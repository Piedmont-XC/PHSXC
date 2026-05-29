# PHSXC GitHub Pages Site

This is a simple mobile-friendly summer training app for Piedmont High School Cross Country.

## Files

- `index.html` — main app page
- `styles.css` — visual styling
- `app.js` — workout logic and Google Sheet CSV connection
- `manifest.webmanifest` — lets runners save it to their phone home screen
- `service-worker.js` — simple offline cache

## Connect to Google Sheets

1. Upload the master spreadsheet into Google Sheets.
2. Publish the `Master Plan` tab as CSV.
3. Copy the published CSV URL.
4. Open `app.js`.
5. Paste the URL into:

```js
const GOOGLE_SHEET_CSV_URL = "";
```

## GitHub Pages Setup

Create a public GitHub repository named `PHSXC`.

Upload all files from this folder to the repository root.

Then go to:

Settings → Pages → Build and deployment → Source: Deploy from a branch  
Branch: `main`  
Folder: `/root`  
Save

The site will publish at:

`https://YOUR-GITHUB-USERNAME.github.io/PHSXC/`
