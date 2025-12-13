// Tab Grouping Feature
// Handles automatic tab grouping by domain

/**
 * Get grouping key for a URL
 * Handles special cases like docs.google.com where Docs/Sheets/Slides should be separate
 * @param {string} url - The URL to get grouping key for
 * @returns {string} - Grouping key (usually hostname, but more specific for certain domains)
 */
function getGroupingKey(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Special handling for docs.google.com (Docs, Sheets, Slides, Forms)
    if (hostname === 'docs.google.com') {
      const appType = urlObj.pathname.split('/')[1];
      if (appType) {
        // Return friendly names for display
        const appNames = {
          'document': 'Google Docs',
          'spreadsheets': 'Google Sheets',
          'presentation': 'Google Slides',
          'forms': 'Google Forms'
        };
        return appNames[appType] || hostname;
      }
    }

    return hostname;
  } catch {
    return url;
  }
}

/**
 * Analyze tabs to determine if grouping banner should be shown
 * @param {Array} tabs - List of chrome tabs
 * @param {Object} groupingState - Current grouping state from storage
 * @returns {Object} - { shouldShow, stats }
 */
function shouldShowGroupingBanner(tabs, groupingState) {
  // Don't show if already grouped
  if (groupingState.isGrouped) {
    return { shouldShow: false, stats: null };
  }

  // Don't show if banner was dismissed
  if (groupingState.bannerDismissed) {
    return { shouldShow: false, stats: null };
  }

  // Filter out chrome:// and edge:// URLs
  const validTabs = tabs.filter(tab =>
    tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')
  );

  // Check: Must have 5+ tabs
  if (validTabs.length < 5) {
    return { shouldShow: false, stats: null };
  }

  // Group tabs by domain (with special handling for Google apps)
  const domainGroups = {};
  validTabs.forEach(tab => {
    try {
      const groupKey = getGroupingKey(tab.url);
      if (!domainGroups[groupKey]) {
        domainGroups[groupKey] = [];
      }
      domainGroups[groupKey].push(tab);
    } catch (e) {
      // Skip invalid URLs
    }
  });

  // Find domains with 2+ tabs
  const domainsWithMultipleTabs = Object.values(domainGroups).filter(
    group => group.length >= 2
  );

  // Check: Must have at least 1 domain with 2+ tabs
  if (domainsWithMultipleTabs.length < 1) {
    return { shouldShow: false, stats: null };
  }

  // Calculate stats for banner
  const stats = {
    totalTabs: validTabs.length,
    groupableGroups: domainsWithMultipleTabs.length,
    domainGroups: domainGroups
  };

  return { shouldShow: true, stats };
}

/**
 * Group tabs by domain
 * @param {Array} tabs - List of chrome tabs
 * @returns {Object} - { groups, singles }
 */
function groupTabsByDomain(tabs) {
  // Filter out chrome:// and edge:// URLs
  const validTabs = tabs.filter(tab =>
    tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')
  );

  // Group by domain (with special handling for Google apps)
  const domainGroups = {};
  validTabs.forEach(tab => {
    try {
      const groupKey = getGroupingKey(tab.url);
      if (!domainGroups[groupKey]) {
        domainGroups[groupKey] = {
          domain: groupKey,
          tabs: [],
          collapsed: false // Start expanded
        };
      }
      domainGroups[groupKey].tabs.push(tab);
    } catch (e) {
      // Skip invalid URLs
    }
  });

  // Separate groups (2+ tabs) from singles (1 tab)
  const groups = [];
  const singles = [];

  Object.values(domainGroups).forEach(group => {
    if (group.tabs.length >= 2) {
      groups.push(group);
    } else {
      singles.push(...group.tabs);
    }
  });

  // Sort groups by tab count (largest first)
  groups.sort((a, b) => b.tabs.length - a.tabs.length);

  // Collapse all groups except the largest
  if (groups.length > 1) {
    for (let i = 1; i < groups.length; i++) {
      groups[i].collapsed = true;
    }
  }

  return { groups, singles };
}

