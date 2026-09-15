# DEMETER 26' — React App

## Routes

| Path | Page |
|------|------|
| `/` | Student quiz |
| `/admin` | Admin console (Sign up / Sign in) |

## Local

```bash
npm install
npm run dev
```

## Deploy to Vercel

**Important:** Deploy this **Vite React** project (not old single HTML files).

1. Push `demeter-app` to GitHub, or use Vercel CLI from this folder.
2. Framework preset: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`
5. `vercel.json` is included so `/admin` does not 404 (SPA rewrite → `index.html`).

### If admin still 404s

In Vercel project → Settings → ensure Root Directory points at the folder that contains `package.json` and `vite.config.js`, then **Redeploy**.

Without `vercel.json` rewrites, Vercel looks for a real `/admin` file and returns 404.

## Firebase

Enable **Authentication → Email/Password** in Firebase Console so admin Sign up works.
