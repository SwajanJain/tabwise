/**
 * Tabwise AI Worker - Cloudflare Worker
 * Proxies requests to OpenAI API with secret key
 *
 * Rate limiting: 10 requests per minute per IP
 * For additional protection, configure Cloudflare Rate Limiting in the dashboard
 */

// Simple in-memory rate limiter (resets on worker restart)
const rateLimitMap = new Map();
const RATE_LIMIT = 10; // requests
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.timestamp > RATE_WINDOW) {
    // New window
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false; // Rate limited
  }

  record.count++;
  return true;
}

// Clean up old entries periodically (every 100 requests)
let requestCount = 0;
function cleanupRateLimitMap() {
  requestCount++;
  if (requestCount % 100 === 0) {
    const now = Date.now();
    for (const [ip, record] of rateLimitMap) {
      if (now - record.timestamp > RATE_WINDOW) {
        rateLimitMap.delete(ip);
      }
    }
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const origin = request.headers.get('Origin') || '*';

    if (!origin.includes('chrome-extension://') && !origin.includes('moz-extension://')) {
      return new Response('Forbidden', { status: 403 });
    }

    // Rate limiting by IP
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    cleanupRateLimitMap();

    if (!checkRateLimit(clientIP)) {
      return jsonResponse({ error: 'Rate limit exceeded. Try again later.' }, 429, origin);
    }

    try {
      const { history, profile } = await request.json();

      if (!history || typeof history !== 'object') {
        return jsonResponse({ error: 'Invalid history data' }, 400, origin);
      }

      // Pre-filter history before sending to AI
      const filteredHistory = filterHistory(history);

      const prompt = buildPrompt(filteredHistory, profile);

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-5.2',
          messages: [
            {
              role: 'system',
              content: `You are an expert at understanding professional workflows and digital habits. You analyze browsing patterns to identify and infer a user's ideal daily workflow - which apps and sites are ESSENTIAL to their work vs. noise.

Your goal: Help users set up their "Quick Access Grid" - the 10-15 sites they'd put on their phone's home screen. These are one-click shortcuts, not bookmarks.

Process: First infer the user's workflow, then select favorites that represent it.
Output: Return ONLY valid JSON object with "workflow", "favorites", and "suggestedAdd" keys. No explanation, no markdown.

IMPORTANT: You must also include ONE "suggestedAdd" - a site the user visits often but didn't make the top 15. This will be used to teach them how to add favorites themselves.`
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_completion_tokens: 1000
        })
      });

      if (!openaiResponse.ok) {
        const err = await openaiResponse.text();
        console.error('OpenAI error:', err);
        return jsonResponse({ error: 'AI analysis failed', details: err }, 500, origin);
      }

      const data = await openaiResponse.json();
      const content = data.choices[0]?.message?.content || '{}';

      let parsed;
      try {
        parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
      } catch (e) {
        return jsonResponse({ error: 'Failed to parse AI response' }, 500, origin);
      }

      // Handle both formats: {workflow, favorites, suggestedAdd} or just array
      let workflow = '';
      let favorites = [];
      let suggestedAdd = null;

      if (Array.isArray(parsed)) {
        favorites = parsed;
      } else if (parsed.favorites && Array.isArray(parsed.favorites)) {
        workflow = parsed.workflow || '';
        favorites = parsed.favorites;
        suggestedAdd = parsed.suggestedAdd || null;
      } else {
        return jsonResponse({ error: 'Invalid response format' }, 500, origin);
      }

      // Post-process: ensure one URL per domain
      favorites = dedupeByDomain(favorites).slice(0, 15);

      // Validate suggestedAdd has required fields
      if (suggestedAdd && (!suggestedAdd.url || !suggestedAdd.title)) {
        suggestedAdd = null;
      }

      return jsonResponse({ workflow, favorites, suggestedAdd }, 200, origin);

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ error: 'Internal server error' }, 500, origin);
    }
  }
};

/**
 * Filter out noise domains before sending to AI
 */
function filterHistory(history) {
  const filtered = {};

  for (const [domain, data] of Object.entries(history)) {
    const lowerDomain = domain.toLowerCase();

    // Skip localhost and local IPs
    if (lowerDomain.includes('localhost') ||
        lowerDomain.includes('127.0.0.1') ||
        lowerDomain.includes('0.0.0.0') ||
        lowerDomain.match(/^192\.168\./) ||
        lowerDomain.match(/^10\./)) {
      continue;
    }

    // Skip browser internal pages
    if (lowerDomain.startsWith('chrome://') ||
        lowerDomain.startsWith('edge://') ||
        lowerDomain.startsWith('about:') ||
        lowerDomain.startsWith('chrome-extension://')) {
      continue;
    }

    // Skip auth/login subdomains
    if (lowerDomain.startsWith('accounts.') ||
        lowerDomain.startsWith('login.') ||
        lowerDomain.startsWith('auth.') ||
        lowerDomain.startsWith('sso.') ||
        lowerDomain.startsWith('signin.')) {
      continue;
    }

    filtered[domain] = data;
  }

  return filtered;
}

/**
 * Ensure only one URL per domain in final results
 */
function dedupeByDomain(favorites) {
  const seen = new Set();
  const deduped = [];

  for (const fav of favorites) {
    if (!fav || !fav.url) continue;

    try {
      const hostname = new URL(fav.url).hostname.toLowerCase().replace('www.', '');

      if (!seen.has(hostname)) {
        seen.add(hostname);
        deduped.push({
          url: fav.url,
          title: fav.title || extractDomain(fav.url)
        });
      }
    } catch {
      // Skip invalid URLs
    }
  }

  return deduped;
}

