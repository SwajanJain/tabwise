// UI Components and Helpers

// Favicon helper - uses Chrome's cached favicons
function getFaviconUrl(url) {
  try {
    return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`;
  } catch {
    return null;
  }
}

function getDomainInitial(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.charAt(0).toUpperCase();
  } catch {
    return '?';
  }
}

// ========================================
// GENERIC FAVICON (GLOBE) DETECTION
// ========================================

// Cache for generic favicon detection
let genericFaviconData = null; // ArrayBuffer of generic globe
let calibrationPromise = null;

// Track favorites that need favicon refresh after tab loads
const pendingFaviconRefresh = new Set();

/**
 * Calibrate the generic globe favicon (runs once)
 * Chrome returns a gray globe icon for sites without cached favicons.
 * We detect this by fetching a known non-existent URL and storing its data.
 */
async function calibrateGenericFavicon() {
  if (calibrationPromise) return calibrationPromise;

  calibrationPromise = (async () => {
    try {
      const dummyUrl = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent('https://no-favicon.invalid/')}&size=32`;
      const response = await fetch(dummyUrl);
      const blob = await response.blob();
      genericFaviconData = await blob.arrayBuffer();
      console.log('[Favicon] Calibrated generic globe, size:', genericFaviconData.byteLength);
    } catch (e) {
      console.error('[Favicon] Calibration failed:', e);
      genericFaviconData = null;
    }
  })();

  return calibrationPromise;
}

/**
 * Compare two ArrayBuffers for equality
 */
function arrayBuffersEqual(buf1, buf2) {
  if (buf1.byteLength !== buf2.byteLength) return false;
  const view1 = new Uint8Array(buf1);
  const view2 = new Uint8Array(buf2);
  for (let i = 0; i < view1.length; i++) {
    if (view1[i] !== view2[i]) return false;
  }
  return true;
}

/**
 * Check if a favicon URL returns the generic globe icon
 * @param {string} url - The site URL to check
 * @returns {Promise<boolean>} - True if it's the generic globe
 */
async function isGenericFavicon(url) {
  if (genericFaviconData === null) {
    await calibrateGenericFavicon();
  }

  // Calibration failed, can't detect
  if (genericFaviconData === null) return false;

  try {
    const faviconUrl = getFaviconUrl(url);
    const response = await fetch(faviconUrl);
    const blob = await response.blob();
    const data = await blob.arrayBuffer();

    // Compare actual data, not just size
    return arrayBuffersEqual(data, genericFaviconData);
  } catch {
    return true; // Fetch failed, treat as generic
  }
}

/**
 * Mark a favorite for favicon refresh after its tab loads
 * @param {string} favoriteId - The favorite ID
 * @param {string} url - The favorite URL (to match with tab)
 */
function markFaviconForRefresh(favoriteId, url) {
  pendingFaviconRefresh.add(JSON.stringify({ favoriteId, url }));
  console.log('[Favicon] Marked for refresh:', favoriteId);
}

/**
 * Check if a URL has a pending favicon refresh
 * @param {string} url - The URL to check
 * @returns {Object|null} - The pending item or null
 */
