# AlphabetSoup — Browser Extension

NATO phonetic alphabet parser as a browser extension. Highlight any text on any page, right-click, and get an instant readback in a popup — using your saved custom words, colors, and preferences.

## Supported Browsers
- Chrome
- Edge
- Firefox

## Development

```bash
npm install
npm run dev       # watch mode — rebuilds on file change
```

Then load the built folder as an unpacked extension:
- **Chrome**: `chrome://extensions` → Developer mode → Load unpacked → select `dist-chrome/`
- **Edge**: `edge://extensions` → Developer mode → Load unpacked → select `dist-edge/`
- **Firefox**: `about:debugging` → This Firefox → Load Temporary Add-on → select `dist-firefox/manifest.json`

## Build

```bash
npm run build:chrome    # → dist-chrome/
npm run build:edge      # → dist-edge/
npm run build:firefox   # → dist-firefox/ (applies gecko patch to manifest)
npm run build:all       # builds all three
```

Each browser gets its own output directory so builds can coexist without cross-contamination.

### Zip for store submission

```bash
npm run zip:chrome      # → alphabetsoup-chrome.zip
npm run zip:edge        # → alphabetsoup-edge.zip
npm run zip:firefox     # → alphabetsoup-firefox.zip
```

## CI/CD — GitHub Actions

Pushing a `v*` tag runs `release.yml`, which publishes all three stores from a
single matrix job. The version is taken from the tag (`v1.2.2` → `1.2.2`),
stamped into `public/manifest.json` and `package.json` **before** the build, and
verified in each built manifest — so Chrome, Edge and Firefox always ship the
same version number. `fail-fast` is off, so one store rejecting a build does not
block the other two.

| Matrix target | Store | Build |
|---------------|-------|-------|
| `chrome` | Chrome Web Store | `build:chrome` |
| `edge` | Edge Add-ons | `build:edge` |
| `firefox` | Firefox AMO | `build:firefox` |

`workflow_dispatch` accepts a version input for re-running a release without
cutting a new tag. Built zips are also uploaded as run artifacts for manual
store submission if an upload step fails.

### Required GitHub Secrets

#### Chrome Web Store
| Secret | Where to get it |
|--------|----------------|
| `CWS_CLIENT_ID` | Google Cloud Console → OAuth 2.0 client for Chrome Web Store API |
| `CWS_CLIENT_SECRET` | Same OAuth client |
| `CWS_REFRESH_TOKEN` | Run OAuth flow once using the client above |

Guide: https://developer.chrome.com/docs/webstore/using-api

#### Edge Add-ons
| Secret | Where to get it |
|--------|----------------|
| `EDGE_PRODUCT_ID` | Edge Partner Center → your extension's product ID |
| `EDGE_CLIENT_ID` | Edge Partner Center → Publish API → client ID |
| `EDGE_API_KEY` | Edge Partner Center → Publish API → API key |

Guide: https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/api/using-addons-api

#### Firefox AMO
| Secret | Where to get it |
|--------|----------------|
| `AMO_API_KEY` | addons.mozilla.org → User → API credentials |
| `AMO_API_SECRET` | Same page |

Guide: https://extensionworkshop.com/documentation/develop/web-ext-technical-reference/

## Settings Sync with Web App

The extension stores settings in `chrome.storage.local` (not `localStorage`), so settings are independent from the web app at alphabetsoup.app. Custom words added in the web app won't automatically appear in the extension.

Use the export/import feature to sync settings between web app, extension, and desktop app.

## File Structure

```
├── public/
│   ├── manifest.json          # Extension manifest (MV3, Chrome/Edge base)
│   ├── background.js          # Service worker — context menu registration
│   ├── content.js             # Content script (reserved for future overlay)
│   └── icons/                 # Extension icons (16, 32, 48, 128px)
├── src/
│   ├── popup.jsx              # React popup component — full parser UI
│   └── options.jsx            # Settings page UI
├── scripts/
│   └── patch-firefox.js       # Patches manifest for Firefox (gecko ID, background.scripts)
├── .github/workflows/
│   └── release.yml            # Tag-driven publish to all three stores
├── vite.config.js
└── package.json
```
