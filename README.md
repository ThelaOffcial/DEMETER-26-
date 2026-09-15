# DEMETER 26' — React App

Real **React + Vite** project (not CDN HTML).

## Structure

```
demeter-app/
  index.html
  package.json
  vite.config.js
  src/
    main.jsx
    App.jsx
    pages/
      QuizPage.jsx      # Student quiz  →  /
      AdminPage.jsx     # Admin console →  /admin
    lib/
      firebase.js
      scoring.js        # Answer key (admin only)
      device.js
      uiStrings.js
    data/
      questions.js
      translations.js
    styles/index.css
```

## Run

```bash
cd demeter-app
npm install
npm run dev
```

- Student: http://localhost:5173/
- Admin:   http://localhost:5173/admin

## Build for production

```bash
npm run build
```

Output in `dist/`. Deploy the `dist` folder to any static host.

## Features

**Student**
- EN / සිංහල
- 10s read + 20s answer, fast bonus, image questions
- Anti-cheat (fullscreen, violations)
- Device lock + admin retake support

**Admin**
- Sign up / Sign in (Firebase Auth)
- Live results, leaderboard, CSV
- Allow retake, unlock devices, delete submissions

Enable **Email/Password** in Firebase Console → Authentication.
