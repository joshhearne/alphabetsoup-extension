# AlphabetSoup — Browser Extension

NATO phonetic alphabet parser as a browser extension. Highlight any text on any page, right-click, and get an instant readback in a popup — using your saved custom words, colors, and preferences.

## Supported Browsers
- Chrome (and any Chromium browser — Edge, Brave, Arc, etc.)
- Firefox

## Development

```bash
npm install
npm run dev       # watch mode — rebuilds on file change
```

Then load the `dist/` folder as an unpacked extension:
- **Chrome/Edge**: `chrome://extensions` → Developer mode → Load unpacked → select `dist/`
- **Firefox**: `about:debugging` → This Firefox → Load Temporary Add-on → select any file in `dist/`

## Build

```bash
npm run build           # Chrome/Edge
npm run build:firefox   # Firefox (applies gecko patch to manifest)
```

Output lands in `dist/`. Zip the contents of `dist/` for store submission.

## CI/CD — GitHub Actions

Pushes to `main` that touch the `extension/` directory automatically publish to both stores.

### Required GitHub Secrets

#### Chrome Web Store
| Secret | Where to get it |
|--------|----------------|
| `CHROME_EXTENSION_ID` | Chrome Web Store developer dashboard — your extension's ID |
| `CHROME_CLIENT_ID` | Google Cloud Console → OAuth 2.0 client for Chrome Web Store API |
| `CHROME_CLIENT_SECRET` | Same OAuth client |
| `CHROME_REFRESH_TOKEN` | Run OAuth flow once using the client above |

Guide: https://developer.chrome.com/docs/webstore/using-api

#### Firefox AMO
| Secret | Where to get it |
|--------|----------------|
| `FIREFOX_API_KEY` | addons.mozilla.org → User → API credentials |
| `FIREFOX_API_SECRET` | Same page |

Guide: https://extensionworkshop.com/documentation/develop/web-ext-technical-reference/

## Settings Sync with Web App

The extension stores settings in `chrome.storage.local` (not `localStorage`), so settings are independent from the web app at alphabetsoup.app. Custom words added in the web app won't automatically appear in the extension.

**Future**: export/import settings as JSON to sync between web app, extension, and desktop app.

## File Structure

```
extension/
├── manifest.json          # Extension manifest (MV3)
├── background.js          # Service worker — context menu registration
├── content.js             # Content script (minimal — reserved for future overlay)
├── popup.html             # Popup entry point
├── src/
│   └── popup.jsx          # React popup component — full parser UI
├── icons/                 # Extension icons (16, 32, 48, 128px)
├── scripts/
│   └── patch-firefox.js   # Adds gecko ID to manifest for Firefox submission
├── vite.config.js
└── package.json
```