/**
 * Render grouping banner UI
 * @param {Object} stats - Stats from shouldShowGroupingBanner
 * @param {Function} onGroup - Callback when group button is clicked
 * @param {Function} onDismiss - Callback when dismiss button is clicked
 * @returns {HTMLElement}
 */
function createGroupingBanner(stats, onGroup, onDismiss) {
  const banner = document.createElement('div');
  banner.className = 'grouping-banner';
  banner.innerHTML = `
    <div class="grouping-banner-header">
      <span class="grouping-banner-icon">✨</span>
      <span class="grouping-banner-title">Tabs are scattered</span>
      <button class="grouping-banner-dismiss" aria-label="Dismiss" title="Dismiss">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <p class="grouping-banner-description">
      You have multiple tabs from the same sites. Group them for easier navigation.
    </p>
    <button class="grouping-banner-group-btn">
      📊 Group tabs
    </button>
  `;

  // Event listeners
  banner.querySelector('.grouping-banner-group-btn').addEventListener('click', onGroup);
  banner.querySelector('.grouping-banner-dismiss').addEventListener('click', onDismiss);

  return banner;
}

/**
 * Render dismissed tooltip
 * @param {Function} onClose - Callback when tooltip is closed
 * @returns {HTMLElement}
 */
function createDismissedTooltip(onClose) {
  const tooltip = document.createElement('div');
  tooltip.className = 'grouping-dismissed-tooltip';
  tooltip.innerHTML = `
    <div class="grouping-dismissed-tooltip-header">
      <span class="grouping-dismissed-tooltip-icon">💡</span>
      <span class="grouping-dismissed-tooltip-title">Banner hidden</span>
      <button class="grouping-dismissed-tooltip-close" aria-label="Close" title="Close">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <p class="grouping-dismissed-tooltip-description">
      You can always group tabs from Settings (⚙️) → "Group tabs by site"
    </p>
  `;

  // Event listener
  tooltip.querySelector('.grouping-dismissed-tooltip-close').addEventListener('click', onClose);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (tooltip.parentElement) {
      tooltip.remove();
      if (onClose) onClose();
    }
  }, 5000);

  return tooltip;
}

/**
 * Render small fallback grouping button
 * @param {number} tabCount - Total number of tabs
 * @param {Function} onGroup - Callback when group button is clicked
 * @returns {HTMLElement}
 */
function createSmallGroupButton(tabCount, onGroup) {
  const button = document.createElement('div');
  button.className = 'grouping-small-button';
  button.innerHTML = `
    <span class="grouping-small-button-text">${tabCount} tabs open</span>
    <button class="grouping-small-button-action">📊 Group</button>
  `;

  button.querySelector('.grouping-small-button-action').addEventListener('click', onGroup);

  return button;
}

/**
 * Render grouped tabs UI
 * @param {Object} groupedData - Result from groupTabsByDomain
 * @param {Function} onTabClick - Callback when tab is clicked
 * @param {Function} onGroupToggle - Callback when group is toggled
 * @param {Function} onGroupClose - Callback when group close is clicked
 * @param {Function} onTabClose - Callback when tab close is clicked
 * @param {Function} onTabNav - Callback for back/forward navigation
 * @param {Function} onTabRename - Callback for tab rename
 * @param {Object} tabAliases - Tab aliases from state
 * @returns {HTMLElement}
 */
