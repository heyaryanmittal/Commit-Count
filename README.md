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

## 🔒 Deployment & Security
This project is configured for **GitHub Pages** with integrated **GitHub Actions** for automatic deployment on every push.

### Setting up Secrets
To ensure the dashboard functions in production:
1.  Go to your repository on GitHub.
2.  Navigate to **Settings > Secrets and variables > Actions**.
3.  Add a **New repository secret**:
    -   Name: `VITE_GITHUB_TOKEN`
    -   Value: `your_token`
4.  The `.env` file is excluded from git via `.gitignore` for local safety.

---
© 2026 Commit Count Analytics. Deployed via GitHub Pages.
