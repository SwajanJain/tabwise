# Chrome Web Store Assets Guide

This guide explains what assets you need to create for the Chrome Web Store listing.

## Required Assets

### 1. Screenshots (REQUIRED - At least 1, up to 5)

**Dimensions:** 1280x800 or 640x400 pixels
**Format:** PNG or JPEG
**Max file size:** 2MB each

#### What to Capture:

**Screenshot 1: Overview with Favorites & Workspaces** (Most Important)
- Show the side panel open with favorites grid at top
- Have 8-12 favorites visible with recognizable icons (Gmail, Slack, GitHub, etc.)
- Show 1-2 expanded workspaces below
- Make sure the panel looks clean and organized

**Screenshot 2: One-Click Onboarding** (NEW - Shows ease of setup)
- Show the onboarding modal with "Set up automatically" button
- Or show the success screen with "X favorites and Y workspaces created"
- Demonstrates zero-effort setup

**Screenshot 3: Tab Grouping** (NEW - Key differentiator)
- Show tabs grouped by domain (e.g., 4 GitHub tabs, 3 Google Docs tabs)
- One group expanded, others collapsed
- Shows how it tames tab chaos

**Screenshot 4: Screenshot Capture** (NEW - Unique feature)
- Show the selection overlay on a webpage
- Or show the toolbar with Copy/Download buttons
- Demonstrates built-in utility

**Screenshot 5: Search Feature**
- Show the search bar active (Cmd+K)
- Search results showing matches from favorites, workspaces, AND open tabs
- Demonstrates quick access

#### How to Take Screenshots:

1. **Set up a clean demo:**
   ```bash
   # Open these sites in tabs:
   - gmail.com
   - slack.com
   - github.com
   - notion.so
   - figma.com
   - linear.app
   ```

2. **Add them to favorites and workspaces**

3. **Take screenshots:**
   - Mac: `Cmd+Shift+4` then select the browser window
   - Windows: `Win+Shift+S` then select area
   - Or use browser dev tools: `Cmd+Shift+P` → "Capture screenshot"

4. **Resize to 1280x800:**
   - Use Preview (Mac) or Paint (Windows)
   - Or online tools like iloveimg.com/resize-image

### 2. Promotional Tile (OPTIONAL but Recommended)

**Small Tile:** 440x280 pixels
**Format:** PNG or JPEG

**Design tips:**
- Use the extension icon
- Add tagline: "Vertical Tab Manager"
- Keep it simple and professional
- Use brand colors

Tools to create:
- Canva (free templates)
- Figma
- Photoshop/GIMP

### 3. Store Listing Text (REQUIRED)

Already have this in README, but optimize for Chrome Web Store:

**Short Description (132 characters max):**
```
Vertical tabs sidebar with workspaces, smart tab switching, and favorites. Organize tabs the way they were meant to be.
```

**Detailed Description (no limit):**
Copy the key sections from README.md:
- Problem statement
- Key features (smart switching, workspaces, favorites)
- Who it's for
- Installation/usage

### 4. Category Selection

Choose: **Productivity**

### 5. Language

Primary: **English**

---

## Chrome Web Store Submission Checklist

Before submitting, verify:

- [ ] At least 1 screenshot (1280x800 or 640x400)
- [x] Icons present (16px, 48px, 128px)
- [x] Privacy policy created and accessible (PRIVACY.md)
- [x] Manifest V3 configured
- [x] All permissions justified in description (see template above)
- [ ] Description is clear and accurate
- [ ] No trademark violations in name/description
- [ ] Tested extension works in latest Chrome
- [ ] Tested all features: favorites, workspaces, search, screenshots, tab grouping, onboarding

---

## Store Listing Description Template

Use this template for the Chrome Web Store description:

**Short Description (132 characters max):**
```
Vertical tabs sidebar with workspaces, smart tab switching, and favorites. Organize tabs the way they were meant to be.
```

**Detailed Description:**

