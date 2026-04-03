# Commit Count: GitHub Intelligence Analytics

A high-fidelity platform to visualize GitHub contribution history with 12-year depth and real-time streak tracking.

## 🚀 Key Features
- **Secure GraphQL Proxy**: Uses a protected Netlify Function to hide your API token from the frontend.
- **Premium Design**: Modern "Imperial Plum" aesthetic with glassmorphism and Framer Motion animations.
- **12-Year History**: Deep-level auditing of contribution data via high-performance GraphQL queries.
- **Real-Time Synchronicity**: Latency-free detection of new commits via the public events stream.

## ⚙️ Deployment (Netlify)
This project is optimized for deployment via **Netlify**.

### 1. Set Environment Variables
In your Netlify Dashboard (**Site settings > Environment variables**), add:
- `GITHUB_TOKEN`: Your GitHub Personal Access Token (PAT).

### 2. Built-in Proxy
The app automatically uses the serverless function in `/netlify/functions/github-proxy.js` to communicate with GitHub. This ensures your token is never exposed to the browser.

---
© 2026 Commit Count Analytics. Deployed via Netlify.
