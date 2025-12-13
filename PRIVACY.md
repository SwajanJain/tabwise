# Privacy Policy for Tabwise — Vertical Tab Manager

**Last Updated:** December 13, 2024

## The Short Version

**We do NOT collect, store, or transmit ANY of your data to any server.** Everything stays 100% on your device. We have no servers, no analytics, no tracking. Zero.

---

## Overview

Tabwise ("the Extension") is a vertical tab manager sidebar for organizing tabs. This privacy policy explains how the Extension handles your data.

## Our Privacy Promise

- ✅ **100% Local** — All data is stored on your device only
- ✅ **Zero Servers** — We do not operate any servers
- ✅ **Zero Tracking** — No analytics, no telemetry, no tracking pixels
- ✅ **Zero Data Collection** — We never see, collect, or access your data
- ✅ **Open Source** — Verify everything by reading our code

## What Data is Stored (Locally Only)

The Extension stores the following data **on your device only** using Chrome's storage API:

| Data | Purpose |
|------|---------|
| Favorites | URLs and titles of sites you pin |
| Workspaces | Names and items in your workspace folders |
| Tab bindings | Which tab is linked to which favorite |
| Preferences | Your settings (theme, behavior, etc.) |
| Tab aliases | Custom names you give to tabs |

**This data never leaves your browser.** We cannot see it. We cannot access it. It exists only on your device.

## What Data We Access Temporarily

Some features require temporary access to browser data. This data is **processed locally and immediately discarded** — never stored or transmitted:

| Feature | Data Accessed | What Happens |
|---------|---------------|--------------|
| One-Click Setup | Browsing history | Analyzed locally to suggest favorites. Never stored or sent anywhere. |
| Bookmark Import | Bookmark folders | Read locally to create workspaces. Never stored or sent anywhere. |
| Screenshot Capture | Visible page content | Captured and saved to your clipboard or downloads. Never sent anywhere. |

## What We Do NOT Do

- ❌ We do **NOT** send any data to any server
- ❌ We do **NOT** have servers to receive data
- ❌ We do **NOT** collect personal information
- ❌ We do **NOT** track your browsing activity
- ❌ We do **NOT** use analytics services (Google Analytics, Mixpanel, etc.)
- ❌ We do **NOT** use tracking pixels or cookies
- ❌ We do **NOT** sell or share data (we don't have any to sell)
- ❌ We do **NOT** monetize your data in any way

## Permissions Explained

The Extension requests these permissions for specific features:

| Permission | Why We Need It |
|------------|----------------|
| `sidePanel` | Display the vertical sidebar interface |
| `storage` | Save your favorites, workspaces, and preferences locally |
| `tabs` | Manage tabs, implement smart tab switching |
| `activeTab` | Get info about current tab for navigation controls and capture screenshots |
| `favicon` | Show website icons in favorites and workspaces |
| `history` | One-click setup reads history locally to suggest favorites |
| `bookmarks` | Import bookmark folders as workspaces |
| `scripting` | Inject screenshot selection overlay on current page |
| `clipboardWrite` | Copy screenshots to clipboard |
| `downloads` | Save screenshots as files |
| `offscreen` | Required for clipboard operations in Manifest V3 |
| `host permissions` | Screenshot feature needs to work on any webpage |

**Every permission is used for a specific user-facing feature. None are used to collect or transmit data.**

## Chrome Sync

If you have Chrome Sync enabled, your favorites and workspaces may sync across your devices via Google's servers. This is standard Chrome functionality:

- Google handles the encryption and syncing
- We have no access to this synced data
- You can disable Chrome Sync in browser settings to keep data on one device only

## Your Control

You have full control over your data:

- **View:** Data is in Chrome storage (viewable via developer tools)
- **Export:** Settings → Export to download your data as JSON
- **Delete:** Remove the extension to delete all data instantly
- **Clear:** Use Clear All to reset specific data

## Open Source Verification

Tabwise is **100% open source**. Don't trust us — verify:

🔗 **Source Code:** https://github.com/SwajanJain/tabwise

You can read every line of code and confirm that:
- No network requests are made to external servers
- No data is collected or transmitted
- All functionality runs locally in your browser

## Third Parties

We use **zero** third-party services:
- No analytics (Google Analytics, Mixpanel, Amplitude, etc.)
- No crash reporting (Sentry, Bugsnag, etc.)
- No advertising
- No external APIs

The only external communication is Chrome Sync (if you have it enabled), which is handled by Google, not us.

## Changes to This Policy

If we update this policy, changes will be posted here with an updated date. Major changes will be noted in the extension's changelog.

## Contact

Questions about privacy?

- GitHub Issues: https://github.com/SwajanJain/tabwise/issues

## Summary

**Your data is yours. It stays on your device. We never see it, touch it, or transmit it. Period.**

By installing Tabwise, you agree to this privacy policy.
