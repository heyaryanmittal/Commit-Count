# Commit Count: GitHub Contribution Intelligence Dashboard

A high-fidelity, real-time analytics platform to visualize GitHub contribution history with 12-year depth, streak tracking, and precision date-range auditing.

## 🚀 Key Features
- **Real-Time Data Patching**: Synchronizes with GitHub's live `/events` stream to detect commits the second they are pushed.
- **Premium Imperial Plum Aesthetic**: Modern, dark-themed dashboard with glassmorphism and smooth animations (Framer Motion).
- **12-Year Historical Audit**: Direct integration with the GitHub GraphQL API for high-density historical data.
- **Precision Data Filter**: Audit specific date ranges with 100% accuracy using UTC string normalization.
- **Engagement Metrics**: Best vs. Current streak tracking, Year-over-Year (YoY) velocity, and weekly intensity breakdown.

## 🛠️ Technical Stack
- **React + Vite**
- **Lucide React** (Iconography)
- **Framer Motion** (Animations)
- **GitHub GraphQL API + REST Events API** (Data sources)

## ⚙️ Configuration
To use this dashboard, create a `.env` file in the root directory and add your GitHub Personal Access Token (PAT):

```env
VITE_GITHUB_TOKEN=your_token_here
```

*Note: Ensure your token has `public_repo` (or read) permissions at minimum for public profile scanning.*

## 🔒 Security
The `.env` file is included in `.gitignore` to prevent credential exposure. When deploying (e.g., to Netlify or Vercel), ensure you set `VITE_GITHUB_TOKEN` in your environment variables dashboard.

---
© 2026 Commit Count Analytics Engine. Designed for precision.
