import { useState, useEffect, useMemo } from 'react';
import './App.css';
import {
  Search, Github, Calendar, Activity, TrendingUp, Filter,
  Flame, Award, BarChart3, Clock, Share2, Download, Zap, TrendingDown, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

  const fetchStats = async (user) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setCustomStats(null);
    const token = import.meta.env.VITE_GITHUB_TOKEN;

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
        const response = await fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers: {
            'Authorization': `bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            variables: { login: user, from: fromDate, to: toDate },
          }),
        });

        if (!response.ok) {
          if (response.status === 401) throw new Error('Invalid or expired GitHub Token');
          if (response.status === 404) throw new Error('GitHub User not found');
          throw new Error('GitHub infrastructure error');
        }

        const res = await response.json();
        if (res.errors) throw new Error(res.errors[0].message);
        if (!res.data.user) throw new Error('Target profile not identified');

        return res.data.user.contributionsCollection.contributionCalendar.weeks
          .flatMap(w => w.contributionDays);
      };

      const results = await Promise.all(yearsNeeded.map(y => fetchYear(y)));
      let allDays = results.flat();

      // Real-Time Patch: Fetch recent events to catch very new commits
      try {
        const eventsRes = await fetch(`https://api.github.com/users/${user}/events/public?per_page=30`, {
          headers: { 'Authorization': `bearer ${token}` }
        });
        if (eventsRes.ok) {
          const events = await eventsRes.json();
          const todayStr = new Date().toISOString().split('T')[0];
          let todayCommits = 0;
          
          events.forEach(ev => {
            if (ev.type === 'PushEvent' && ev.created_at.startsWith(todayStr)) {
              todayCommits += (ev.payload.size || 0);
            }
          });

          // Update today's entry if events show more commits than GraphQL
          const todayIdx = allDays.findIndex(d => d.date === todayStr);
          if (todayIdx !== -1) {
            allDays[todayIdx].contributionCount = Math.max(allDays[todayIdx].contributionCount, todayCommits);
          } else if (todayCommits > 0) {
            allDays.push({ date: todayStr, contributionCount: todayCommits });
          }
        }
      } catch (e) { console.warn("Live patch failed", e); }

      if (allDays.length === 0) {
        throw new Error('User not found or has no contribution history');
      }

      const dateMap = new Map();
      allDays.forEach(day => {
        if (day && day.date) dateMap.set(day.date, day);
      });

      const sortedDays = Array.from(dateMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
      const totalContributions = sortedDays.reduce((sum, d) => sum + (d.contributionCount || 0), 0);

      // Calculate Streaks
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

      const todayStr = new Date().toISOString().split('T')[0];
      const latestDataIndex = sortedDays.findIndex(d => d.date === todayStr);
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
        currentStreakRange: currentStreak > 0 ? `${new Date(currentStreakStart).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} - ${new Date(currentStreakEnd).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}` : 'No active streak',
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

      const sStr = start.toISOString().split('T')[0];
      const eStr = end.toISOString().split('T')[0];

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
    
    // Exact string comparison for 100% precision
    const filteredDays = data.days.filter(d => d.date >= fromDate && d.date <= toDate);

    const total = filteredDays.reduce((sum, d) => sum + (d.contributionCount || 0), 0);
    const activeDays = filteredDays.filter(d => d.contributionCount > 0).length;

    setCustomStats({
      total,
      activeDays,
      range: `${new Date(fromDate).toLocaleDateString()} - ${new Date(toDate).toLocaleDateString()}`
    });
  };

  return (
    <div id="root">
      <motion.div
        className="title-block"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <Github size={50} style={{ color: 'var(--plum-vibrant)' }} />
        </div>
        <h1 className="title-main">Commit Count</h1>
        <p className="subtitle-main">Fast, simple GitHub analytics and streak tracking</p>

        <form onSubmit={handleSearch} className="search-wrapper">
          <Search size={22} className="search-icon-fixed" />
          <input
            type="text"
            className="search-field"
            placeholder="Username (e.g. heyaryanmittal)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn-premium" disabled={loading}>
            {loading ? <span className="loader-hex" style={{ width: '20px', height: '20px' }}></span> : 'Check Stats'}
          </button>
        </form>
      </motion.div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            className="error-message"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ color: '#fecaca', background: 'rgba(161, 11, 86, 0.1)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--plum-bright)', maxWidth: '600px', margin: '2rem auto' }}
          >
            <Zap size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
            {error}
          </motion.div>
        )}

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ padding: '6rem 0', textAlign: 'center' }}
          >
            <div style={{ display: 'inline-block' }}>
              <div className="loader-hex"></div>
            </div>
            <p style={{ color: '#9ca3af', marginTop: '2rem', fontSize: '1.1rem' }}>Updating records...</p>
          </motion.div>
        )}

        {data && !loading && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'center' }}>
               <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '0.4rem 1rem', borderRadius: '50px', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                 <motion.div 
                   animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }} 
                   transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                   style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}
                 />
                 <span>Real-time records synchronized • Last check at {data.lastUpdated}</span>
               </div>
            </div>

            <div className="stats-container">
              <div className="data-card">
                <div className="data-icon"><BarChart3 size={24} /></div>
                <div className="data-label">Total Commits</div>
                <div className="data-value">{(data.totalContributions || 0).toLocaleString()}</div>
                <p className="data-sub">All-time activity found</p>
              </div>

              <div className="data-card highlight-border">
                <div className="data-icon"><Flame size={24} /></div>
                <div className="data-label">Best Streak</div>
                <div className="data-value">{data.longestStreak}</div>
                <p className="data-sub">Maximum consecutive days</p>
              </div>

              <div className="data-card">
                <div className="data-icon"><Award size={24} /></div>
                <div className="data-label">Current Streak</div>
                <div className="data-value">{data.currentStreak}</div>
                <p className="data-sub" style={{ color: 'var(--plum-vibrant)', fontWeight: 800 }}>{data.currentStreakRange}</p>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-card">
                <div className="detail-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Activity size={20} />
                    <span>Yearly Comparison</span>
                  </div>
                  <div style={{ fontSize: '0.65rem', background: 'rgba(161, 11, 86, 0.1)', padding: '0.3rem 0.8rem', borderRadius: '50px', color: '#9ca3af' }}>
                    Active since {new Date(data.days[0].date).getFullYear()}
                  </div>
                </div>
                <div className="velocity-display">
                  <div className="v-item">
                    <span className="v-label-small">This Year</span>
                    <span className="v-label-micro">{rollingStats[0]?.range}</span>
                    <span className="v-val-large" style={{ marginTop: '0.5rem' }}>{(rollingStats[0]?.total || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ width: '1px', height: '60px', background: 'var(--plum-mid)' }}></div>
                  <div className="v-item">
                    <span className="v-label-small">Last Year</span>
                    <span className="v-label-micro">{rollingStats[1]?.range}</span>
                    <span className="v-val-large" style={{ marginTop: '0.5rem' }}>{(rollingStats[1]?.total || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ marginTop: '1.5rem', color: '#9ca3af', fontSize: '0.9rem' }}>
                  {rollingStats[0]?.total > rollingStats[1]?.total ? (
                    <span style={{ color: '#10b981' }}><TrendingUp size={14} /> +{((rollingStats[0]?.total - rollingStats[1]?.total) / (rollingStats[1]?.total || 1) * 100).toFixed(1)}% growth</span>
                  ) : (
                    <span style={{ color: '#ef4444' }}><TrendingDown size={14} /> -{((rollingStats[1]?.total - rollingStats[0]?.total) / (rollingStats[1]?.total || 1) * 100).toFixed(1)}% drop</span>
                  )}
                </div>
              </div>

              <div className="detail-card">
                <div className="detail-title">
                  <Clock size={20} />
                  <span>Busiest Day</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'var(--plum-bright)', padding: '0.5rem 1.5rem', borderRadius: '12px', fontWeight: 800 }}>{data.bestDay}</div>
                  <p style={{ margin: 0, color: '#d1d5db' }}>Most active day of the week</p>
                </div>
                <div className="day-strip">
                  {data.dayDist.map((val, i) => (
                    <div
                      key={i}
                      className="day-bar"
                      style={{
                        height: `${(val / (Math.max(...data.dayDist) || 1)) * 100}%`,
                        backgroundColor: i === (new Date().getDay()) ? 'var(--plum-vibrant)' : 'var(--plum-mid)'
                      }}
                    ></div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem', color: '#6b7280' }}>
                  <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
                </div>
              </div>
            </div>

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
                  <motion.div
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer style={{ marginTop: 'auto', paddingBottom: '3rem', borderTop: '1px solid var(--plum-mid)', paddingTop: '3rem', color: '#6b7280' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
          <p>© 2026 GitHub Commit Analytics. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Share2 size={16} /> Share</span>
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Download size={16} /> Export</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
