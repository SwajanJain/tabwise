// Onboarding System
// Handles first-launch experience and quick import

/**
 * Detect if a URL looks like a specific file/item (vs. a dashboard)
 */
function looksLikeSpecificItem(url) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Pattern 1: Long alphanumeric IDs (20+ chars)
    const longIdPattern = /[a-zA-Z0-9_-]{20,}/;
    if (longIdPattern.test(path)) {
      return true;
    }

    // Pattern 2: UUID format (8-4-4-4-12)
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    if (uuidPattern.test(path)) {
      return true;
    }

    // Pattern 3: Common file/item path segments
    const itemKeywords = ['/d/', '/file/', '/document/', '/sheet/', '/c/', '/chat/', '/conversation/', '/edit', '/view'];
    if (itemKeywords.some(keyword => path.includes(keyword))) {
      return true;
    }

    // Pattern 4: Very deep paths (4+ segments usually means nested items)
    const pathDepth = path.split('/').filter(Boolean).length;
    if (pathDepth >= 4) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Check if URL is a login/auth page that should never be selected
 */
function isLoginOrAuthUrl(url) {
  try {
    const lowerUrl = url.toLowerCase();
    const authPatterns = ['/login', '/signin', '/auth', '/oauth', '/signup', '/register'];
    return authPatterns.some(pattern => lowerUrl.includes(pattern));
  } catch {
    return false;
  }
}

/**
 * Smart URL selector - picks the best URL for a domain
 * Works for any productivity tool without hardcoding
 */
function selectBestUrl(domainData) {
  const { urls, totalVisits } = domainData;

  // Convert to array and sort by visit count
  const urlEntries = Object.entries(urls)
    .map(([url, visits]) => ({
      url,
      visits,
      percentage: visits / totalVisits
    }))
    .sort((a, b) => b.visits - a.visits);

  // Filter out login/auth URLs
  const nonAuthUrls = urlEntries.filter(entry => !isLoginOrAuthUrl(entry.url));

  // If all URLs were auth URLs, fallback to first entry
  const validUrls = nonAuthUrls.length > 0 ? nonAuthUrls : urlEntries;

  // Calculate fragmentation
  const uniqueUrls = validUrls.length;
  const fragmentationRatio = uniqueUrls / totalVisits;
  const topUrlPercentage = validUrls[0].percentage;

  // Step 1: Clear winner (>50% of traffic)
  if (topUrlPercentage > 0.5) {
    return validUrls[0].url;
  }

  // Step 2: Highly fragmented? Look for dashboard patterns
  if (fragmentationRatio > 0.6) {
    // Look for dashboard keywords
    const dashboardKeywords = [
      '/dashboard', '/home', '/inbox', '/feed', '/files',
      '/recent', '/workspace', '/projects', '/app', '/panel',
      '/admin', '/overview'
    ];

    for (const entry of validUrls) {
      try {
        const urlObj = new URL(entry.url);
        const path = urlObj.pathname.toLowerCase();

        if (dashboardKeywords.some(keyword => path.includes(keyword))) {
          return entry.url;
        }
      } catch {}
    }

    // No dashboard keyword? Use the shortest path
    const shortestUrl = validUrls.reduce((shortest, current) => {
      try {
        const shortestDepth = new URL(shortest.url).pathname.split('/').filter(Boolean).length;
        const currentDepth = new URL(current.url).pathname.split('/').filter(Boolean).length;
        return currentDepth < shortestDepth ? current : shortest;
      } catch {
        return shortest;
      }
    });

    return shortestUrl.url;
  }

  // Step 3: Check if top URL looks like a file/item
  const topUrl = validUrls[0].url;
  if (looksLikeSpecificItem(topUrl)) {
    // Try to find a dashboard-like URL
    for (const entry of validUrls) {
      if (!looksLikeSpecificItem(entry.url)) {
        return entry.url;
      }
    }
  }

  // Step 4: Default to most visited URL
  return topUrl;
}

/**
 * Check if domain should be filtered out as noise
 */
function isNoiseDomain(hostname) {
  // Filter out login/auth pages
  if (hostname.includes('accounts.') ||
      hostname.includes('login.') ||
      hostname.includes('auth.')) {
    return true;
  }

  return false;
}

/**
 * Analyze browsing history and return top sites
 * @param {number} days - Number of days to analyze
 * @returns {Promise<Array>} - Top sites sorted by visit count
 */
async function analyzeHistory(days = 14) {
  const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);

  // Get history
  const history = await chrome.history.search({
    text: '',
    startTime: startTime,
    maxResults: 2000
  });

  // Group by hostname
  const domainData = {};

  history.forEach(item => {
    try {
      const url = new URL(item.url);
      const hostname = url.hostname;

      // Skip noise
      if (hostname.startsWith('chrome://') ||
          hostname.startsWith('edge://') ||
          hostname.includes('localhost') ||
          hostname.includes('127.0.0.1') ||
          hostname === '' ||
          isNoiseDomain(hostname)) {
        return;
      }

      if (!domainData[hostname]) {
        domainData[hostname] = {
          hostname,
          totalVisits: 0,
          lastVisit: 0,
          urls: {}
        };
      }

      domainData[hostname].totalVisits++;
      domainData[hostname].lastVisit = Math.max(
        domainData[hostname].lastVisit,
        item.lastVisitTime
      );

      // Track individual URLs (not normalized)
      const fullUrl = `${url.origin}${url.pathname}`;
      domainData[hostname].urls[fullUrl] = (domainData[hostname].urls[fullUrl] || 0) + 1;
    } catch (err) {
      // Skip invalid URLs
    }
  });

  // Use smart selector to pick best URL for each domain
  const sites = Object.values(domainData).map(site => {
    const bestUrl = selectBestUrl(site);

    return {
      hostname: site.hostname,
      bestUrl: bestUrl,
      visits: site.totalVisits,
      lastVisit: site.lastVisit
    };
  });

  // Sort by visit count
  sites.sort((a, b) => b.visits - a.visits);

  return sites;
}

/**
 * Clean hostname for display title
 * gmail.com → Gmail
 * acme-corp.slack.com → Slack
 */
