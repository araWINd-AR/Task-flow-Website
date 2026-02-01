# TaskFlow Starter (React + Firebase)

## Requirements
- Install Node.js (LTS)

## Setup
1) Open this folder in VS Code / Visual Studio
2) Open terminal in this folder and run:

```bash
npm install
npm run dev
```

Open the URL printed in terminal (usually http://localhost:5173)

## Firebase (required for login + tasks)
1) Firebase Console → Create Project
2) Authentication → enable Email/Password
3) Firestore Database → create database (test mode for development)
4) Project Settings → General → Your Apps → Web App → copy config
5) Paste into: `src/firebase.js`

## Deploy on Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- SPA routing redirect is already included at: `public/_redirects`