```markdown
You have 47 tabs open. You can't find Slack. You just opened a 4th Gmail tab.

Tabwise brings vertical tab management to Chrome, Brave, Edge, and AI browsers like Comet and Atlas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ ONE-CLICK SETUP (NEW)

Click "Set up automatically" and we'll:
• Analyze your browsing history (locally, nothing leaves your browser)
• Auto-create favorites from your top 20 most-visited sites
• Import your bookmark folders as ready-to-use workspaces
• Optionally add a Google Workspace bundle (Gmail, Calendar, Drive, Docs, Sheets, Slides, Meet, Chat)

Your sidebar is personalized in 10 seconds.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 SMART TAB SWITCHING (Arc's Killer Feature)

• Click Gmail → Opens Gmail
• Click Gmail again → Focuses that same tab (doesn't open another)
• Navigate to Settings → Click Gmail again → STILL goes to that tab

One site = one tab. No more duplicates.

• Shift+Click: Force new tab when you actually want one

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 WORKSPACES

Organize tabs like an adult:
• 💼 Work — The stuff your boss thinks you're doing
• 🎨 Side Project — The stuff you're actually doing
• 🏠 Personal — Everything else

Click to switch context. Collapse what you're not using. Drag items between workspaces.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⭐ FAVORITES GRID

Daily sites in a clean icon grid. Click once = open. Click again = focus. Visual indicators show what's already open.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🗂️ TAB GROUPING (NEW)

Got 12 GitHub tabs and 8 Google Docs tabs? One click: grouped by site. Collapse groups you're not using. Close entire groups when done.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📸 SCREENSHOT CAPTURE (NEW)

Click the camera icon. Drag to select any region. Copy to clipboard or download as PNG. Perfect for bug reports and design feedback.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 OPEN TABS LIST

See every tab in the sidebar. Click to switch. Drag to reorder. Rename tabs with custom labels. Hover for back/forward/close controls.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 QUICK SEARCH

Cmd/Ctrl+K → type "slack" → there it is. Searches favorites, workspaces, AND open tabs.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 NAVIGATION CONTROLS

Back, forward, refresh buttons right in the sidebar header. Control the active tab without leaving your workflow.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⌨️ KEYBOARD SHORTCUTS

• Cmd/Ctrl + Shift + V: Toggle sidebar
• Cmd/Ctrl + K: Quick search
• Shift + Click: Force new tab
• Arrow keys: Navigate search results
• Escape: Close search / cancel screenshot

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👥 WHO IT'S FOR

• Arc fans who want AI browsers (Comet, Atlas, Dia) but miss vertical tabs
• Chrome/Brave/Edge users tired of horizontal tab chaos
• Product managers, developers, designers juggling 30+ tabs daily
• Anyone who's ever thought "where the hell is my Amplitude tab?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔒 PRIVACY

• 100% local — no servers, no tracking, no analytics
• History analysis stays on your device
• Open source: github.com/SwajanJain/tabwise

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHY WE NEED CERTAIN PERMISSIONS

• tabs, activeTab: Core functionality — managing and switching tabs
• storage: Save your favorites, workspaces, and preferences locally
• sidePanel: Display the vertical sidebar
• history, bookmarks: One-click setup imports from your data (locally)
• scripting, host permissions: Screenshot capture requires page access
• downloads, clipboardWrite: Save/copy screenshots
• offscreen: Clipboard operations in background

All processing happens locally. We never send data anywhere.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 GET STARTED

1. Install
2. Click "Set up automatically" (or start empty)
3. Done — your favorites and workspaces are ready

Questions? Visit our GitHub repo.
```

---

## Tips for Getting Approved Quickly

1. **Be transparent about permissions:**
   - Explain why you need each permission in the description
   - We only use: sidePanel, storage, tabs, favicon

2. **Privacy policy must be accessible:**
   - Link to PRIVACY.md in your GitHub repo
   - Make sure it's viewable without login

3. **Avoid trademark issues:**
   - Use original branding ("Tabwise")
   - Don't claim affiliation with other browsers
   - Keep descriptions factual

4. **Respond quickly to review feedback:**
   - Chrome reviewers may ask questions
   - Respond within 48 hours for faster approval

5. **Test thoroughly before submission:**
   - Works in latest Chrome version
   - No console errors
   - All features functional

---

## After Approval

1. Add Chrome Web Store badge to README
2. Update README with store link
3. Share on Product Hunt, HackerNews, Reddit
4. Tweet about launch

Good luck! 🚀