function cleanTitle(hostname) {
  // Remove common prefixes
  let clean = hostname.replace(/^www\./, '');

  // Extract main name (before first dot or hyphen in subdomain)
  const parts = clean.split('.');

  // For subdomains like acme-corp.slack.com, use the main domain
  if (parts.length > 2) {
    // Get the domain before TLD (slack from acme-corp.slack.com)
    clean = parts[parts.length - 2];
  } else {
    // Simple domain like github.com
    clean = parts[0];
  }

  // Capitalize first letter
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Extract bookmark folders and their bookmarks
 * @param {boolean} filterByRecency - If true, only include folders with bookmarks visited in last 30 days
 */
async function extractBookmarkFolders(filterByRecency = false) {
  console.log('[extractBookmarkFolders] Starting extraction, filterByRecency:', filterByRecency);

  const bookmarkTree = await chrome.bookmarks.getTree();
  console.log('[extractBookmarkFolders] Bookmark tree:', bookmarkTree);

  const folders = [];
  const systemFolders = ['mobile bookmarks', 'other bookmarks', 'reading list'];

  // Get recent history if filtering by recency
  let recentUrls = new Set();
  if (filterByRecency) {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const history = await chrome.history.search({
      text: '',
      startTime: thirtyDaysAgo,
      maxResults: 10000
    });
    recentUrls = new Set(history.map(item => item.url));
    console.log('[extractBookmarkFolders] Recent URLs (30 days):', recentUrls.size);
  }

  function traverseBookmarks(nodes, depth = 0) {
    console.log(`[traverseBookmarks] Depth ${depth}, processing ${nodes.length} nodes`);
    for (const node of nodes) {
      console.log(`[traverseBookmarks] Node at depth ${depth}:`, node.title || '(root/no title)', 'has children:', !!node.children);

      if (node.children) {
        // Handle folders with titles
        if (node.title) {
          console.log(`[traverseBookmarks] Depth ${depth}: "${node.title}", has ${node.children.length} children`);

          // Import all folders at depth 2+ (these are user folders)
          // System folders only exist at depth 1, so we don't need to check for them at deeper levels
          if (depth >= 2) {
            const bookmarks = [];
            collectBookmarks(node, bookmarks);
            console.log(`[traverseBookmarks] Found user folder "${node.title}" with ${bookmarks.length} bookmarks`);

            if (bookmarks.length > 0) {
              // If filtering by recency, check if at least one bookmark was visited recently
              if (filterByRecency) {
                const hasRecentVisit = bookmarks.some(bm => recentUrls.has(bm.url));
                console.log(`[traverseBookmarks] Folder "${node.title}" has recent visit: ${hasRecentVisit}`);
                if (!hasRecentVisit) {
                  continue; // Skip this folder, but continue processing other nodes
                }
              }

              console.log(`[traverseBookmarks] ✅ Adding folder "${node.title}" with ${bookmarks.length} bookmarks`);
              folders.push({
                name: node.title,
                bookmarks: bookmarks
              });
            }
          }
        }

        // Always recurse into children (even for root nodes without titles)
        traverseBookmarks(node.children, depth + 1);
      }
    }
  }

  function collectBookmarks(node, bookmarks) {
    if (node.children) {
      for (const child of node.children) {
        if (child.url) {
          bookmarks.push({
            title: child.title,
            url: child.url
          });
        } else if (child.children) {
          collectBookmarks(child, bookmarks);
        }
      }
    }
  }

  traverseBookmarks(bookmarkTree);
  console.log(`[extractBookmarkFolders] Extraction complete. Found ${folders.length} folders total.`);
  folders.forEach(f => console.log(`  - ${f.name}: ${f.bookmarks.length} bookmarks`));
  return folders;
}

/**
 * Quick import: Analyze history and auto-populate favorites + workspaces
 */
async function quickImport() {
  try {
    const summary = {
      favorites: 0,
      workspaces: []
    };

    // 1. Import favorites from history (top 15, last 14 days)
    const topSites = await analyzeHistory(14);
    const qualified = topSites.filter(site => site.visits >= 3);
    const favoritesToImport = qualified.slice(0, 15);

    for (const site of favoritesToImport) {
      await Storage.addFavorite({
        url: site.bestUrl,
        title: cleanTitle(site.hostname)
      });
    }

    summary.favorites = favoritesToImport.length;

    // Track favorite URLs to avoid duplicates (exact URL matching)
    const favoriteUrls = new Set(
      favoritesToImport.map(s => s.bestUrl)
    );

    // 2. Get bookmark folders (only those used in last 30 days during onboarding)
    const bookmarkFolders = await extractBookmarkFolders(true);

    // 3. Track if we found Work/Personal folders
    let hasWorkFolder = false;
    let hasPersonalFolder = false;
    const workspaceUrls = new Set();

    // 4. Create workspaces from bookmark folders
    for (const folder of bookmarkFolders) {
      const lowerName = folder.name.toLowerCase();

      // Check if this is Work or Personal related (word boundary matching)
      if (/\bwork\b/.test(lowerName)) {
        hasWorkFolder = true;
      }
      if (/\b(personal|home)\b/.test(lowerName)) {
        hasPersonalFolder = true;
      }

      // Create workspace
      const emoji = guessEmojiForFolder(folder.name);
      const workspace = await Storage.addWorkspace(folder.name, emoji);

      let addedCount = 0;

      // Add bookmarks (exclude if exact URL already in favorites)
      for (const bookmark of folder.bookmarks) {
        try {
          if (!favoriteUrls.has(bookmark.url)) {
            const hostname = new URL(bookmark.url).hostname;
            await Storage.addWorkspaceItem(workspace.id, {
              url: bookmark.url,
              title: bookmark.title || cleanTitle(hostname)
            });
            workspaceUrls.add(bookmark.url);
            addedCount++;
          }
        } catch (err) {
          // Skip invalid URLs
        }
      }

      summary.workspaces.push({
        name: folder.name,
        emoji: emoji,
        tabs: addedCount
      });
    }

    // 5. Create Work workspace if not found in bookmarks
    if (!hasWorkFolder) {
      await Storage.addWorkspace('Work', '💼');
      summary.workspaces.push({
        name: 'Work',
        emoji: '💼',
        tabs: 0
      });
    }

    // 6. Create Personal workspace if not found in bookmarks
    if (!hasPersonalFolder) {
      await Storage.addWorkspace('Personal', '🏠');
      summary.workspaces.push({
        name: 'Personal',
        emoji: '🏠',
        tabs: 0
      });
    }

    // 7. Create Random workspace for loose bookmarks (not in folders, visited in last 30 days)
    // Collect all loose bookmarks from the bookmark tree
    const looseBookmarks = [];
    const bookmarkTree = await chrome.bookmarks.getTree();

    // Get recent history URLs (30 days) for filtering
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentHistory = await chrome.history.search({
      text: '',
      startTime: thirtyDaysAgo,
      maxResults: 10000
    });
    const recentUrls = new Set(recentHistory.map(item => item.url));

    function collectLooseBookmarks(nodes, depth = 0) {
      for (const node of nodes) {
        // At depth 2, collect bookmarks (nodes with URL) that are NOT folders
        if (depth === 2 && node.url && !node.children) {
          looseBookmarks.push({
            title: node.title,
            url: node.url
          });
        }

        // Recurse into folders
        if (node.children) {
          collectLooseBookmarks(node.children, depth + 1);
        }
      }
    }

    collectLooseBookmarks(bookmarkTree);
    console.log(`[quickImport] Found ${looseBookmarks.length} loose bookmarks (not in folders)`);

    // Filter to only those visited in last 30 days
    const recentLooseBookmarks = looseBookmarks.filter(bm => recentUrls.has(bm.url));
    console.log(`[quickImport] ${recentLooseBookmarks.length} loose bookmarks visited in last 30 days`);

    // Create Random workspace if there are recent loose bookmarks
    if (recentLooseBookmarks.length > 0) {
      const randomWorkspace = await Storage.addWorkspace('Random', '🎲');
      let addedCount = 0;

      for (const bookmark of recentLooseBookmarks) {
        try {
          // Add if not already in favorites or other workspaces
          if (!favoriteUrls.has(bookmark.url) && !workspaceUrls.has(bookmark.url)) {
            const hostname = new URL(bookmark.url).hostname;
            await Storage.addWorkspaceItem(randomWorkspace.id, {
              url: bookmark.url,
              title: bookmark.title || cleanTitle(hostname)
            });
            addedCount++;
          }
        } catch (err) {
          // Skip invalid URLs
        }
      }

      if (addedCount > 0) {
        summary.workspaces.push({
          name: 'Random',
          emoji: '🎲',
          tabs: addedCount
        });
      }
    }

    return {
      success: true,
      summary: summary
    };

  } catch (error) {
    console.error('[Onboarding] Quick import failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Guess emoji for folder name
 */
function guessEmojiForFolder(name) {
  const lower = name.toLowerCase();

  if (lower.includes('work') || lower.includes('job') || lower.includes('office')) return '💼';
  if (lower.includes('personal') || lower.includes('home')) return '🏠';
  if (lower.includes('dev') || lower.includes('code') || lower.includes('programming')) return '💻';
  if (lower.includes('read') || lower.includes('article') || lower.includes('news')) return '📰';
  if (lower.includes('shop') || lower.includes('buy') || lower.includes('store')) return '🛒';
  if (lower.includes('travel') || lower.includes('trip')) return '✈️';
  if (lower.includes('recipe') || lower.includes('food') || lower.includes('cooking')) return '🍳';
  if (lower.includes('music')) return '🎵';
  if (lower.includes('video') || lower.includes('youtube')) return '📺';
  if (lower.includes('learn') || lower.includes('study') || lower.includes('education')) return '📚';

  return '📁';
}

/**
 * Create Google Workspace with all Google services
 */
async function createGoogleWorkspace() {
  const workspace = await Storage.addWorkspace('Google Workspace', '🌐');

  const googleServices = [
    { url: 'https://mail.google.com/mail', alias: 'Gmail', icon: 'https://www.google.com/gmail/about/static-2.0/images/logo-gmail.png' },
    { url: 'https://calendar.google.com/calendar', alias: 'Calendar', icon: 'https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png' },
    { url: 'https://drive.google.com/drive', alias: 'Drive', icon: 'https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png' },
    { url: 'https://docs.google.com/document/u/0/', alias: 'Docs', icon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico' },
    { url: 'https://docs.google.com/spreadsheets/u/0/', alias: 'Sheets', icon: 'https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico' },
    { url: 'https://docs.google.com/presentation/u/0/', alias: 'Slides', icon: 'https://ssl.gstatic.com/docs/presentations/images/favicon5.ico' },
    { url: 'https://meet.google.com/', alias: 'Meet', icon: 'https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png' },
    { url: 'https://mail.google.com/chat', alias: 'Chat', icon: 'https://www.gstatic.com/images/branding/product/2x/chat_2020q4_48dp.png' }
  ];

  for (const service of googleServices) {
    await Storage.addWorkspaceItem(workspace.id, service);
  }

  return workspace;
}

/**
 * Collapse all workspaces except "Google Workspace"
 * Used after onboarding Quick Setup and bookmark imports.
 */
async function collapseNonGoogleWorkspaces() {
  try {
    const state = await Storage.getState();
    const workspaces = state.workspaces || {};

    for (const workspace of Object.values(workspaces)) {
      const shouldBeCollapsed = workspace.name !== 'Google Workspace';
      if (workspace.collapsed !== shouldBeCollapsed) {
        await Storage.updateWorkspace(workspace.id, { collapsed: shouldBeCollapsed });
      }
    }
  } catch (err) {
    console.error('[Onboarding] Failed to collapse workspaces:', err);
  }
}

/**
 * Check if this is first launch (no favorites, no workspaces)
 */
function isFirstLaunch(state) {
  return state.favorites.length === 0 &&
         Object.keys(state.workspaces).length === 0;
}

/**
 * Show onboarding welcome modal
 */
function showOnboardingModal(onComplete) {
  showModal('', `
    <div class="onboarding-welcome">
      <div class="onboarding-pain-visual">
        <div class="tab-chaos">
          ${Array(12).fill('<span class="mini-tab"></span>').join('')}
        </div>
      </div>

      <h2 class="onboarding-title">40 tabs. Can't find anything.</h2>
      <p class="onboarding-description">
        We'll organize them.
      </p>

      <div class="onboarding-cta">
        <button class="btn btn-primary btn-large" id="quick-import-btn">
          Set up from my browsing history
        </button>

        <button class="btn btn-secondary" id="skip-onboarding-btn">
          Start empty
        </button>
      </div>

      <div class="onboarding-toggle">
        <label class="onboarding-checkbox-row">
          <input type="checkbox" id="add-google-workspace-checkbox" checked />
          <span class="onboarding-checkbox-title">Add Google Workspace</span>
        </label>
      </div>
    </div>
  `);

  // Quick import handler
  document.getElementById('quick-import-btn').addEventListener('click', async () => {
    // Show loading state
    const btn = document.getElementById('quick-import-btn');
    btn.disabled = true;
    btn.innerHTML = '<span>⚡ Setting up...</span>';

    // Check if Google Workspace should be added
    const shouldAddGoogleWorkspace = document.getElementById('add-google-workspace-checkbox').checked;

    // Add Google Workspace FIRST (so it appears at top)
    if (shouldAddGoogleWorkspace) {
      await createGoogleWorkspace();
    }

    // Run import (creates workspaces after Google Workspace)
    const result = await quickImport();

    if (result.success) {
      // After creating workspaces, keep only Google Workspace expanded
      await collapseNonGoogleWorkspaces();
      hideModal();
      // Go directly to post-onboarding coach (skip old screens 2 & 3)
      if (onComplete) onComplete();
    } else {
      alert('Import failed. Please try again or start empty.');
      btn.disabled = false;
      btn.innerHTML = '<span>🚀 Quick Setup (Recommended)</span><span class="btn-subtitle">Use your real history to auto-build workspaces</span>';
    }
  });

  // Skip handler
  document.getElementById('skip-onboarding-btn').addEventListener('click', async () => {
    // Check if Google Workspace should be added
    const shouldAddGoogleWorkspace = document.getElementById('add-google-workspace-checkbox').checked;

    // Add Google Workspace FIRST (so it appears at top)
    if (shouldAddGoogleWorkspace) {
      await createGoogleWorkspace();
    }

    // Create empty workspaces
    await Storage.addWorkspace('Work', '💼');
    await Storage.addWorkspace('Personal', '🏠');

    // After creating workspaces, keep only Google Workspace expanded
    await collapseNonGoogleWorkspaces();

    hideModal();
    if (onComplete) onComplete();
  });
}

/**
 * Show success modal after import (Screen 2 - Simple celebration)
 * @param {Object} summary - Import summary
 * @param {boolean} hasGoogleWorkspace - Whether Google Workspace was added
 * @param {Function} onComplete - Callback when entire onboarding flow completes
 */
function showSuccessModal(summary, hasGoogleWorkspace = false, onComplete = null) {
  // Calculate total workspaces (including Google Workspace if added)
  const totalWorkspaces = summary.workspaces.length + (hasGoogleWorkspace ? 1 : 0);

  // Handle empty or minimal import
  const hasContent = summary.favorites > 0 || totalWorkspaces > 0;

  showModal('', `
    <div class="onboarding-success">
      <div class="onboarding-progress">
        <span class="progress-dot completed"></span>
        <span class="progress-dot active"></span>
        <span class="progress-dot"></span>
      </div>
      <div class="onboarding-icon">${hasContent ? '✓' : '📋'}</div>
      <h2 class="onboarding-title">${hasContent ? 'Your tabs, organized' : 'Ready to go'}</h2>

      ${hasContent ? `
        <div class="onboarding-stats">
          <div class="stat-item">
            <span class="stat-number">${summary.favorites}</span>
            <span class="stat-label">favorites</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${totalWorkspaces}</span>
            <span class="stat-label">workspaces</span>
          </div>
        </div>
      ` : ''}

      <div class="onboarding-key-feature">
        <strong>One click = right tab</strong>
        <span>No more duplicate Gmail tabs.</span>
      </div>

      <div class="onboarding-cta">
        <button class="btn btn-primary btn-large" id="next-tips-btn">
          One more thing
        </button>
        <button class="btn btn-secondary" id="skip-tips-btn">
          Start browsing
        </button>
      </div>
    </div>
  `);

  document.getElementById('next-tips-btn').addEventListener('click', () => {
    hideModal();
    showTipsModal(onComplete);
  });

  document.getElementById('skip-tips-btn').addEventListener('click', () => {
    hideModal();
    // User skipped tips, call onComplete now
    if (onComplete) onComplete();
  });
}

/**
 * Show tips modal (Screen 3 - Immersive experience setup)
 * @param {Function} onComplete - Callback when onboarding flow completes
 */
function showTipsModal(onComplete = null) {
  chrome.runtime.getPlatformInfo((info) => {
    const isMac = info?.os === 'mac';

    const modifierKey = isMac ? '⌘' : 'Ctrl';
    const platformInstructions = isMac ? `
      <div class="immersive-section">
        <div class="immersive-section-title">Hide the tab bar</div>
        <div class="immersive-step">
          <span class="step-number">1</span>
          <span>Enter full screen</span>
        </div>
        <div class="immersive-step">
          <span class="step-number">2</span>
          <span>Menu bar → <strong>View</strong> → Uncheck <strong>"Always Show Toolbar in Full Screen"</strong></span>
        </div>
      </div>
      <div class="immersive-section">
        <div class="immersive-section-title">Toggle this panel</div>
        <div class="immersive-step">
          <span class="step-number">3</span>
          <span>Press <kbd>${modifierKey}</kbd> <kbd>Shift</kbd> <kbd>E</kbd> to show/hide</span>
        </div>
      </div>
    ` : `
      <div class="immersive-section">
        <div class="immersive-section-title">Hide the tab bar</div>
        <div class="immersive-step">
          <span class="step-number">1</span>
          <span>Press <kbd>F11</kbd> for full screen</span>
        </div>
      </div>
      <div class="immersive-section">
        <div class="immersive-section-title">Toggle this panel</div>
        <div class="immersive-step">
          <span class="step-number">2</span>
          <span>Press <kbd>${modifierKey}</kbd> <kbd>Shift</kbd> <kbd>E</kbd> to show/hide</span>
        </div>
      </div>
    `;

    showModal('', `
      <div class="onboarding-success">
        <div class="onboarding-progress">
          <span class="progress-dot completed"></span>
          <span class="progress-dot completed"></span>
          <span class="progress-dot active"></span>
        </div>
        <div class="onboarding-icon">🖥️</div>
        <h2 class="onboarding-title">Go immersive</h2>
        <p class="onboarding-subtitle">No tabs. No clutter. Just content.</p>

        <div class="immersive-steps">
          ${platformInstructions}
        </div>

        <div class="onboarding-cta">
          <button class="btn btn-primary btn-large" id="start-using-btn">
            Done
          </button>
        </div>
      </div>
    `);

    document.getElementById('start-using-btn').addEventListener('click', () => {
      hideModal();
      // Onboarding complete - now start the post-onboarding coach
      if (onComplete) onComplete();
    });
  });
}

/**
 * Import all bookmark folders (for Settings - no 30-day filter)
 * @returns {Promise<Object>} - Summary of imported workspaces
 */
async function importAllBookmarks() {
  try {
    console.log('[importAllBookmarks] Starting import...');

    const summary = {
      workspaces: [],
      skipped: 0
    };

    // Get current state
    const state = await Storage.getState();
    console.log('[importAllBookmarks] Current state:', {
      favorites: state.favorites.length,
      workspaces: Object.keys(state.workspaces).length
    });

    // Track existing URLs in favorites and workspaces
    const existingUrls = new Set();

    // Add favorite URLs
    state.favorites.forEach(fav => existingUrls.add(fav.url));
    console.log('[importAllBookmarks] Existing favorite URLs:', existingUrls.size);

    // Add workspace URLs
    Object.values(state.workspaces).forEach(ws => {
      ws.items.forEach(item => existingUrls.add(item.url));
    });
    console.log('[importAllBookmarks] Total existing URLs (favorites + workspaces):', existingUrls.size);

    // Get ALL bookmark folders (no recency filter)
    const bookmarkFolders = await extractBookmarkFolders(false);
    console.log('[importAllBookmarks] Got bookmark folders:', bookmarkFolders.length);

    // Create workspaces from bookmark folders
    for (const folder of bookmarkFolders) {
      console.log(`[importAllBookmarks] Processing folder "${folder.name}" with ${folder.bookmarks.length} bookmarks`);
      const emoji = guessEmojiForFolder(folder.name);

      // Check if workspace with this name already exists
      const existingWorkspace = Object.values(state.workspaces).find(
        ws => ws.name.toLowerCase() === folder.name.toLowerCase()
      );

      let workspace;
      if (existingWorkspace) {
        console.log(`[importAllBookmarks] Workspace "${folder.name}" already exists, adding to it`);
        workspace = existingWorkspace;
      } else {
        console.log(`[importAllBookmarks] Creating new workspace "${folder.name}"`);
        workspace = await Storage.addWorkspace(folder.name, emoji);
      }

      let addedCount = 0;
      let skippedCount = 0;

      // Add bookmarks (exclude if already exists)
      for (const bookmark of folder.bookmarks) {
        try {
          if (!existingUrls.has(bookmark.url)) {
            console.log(`[importAllBookmarks]   ✅ Adding: ${bookmark.title}`);
            const hostname = new URL(bookmark.url).hostname;
            await Storage.addWorkspaceItem(workspace.id, {
              url: bookmark.url,
              title: bookmark.title || cleanTitle(hostname)
            });
            existingUrls.add(bookmark.url);
            addedCount++;
          } else {
            console.log(`[importAllBookmarks]   ⏭️  Skipping (already exists): ${bookmark.title}`);
            skippedCount++;
          }
        } catch (err) {
          console.log(`[importAllBookmarks]   ❌ Error adding bookmark:`, err);
        }
      }

      console.log(`[importAllBookmarks] Folder "${folder.name}": added ${addedCount}, skipped ${skippedCount}`);

      if (addedCount > 0 || !existingWorkspace) {
        summary.workspaces.push({
          name: folder.name,
          emoji: emoji,
          tabs: addedCount,
          existing: !!existingWorkspace
        });
      }
    }

    // Import loose bookmarks (not in folders) to Random workspace
    console.log('[importAllBookmarks] Collecting loose bookmarks...');
    const looseBookmarks = [];
    const bookmarkTree = await chrome.bookmarks.getTree();

    function collectLooseBookmarks(nodes, depth = 0) {
      for (const node of nodes) {
        // At depth 2, collect bookmarks (nodes with URL) that are NOT folders
        if (depth === 2 && node.url && !node.children) {
          looseBookmarks.push({
            title: node.title,
            url: node.url
          });
        }

        // Recurse into folders
        if (node.children) {
          collectLooseBookmarks(node.children, depth + 1);
        }
      }
    }

    collectLooseBookmarks(bookmarkTree);
    console.log(`[importAllBookmarks] Found ${looseBookmarks.length} loose bookmarks (not in folders)`);

    // Create or use existing Random workspace for loose bookmarks
    if (looseBookmarks.length > 0) {
      let randomWorkspace = Object.values(state.workspaces).find(
        ws => ws.name.toLowerCase() === 'random'
      );

      if (!randomWorkspace) {
        console.log('[importAllBookmarks] Creating Random workspace for loose bookmarks');
        randomWorkspace = await Storage.addWorkspace('Random', '🎲');
      } else {
        console.log('[importAllBookmarks] Using existing Random workspace');
      }

      let addedCount = 0;
      let skippedCount = 0;

      for (const bookmark of looseBookmarks) {
        try {
          if (!existingUrls.has(bookmark.url)) {
            console.log(`[importAllBookmarks]   ✅ Adding loose bookmark: ${bookmark.title}`);
            const hostname = new URL(bookmark.url).hostname;
            await Storage.addWorkspaceItem(randomWorkspace.id, {
              url: bookmark.url,
              title: bookmark.title || cleanTitle(hostname)
            });
            existingUrls.add(bookmark.url);
            addedCount++;
          } else {
            console.log(`[importAllBookmarks]   ⏭️  Skipping (already exists): ${bookmark.title}`);
            skippedCount++;
          }
        } catch (err) {
          console.log(`[importAllBookmarks]   ❌ Error adding loose bookmark:`, err);
        }
      }

      console.log(`[importAllBookmarks] Random workspace: added ${addedCount}, skipped ${skippedCount}`);

      if (addedCount > 0 || !Object.values(state.workspaces).find(ws => ws.name.toLowerCase() === 'random')) {
        summary.workspaces.push({
          name: 'Random',
          emoji: '🎲',
          tabs: addedCount,
          existing: !!Object.values(state.workspaces).find(ws => ws.name.toLowerCase() === 'random')
        });
      }
    }

    // After import, keep only Google Workspace expanded
    await collapseNonGoogleWorkspaces();

    return {
      success: true,
      summary: summary
    };

  } catch (error) {
    console.error('[Import Bookmarks] Failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ========================================
// POST-ONBOARDING COACH (Complete Flow)
// ========================================

const COACH_STORAGE_KEY = 'postOnboardingCoach';

const COACH_STEPS = {
  INTRO: 0,             // "This is your Smart Grid"
  CLEANUP_FAVORITES: 1, // Remove junk favorites (with 2 options)
  CLEANUP_MORE: 2,      // "Want to remove more?"
  CLEANUP_WORKSPACES: 3,// Remove empty workspaces
  SMART_SWITCH_1: 4,    // Click first (most used) favorite
  SMART_SWITCH_2: 5,    // Click second favorite
  SMART_SWITCH_3: 6,    // Click first again (the aha moment)
  DUPLICATE_TAB: 7,     // Shift+Click to create duplicate
  CHAOS_VIEW: 8,        // Show ungrouped tabs (the chaos)
  MAGIC_MOMENT: 9,      // Group tabs (the transformation)
  GROUPING_TRY: 10,     // Interactive: click group to expand/collapse
  HIDE_TAB_BAR: 11,     // Platform-specific instructions to hide tab bar
  IMMERSIVE_HINT: 12,   // Shortcut key to toggle panel
  COMPLETE: 13
};

// Track coach state during the flow
let coachFlowState = {
  // Smart switch tracking
  firstFavoriteId: null,
  secondFavoriteId: null,
  clickCount: 0,
  // Cleanup tracking
  junkFavorites: [],      // Identified junk favorites
  emptyWorkspaces: [],    // Identified empty workspaces
  removedFavorites: 0,
  removedWorkspaces: 0,
  // Flow control - prevent infinite loops
  cleanupMoreShown: false // Track if "Want to remove more?" was already shown
};

/**
 * Get coach state from local storage
 */
async function getCoachState() {
  return new Promise((resolve) => {
    chrome.storage.local.get([COACH_STORAGE_KEY], (result) => {
      resolve(result[COACH_STORAGE_KEY] || {
        completed: false,
        skipped: false,
        currentStep: COACH_STEPS.INTRO,
        cleanupFavoritesDone: false,
        cleanupWorkspacesDone: false,
        smartSwitchDone: false,
        groupingDone: false
      });
    });
  });
}

/**
 * Save coach state to local storage
 */
async function setCoachState(state) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [COACH_STORAGE_KEY]: state }, resolve);
  });
}

/**
 * Check if coach should be shown
 */
async function shouldShowCoach() {
  const state = await getCoachState();
  return !state.completed && !state.skipped;
}

/**
 * Check if user already has enough tabs with duplicates
 */
async function checkExistingTabChaos() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const domainCounts = {};

  for (const tab of tabs) {
    if (!tab.url || tab.url.startsWith('chrome://')) continue;
    try {
      const hostname = new URL(tab.url).hostname;
      domainCounts[hostname] = (domainCounts[hostname] || 0) + 1;
    } catch {}
  }

  const hasDuplicates = Object.values(domainCounts).some(count => count >= 2);
  const hasManyTabs = tabs.length >= 5;

  return { hasDuplicates, hasManyTabs, tabCount: tabs.length };
}

// Generic favicon detection using blob size comparison
let genericFaviconSize = null;

/**
 * Calibrate by fetching a known non-existent URL to get the generic globe size.
 * Uses .invalid TLD which is reserved and guaranteed to have no favicon.
 */
async function calibrateGenericFavicon() {
  const dummyUrl = chrome.runtime.getURL(
    `/_favicon/?pageUrl=${encodeURIComponent('https://no-favicon.invalid/')}&size=32`
  );
  try {
    const response = await fetch(dummyUrl);
    const blob = await response.blob();
    genericFaviconSize = blob.size;
    console.log('[Favicon] Calibrated generic globe size:', genericFaviconSize);
  } catch (e) {
    console.error('[Favicon] Calibration failed:', e);
  }
}

/**
 * Check if a URL has the generic gray globe favicon
 * @param {string} siteUrl - The URL to check
 * @returns {Promise<boolean>} - True if favicon is the generic globe
 */
async function hasGenericFavicon(siteUrl) {
  if (genericFaviconSize === null) {
    await calibrateGenericFavicon();
  }

  // If calibration failed, can't detect
  if (genericFaviconSize === null) {
    return false;
  }

  const faviconUrl = chrome.runtime.getURL(
    `/_favicon/?pageUrl=${encodeURIComponent(siteUrl)}&size=32`
  );

  try {
    const response = await fetch(faviconUrl);
    const blob = await response.blob();
    return blob.size === genericFaviconSize;
  } catch (e) {
    console.warn('[Favicon] Failed to check:', siteUrl, e);
    return false;
  }
}

/**
 * Identify favorites to suggest for cleanup
 * Prioritizes: 1) items with generic globe favicon, 2) least used items
 */
async function identifyJunkFavorites() {
  const state = await Storage.getState();

  if (state.favorites.length < 2) {
    return [];
  }

  // Calibrate once at the start
  await calibrateGenericFavicon();

  // Check for favorites with generic globe favicon
  const genericFaviconFavorites = [];
  for (const fav of state.favorites) {
    if (await hasGenericFavicon(fav.url)) {
      genericFaviconFavorites.push({
        ...fav,
        reason: 'no-favicon'
      });
    }
    // Limit to 2 for cleanup suggestion
    if (genericFaviconFavorites.length >= 2) break;
  }

  // If we found items with generic favicons, suggest those
  if (genericFaviconFavorites.length > 0) {
    return genericFaviconFavorites;
  }

  // Fallback: suggest least used items (last in the array)
  // Favorites array is ordered by usage: most used first, least used last
  const leastUsedItems = state.favorites.slice(-2);
  return leastUsedItems.map(fav => ({
    ...fav,
    reason: 'least-used'
  }));
}

/**
 * Identify problematic workspaces (empty or bloated)
 */
async function identifyProblematicWorkspaces() {
  const state = await Storage.getState();
  const problems = {
    empty: [],
    bloated: []
  };

  for (const [id, workspace] of Object.entries(state.workspaces)) {
    if (workspace.items.length === 0) {
      problems.empty.push({ id, ...workspace });
    } else if (workspace.items.length >= 15) {
      problems.bloated.push({ id, ...workspace, itemCount: workspace.items.length });
    }
  }

  return problems;
}

/**
 * Create the coach overlay element
 */
function createCoachOverlay() {
  const existing = document.getElementById('coach-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'coach-overlay';
  overlay.className = 'coach-overlay';
  document.body.appendChild(overlay);
  return overlay;
}

/**
 * Render progress dots
 */
function renderProgressDots(currentStep, totalSteps = 6) {
  let dots = '';
  for (let i = 0; i < totalSteps; i++) {
    let className = 'coach-dot';
    if (i < currentStep) className += ' completed';
    else if (i === currentStep) className += ' active';
    dots += `<span class="${className}"></span>`;
  }
  return `<div class="coach-progress">${dots}</div>`;
}

/**
 * Get favorite display name
 */
function getFavoriteName(fav) {
  if (fav.title) return fav.title;
  try {
    return new URL(fav.url).hostname.replace('www.', '');
  } catch {
    return 'this site';
  }
}

/**
 * Highlight a specific favorite
 */
function highlightFavorite(favoriteId) {
  // Remove existing highlights
  document.querySelectorAll('.fav-item.coach-target').forEach(el => {
    el.classList.remove('coach-target');
  });

  if (favoriteId) {
    const favEl = document.querySelector(`.fav-item[data-id="${favoriteId}"]`);
    if (favEl) {
      favEl.classList.add('coach-target');
    }
  }
}

/**
 * Highlight multiple favorites (for showing 2 options)
 */
function highlightFavorites(favoriteIds) {
  // Remove existing highlights
  document.querySelectorAll('.fav-item.coach-target').forEach(el => {
    el.classList.remove('coach-target');
  });

  for (const id of favoriteIds) {
    const favEl = document.querySelector(`.fav-item[data-id="${id}"]`);
    if (favEl) {
      favEl.classList.add('coach-target');
    }
  }
}

/**
 * Highlight the entire favorites grid
 */
function highlightFavoritesGrid() {
  const grid = document.querySelector('.favorites-grid');
  if (grid) {
    grid.classList.add('coach-highlight');
  }
}

/**
 * Highlight a workspace
 */
function highlightWorkspace(workspaceId) {
  // Remove existing workspace highlights
  document.querySelectorAll('.workspace.coach-target').forEach(el => {
    el.classList.remove('coach-target');
  });

  if (workspaceId) {
    const wsEl = document.querySelector(`.workspace[data-id="${workspaceId}"]`);
    if (wsEl) {
      wsEl.classList.add('coach-target');
      // Scroll into view
      wsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

/**
 * Clear all coach highlights
 */
function clearCoachHighlights() {
  document.querySelectorAll('.coach-target, .coach-highlight').forEach(el => {
    el.classList.remove('coach-target', 'coach-highlight');
  });
  // Also clear group header highlights
  document.querySelectorAll('.tab-group-header.coach-target').forEach(el => {
    el.classList.remove('coach-target');
  });
}

/**
 * Get the most used favorites (top of the grid = most used)
 * Returns [first, second] for smart switch demo
 */
async function getMostUsedFavorites() {
  const state = await Storage.getState();
  // Favorites are ordered by usage (top = most used)
  // We need at least 2 for the smart switch demo
  if (state.favorites.length >= 2) {
    return [state.favorites[0], state.favorites[1]];
  } else if (state.favorites.length === 1) {
    return [state.favorites[0], null];
  }
  return [null, null];
}

/**
 * Get workspace name for display
 */
function getWorkspaceName(workspace) {
  return workspace.emoji
    ? `${workspace.emoji} ${workspace.name}`
    : workspace.name;
}

// ========================================
// STEP RENDERERS
// ========================================

/**
 * Step 0: INTRO - "This is your Smart Grid"
 */
function showStepIntro(overlay, onNext, onSkip) {
  // Highlight the entire favorites grid
  highlightFavoritesGrid();

  overlay.innerHTML = `
    <div class="coach-card">
      ${renderProgressDots(0)}
      <div class="coach-content">
        <div class="coach-title">This is your Smart Grid</div>
        <div class="coach-subtitle">
          Your top 15 most-used sites and below are your workspaces from bookmarks.<br>
          <span style="opacity: 0.7; font-style: italic;">See anything that doesn't fit?</span>
        </div>
        <div class="coach-actions">
          <button class="coach-btn-primary" id="coach-next">Quick review</button>
          <button class="coach-btn-skip" id="coach-skip">Looks good</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('coach-next').addEventListener('click', () => {
    clearCoachHighlights();
    onNext();
  });
  document.getElementById('coach-skip').addEventListener('click', () => {
    clearCoachHighlights();
    onSkip();
  });
}

/**
 * Step 1: CLEANUP_FAVORITES - Give 2 specific options to remove
 */
async function showStepCleanupFavorites(overlay, onNext, onSkip) {
  const junkFavorites = await identifyJunkFavorites();
  coachFlowState.junkFavorites = junkFavorites;

  // If no junk favorites, skip to workspaces
  if (junkFavorites.length === 0) {
    onNext();
    return;
  }

  // Highlight the junk favorites
  highlightFavorites(junkFavorites.map(f => f.id));

  // Build the message based on detection reason
  let message = '';
  const name1 = getFavoriteName(junkFavorites[0]);
  const reason1 = junkFavorites[0].reason;

  if (junkFavorites.length === 1) {
    const reasonText = reason1 === 'no-favicon'
      ? 'Missing icon — might not belong.'
      : 'Least visited — might not need quick access.';
    message = `
      <strong>${name1}</strong><br>
      <span style="font-size: 11px; opacity: 0.7">${reasonText}</span><br>
      Right-click → Remove
    `;
  } else {
    const name2 = getFavoriteName(junkFavorites[1]);
    message = `
      Remove one that doesn't fit:<br>
      <strong>${name1}</strong> or <strong>${name2}</strong><br>
      <span style="font-size: 11px; opacity: 0.7">Right-click → Remove</span>
    `;
  }

  overlay.innerHTML = `
    <div class="coach-card">
      ${renderProgressDots(1)}
      <div class="coach-content">
        <div class="coach-title">Quick cleanup</div>
        <div class="coach-subtitle">${message}</div>
        <div class="coach-actions">
          <button class="coach-btn-primary" id="coach-next">Done</button>
          <button class="coach-btn-skip" id="coach-skip">Skip</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('coach-next').addEventListener('click', () => {
    clearCoachHighlights();
    coachFlowState.removedFavorites++;
    onNext();
  });
  document.getElementById('coach-skip').addEventListener('click', () => {
    clearCoachHighlights();
    onSkip();
  });
}

/**
 * Step 2: CLEANUP_MORE - "Want to remove more?"
 */
async function showStepCleanupMore(overlay, onContinue, onDone, onSkip) {
  // Check if there are still junk favorites
  const junkFavorites = await identifyJunkFavorites();

  // If no more junk, move on
  if (junkFavorites.length === 0) {
    onDone();
    return;
  }

  overlay.innerHTML = `
    <div class="coach-card">
      ${renderProgressDots(1)}
      <div class="coach-content">
        <div class="coach-title">Want to remove more?</div>
        <div class="coach-subtitle">
          We found ${junkFavorites.length} more that might not belong.
        </div>
        <div class="coach-actions">
          <button class="coach-btn-primary" id="coach-continue">Show me</button>
          <button class="coach-btn-skip" id="coach-done">I'm good, continue</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('coach-continue').addEventListener('click', onContinue);
  document.getElementById('coach-done').addEventListener('click', onDone);
}

/**
 * Step 3: CLEANUP_WORKSPACES - Remove empty workspaces
 */
async function showStepCleanupWorkspaces(overlay, onNext, onSkip) {
  const problems = await identifyProblematicWorkspaces();
  coachFlowState.emptyWorkspaces = problems.empty;

  // If no empty workspaces, skip
  if (problems.empty.length === 0) {
    onNext();
    return;
  }

  const firstEmpty = problems.empty[0];
  highlightWorkspace(firstEmpty.id);

  const wsName = getWorkspaceName(firstEmpty);
  const count = problems.empty.length;

  overlay.innerHTML = `
    <div class="coach-card">
      ${renderProgressDots(1)}
      <div class="coach-content">
        <div class="coach-title">Empty workspace${count > 1 ? 's' : ''}</div>
        <div class="coach-subtitle">
          <strong>${wsName}</strong> is empty${count > 1 ? ` (and ${count - 1} more)` : ''}.<br>
          Right-click → Delete to remove.
        </div>
        <div class="coach-actions">
          <button class="coach-btn-primary" id="coach-next">Done</button>
          <button class="coach-btn-skip" id="coach-skip">Keep them</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('coach-next').addEventListener('click', () => {
    clearCoachHighlights();
    onNext();
  });
  document.getElementById('coach-skip').addEventListener('click', () => {
    clearCoachHighlights();
    onSkip();
  });
}

/**
 * Step 4: Smart Switch - Click First (most used)
 */
async function showStepSmartSwitch1(overlay, onSkip) {
  const [firstFav, secondFav] = await getMostUsedFavorites();

  if (!firstFav) {
    // No favorites, skip smart switch demo
    return null;
  }

  // Store for later steps
  coachFlowState.firstFavoriteId = firstFav.id;
  coachFlowState.secondFavoriteId = secondFav?.id;
  coachFlowState.clickCount = 0;

  // Scroll to favorites section so user can see the highlighted item
  const favoritesSection = document.querySelector('.favorites-section');
  if (favoritesSection) {
    favoritesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  highlightFavorite(firstFav.id);

  const firstName = getFavoriteName(firstFav);

  overlay.innerHTML = `
    <div class="coach-card">
      ${renderProgressDots(2)}
      <div class="coach-content">
        <div class="coach-title">Now, the magic trick</div>
        <div class="coach-subtitle">
          Click on <strong>${firstName}</strong>
        </div>
        <div class="coach-waiting">
          <span class="coach-waiting-text coach-pulse">Waiting for click...</span>
        </div>
        <div class="coach-actions">
          <button class="coach-btn-skip" id="coach-skip">Skip</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('coach-skip').addEventListener('click', () => {
    clearCoachHighlights();
    onSkip();
  });

  return firstFav.id;
}

/**
 * Step 5: Smart Switch - Click Second
 */
async function showStepSmartSwitch2(overlay, onSkip) {
  const [firstFav, secondFav] = await getMostUsedFavorites();

  if (!secondFav) {
    // Only one favorite, can't do the full demo
    return null;
  }

  // Scroll to favorites section
  const favoritesSection = document.querySelector('.favorites-section');
  if (favoritesSection) {
    favoritesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  highlightFavorite(secondFav.id);

  const firstName = getFavoriteName(firstFav);
  const secondName = getFavoriteName(secondFav);

  overlay.innerHTML = `
    <div class="coach-card">
      ${renderProgressDots(2)}
      <div class="coach-content">
        <div class="coach-title">Good! Now click <strong>${secondName}</strong></div>
        <div class="coach-subtitle">
          <span style="font-size: 11px; opacity: 0.7">You just opened ${firstName}. Now let's switch.</span>
        </div>
        <div class="coach-waiting">
          <span class="coach-waiting-text coach-pulse">Waiting for click...</span>
        </div>
        <div class="coach-actions">
          <button class="coach-btn-skip" id="coach-skip">Skip</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('coach-skip').addEventListener('click', () => {
    clearCoachHighlights();
    onSkip();
  });

  return secondFav.id;
}

/**
 * Step 6: Smart Switch - Click First Again (the aha moment!)
 */
async function showStepSmartSwitch3(overlay, onSkip) {
  const state = await Storage.getState();
  const firstFav = state.favorites.find(f => f.id === coachFlowState.firstFavoriteId) || state.favorites[0];

  if (!firstFav) return null;

  // Scroll to favorites section
  const favoritesSection = document.querySelector('.favorites-section');
  if (favoritesSection) {
    favoritesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  highlightFavorite(firstFav.id);

  const firstName = getFavoriteName(firstFav);

  overlay.innerHTML = `
    <div class="coach-card">
      ${renderProgressDots(2)}
      <div class="coach-content">
        <div class="coach-title">Now click <strong>${firstName}</strong> again</div>
        <div class="coach-subtitle">
          <span style="font-size: 11px; opacity: 0.7">Watch carefully what happens...</span>
        </div>
        <div class="coach-waiting">
          <span class="coach-waiting-text coach-pulse">Waiting for click...</span>
        </div>
        <div class="coach-actions">
          <button class="coach-btn-skip" id="coach-skip">Skip</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('coach-skip').addEventListener('click', () => {
    clearCoachHighlights();
    onSkip();
  });

  return firstFav.id;
}

/**
 * Step 4b: Smart Switch Success Toast
 */
function showSmartSwitchSuccess(overlay, onNext) {
  clearCoachHighlights();

  overlay.innerHTML = `
    <div class="coach-card">
      ${renderProgressDots(2)}
      <div class="coach-content">
        <div class="coach-success">
          <div class="coach-success-icon">✓</div>
          <div class="coach-success-title">Same tab. No duplicate.</div>
          <div class="coach-success-subtitle">
            Horizontal tabs would've opened another one.
          </div>
        </div>
        <div class="coach-actions">
          <button class="coach-btn-primary" id="coach-next">Continue</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('coach-next').addEventListener('click', onNext);
}

/**
 * Step 7: Duplicate Tab - Shift+Click instruction
 */
async function showStepDuplicateTab(overlay, onSkip) {
  const state = await Storage.getState();
  const firstFav = state.favorites.find(f => f.id === coachFlowState.firstFavoriteId) || state.favorites[0];

  if (!firstFav) return null;

  // Scroll to favorites section
  const favoritesSection = document.querySelector('.favorites-section');
  if (favoritesSection) {
    favoritesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  highlightFavorite(firstFav.id);

  const firstName = getFavoriteName(firstFav);

  overlay.innerHTML = `
    <div class="coach-card">
      ${renderProgressDots(3, 7)}
      <div class="coach-content">
        <div class="coach-title">But what if you need two?</div>
        <div class="coach-subtitle">
          Hold <kbd>Shift</kbd> and click <strong>${firstName}</strong><br>
          <span style="font-size: 11px; opacity: 0.7">This opens a new tab for the same site.</span>
        </div>
        <div class="coach-waiting">
          <span class="coach-waiting-text coach-pulse">Shift + Click...</span>
        </div>
        <div class="coach-actions">
          <button class="coach-btn-skip" id="coach-skip">Skip</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('coach-skip').addEventListener('click', () => {
    clearCoachHighlights();
    onSkip();
  });

  return firstFav.id;
}

/**
 * Step 8: Chaos View - Show ungrouped tabs
 */
async function showStepChaosView(overlay, onNext, onSkip) {
  clearCoachHighlights();

  // Position overlay at top so user can see Open Tabs below
  overlay.classList.add('position-top');

  // Ensure grouping is OFF to show the chaos
  await Storage.setTabsGrouped(false);

  // Trigger UI refresh to show ungrouped state
  window.dispatchEvent(new CustomEvent('refresh-tabs'));

  // Scroll to Open Tabs section
  const openTabsSection = document.querySelector('#open-tabs-section');
  if (openTabsSection) {
    openTabsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  overlay.innerHTML = `
    <div class="coach-card">
      ${renderProgressDots(4, 7)}
      <div class="coach-content">
        <div class="coach-title">This is your tab bar normally</div>
        <div class="coach-subtitle">
          Two tabs of the same site, scattered.<br>
          <span style="font-size: 11px; opacity: 0.7">Imagine 40 of these...</span>
        </div>
        <div class="coach-actions">
          <button class="coach-btn-primary" id="coach-next">Show me the fix</button>
          <button class="coach-btn-skip" id="coach-skip">Skip</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('coach-next').addEventListener('click', onNext);
  document.getElementById('coach-skip').addEventListener('click', onSkip);
}

/**
 * Step 9: Magic Moment - Group the tabs
 */
async function showStepMagicMoment(overlay, onNext, onSkip) {
  // Keep overlay at top
  overlay.classList.add('position-top');

  // Enable grouping - the magic transformation
  await Storage.setTabsGrouped(true);

  // Trigger UI refresh to show grouped state
  window.dispatchEvent(new CustomEvent('refresh-tabs'));

  // Wait for async refresh to complete (event listener is async)
  await new Promise(resolve => setTimeout(resolve, 500));

  // Scroll to Open Tabs section
  const openTabsSection = document.querySelector('#open-tabs-section');
  if (openTabsSection) {
    openTabsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  overlay.innerHTML = `
    <div class="coach-card">
      ${renderProgressDots(5, 7)}
      <div class="coach-content">
        <div class="coach-success">
          <div class="coach-success-icon">✨</div>
          <div class="coach-success-title">Same site, one group</div>
          <div class="coach-success-subtitle">
            Automatically organized.
          </div>
        </div>
        <div class="coach-actions">
          <button class="coach-btn-primary" id="coach-next">Continue</button>
          <button class="coach-btn-skip" id="coach-skip">Skip</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('coach-next').addEventListener('click', onNext);
  document.getElementById('coach-skip').addEventListener('click', onSkip);
}

/**
 * Step 10: Grouping Try - Interactive expand/collapse
 */
async function showStepGroupingTry(overlay, onComplete, onSkip) {
  // Keep overlay at top
  overlay.classList.add('position-top');

  // Scroll to Open Tabs section
  const openTabsSection = document.querySelector('#open-tabs-section');
  if (openTabsSection) {
    openTabsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Highlight a group header in Open Tabs (if any)
  const groupHeader = document.querySelector('.tab-group-header');
  if (groupHeader) {
    groupHeader.classList.add('coach-target');
  }

  overlay.innerHTML = `
    <div class="coach-card" id="grouping-try-card">
      ${renderProgressDots(6, 7)}
      <div class="coach-content">
        <div class="coach-title">Try it yourself</div>
        <div class="coach-subtitle">
          Click the group to expand and collapse.
        </div>
        <div class="coach-waiting">
          <span class="coach-waiting-text coach-pulse">Click the group...</span>
        </div>
        <div class="coach-actions">
          <button class="coach-btn-skip" id="coach-skip">Skip</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('coach-skip').addEventListener('click', () => {
    clearCoachHighlights();
    onSkip();
  });

  // Store callback for when user clicks group
  coachFlowState.onGroupClicked = () => {
    showGroupingSuccess(overlay, onComplete);
  };
}

/**
 * Step 10b: Grouping Success - shown after user clicks group
 */
function showGroupingSuccess(overlay, onComplete) {
  clearCoachHighlights();
  // Keep overlay at top
  overlay.classList.add('position-top');

  overlay.innerHTML = `
    <div class="coach-card">
      ${renderProgressDots(6, 7)}
      <div class="coach-content">
        <div class="coach-success">
          <div class="coach-success-icon">✓</div>
          <div class="coach-success-title">No more tab chaos</div>
          <div class="coach-success-subtitle">
            40 tabs? Still organized.
          </div>
        </div>
        <div class="coach-actions">
          <button class="coach-btn-primary" id="coach-done">Done</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('coach-done').addEventListener('click', onComplete);
}

/**
 * Old Step 7: Tab Grouping (now replaced by new flow, kept for reference)
 */
async function showStepGroupingOld(overlay, onNext, onSkip) {
  const { tabCount, hasDuplicates } = await checkExistingTabChaos();

  let message = '';
  if (hasDuplicates) {
    message = 'Look at your Open Tabs below — tabs from the same site are grouped together.';
  } else if (tabCount >= 3) {
    message = 'When you have multiple tabs from the same site, they\'ll be grouped together.';
  } else {
    message = 'As you browse, tabs from the same site will be automatically grouped.';
  }

  overlay.innerHTML = `
    <div class="coach-card">
      ${renderProgressDots(3)}
      <div class="coach-content">
        <div class="coach-title">Tabs stay organized</div>
        <div class="coach-subtitle">
          ${message}<br>
          <span style="font-size: 11px; opacity: 0.7">No more hunting through 40 identical tabs.</span>
        </div>
        <div class="coach-actions">
          <button class="coach-btn-primary" id="coach-next">Got it</button>
          <button class="coach-btn-skip" id="coach-skip">Skip</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('coach-next').addEventListener('click', onNext);
  document.getElementById('coach-skip').addEventListener('click', onSkip);
}

/**
 * Step 11: Hide Tab Bar - Platform-specific instructions
 */
function showStepHideTabBar(overlay, onNext, onSkip) {
  // Move overlay back to bottom for final steps
  overlay.classList.remove('position-top');

  chrome.runtime.getPlatformInfo((info) => {
    const platform = info?.os;
    const isMac = platform === 'mac';
    const isChromeOS = platform === 'cros';

    let instructions;

    if (isMac) {
      instructions = `
        <div class="coach-subtitle">
          For a cleaner look, hide the tab bar:
        </div>
        <div class="coach-steps-list">
          <div class="coach-step-item">
            <span class="coach-step-num">1</span>
            <span>Enter full screen mode</span>
          </div>
          <div class="coach-step-item">
            <span class="coach-step-num">2</span>
            <span>Menu → <strong>View</strong> → Uncheck <strong>"Always Show Toolbar in Full Screen"</strong></span>
          </div>
        </div>
      `;
    } else if (isChromeOS) {
      instructions = `
        <div class="coach-subtitle">
          For a cleaner look, go full screen:
        </div>
        <div class="coach-steps-list">
          <div class="coach-step-item">
            <span class="coach-step-num">1</span>
            <span>Press <kbd>⎋</kbd> (Fullscreen key) or <kbd>F4</kbd></span>
          </div>
          <div class="coach-step-item">
            <span class="coach-step-num">2</span>
            <span>The tab bar hides automatically in full screen</span>
          </div>
        </div>
      `;
    } else {
      // Windows / Linux
      instructions = `
        <div class="coach-subtitle">
          For a cleaner look, hide the tab bar:
        </div>
        <div class="coach-steps-list">
          <div class="coach-step-item">
            <span class="coach-step-num">1</span>
            <span>Press <kbd>F11</kbd> for full screen</span>
          </div>
        </div>
      `;
    }

    overlay.innerHTML = `
      <div class="coach-card">
        ${renderProgressDots(6, 8)}
        <div class="coach-content">
          <div class="coach-title">Go immersive</div>
          ${instructions}
          <div class="coach-actions">
            <button class="coach-btn-primary" id="coach-next">Next</button>
            <button class="coach-btn-skip" id="coach-skip">Skip</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('coach-next').addEventListener('click', onNext);
    document.getElementById('coach-skip').addEventListener('click', onSkip);
  });
}

/**
 * Step 12: Immersive Hint - Shortcut key to toggle panel
 */
function showStepImmersiveHint(overlay, onDone, onSkip) {
  chrome.runtime.getPlatformInfo((info) => {
    const isMac = info?.os === 'mac';
    const modifierKey = isMac ? '⌘' : 'Ctrl';

    overlay.innerHTML = `
      <div class="coach-card">
        ${renderProgressDots(7, 8)}
        <div class="coach-content">
          <div class="coach-title">Toggle this panel anytime</div>
          <div class="coach-subtitle">
            Show or hide with:
          </div>
          <div class="coach-keys">
            <span class="coach-key">${modifierKey}</span>
            <span class="coach-key">Shift</span>
            <span class="coach-key">E</span>
          </div>
          <div class="coach-subtitle" style="margin-top: 8px; font-size: 11px; opacity: 0.7">
            Hide it when you need space. Summon it when you need to switch.
          </div>
          <div class="coach-actions">
            <button class="coach-btn-primary" id="coach-done">Got it!</button>
            <button class="coach-btn-skip" id="coach-skip">Skip</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('coach-done').addEventListener('click', onDone);
    document.getElementById('coach-skip').addEventListener('click', onSkip);
  });
}

/**
 * Step 13: Complete - Celebration!
 */
function showStepComplete(overlay, onDone) {
  overlay.innerHTML = `
    <div class="coach-card">
      ${renderProgressDots(8, 8)}
      <div class="coach-content">
        <div class="coach-success">
          <div class="coach-success-icon">🎉</div>
          <div class="coach-success-title">You're all set!</div>
          <div class="coach-success-subtitle">
            Same key to hide. Same key to summon.<br>
            That's your new workflow.
          </div>
        </div>
        <div class="coach-actions">
          <button class="coach-btn-primary" id="coach-done">Got it</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('coach-done').addEventListener('click', onDone);
}

/**
 * Dismiss the coach with animation
 */
function dismissCoach(overlay, callback) {
  const card = overlay.querySelector('.coach-card');
  if (card) {
    card.classList.add('exiting');
    setTimeout(() => {
      overlay.remove();
      if (callback) callback();
    }, 200);
  } else {
    overlay.remove();
    if (callback) callback();
  }
}

/**
 * Main coach flow controller
 */
async function startPostOnboardingCoach() {
  const shouldShow = await shouldShowCoach();
  if (!shouldShow) {
    console.log('[Coach] Already completed or skipped');
    return;
  }

  let coachState = await getCoachState();
  const overlay = createCoachOverlay();

  const skip = async () => {
    coachState.skipped = true;
    await setCoachState(coachState);
    clearCoachHighlights();
    dismissCoach(overlay);
  };

  const complete = async () => {
    coachState.completed = true;
    await setCoachState(coachState);
    clearCoachHighlights();
    dismissCoach(overlay);
  };

  const goToStep = async (step) => {
    coachState.currentStep = step;
    await setCoachState(coachState);
    renderCurrentStep();
  };

  const renderCurrentStep = async () => {
    const step = coachState.currentStep;

    switch (step) {
      case COACH_STEPS.INTRO:
        showStepIntro(overlay, () => goToStep(COACH_STEPS.CLEANUP_FAVORITES), skip);
        break;

      case COACH_STEPS.CLEANUP_FAVORITES:
        await showStepCleanupFavorites(
          overlay,
          () => {
            // If we've already shown "Want to remove more?", go directly to workspaces
            if (coachFlowState.cleanupMoreShown) {
              goToStep(COACH_STEPS.CLEANUP_WORKSPACES);
            } else {
              goToStep(COACH_STEPS.CLEANUP_MORE);
            }
          },
          skip
        );
        break;

      case COACH_STEPS.CLEANUP_MORE:
        await showStepCleanupMore(
          overlay,
          () => {
            // "Show me" → mark shown, go back to show 2 more items
            coachFlowState.cleanupMoreShown = true;
            goToStep(COACH_STEPS.CLEANUP_FAVORITES);
          },
          () => goToStep(COACH_STEPS.CLEANUP_WORKSPACES), // "I'm good" → go to workspaces
          skip
        );
        break;

      case COACH_STEPS.CLEANUP_WORKSPACES:
        await showStepCleanupWorkspaces(
          overlay,
          () => goToStep(COACH_STEPS.SMART_SWITCH_1),
          () => goToStep(COACH_STEPS.SMART_SWITCH_1) // Skip also goes to smart switch
        );
        break;

      case COACH_STEPS.SMART_SWITCH_1:
        await showStepSmartSwitch1(overlay, skip);
        break;

      case COACH_STEPS.SMART_SWITCH_2:
        await showStepSmartSwitch2(overlay, skip);
        break;

      case COACH_STEPS.SMART_SWITCH_3:
        await showStepSmartSwitch3(overlay, skip);
        break;

      case COACH_STEPS.DUPLICATE_TAB:
        await showStepDuplicateTab(overlay, skip);
        break;

      case COACH_STEPS.CHAOS_VIEW:
        await showStepChaosView(
          overlay,
          () => goToStep(COACH_STEPS.MAGIC_MOMENT),
          skip
        );
        break;

      case COACH_STEPS.MAGIC_MOMENT:
        await showStepMagicMoment(
          overlay,
          () => goToStep(COACH_STEPS.GROUPING_TRY),
          skip
        );
        break;

      case COACH_STEPS.GROUPING_TRY:
        await showStepGroupingTry(
          overlay,
          () => goToStep(COACH_STEPS.HIDE_TAB_BAR),
          skip
        );
        break;

      case COACH_STEPS.HIDE_TAB_BAR:
        showStepHideTabBar(
          overlay,
          () => goToStep(COACH_STEPS.IMMERSIVE_HINT),
          skip
        );
        break;

      case COACH_STEPS.IMMERSIVE_HINT:
        showStepImmersiveHint(
          overlay,
          () => goToStep(COACH_STEPS.COMPLETE),
          () => goToStep(COACH_STEPS.COMPLETE) // Skip goes to complete
        );
        break;

      case COACH_STEPS.COMPLETE:
        showStepComplete(overlay, complete);
        break;
    }
  };

  renderCurrentStep();
}

/**
 * Called when panel visibility changes
 * (No longer used for coach flow, but kept for potential future use)
 */
async function onPanelVisibilityChanged(isVisible) {
  // Currently not used - immersive hint is just informational
  // Could be used for analytics or future features
}

/**
 * Called when user clicks a favorite
 */
async function onFavoriteClicked(favoriteId) {
  const coachState = await getCoachState();

  if (coachState.completed || coachState.skipped) return;

  const step = coachState.currentStep;

  if (step === COACH_STEPS.SMART_SWITCH_1) {
    // First click done, go to second
    coachFlowState.clickCount = 1;
    coachState.currentStep = COACH_STEPS.SMART_SWITCH_2;
    await setCoachState(coachState);
    setTimeout(() => startPostOnboardingCoach(), 300);

  } else if (step === COACH_STEPS.SMART_SWITCH_2) {
    // Second click done, go to third
    coachFlowState.clickCount = 2;
    coachState.currentStep = COACH_STEPS.SMART_SWITCH_3;
    await setCoachState(coachState);
    setTimeout(() => startPostOnboardingCoach(), 300);

  } else if (step === COACH_STEPS.SMART_SWITCH_3) {
    // Third click (back to first) - this is the aha moment!
    coachFlowState.clickCount = 3;
    coachState.smartSwitchDone = true;

    // Show success, then move to DUPLICATE_TAB step (new flow)
    const overlay = document.getElementById('coach-overlay');
    if (overlay) {
      showSmartSwitchSuccess(overlay, async () => {
        coachState.currentStep = COACH_STEPS.DUPLICATE_TAB;
        await setCoachState(coachState);
        startPostOnboardingCoach();
      });
    }
  }
}

/**
 * Called when user Shift+Clicks a favorite (creates duplicate)
 * Now used in the DUPLICATE_TAB step of the coach flow
 */
async function onDuplicateCreated() {
  const coachState = await getCoachState();

  if (coachState.completed || coachState.skipped) return;

  const step = coachState.currentStep;

  if (step === COACH_STEPS.DUPLICATE_TAB) {
    // User created a duplicate - move to chaos view
    console.log('[Coach] Duplicate created via Shift+Click - advancing to chaos view');
    coachState.currentStep = COACH_STEPS.CHAOS_VIEW;
    await setCoachState(coachState);
    setTimeout(() => startPostOnboardingCoach(), 500);
  }
}

/**
 * Called when user clicks a group header in Open Tabs
 * Used in the GROUPING_TRY step
 */
async function onGroupHeaderClicked() {
  const coachState = await getCoachState();

  if (coachState.completed || coachState.skipped) return;

  const step = coachState.currentStep;

  if (step === COACH_STEPS.GROUPING_TRY) {
    // User clicked the group - show success
    if (coachFlowState.onGroupClicked) {
      coachFlowState.onGroupClicked();
    }
  }
}

// Export for use in sidepanel.js
window.PostOnboardingCoach = {
  start: startPostOnboardingCoach,
  onPanelVisibilityChanged,
  onFavoriteClicked,
  onDuplicateCreated,
  onGroupHeaderClicked,
  shouldShowCoach
};