function getPendingFaviconRefresh(url) {
  for (const item of pendingFaviconRefresh) {
    const parsed = JSON.parse(item);
    try {
      // Match by hostname to handle URL variations
      const pendingHost = new URL(parsed.url).hostname;
      const checkHost = new URL(url).hostname;
      if (pendingHost === checkHost) {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Remove a favorite from pending refresh
 * @param {string} favoriteId - The favorite ID to remove
 */
function clearPendingFaviconRefresh(favoriteId) {
  for (const item of pendingFaviconRefresh) {
    const parsed = JSON.parse(item);
    if (parsed.favoriteId === favoriteId) {
      pendingFaviconRefresh.delete(item);
      console.log('[Favicon] Cleared pending refresh:', favoriteId);
      break;
    }
  }
}

/**
 * Initialize favicon detection (call on extension load)
 */
function initFaviconDetection() {
  calibrateGenericFavicon();
}

// Create favicon element
function createFaviconElement(url, size = 20, customIcon = null) {
  const container = document.createElement('div');
  container.className = 'workspace-item-icon';

  const faviconUrl = customIcon || getFaviconUrl(url);

  if (faviconUrl) {
    const img = document.createElement('img');
    img.src = faviconUrl;
    img.onerror = () => {
      container.innerHTML = `<div class="fallback-icon">${getDomainInitial(url)}</div>`;
    };
    container.appendChild(img);
  } else {
    container.innerHTML = `<div class="fallback-icon">${getDomainInitial(url)}</div>`;
  }

  return container;
}

// Favorites Grid Component
class FavoritesGrid {
  constructor(container, state, onAdd, onRemove, onClick, tabStates = {}) {
    this.container = container;
    this.state = state;
    this.onAdd = onAdd;
    this.onRemove = onRemove;
    this.onClick = onClick;
    this.tabStates = tabStates;
  }

  render() {
    this.container.innerHTML = '';

    // Render favorite items
    this.state.favorites.forEach(fav => {
      const item = document.createElement('button');
      item.className = 'fav-item';
      item.title = fav.title || new URL(fav.url).hostname;
      item.dataset.id = fav.id;

      // Add indicator classes based on tab state
      const tabState = this.tabStates[fav.id];
      if (tabState) {
        if (tabState.isActive) {
          item.classList.add('is-active');
        } else if (tabState.tabCount > 1) {
          item.classList.add('has-multiple-tabs');
          item.setAttribute('data-tab-count', tabState.tabCount);
        } else if (tabState.tabCount === 1) {
          item.classList.add('is-open');
        }
      }

      const faviconUrl = getFaviconUrl(fav.url);

      const img = document.createElement('img');
      img.src = faviconUrl;
      img.onerror = () => {
        item.innerHTML = `<div class="fallback-icon">${getDomainInitial(fav.url)}</div>`;
      };

      item.appendChild(img);

      // Add close button
      const closeBtn = document.createElement('div');
      closeBtn.className = 'close-btn';
      closeBtn.innerHTML = `
        <svg viewBox="0 0 10 10" fill="none">
          <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      `;
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showConfirmDialog({
          title: 'Remove Favorite?',
          message: `Remove "${fav.title || new URL(fav.url).hostname}" from favorites?<br><br>You can always add it back later.`,
          confirmText: 'Remove',
          cancelText: 'Cancel',
          danger: true,
          onConfirm: () => this.onRemove(fav.id)
        });
      });
      item.appendChild(closeBtn);

      item.addEventListener('click', (e) => this.onClick(fav, null, e));

      // Right-click for context menu
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, [
          {
            label: 'Open in new tab',
            onClick: () => this.onClick(fav, 'new-tab')
          },
          { divider: true },
          {
            label: 'Remove from favorites',
            onClick: () => {
              showConfirmDialog({
                title: 'Remove Favorite?',
                message: `Remove "${fav.title || new URL(fav.url).hostname}" from favorites?<br><br>You can always add it back later.`,
                confirmText: 'Remove',
                cancelText: 'Cancel',
                danger: true,
                onConfirm: () => this.onRemove(fav.id)
              });
            },
            danger: true
          }
        ]);
      });

      this.container.appendChild(item);
    });

    // Add button - always visible as last item
    const addBtn = document.createElement('button');
    addBtn.className = 'fav-add-btn';
    addBtn.title = 'Add favorite';
    addBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `;
    addBtn.addEventListener('click', this.onAdd);
    this.container.appendChild(addBtn);
  }
}

// Workspace Component
class WorkspacesList {
  constructor(container, state, callbacks, tabStates = {}) {
    this.container = container;
    this.state = state;
    this.callbacks = callbacks;
    this.tabStates = tabStates;
    this.editingWorkspaceId = null; // Track which workspace is being edited
  }

  render() {
    this.container.innerHTML = '';

    const workspaces = Object.values(this.state.workspaces);

    if (workspaces.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          No workspaces yet. Click + to create one.
        </div>
      `;
      return;
    }

    workspaces.forEach(workspace => {
      const workspaceEl = this.createWorkspaceElement(workspace);
      this.container.appendChild(workspaceEl);
    });
  }

  createWorkspaceElement(workspace) {
    const div = document.createElement('div');
    const isEditing = this.editingWorkspaceId === workspace.id;
    div.className = `workspace ${workspace.collapsed ? 'collapsed' : ''} ${isEditing ? 'editing' : ''}`;
    div.dataset.id = workspace.id;

    // Header
    const header = document.createElement('div');
    header.className = 'workspace-header';

    // Get workspace icon (could be customizable later)
    const workspaceIcons = {
      'Office': '🏢',
      'Alma': '🎓',
      'Job Update': '💼',
      'Personal': '🏠',
      'Work': '💻',
      'default': '📁'
    };
    const icon = workspaceIcons[workspace.name] || workspaceIcons['default'];
    const editIcon = isEditing ? '✏️' : icon;

    header.innerHTML = `
      <svg class="workspace-chevron" viewBox="0 0 20 20" fill="none">
        <path d="M7 4L13 10L7 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="workspace-icon">${editIcon}</span>
      <span class="workspace-name">${this.escapeHtml(workspace.name)}${isEditing ? ' (Editing...)' : ''}</span>
      <span class="workspace-count">${workspace.items.length}</span>
    `;

    // Only allow collapse toggle when not editing
    if (!isEditing) {
      header.addEventListener('click', () => {
        this.callbacks.onToggleCollapse(workspace.id);
      });
    }

    // Context menu for workspace
    header.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showContextMenu(e.clientX, e.clientY, [
        {
          label: 'Rename',
          onClick: () => this.callbacks.onRenameWorkspace(workspace.id)
        },
        {
          label: 'Edit items',
          onClick: () => this.enterEditMode(workspace.id)
        },
        { divider: true },
        {
          label: 'Delete workspace',
          onClick: () => this.callbacks.onDeleteWorkspace(workspace.id),
          danger: true
        }
      ]);
    });

    div.appendChild(header);

    // Items container
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'workspace-items';

    // Render items
    workspace.items.forEach(item => {
      const itemEl = this.createWorkspaceItem(workspace.id, item, isEditing);
      itemsContainer.appendChild(itemEl);
    });

    // Enable drag-drop for workspace items (only when not editing)
    if (!isEditing && typeof enableWorkspaceItemDragDrop === 'function') {
      enableWorkspaceItemDragDrop(itemsContainer, workspace.id, async (fromIndex, toIndex, fromData, toData) => {
        console.log(`[DragDrop] Workspace item reorder in ${workspace.id}: ${fromIndex} → ${toIndex}`);

        const sourceWorkspaceId = fromData.workspaceId;
        const targetWorkspaceId = toData?.workspaceId || sourceWorkspaceId;

        const currentState = await Storage.getState();
        const sourceWorkspace = currentState.workspaces[sourceWorkspaceId];
        const targetWorkspace = currentState.workspaces[targetWorkspaceId];

        if (!sourceWorkspace || !targetWorkspace) return;

        // Find the dragged item
        const item = sourceWorkspace.items.find(i => i.id === fromData.itemId);
        if (!item) return;

        if (sourceWorkspaceId === targetWorkspaceId) {
          // Reorder within the same workspace
          const newItems = reorderArray(sourceWorkspace.items, fromIndex, toIndex);
          await Storage.updateWorkspace(sourceWorkspaceId, { items: newItems });
        } else {
          // Move to a different workspace at the target position
          const updatedSourceItems = sourceWorkspace.items.filter(i => i.id !== fromData.itemId);
          const destinationItems = [...targetWorkspace.items];
          const insertionIndex = Math.min(toIndex, destinationItems.length);
          destinationItems.splice(insertionIndex, 0, item);

          await Storage.updateState(state => ({
            ...state,
            workspaces: {
              ...state.workspaces,
              [sourceWorkspaceId]: {
                ...state.workspaces[sourceWorkspaceId],
                items: updatedSourceItems
              },
              [targetWorkspaceId]: {
                ...state.workspaces[targetWorkspaceId],
                items: destinationItems
              }
            }
          }));
        }

        // Refresh state and re-render
        const state = await Storage.getState();
        window.dispatchEvent(new CustomEvent('storage-updated', { detail: state }));
      });
    }

    // Add item button or Done editing button
    if (isEditing) {
      const doneBtn = document.createElement('button');
      doneBtn.className = 'done-editing-btn';
      doneBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M11 4L5 10L2 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Done Editing</span>
      `;
      doneBtn.addEventListener('click', () => {
        this.exitEditMode();
      });
      itemsContainer.appendChild(doneBtn);
    } else {
      const addBtn = document.createElement('button');
      addBtn.className = 'add-item-btn';
      addBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2V12M2 7H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>Add tab</span>
      `;
      addBtn.addEventListener('click', () => {
        this.callbacks.onAddItem(workspace.id);
      });
      itemsContainer.appendChild(addBtn);
    }

    div.appendChild(itemsContainer);

    return div;
  }

  createWorkspaceItem(workspaceId, item, isEditing = false) {
    const div = document.createElement('div');
    div.className = 'workspace-item';
    div.dataset.id = item.id;

    // Add indicator classes based on tab state
    const tabState = this.tabStates[item.id];
    if (tabState) {
      if (tabState.isActive) {
        div.classList.add('is-active');
      } else if (tabState.tabCount > 1) {
        div.classList.add('has-multiple-tabs');
      } else if (tabState.tabCount === 1) {
        div.classList.add('is-open');
      }
    }

    // Icon (use custom icon if provided)
    const icon = createFaviconElement(item.url, 20, item.icon);

    // Add badge count attribute for CSS to display
    if (tabState && tabState.tabCount > 1) {
      icon.setAttribute('data-tab-count', tabState.tabCount);
    }

    div.appendChild(icon);

    // Content
    const content = document.createElement('div');
    content.className = 'workspace-item-content';

    const title = document.createElement('div');
    title.className = 'workspace-item-title';
    title.textContent = item.alias || this.getUrlTitle(item.url);

    content.appendChild(title);
    div.appendChild(content);

    // Delete button in edit mode
    if (isEditing) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'item-delete-btn';
      deleteBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.callbacks.onRemoveItem(workspaceId, item.id);
      });
      div.appendChild(deleteBtn);
    } else {
      // Click handler (only when not editing)
      div.addEventListener('click', (e) => {
        this.callbacks.onOpenItem(item, null, e);
      });

      // Context menu
      div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showItemContextMenu(e, workspaceId, item);
      });
    }

    return div;
  }

  showItemContextMenu(e, workspaceId, item) {
    const workspaces = Object.values(this.state.workspaces);
    const otherWorkspaces = workspaces.filter(w => w.id !== workspaceId);

    const menuItems = [
      {
        label: 'Open',
        onClick: () => this.callbacks.onOpenItem(item)
      },
      {
        label: 'Open in new tab',
        onClick: () => this.callbacks.onOpenItem(item, 'new-tab')
      },
      { divider: true },
      {
        label: 'Rename alias',
        onClick: () => this.callbacks.onRenameItem(workspaceId, item.id)
      }
    ];

    if (otherWorkspaces.length > 0) {
      menuItems.push({
        label: 'Move to...',
        submenu: otherWorkspaces.map(w => ({
          label: w.name,
          onClick: () => this.callbacks.onMoveItem(workspaceId, w.id, item.id)
        }))
      });
    }

    menuItems.push(
      { divider: true },
      {
        label: 'Remove',
        onClick: () => this.callbacks.onRemoveItem(workspaceId, item.id),
        danger: true
      }
    );

    showContextMenu(e.clientX, e.clientY, menuItems);
  }

  getUrlTitle(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  getUrlDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  enterEditMode(workspaceId) {
    // Auto-expand if workspace is collapsed
    const workspace = this.state.workspaces[workspaceId];
    if (workspace && workspace.collapsed) {
      this.callbacks.onToggleCollapse(workspaceId);
    }

    this.editingWorkspaceId = workspaceId;
    this.render();
  }

  exitEditMode() {
    this.editingWorkspaceId = null;
    this.render();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Context Menu
function showContextMenu(x, y, items) {
  const menu = document.getElementById('context-menu');
  menu.innerHTML = '';

  items.forEach(item => {
    if (item.divider) {
      const divider = document.createElement('div');
      divider.className = 'context-menu-divider';
      menu.appendChild(divider);
    } else if (item.submenu) {
      // Handle submenu items
      const menuItem = document.createElement('div');
      menuItem.className = 'context-menu-item has-submenu';
      menuItem.innerHTML = `
        <span>${item.label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="margin-left: auto;">
          <path d="M4 2L8 6L4 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;

      // Create submenu container
      const submenu = document.createElement('div');
      submenu.className = 'context-submenu';
      item.submenu.forEach(subItem => {
        const subMenuItem = document.createElement('div');
        subMenuItem.className = 'context-menu-item';
        subMenuItem.textContent = subItem.label;
        subMenuItem.addEventListener('click', () => {
          subItem.onClick();
          hideContextMenu();
        });
        submenu.appendChild(subMenuItem);
      });

      menuItem.appendChild(submenu);

      // Show submenu on hover
      menuItem.addEventListener('mouseenter', () => {
        submenu.style.display = 'block';

        // Smart positioning: check available space on both sides
        setTimeout(() => {
          const menuItemRect = menuItem.getBoundingClientRect();
          const submenuRect = submenu.getBoundingClientRect();
          const spaceOnRight = window.innerWidth - menuItemRect.right;
          const spaceOnLeft = menuItemRect.left;

          // If not enough room on either side, overlay on top
          if (submenuRect.width > spaceOnRight && submenuRect.width > spaceOnLeft) {
            submenu.style.left = '0';
            submenu.style.right = 'auto';
            submenu.style.marginLeft = '0';
            submenu.style.marginRight = '0';
          }
          // If overflow on right but room on left
          else if (submenuRect.right > window.innerWidth && spaceOnLeft > submenuRect.width) {
            submenu.style.left = 'auto';
            submenu.style.right = '100%';
            submenu.style.marginLeft = '0';
            submenu.style.marginRight = '4px';
          }
          // Otherwise keep on right (default)
        }, 0);
      });
      menuItem.addEventListener('mouseleave', () => {
        submenu.style.display = 'none';
        // Reset positioning
        submenu.style.left = '100%';
        submenu.style.right = 'auto';
        submenu.style.marginLeft = '4px';
        submenu.style.marginRight = '0';
      });

      menu.appendChild(menuItem);
    } else {
      const menuItem = document.createElement('div');
      menuItem.className = `context-menu-item ${item.danger ? 'danger' : ''}`;
      menuItem.textContent = item.label;
      menuItem.addEventListener('click', () => {
        item.onClick();
        hideContextMenu();
      });
      menu.appendChild(menuItem);
    }
  });

  menu.style.display = 'block';
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  // Adjust if off-screen
  setTimeout(() => {
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${y - rect.height}px`;
    }
  }, 0);

  // Close on click outside
  const closeHandler = (e) => {
    if (!menu.contains(e.target)) {
      hideContextMenu();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 0);
}

function hideContextMenu() {
  const menu = document.getElementById('context-menu');
  menu.style.display = 'none';
}

// Modal helpers
function showModal(title, content, onConfirm) {
  const overlay = document.getElementById('modal-overlay');
  const modalContent = document.getElementById('modal-content');

  // Only render title if provided (onboarding screens use their own h2)
  const titleHtml = title ? `<h3 class="modal-title">${title}</h3>` : '';

  modalContent.innerHTML = `
    ${titleHtml}
    ${content}
  `;

  overlay.style.display = 'flex';

  // Focus first input
  const firstInput = modalContent.querySelector('input, textarea, select');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }

  // Return close function
  return () => {
    overlay.style.display = 'none';
  };
}

function hideModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.style.display = 'none';
}

/**
 * Show confirmation dialog
 * @param {Object} options - { title, message, confirmText, cancelText, danger, onConfirm }
 */
function showConfirmDialog({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger = false, onConfirm }) {
  const dangerClass = danger ? 'btn-danger' : 'btn-primary';

  showModal(title, `
    <div class="confirm-dialog">
      <p class="confirm-message">${message}</p>
      <div class="confirm-buttons">
        <button class="btn btn-secondary" id="confirm-cancel-btn">${cancelText}</button>
        <button class="btn ${dangerClass}" id="confirm-ok-btn">${confirmText}</button>
      </div>
    </div>
  `);

  // Cancel button
  document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
    hideModal();
  });

  // Confirm button
  document.getElementById('confirm-ok-btn').addEventListener('click', () => {
    hideModal();
    if (onConfirm) onConfirm();
  });

  // Focus confirm button
  setTimeout(() => {
    document.getElementById('confirm-cancel-btn').focus();
  }, 100);
}

// Click outside to close
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modal-overlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hideModal();
    }
  });
});
