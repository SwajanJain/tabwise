# Tabwise AI Worker

Cloudflare Worker that proxies requests to OpenAI API, keeping the API key secure.

## Setup

### 1. Create Cloudflare Account
Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign up (free).

### 2. Create Worker
1. Go to **Workers & Pages** → **Create Application** → **Create Worker**
2. Name it `tabwise-ai` (or whatever you prefer)
3. Click **Deploy**

### 3. Add Code
1. Click **Edit Code**
2. Replace the default code with contents of `worker.js`
3. Click **Save and Deploy**

### 4. Add Environment Variables
1. Go to **Settings** → **Variables**
2. Add these variables:

| Variable | Value |
|----------|-------|
| `OPENAI_API_KEY` | Your OpenAI API key (sk-...) |
| `OPENAI_MODEL` | `gpt-4o` or `gpt-4o-mini` (optional, defaults to gpt-4o) |

3. Click **Encrypt** for the API key (important!)
4. Click **Save and Deploy**

### 5. Get Your Worker URL
Your worker URL will be:
```
https://tabwise-ai.YOUR_SUBDOMAIN.workers.dev
```

### 6. Update Extension
In `onboarding.js`, update the `AI_WORKER_URL`:
```javascript
const AI_WORKER_URL = 'https://tabwise-ai.YOUR_SUBDOMAIN.workers.dev';
```

## Security Features

- Only accepts requests from Chrome/Firefox extensions (validates Origin header)
- API key never exposed to client
- No logging of user data
- Rate limited by Cloudflare (100k requests/day on free tier)

## Testing

```bash
curl -X POST https://tabwise-ai.YOUR_SUBDOMAIN.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: chrome-extension://test" \
  -d '{"history": {"github.com": {"totalVisits": 100, "topUrls": [{"url": "https://github.com", "visits": 100}]}}, "profile": ["Developer"]}'
```

## Cost Estimate

- Cloudflare Workers: Free (100k requests/day)
- OpenAI GPT-4o: ~$0.005 per onboarding (varies with history size)

For 1000 users onboarding: ~$5