function renderGroupedTabs(groupedData, callbacks, tabAliases = {}) {
  const container = document.createElement('div');
  container.className = 'grouped-tabs-container';

  // Render groups
  groupedData.groups.forEach(group => {
    const groupEl = document.createElement('div');
    groupEl.className = `tab-group ${group.collapsed ? 'collapsed' : ''}`;
    groupEl.dataset.domain = group.domain;

    // Group header
    const header = document.createElement('div');
    header.className = 'tab-group-header';
    header.innerHTML = `
      <svg class="tab-group-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M5 10L9 7L5 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="tab-group-domain">${escapeHtml(group.domain)}</span>
      <span class="tab-group-count">(${group.tabs.length})</span>
      <button class="tab-group-close" title="Close all tabs in group">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    `;

    // Toggle collapse on header click
    header.addEventListener('click', (e) => {
      if (e.target.closest('.tab-group-close')) return;
      group.collapsed = !group.collapsed;
      groupEl.classList.toggle('collapsed');
      if (callbacks.onGroupToggle) callbacks.onGroupToggle(group.domain, group.collapsed);
      // Notify coach of group header click (for onboarding)
      if (window.PostOnboardingCoach && window.PostOnboardingCoach.onGroupHeaderClicked) {
        window.PostOnboardingCoach.onGroupHeaderClicked();
      }
    });

    // Close all tabs in group
    header.querySelector('.tab-group-close').addEventListener('click', (e) => {
      e.stopPropagation();
      if (callbacks.onGroupClose) callbacks.onGroupClose(group.tabs);
    });

    groupEl.appendChild(header);

    // Group content (tabs) - always render, CSS handles visibility
    const content = document.createElement('div');
    content.className = 'tab-group-content';

    group.tabs.forEach(tab => {
      const tabEl = createTabElement(tab, callbacks, tabAliases);
      content.appendChild(tabEl);
    });

    groupEl.appendChild(content);

    container.appendChild(groupEl);
  });

  // Render singles section
  if (groupedData.singles.length > 0) {
    const singlesSection = document.createElement('div');
    singlesSection.className = 'tab-singles-section';

    const divider = document.createElement('div');
    divider.className = 'tab-singles-divider';
    singlesSection.appendChild(divider);

    const label = document.createElement('div');
    label.className = 'tab-singles-label';
    label.textContent = `Singles (${groupedData.singles.length})`;
    singlesSection.appendChild(label);

    groupedData.singles.forEach(tab => {
      const tabEl = createTabElement(tab, callbacks, tabAliases);
      singlesSection.appendChild(tabEl);
    });

    container.appendChild(singlesSection);
  }

  return container;
}

/**
 * Create a tab element (used in both groups and singles)
 */
function createTabElement(tab, callbacks, tabAliases) {
  const alias = tabAliases?.[tab.id] || null;
  const displayTitle = alias || tab.title;
  const isActive = tab.active;

  const tabEl = document.createElement('div');
  tabEl.className = `tab-item ${isActive ? 'active' : ''}`;
  tabEl.dataset.tabId = tab.id;

  tabEl.innerHTML = `
    <div class="tab-item-icon">${createFaviconElement(tab.url, 18).outerHTML}</div>
    <div class="tab-item-title" title="${escapeHtml(tab.title)}">${escapeHtml(displayTitle)}</div>
    <div class="tab-item-actions">
      <div class="tab-status-indicator"></div>
      <div class="tab-nav-controls">
        <button class="tab-nav-btn" data-action="back" data-tab-id="${tab.id}" title="Go back">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7L9 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="tab-nav-btn" data-action="forward" data-tab-id="${tab.id}" title="Go forward">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3L9 7L5 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="tab-nav-btn tab-close-btn" data-action="close" data-tab-id="${tab.id}" title="Close tab">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Click to activate tab
  tabEl.addEventListener('click', (e) => {
    if (e.target.closest('.tab-nav-controls')) return;
    if (callbacks.onTabClick) callbacks.onTabClick(tab.id);
  });

  // Right-click to rename
  tabEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (callbacks.onTabRename) callbacks.onTabRename(tab.id);
  });

  // Tab navigation buttons
  tabEl.querySelectorAll('.tab-nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const tabId = parseInt(btn.dataset.tabId);
      if (callbacks.onTabNav) callbacks.onTabNav(action, tabId);
    });
  });

  return tabEl;
}

/**
 * Render ungroup button
 * @param {Function} onUngroup - Callback when ungroup is clicked
 * @returns {HTMLElement}
 */
function createUngroupButton(onUngroup) {
  const button = document.createElement('button');
  button.className = 'ungroup-btn';
  button.title = 'Ungroup all tabs';
  button.textContent = '↩️ Ungroup';
  button.addEventListener('click', onUngroup);
  return button;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
