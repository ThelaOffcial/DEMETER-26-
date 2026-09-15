# DEMETER 26' Eco Quiz

Student quiz + Admin console (Firebase Realtime Database + Auth).

## Files

| File | Purpose |
|------|---------|
| `index.html` | Student quiz (EN/SI, anti-cheat, one attempt per device) |
| `admin.html` | React admin (Sign in / Sign up, results, retakes, devices, export) |
| `questions-data.js` | Question bank (no answers) |
| `translations-si.js` | Sinhala UI + question labels |

## Admin accounts (Sign up + Sign in)

1. Open `admin.html`
2. **Sign up** tab → email + password (min 6 chars) → Create admin account  
3. Next visits: **Sign in** with the same email/password  
4. **Sign out** ends the session  

Firebase must have **Email/Password** enabled:  
Firebase Console → Authentication → Sign-in method → Email/Password → Enable.

Clear error messages are shown for wrong password, weak password, email already in use, network errors, etc.

Session stays on this browser until Sign out (normal Firebase behaviour). A brief “Checking session…” screen avoids a login flash on reload.

## Retake

1. Admin → open submission → **Allow device to retake** (or Devices tab)  
2. Student refreshes `index.html` — local lock clears when server lock is gone  

## Scoring

Q1–15: 1 mark · Q16–35: 2 · Q36–50: 4 (=115) + up to 5 fast bonus → max **120**

## Fixes in this package

- Sign up + Sign in for admin accounts  
- Friendly auth error messages  
- Auth loading gate (no random auto-jump to dashboard)  
- Retake end-to-end  
- Scoring of `{ value, fast, at }` answers  
- Q39 answer key matched to option text  
- React double-escape removed  
