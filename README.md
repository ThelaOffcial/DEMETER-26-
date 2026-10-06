# DEMETER 26' — React App (Round 2 · Sinhala medium)

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

## Round 2 notes

- Questions live in `src/data/questions.js` (Sinhala, 50 questions, images in `public/q/`).
- Default answer key is in `src/lib/scoring.js`. The admin **Answer key** page can override any answer; overrides are stored at `config/answerKey` in Realtime Database and every submission is re-scored instantly.
- Before the sitting: Admin → Settings → clear device locks and delete round 1 submissions.
- Database rules must let signed-in admins read/write `config/answerKey`.
