import { useState, useEffect, useMemo } from 'react';
import './App.css';
import {
  Search, Github, Activity, TrendingUp, Filter,
  Flame, Award, BarChart3, Clock, Download, Zap, TrendingDown
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function App() {
  const [username, setUsername] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [customStats, setCustomStats] = useState(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      document.body.style.setProperty('--mouse-x', `${(e.clientX / window.innerWidth) * 100}%`);
      document.body.style.setProperty('--mouse-y', `${(e.clientY / window.innerHeight) * 100}%`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Real-Time Auto-Sync Effect
  useEffect(() => {
    if (!username || error) return;
    
    // Initial fetch skip as it's triggered by search
    const interval = setInterval(() => {
      console.log(`Auto-syncing data for ${username}...`);
      fetchStats(username, true); // true = silent update
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [username, error]);

  const fetchStats = async (user, isSilent = false) => {
    if (!user) return;
    if (!isSilent) setLoading(true);
    setError(null);
    setCustomStats(null);

    // Smart Environment Handling
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const localToken = import.meta.env.VITE_GITHUB_TOKEN;
    const PROXY_BASE = '/.netlify/functions/github-proxy';
    
    // Logic: In development, we use the local token if it exists. 
    // In production (Netlify), we use the zero-knowledge proxy.
    const useDirectFetch = isDev && localToken;

    try {
      const currentY = new Date().getFullYear();
      const yearsNeeded = Array.from({ length: 12 }, (_, i) => currentY - i);

      const fetchYear = async (year) => {
        const fromDate = `${year}-01-01T00:00:00Z`;
        const toDate = `${year}-12-31T23:59:59Z`;
        const query = `
          query($login: String!, $from: DateTime!, $to: DateTime!) {
            user(login: $login) {
              contributionsCollection(from: $from, to: $to) {
                contributionCalendar {
                  totalContributions
                  weeks {
                    contributionDays {
                      date
                      contributionCount
                    }
                  }
                }
              }
            }
          }
        `;
        
        // Construct Endpoint
        const targetUrl = useDirectFetch ? "https://api.github.com/graphql" : `${PROXY_BASE}/graphql`;
        const headers = { "Content-Type": "application/json" };
        if (useDirectFetch) {
          headers["Authorization"] = `bearer ${localToken}`;
        }

        const response = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query,
            variables: { login: user, from: fromDate, to: toDate },
          }),
        });

        if (!response.ok) {
          if (response.status === 401) throw new Error('Invalid or Expired GitHub Token');
          if (response.status === 404) throw new Error('GitHub User not found');
          throw new Error(`Fetch failed: ${response.status}`);
        }

        const res = await response.json();
        if (res.errors) throw new Error(res.errors[0].message);
        if (!res.data || !res.data.user) throw new Error('Target profile not identified');

        return res.data.user.contributionsCollection.contributionCalendar.weeks
          .flatMap(w => w.contributionDays);
      };

      const results = await Promise.all(yearsNeeded.map(y => fetchYear(y)));
      let allDays = results.flat();

      // Live Patch Section
      try {
        const eventsUrl = useDirectFetch 
          ? `https://api.github.com/users/${user}/events/public?per_page=30` 
          : `${PROXY_BASE}/users/${user}/events/public?per_page=30`;
        
        const eventsHeaders = useDirectFetch ? { "Authorization": `bearer ${localToken}` } : {};
        const eventsRes = await fetch(eventsUrl, { headers: eventsHeaders });
        
        if (eventsRes.ok) {
          const events = await eventsRes.json();
          const todayStr = new Date().toLocaleDateString('en-CA');
          let todayCommits = 0;

          events.forEach(ev => {
            if (ev.type === 'PushEvent' && ev.created_at.includes(todayStr)) {
              todayCommits += (ev.payload.size || 0);
            }
          });

          const todayIdx = allDays.findIndex(d => d.date === todayStr);
          if (todayIdx !== -1) {
            allDays[todayIdx].contributionCount = Math.max(allDays[todayIdx].contributionCount, todayCommits);
          } else if (todayCommits > 0) {
            allDays.push({ date: todayStr, contributionCount: todayCommits });
          }
        }
      } catch (e) {
        console.warn("Live patch inhibited", e);
      }

      if (allDays.length === 0) {
        throw new Error('User has no contribution history available');
      }

      const dateMap = new Map();
      allDays.forEach(day => {
        if (day && day.date) dateMap.set(day.date, day);
      });

      const sortedDays = Array.from(dateMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
      const totalContributions = sortedDays.reduce((sum, d) => sum + (d.contributionCount || 0), 0);

      // Streaks
      let longestStreak = 0;
      let currentStreak = 0;
      let tempStreak = 0;

      for (let i = 0; i < sortedDays.length; i++) {
        if (sortedDays[i].contributionCount > 0) {
          tempStreak++;
        } else {
          if (tempStreak > longestStreak) longestStreak = tempStreak;
          tempStreak = 0;
        }
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;

      const currentDayStr = new Date().toLocaleDateString('en-CA');
      const latestDataIndex = sortedDays.findIndex(d => d.date === currentDayStr);
      let searchIndex = latestDataIndex === -1 ? sortedDays.length - 1 : latestDataIndex;

      while (searchIndex >= 0 && sortedDays[searchIndex].contributionCount > 0) {
        currentStreak++;
        searchIndex--;
      }

      let currentStreakStart = null;
      let currentStreakEnd = null;
      if (currentStreak > 0) {
        currentStreakEnd = sortedDays[latestDataIndex === -1 ? sortedDays.length - 1 : latestDataIndex].date;
        currentStreakStart = sortedDays[(latestDataIndex === -1 ? sortedDays.length - 1 : latestDataIndex) - currentStreak + 1].date;
      }

      const dayDist = [0, 0, 0, 0, 0, 0, 0];
      sortedDays.forEach(d => {
        const dayIdx = new Date(d.date).getDay();
        dayDist[dayIdx] += (d.contributionCount || 0);
      });

      const maxDayVal = Math.max(...dayDist);
      const bestDayIdx = dayDist.indexOf(maxDayVal);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      setData({
        days: sortedDays,
        totalContributions,
        longestStreak,
        currentStreak,
        currentStreakRange: currentStreak > 0 ? `${new Date(currentStreakStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${new Date(currentStreakEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'No active streak',
        bestDay: dayNames[bestDayIdx],
        dayDist,
        lastUpdated: new Date().toLocaleTimeString()
      });
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const rollingStats = useMemo(() => {
    if (!data) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = [];
    const options = { month: 'short', day: 'numeric', year: 'numeric' };

    for (let i = 0; i < 2; i++) {
      const end = new Date(today);
      end.setFullYear(today.getFullYear() - i);
      const start = new Date(today);
      start.setFullYear(today.getFullYear() - (i + 1));
      start.setDate(start.getDate() + 1);

      const sStr = start.toLocaleDateString('en-CA');
      const eStr = end.toLocaleDateString('en-CA');

      const yearTotal = data.days
        .filter(d => d.date >= sStr && d.date <= eStr)
        .reduce((sum, d) => sum + (d.contributionCount || 0), 0);

      stats.push({
        total: yearTotal,
        range: `${start.toLocaleDateString(undefined, options)} - ${end.toLocaleDateString(undefined, options)}`
      });
    }
    return stats;
  }, [data]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setUsername(searchQuery.trim());
      fetchStats(searchQuery.trim());
    }
  };

  const handleCustomSearch = () => {
    if (!fromDate || !toDate || !data) return;
    const filteredDays = data.days.filter(d => d.date >= fromDate && d.date <= toDate);
    const total = filteredDays.reduce((sum, d) => sum + (d.contributionCount || 0), 0);
    const activeDays = filteredDays.filter(d => d.contributionCount > 0).length;

    setCustomStats({
      total,
      activeDays,
      range: `${new Date(fromDate).toLocaleDateString()} - ${new Date(toDate).toLocaleDateString()}`
    });
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const handleExportPDF = async () => {
    setIsGenerating(true);
    const element = document.getElementById('results-printable');
    if (!element) return;

    window.scrollTo(0, 0);
    element.classList.add('pdf-export-mode');
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 400));

    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#0f0111' });
      element.classList.remove('pdf-export-mode');
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? 'l' : 'p', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${username || 'github'}-analytics.pdf`);
    } catch (err) {
      console.error(err);
    }
    setIsGenerating(false);
  };

  return (
    <div id="root">
      <div id="results-printable" style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Motion.div className="title-block" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <Github size={50} style={{ color: 'var(--plum-vibrant)' }} />
          </div>
          <h1 className="title-main">Commit Count</h1>
          <p className="subtitle-main">Real-time GitHub analytics and streak tracking</p>

          <form onSubmit={handleSearch} className="search-wrapper">
            <div className="search-input-container">
              <Search size={22} className="search-icon-inner" />
              <input type="text" className="search-field" placeholder="Username" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <button type="submit" className="btn-premium" disabled={loading}>
              {loading ? <span className="loader-hex" style={{ width: '20px', height: '20px' }}></span> : 'Check Stats'}
            </button>
          </form>
        </Motion.div>

        <AnimatePresence mode="wait">
          {error && (
            <Motion.div className="error-banner" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Zap size={20} /> <span className="error-text">{error}</span>
            </Motion.div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '6rem 0' }}>
              <div className="loader-hex"></div>
              <p style={{ color: '#94a3b8', marginTop: '2rem' }}>Fetching Records...</p>
            </div>
          )}

          {data && !loading && (
            <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '20px' }}>
              <div className="status-badge-container">
                <div className="status-badge">
                  <Motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="status-dot"
                  />
                  <span className="status-text">Real-time records synchronized • Last check at {data.lastUpdated}</span>
                </div>
              </div>

              <div className="stats-container">
                <div className="data-card">
                  <div className="data-icon"><BarChart3 size={24} /></div>
                  <div className="data-label">Total Commits</div>
                  <div className="data-value">{data.totalContributions.toLocaleString()}</div>
                </div>
                <div className="data-card highlight-border">
                  <div className="data-icon"><Flame size={24} /></div>
                  <div className="data-label">Best Streak</div>
                  <div className="data-value">{data.longestStreak}</div>
                </div>
                <div className="data-card">
                  <div className="data-icon"><Award size={24} /></div>
                  <div className="data-label">Current Streak</div>
                  <div className="data-value">{data.currentStreak}</div>
                  <p className="data-sub" style={{ color: 'var(--plum-vibrant)' }}>{data.currentStreakRange}</p>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-card">
                  <div className="detail-title"><Activity size={20} /> Yearly Comparison</div>
                  <div className="velocity-display" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.5rem', width: '100%' }}>
                    <div className="v-item-box" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '18px' }}>
                      <span className="v-label-small" style={{ display: 'block', marginBottom: '0.25rem' }}>This Year</span>
                      <span className="v-label-micro" style={{ display: 'block', color: 'rgba(255,255,255,0.5)' }}>{rollingStats[0]?.range}</span>
                      <span className="v-val-large" style={{ display: 'block', marginTop: '1rem' }}>{rollingStats[0]?.total.toLocaleString()}</span>
                    </div>
                    <div className="v-item-box" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '18px' }}>
                      <span className="v-label-small" style={{ display: 'block', marginBottom: '0.25rem' }}>Last Year</span>
                      <span className="v-label-micro" style={{ display: 'block', color: 'rgba(255,255,255,0.5)' }}>{rollingStats[1]?.range}</span>
                      <span className="v-val-large" style={{ display: 'block', marginTop: '1rem' }}>{rollingStats[1]?.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="detail-card">
                  <div className="detail-title"><Clock size={20} /> Weekly Patterns</div>
                  <div className="chart-box-outer" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '18px' }}>
                    <div className="day-strip">
                      {data.dayDist.map((val, i) => (
                        <div
                          key={i}
                          className="day-bar"
                          style={{
                            height: `${Math.max((val / (Math.max(...data.dayDist) || 1)) * 100, 10)}%`,
                            background: 'var(--plum-vibrant)',
                            boxShadow: '0 4px 15px rgba(255, 0, 127, 0.2)'
                          }}
                        />
                      ))}
                    </div>
                    <div className="day-labels">
                      <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Date Filter Section */}
              <div className="filter-section">
                <h3 className="filter-title">Custom Date Filter</h3>
                <div className="input-block">
                  <div className="input-group">
                    <label className="label-text">FROM DATE</label>
                    <input type="date" className="date-input-field" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="label-text">TO DATE</label>
                    <input type="date" className="date-input-field" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                  </div>
                  <button className="btn-premium" onClick={handleCustomSearch}>
                    <Filter size={18} /> Apply Filter
                  </button>
                </div>

                <AnimatePresence>
                  {customStats && (
                    <Motion.div
                      className="query-grid"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <div className="query-box">
                        <div className="label-text">COMMITS FOUND</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{customStats.total.toLocaleString()}</div>
                      </div>
                      <div className="query-box">
                        <div className="label-text">ACTIVE DAYS</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{customStats.activeDays}</div>
                      </div>
                      <div className="query-box">
                        <div className="label-text">DAY AVERAGE</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{customStats.activeDays > 0 ? (customStats.total / customStats.activeDays).toFixed(2) : "0.00"}</div>
                      </div>
                    </Motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Motion.div>
          )}
        </AnimatePresence>

        <footer style={{ marginTop: 'auto', paddingTop: '4rem', paddingBottom: '3rem', borderTop: '1px solid var(--plum-mid)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.9rem' }}>
            <p>© 2026 Commit Count Analytics.</p>
            <span onClick={handleExportPDF} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Download size={16} /> {isGenerating ? 'Exporting...' : 'Export PDF'}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
