# Privacy Policy for Tabwise: Vertical Tabs & Workspaces

**Last Updated:** December 23, 2025

## The Short Version

**Your data stays on your device** — with one optional exception: if you choose AI-powered setup during onboarding, your browsing patterns are temporarily sent to OpenAI to generate personalized favorites. This is opt-in, one-time, and no data is stored on our servers.

---

## Overview

Tabwise ("the Extension") is a vertical tab manager sidebar for organizing tabs. This privacy policy explains how the Extension handles your data.

## Our Privacy Promise

- ✅ **Local First** — All your data (favorites, workspaces, settings) is stored on your device only
- ✅ **AI is Opt-in** — AI-powered setup is optional and only runs once during onboarding
- ✅ **Zero Tracking** — No analytics, no telemetry, no tracking pixels
- ✅ **Zero Data Storage** — We do not store your data on any server
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

Some features require temporary access to browser data:

| Feature | Data Accessed | What Happens |
|---------|---------------|--------------|
| AI-Powered Setup (Opt-in) | Browsing history (domains & paths) | Sent to OpenAI via our proxy to generate personalized favorites. See "AI-Powered Setup" section below. |
| Bookmark Import | Bookmark folders | Read locally to create workspaces. Never stored or sent anywhere. |
| Screenshot Capture | Visible page content | Captured and saved to your clipboard or downloads. Never sent anywhere. |

## AI-Powered Setup

During onboarding, you can optionally choose "AI-Powered Setup" to automatically generate favorites based on your browsing patterns.

**What happens:**
1. Your recent browsing history (domains and URL paths) is collected locally
2. This data is sent to our Cloudflare Worker, which forwards it to OpenAI's API
3. OpenAI analyzes the patterns and returns suggested favorites
4. The data is immediately discarded — nothing is stored on our servers or OpenAI

**What is sent:**
- Domain names (e.g., `mail.google.com`, `github.com`)
- URL paths (e.g., `/inbox`, `/dashboard`) — to understand which pages you use most
- Your selected profile type (e.g., "Developer", "Designer")

**What is NOT sent:**
- Full URLs with query parameters or sensitive IDs
- Page content or titles
- Cookies, passwords, or personal information

**Your choice:**
- This feature is **opt-in** — you must explicitly choose it during onboarding
- You can skip it and set up favorites manually instead
- It runs only **once** during initial setup, never again

## What We Do NOT Do

- ❌ We do **NOT** store your data on any server
- ❌ We do **NOT** collect personal information
- ❌ We do **NOT** track your browsing activity (AI setup is one-time, opt-in only)
- ❌ We do **NOT** use analytics services (Google Analytics, Mixpanel, etc.)
- ❌ We do **NOT** use tracking pixels or cookies
- ❌ We do **NOT** sell or share data
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
- Network requests only occur during opt-in AI setup
- No data is permanently stored or collected
- All regular functionality runs locally in your browser

## Third Parties

We use minimal third-party services:

| Service | Purpose | When Used |
|---------|---------|-----------|
| OpenAI API | AI-powered favorite suggestions | Only during opt-in onboarding setup |
| Cloudflare Workers | Secure proxy for AI requests | Only during opt-in onboarding setup |

**We do NOT use:**
- Analytics (Google Analytics, Mixpanel, Amplitude, etc.)
- Crash reporting (Sentry, Bugsnag, etc.)
- Advertising networks
- User tracking services

The only other external communication is Chrome Sync (if you have it enabled), which is handled by Google, not us.

## Changes to This Policy

If we update this policy, changes will be posted here with an updated date. Major changes will be noted in the extension's changelog.

## Contact

Questions about privacy?

- GitHub Issues: https://github.com/SwajanJain/tabwise/issues

## Summary

**Your data is yours.** It stays on your device — except during optional AI-powered setup, which temporarily sends browsing patterns to generate personalized favorites. This is opt-in, one-time, and nothing is stored.

By installing Tabwise, you agree to this privacy policy.