function buildPrompt(history, profile) {
  const profileText = profile?.length > 0
    ? profile.join(', ')
    : 'General professional';

  const historyLines = Object.entries(history)
    .sort((a, b) => b[1].totalVisits - a[1].totalVisits)
    .slice(0, 80)
    .map(([domain, data]) => {
      const urls = data.topUrls
        .slice(0, 5)
        .map(u => `  ${u.url} (${u.visits} visits)`)
        .join('\n');
      return `${domain} [${data.totalVisits} total]\n${urls}`;
    })
    .join('\n\n');

  return `
<task>
The user is a ${profileText}. Analyze their browsing history to:
1. Infer their ideal daily workflow
2. Select 10-15 Quick Access favorites that represent this workflow

Think: "What would this person click FIRST thing every morning? What apps would they panic without?"
</task>

<definitions>
- "Favorite" = one best entry URL for a tool (home/dashboard/inbox/workspace), not a specific deep object page
- "Workflow" = the recurring loop of activities: communicate → plan → execute → review → repeat
- "Work-essential" = used for communication, planning, execution, analytics, design, engineering, AI assistance, internal tools, testing, console, monitoring
- "Noise" = news sites, social media, shopping, one-off articles, auth pages, redirects
</definitions>

<inference_steps>
Step 1: Infer the daily workflow of a ${profileText}
- Identify recurring "work sessions": clusters of tool usage that repeat across days
- Map tools into categories: Communication, Planning/Docs, Design, Engineering, Analytics, AI, Calendar/Meetings, Admin/Infra
- Recognize work tools by URL PATTERNS, not domain names:
  - /admin, /panel, /dashboard, /console → admin/business tools
  - /inventory, /orders, /fulfillment → operations/logistics
  - /prospects, /leads, /crm, /sales → sales work
  - /editor, /design, /canvas, /project → creative work
  - /devconsole, /developer, /api-keys → developer tools

Step 2: Select favorites that best represent this workflow
- Cover all relevant categories (don't overfill one category)
- Prefer tools the ${profileText} would use daily
</inference_steps>

<domain_rules>
Treat these as SEPARATE tool buckets:
- mail.google.com ≠ docs.google.com ≠ calendar.google.com ≠ meet.google.com
- Each distinct product subdomain = its own bucket
- Pick ONE best URL per bucket. Never duplicate buckets.
- Exclude: login/oauth/redirect URLs, chrome://, accounts.*
</domain_rules>

<scoring_rules>
For each candidate tool:
+5 if category is essential for a ${profileText}
+4 if it appears across many different days/sessions (habitual)
+3 if long dwell sessions or repeated back-and-forth (sticky tool)
+2 if it acts as a hub (dashboard, workspace home)
-6 if entertainment/news/social/shopping (consumer, not business)
-6 if auth/redirect/consent page
-3 if mostly deep object URLs with no stable home available

Tie-breaker: Prefer covering all workflow categories over overfilling one category.
</scoring_rules>

<url_canonicalization>
Convert observed URLs to stable entry points:
- Slack → workspace/client home
- Gmail → inbox
- Calendar → week view home
- Docs/Drive → docs home or drive home (not specific doc ID)
- Notion → workspace home (not specific page)
- Jira/Linear → project/issues home
- GitHub → dashboard/pulls/issues (unless one repo dominates)
- Figma → files/recent
- Analytics → dashboards home
- AI tools → main chat interface
- Meetings → the specific meeting URL that appears MOST (recurring standup/sync), NEVER the landing page
</url_canonicalization>

<reflection_before_output>
Before finalizing your selection, ask yourself:

1. WORKFLOW REPRESENTATION: Does this grid represent the FULL workflow, or is one category overfilled?
   - If you have 4+ tools from one category (e.g., AI), ask: "Would the user really click 4 AI tools daily, or would 2 serve them while leaving room for other essential tools?"

2. MEETINGS: Did I pick a RECURRING meeting URL (same URL visited multiple times = daily standup) or a useless landing page?
   - A ${profileText}'s workflow likely includes recurring meetings. The landing page is NEVER useful.

3. MISSING CATEGORIES: Am I missing any workflow category that has clear evidence in the history?
   - Look for /admin, /panel, /inventory, /devconsole paths that indicate business operations or developer tools.

4. OPPORTUNITY COST: Each of the 10-15 slots is precious.
   - Is every pick earning its place, or am I including low-value tools just to fill slots?
   - Would dropping one AI tool make room for a business-critical tool?
</reflection_before_output>

<history>
${historyLines}
</history>

<output_format>
Return ONLY a JSON object with three keys:
{
  "workflow": "Brief 1-2 sentence description of inferred daily workflow",
  "favorites": [
    {"url": "https://...", "title": "Short Name (2-3 words)"},
    ...
  ],
  "suggestedAdd": {"url": "https://...", "title": "Short Name", "reason": "Why this site is useful"}
}

The "suggestedAdd" must be a site the user visits regularly but didn't make the top 15 favorites. Pick something useful that would complement their workflow. The "reason" should be a short phrase explaining why it's worth adding (e.g., "You visit this daily", "Great for quick reference").

No explanation. No markdown. No code blocks. Just the JSON object.
</output_format>`;
}

function extractDomain(url) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const parts = hostname.split('.');
    const name = parts.length > 2 ? parts[parts.length - 2] : parts[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return 'Site';
  }
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin
    }
  });
}
