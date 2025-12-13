# Tabwise — Vertical Tab Manager

> **Bring vertical tabs to Chrome, Brave, Edge, Comet, Dia and Atlas** — Workspaces, smart tab switching, and favorites. Finally organize your tabs the way they were meant to be.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)](https://github.com/SwajanJain/tabwise)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 The Problem

**Horizontal tabs are outdated for serious work:**

❌ **Tab overload** – 20+ tabs make it impossible to see what's open.
❌ **No organization** – Can't group tabs by project or context.
❌ **Wasted space** – Horizontal tabs eat precious screen real estate.
❌ **Duplication** – Clicking Gmail opens *another* Gmail tab instead of focusing the existing one.
❌ **Context switching chaos** – Jumping between work, personal, and side projects is messy.

**Result?** You waste time hunting for tabs, or end up with 50+ cluttered windows.

### 💡 Why This Matters Now

* **Arc Browser users love its vertical tabs and workspaces.** However, The Browser Company has discontinued regular updates for Arc, so we're unlikely to ever see true agentic experiences like Comet or Atlas inside Arc itself. Many power users worry that Arc isn't evolving in line with where the web is headed, and even their other AI browser Dia lacks vertical tab management.
* **AI-first browsers (Comet, Atlas, and Dia)** are building agentic, AI-native experiences. But they all force horizontal tabs, with no Arc-style vertical management.
* **Chrome/Brave/Edge users** never had Arc's vertical system to begin with.

**This extension solves that.** → Get Arc's vertical tab organization and smart switching in *any* Chromium browser, while enjoying the AI/agentic future that Arc never built.

---

## ✨ The Solution

**Tabwise** brings vertical tab management to Chrome/Edge/Brave/Comet with:

### 🎯 Smart Tab Switching (Arc's Killer Feature)

* Click Gmail favorite → **Focuses your existing Gmail tab** (or creates new if not open).
* Navigate around in Gmail → Clicking Gmail again brings you *back to that bound tab*.
* No more 5 Slack tabs or duplicate dashboards.

### 📁 Workspaces by Context

* Separate **Work, Design, Client, Personal** flows.
* Collapse/expand workspaces for focus.
* Drag, rename, and alias tabs.

### ⭐ Favorites Grid

* Favicon-only favorites in a clean **4-column grid**, dynamically adjusting rows.
* One-click access to daily tools.
* Minimal, visual, clutter-free.

### 🔍 Quick Search

* `Cmd/Ctrl+K` to filter across favorites, workspaces, and open tabs.
* Lightning fast context switching.

### 📸 Screenshot Capture

* Click the camera icon to capture any region of the page.
* Drag to select, then copy to clipboard or download as PNG.
* Perfect for bug reports, design reviews, and quick shares.

### 🗂️ Smart Tab Grouping

* One-click grouping of open tabs by domain.
* Collapse/expand groups to reduce visual clutter.
* Close entire groups at once when you're done with a context.

### 📥 One-Click Onboarding

* **Quick Setup** analyzes your browsing history and bookmarks locally.
* Auto-creates favorites from your most-visited sites.
* Imports bookmark folders as ready-to-use workspaces.
* Optional Google Workspace bundle (Gmail, Calendar, Drive, Docs, Sheets, Slides, Meet, Chat).

### 🔄 Navigation Controls

* Back, forward, and refresh buttons built into the sidebar header.
* Control the active tab without leaving your workflow.

### 📋 Open Tabs Management

* See all open tabs in a scrollable list.
* Click to switch, hover for back/forward/close controls.
* Rename tabs with custom aliases for better recognition.
* Drag to reorder tabs within your window.

---

## 👥 Who This Is For

* **Arc fans** who love vertical tabs but want AI-native browsers.
* **Product managers & knowledge workers** juggling Slack, dashboards, docs, and calendars.
* **Developers/designers** who need organized contexts across multiple projects.
* **Chrome/Brave/Edge users** tired of tab overload.

Not for: casual browsers with <5 tabs, or those who prefer horizontal layouts.

---

## 🚀 Key Features

| Feature | Description |
|---------|-------------|
| **Smart Tab Switching** | Focus existing tabs instead of duplicating. Tab binding persists across navigation. |
| **Collapsible Workspaces** | Organize tabs by project, client, or context. Drag items between workspaces. |
| **Favorites Grid** | Arc-style favicon-only 4-column grid with visual open/active indicators. |
| **Quick Search** | `Cmd/Ctrl+K` to instantly find any tab, favorite, or workspace. |
| **Screenshot Capture** | Select any region, copy to clipboard or download as PNG. |
| **Tab Grouping** | One-click grouping by domain. Collapse, expand, or close entire groups. |
| **Bookmark Import** | Convert existing bookmark folders into workspaces instantly. |
| **One-Click Onboarding** | Quick Setup auto-populates favorites and workspaces from your history. |
| **Drag & Drop** | Reorder favorites, workspace items, and open tabs with drag-and-drop. |
| **Navigation Controls** | Back, forward, refresh buttons in the sidebar header. |
| **Open Tabs List** | View, rename, reorder, and manage all open tabs from the sidebar. |
| **Keyboard-first UX** | Shortcuts for panel toggle, search, and tab actions. |

---

## 🆚 Why Tabwise?

* Arc = ✅ great vertical tabs, ❌ discontinued updates, ❌ no AI future.
* Comet/Atlas/Dia = ✅ AI-native browsing, ❌ horizontal tabs only.
* Chrome/Brave/Edge = ✅ stable, extensible, ❌ no vertical tabs.

**Tabwise = The bridge.**
Vertical tab power in any browser you choose.

---

## 📦 Install

### From Source

```bash
git clone https://github.com/SwajanJain/tabwise.git
cd tabwise
```

1. Go to your browser's extensions page (`chrome://extensions`, `brave://extensions`, or `comet://extensions`).
2. Enable Developer Mode.
3. Load Unpacked → Select the `side-panel` folder.

### Chrome Web Store (Coming Soon)

---

## 🛠 Tech & Architecture

* **Vanilla JavaScript** (no frameworks, minimal bundle).
* **Manifest V3** – secure modern extension.
* **Side Panel API** – persistent sidebar.
* **Tab matcher & cache** – smart-switch with canonicalized URLs.
* **Cross-device sync** – via Chrome sync storage.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Shift + V` | Toggle sidebar panel |
| `Cmd/Ctrl + K` | Focus search (when panel is open) |
| `↑` `↓` Arrow keys | Navigate search results |
| `Enter` | Open selected search result |
| `Escape` | Close search / Cancel screenshot |
| `Shift + Click` | Force open new tab (bypass smart switching) |

---

## 🎬 User Flow

### First Launch
1. Open the sidebar → See the onboarding screen
2. Choose **"Set up automatically"** → Extension analyzes your history locally
3. Favorites grid populates with your top 20 most-visited sites
4. Workspaces are created from your bookmark folders
5. Optional: Google Workspace bundle adds Gmail, Calendar, Drive, etc.

### Daily Usage
1. **Click a favorite** → Jumps to existing tab or opens new
2. **Expand a workspace** → See tabs organized by project
3. **Press `Cmd/Ctrl+K`** → Search across everything instantly
4. **Drag items** → Reorder favorites or move between workspaces
5. **Click camera icon** → Capture screenshot of any page region

### Organizing Your Workflow
* **Add favorite:** Click `+` in the grid, or right-click any workspace item
* **Create workspace:** Click "New Workspace" at bottom of sidebar
* **Move items:** Drag between workspaces, or right-click → Move to
* **Group tabs:** Settings → "Group tabs by site" when things get cluttered
* **Import bookmarks:** Settings → "Import Bookmarks" to convert folders

---

## 🤝 Contributing

We're building this in the open. Help us improve:

* Accessibility improvements (screen readers, keyboard navigation)
* Performance optimization for 100+ tab users
* Cross-browser testing (Edge, Brave, Opera, Vivaldi)
* Localization / i18n support

Fork, branch, PR — contributions welcome.

---

## 🚦 Getting Started by Use Case

### 🧑‍💼 Product Managers

* **Favorites:** Pin Slack, Gmail, Metabase, Amplitude, Calendar.
* **Workspaces:** `Office` (analytics + comms), `Clients` (dashboards + reports).
* **Smart Switching:** Jump instantly back to dashboards without duplicates.

### 👩‍💻 Developers & Designers

* **Favorites:** GitHub, Linear, Figma, Docs.
* **Workspaces:** `Feature A`, `Feature B` → each with staging, prod, design.
* **Smart Switching:** Reopen same repo tab even after context switching.

### 📚 Researchers & Knowledge Workers

* **Favorites:** Google Scholar, Notion, Docs.
* **Workspaces:** `Topic A`, `Topic B`, `Personal`.
* **Smart Switching:** Navigate deep into resources but return with one click.

### 🌐 Arc Fans Exploring AI Browsers

* Keep the Arc-style vertical system you love.
* Run it inside Comet, Atlas, or Dia to combine vertical tabs with agentic AI features.

---

## 🙏 Credits

Inspired by the vertical tab experience from **Arc Browser**.
Built for everyone who wants organized tabs in any browser.

---

## 🔒 Privacy

All data is stored **locally on your device**. We don't collect, track, or transmit any data.

[Read our full Privacy Policy](./PRIVACY.md)

---

## 📄 License

MIT License - Free to use, modify, and distribute.

---

**Install Tabwise today and finally organize your tabs.** 🚀
