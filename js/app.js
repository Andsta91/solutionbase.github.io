/* =====================================================
   SOLUTIONBASE v2 — App JS
   Loads data from data/solutions.json
   Renders: home, listing, detail views
===================================================== */

// ── Firebase Config ────────────────────────────────
// Config is loaded from firebase-config.js which is listed in .gitignore
// and never committed to the repository.
// window.FIREBASE_CONFIG is set by that file before this script runs.
// If the file is missing or has placeholder values, ratings fall back to local only.
const FIREBASE_CONFIG = (typeof window.FIREBASE_CONFIG !== 'undefined' &&
  window.FIREBASE_CONFIG.apiKey !== 'REPLACE_WITH_YOUR_API_KEY')
  ? window.FIREBASE_CONFIG
  : null;

// ── Shared Ratings Module ──────────────────────────
// Handles reading/writing aggregate ratings to Firebase Firestore
// Falls back gracefully if Firebase is not configured yet
const Ratings = {
  db: null,          // Firestore instance, set after Firebase init
  cache: {},         // { solutionId: { avg: 4.2, count: 17 } }
  listeners: {},     // active Firestore snapshot listeners

  // Call once after Firebase loads
  init(db) {
    this.db = db;
  },

  // Returns true if Firebase has been configured with real values
  isConfigured() {
    return FIREBASE_CONFIG !== null && this.db !== null;
  },

  // Subscribe to live aggregate rating for a solution
  // Calls callback(avg, count) whenever the value changes in Firestore
  subscribe(solutionId, callback) {
    if (!this.isConfigured()) return;
    if (this.listeners[solutionId]) return; // already listening

    const docRef = this.db.collection('ratings').doc(solutionId);
    const unsub = docRef.onSnapshot(snap => {
      if (snap.exists) {
        const data = snap.data();
        this.cache[solutionId] = { avg: data.avg || 0, count: data.count || 0 };
      } else {
        this.cache[solutionId] = { avg: 0, count: 0 };
      }
      callback(this.cache[solutionId].avg, this.cache[solutionId].count);
    }, () => {
      // Silently ignore errors (offline, unindexed, etc.)
    });
    this.listeners[solutionId] = unsub;
  },

  // Unsubscribe from live updates for a solution (call when leaving detail page)
  unsubscribe(solutionId) {
    if (this.listeners[solutionId]) {
      this.listeners[solutionId]();
      delete this.listeners[solutionId];
    }
  },

  // Submit or update a user's rating using a Firestore transaction
  // userPrev = previous rating (0 if none), userNew = new rating (0 = remove)
  async submit(solutionId, userPrev, userNew) {
    if (!this.isConfigured()) return;
    const docRef = this.db.collection('ratings').doc(solutionId);

    try {
      await this.db.runTransaction(async tx => {
        const snap = await tx.get(docRef);
        let total = 0, count = 0;
        if (snap.exists) { total = snap.data().total || 0; count = snap.data().count || 0; }

        // Remove previous rating contribution
        if (userPrev > 0) { total -= userPrev; count -= 1; }
        // Add new rating contribution
        if (userNew > 0)  { total += userNew;  count += 1; }

        if (count <= 0) {
          tx.delete(docRef);
        } else {
          tx.set(docRef, { total, count, avg: Math.round((total / count) * 10) / 10 });
        }
      });
    } catch (e) {
      // Silently fail — user's local rating is still saved
    }
  },

  // Get cached aggregate (used for immediate render before Firestore responds)
  get(solutionId) {
    return this.cache[solutionId] || { avg: 0, count: 0 };
  }
};

// ── State ──────────────────────────────────────────
const App = {
  solutions: [],
  filtered: [],
  currentView: 'home',
  currentSolution: null,
  activeFilter: 'all',
  searchQuery: '',
  difficultyFilter: '',
  darkMode: false,
  comments: {},
  ratings: JSON.parse(localStorage.getItem('sb-ratings') || '{}'),
  compareList: [],
  recentlyViewed: JSON.parse(localStorage.getItem('sb-recent') || '[]'),
  favourites: JSON.parse(localStorage.getItem('sb-favourites') || '[]'),       // pinned solution IDs
  likes: JSON.parse(localStorage.getItem('sb-likes') || '{}'),                 // { id: true } = liked
  localViews: JSON.parse(localStorage.getItem('sb-views') || '{}'),            // { id: count } extra views
  localDownloads: JSON.parse(localStorage.getItem('sb-downloads') || '{}'),    // { id: count } extra downloads

  sampleComments: {
    "employee-onboarding": [
      { author: "Alex Chen", initials: "AC", color: "#0078d4", text: "Deployed this last month — cut onboarding time by 40%. The Teams card integration is seamless. Had to tweak permission groups for our GCC tenant but docs were clear.", time: "3 days ago" },
      { author: "Maria Santos", initials: "MS", color: "#038387", text: "Anyone run this on a GCC High tenant? We have some connector restrictions around external HTTP calls.", time: "1 day ago" }
    ],
    "approval-engine": [
      { author: "Priya Narayan", initials: "PN", color: "#ca5010", text: "This is exactly what we needed. Configured 12 different approval workflows without ever opening the flow editor. The config-list approach is genius.", time: "1 week ago" },
      { author: "Tom Richards", initials: "TR", color: "#107c10", text: "Hit an issue with parallel mode + external users. Filed an issue on the repo. Team responded within a day — great support.", time: "4 days ago" }
    ],
    "modern-intranet": [
      { author: "Sarah Kim", initials: "SK", color: "#0052cc", text: "Deployed to our 5,000-person org. The OrgChart web part is fast and audience targeting on news saved us weeks of dev work.", time: "2 weeks ago" }
    ]
  }
};

// ── Boot ────────────────────────────────────────────
async function boot() {
  // Load dark mode pref
  const savedDark = localStorage.getItem('sb-dark') === 'true';
  if (savedDark) {
    App.darkMode = true;
    document.body.classList.add('dark');
    document.querySelectorAll('.theme-icon').forEach(el => el.textContent = '☀️');
  }

  try {
    const res = await fetch('./data/solutions.json');
    App.solutions = await res.json();
  } catch (e) {
    console.warn('Could not load solutions.json, using empty set:', e);
    App.solutions = [];
  }

  App.filtered = [...App.solutions];

  // ── Initialize Firebase (shared ratings) ──────────
  try {
    if (typeof firebase !== 'undefined' && FIREBASE_CONFIG !== null) {
      firebase.initializeApp(FIREBASE_CONFIG);
      Ratings.init(firebase.firestore());
    }
  } catch (e) {
    // Firebase not available or already initialized — ratings fall back to local only
  }

  // Populate category counts
  updateCatCounts();

  // Set up search
  const sideSearch = document.getElementById('sidebar-search');
  if (sideSearch) {
    sideSearch.addEventListener('input', e => {
      App.searchQuery = e.target.value;
      applyFilters();
      if (App.currentView !== 'solutions') showView('solutions');
      else renderGrid();
    });
  }

  // Topbar selects
  const toolSel = document.getElementById('toolFilter');
  const diffSel = document.getElementById('difficultyFilter');
  if (toolSel) toolSel.addEventListener('change', e => { App.activeFilter = e.target.value; applyFilters(); renderGrid(); });
  if (diffSel) diffSel.addEventListener('change', e => { App.difficultyFilter = e.target.value; applyFilters(); renderGrid(); });

  // Sort
  const sortSel = document.getElementById('sortSelect');
  if (sortSel) sortSel.addEventListener('change', () => { applyFilters(); renderGrid(); });

  // Sidebar nav
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      const nav = el.dataset.nav;
      if (nav === 'all' || nav === 'home') {
        showView('home');
      } else if (nav === 'solutions') {
        App.activeFilter = 'all';
        applyFilters();
        showView('solutions');
      } else {
        App.activeFilter = nav;
        applyFilters();
        showView('solutions');
        // Sync dropdown
        const toolSel = document.getElementById('toolFilter');
        if (toolSel) toolSel.value = nav !== 'all' ? nav : '';
      }
      closeMobileMenu();
    });
  });

  // Theme toggles
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', toggleDark);
  });

  // Mobile menu
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.querySelector('.sidebar');
  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Close sidebar on outside click (mobile)
  document.addEventListener('click', e => {
    if (window.innerWidth <= 900 && sidebar && !sidebar.contains(e.target) && !mobileBtn?.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });

  // Handle hash routing
  handleHash();
  window.addEventListener('popstate', handleHash);

  // First render
  if (App.currentView === 'home') {
    renderHome();
    setTimeout(() => initFadeIns(), 100);
  }

  // Keyboard + command palette
  initKeyboard();
  const cmdInput = document.getElementById('cmd-input');
  if (cmdInput) cmdInput.addEventListener('input', e => renderCmdResults(e.target.value));
  document.getElementById('cmd-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'cmd-overlay') closeCmdPalette();
  });
  document.getElementById('cmd-trigger')?.addEventListener('click', openCmdPalette);

  // About nav links
  document.querySelectorAll('[data-nav="about"]').forEach(el => {
    el.addEventListener('click', () => { showView('about'); closeMobileMenu(); });
  });

  // Favourites nav
  document.querySelectorAll('[data-nav="favourites"]').forEach(el => {
    el.addEventListener('click', () => { showView('favourites'); closeMobileMenu(); });
  });

  // Share popup Escape key close
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const overlay = document.getElementById('share-overlay');
      if (overlay && overlay.classList.contains('open')) closeSharePopup();
    }
  });

  // Init localLikeDelta
  App.localLikeDelta = JSON.parse(localStorage.getItem('sb-like-delta') || '{}');

  // Init fav count
  updateFavCount();

  // Start typing animation
  startTypingAnimation();
}

// ── Hash Routing ────────────────────────────────────
function handleHash() {
  const hash = window.location.hash;
  if (hash.startsWith('#solution/')) {
    const id = hash.replace('#solution/', '');
    const sol = App.solutions.find(s => s.id === id);
    if (sol) openDetail(sol, false);
    else showView('home');
  } else if (hash === '#solutions') {
    showView('solutions');
  } else if (hash === '#about') {
    showView('about');
  } else if (hash === '#favourites') {
    showView('favourites');
  } else {
    showView('home');
  }
}

// ── Navigation ──────────────────────────────────────
function showView(view) {
  App.currentView = view;

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.detail-view').forEach(v => v.classList.remove('active'));

  if (view === 'home') {
    document.getElementById('view-home').classList.add('active');
    renderHome();
    updateSidebarActive('home');
    history.pushState(null, '', '#');
    setTimeout(() => initFadeIns(document.getElementById('view-home')), 50);
  } else if (view === 'solutions') {
    document.getElementById('view-solutions').classList.add('active');
    // Unsubscribe from any active Firestore rating listeners
    if (App.currentSolution) Ratings.unsubscribe(App.currentSolution.id);
    renderGrid();
    renderFilterPills();
    updateSidebarActive(App.activeFilter === 'all' ? 'solutions' : App.activeFilter);
    history.pushState(null, '', '#solutions');
  } else if (view === 'detail') {
    document.getElementById('view-detail').classList.add('active');
    updateSidebarActive('');
  } else if (view === 'about') {
    document.getElementById('view-about').classList.add('active');
    updateSidebarActive('about');
    history.pushState(null, '', '#about');
    renderAboutView();
  } else if (view === 'favourites') {
    document.getElementById('view-favourites').classList.add('active');
    updateSidebarActive('favourites');
    history.pushState(null, '', '#favourites');
    renderFavouritesView();
  }

  // Update topbar title
  const titles = { home: 'Home', solutions: 'All Solutions', detail: App.currentSolution?.title || 'Solution', about: 'About' };
  const titleEl = document.querySelector('.topbar-title');
  if (titleEl) titleEl.textContent = titles[view] || '';

  window.scrollTo(0, 0);
}

function updateSidebarActive(key) {
  document.querySelectorAll('.sidebar-link').forEach(el => {
    el.classList.toggle('active', el.dataset.nav === key);
  });
}

function closeMobileMenu() {
  document.querySelector('.sidebar')?.classList.remove('open');
}

// ── Filtering ───────────────────────────────────────
function applyFilters() {
  let results = [...App.solutions];
  const q = App.searchQuery.toLowerCase().trim();
  const sortSel = document.getElementById('sortSelect');
  const sortVal = sortSel?.value || 'stars';

  if (q) {
    results = results.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tool.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  if (App.activeFilter && App.activeFilter !== 'all') {
    results = results.filter(s => s.tool === App.activeFilter);
  }

  if (App.difficultyFilter) {
    results = results.filter(s => s.difficulty === App.difficultyFilter);
  }

  const sortFns = {
    stars: (a, b) => b.stars - a.stars,
    downloads: (a, b) => b.downloads - a.downloads,
    newest: (a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated),
    title: (a, b) => a.title.localeCompare(b.title)
  };

  results.sort(sortFns[sortVal] || sortFns.stars);
  App.filtered = results;
}

// ── Home View ───────────────────────────────────────
function renderHome() {
  const featured = App.solutions.filter(s => s.featured);

  updateCatCounts();

  // What's New banner
  const wnContainer = document.getElementById('whats-new-container');
  if (wnContainer) wnContainer.innerHTML = renderWhatsNew();

  // Recently Viewed section
  renderRecentlyViewed();

  // Featured grid
  const featuredEl = document.getElementById('featured-grid');
  if (featuredEl) featuredEl.innerHTML = featured.map((s, i) => cardHTML(s, i * 70)).join('');

  // Hero stats
  const totalDownloads = App.solutions.reduce((a, s) => a + s.downloads, 0);
  const el = document.getElementById('stat-downloads');
  if (el) el.textContent = formatNum(totalDownloads) + '+';
}

function updateCatCounts() {
  const cats = ['Power Apps', 'Power Automate', 'SharePoint', 'PowerShell'];
  cats.forEach(cat => {
    const count = App.solutions.filter(s => s.tool === cat).length;
    document.querySelectorAll(`[data-cat-count="${cat}"]`).forEach(el => el.textContent = count);
  });
  document.querySelectorAll('[data-cat-count="all"]').forEach(el => el.textContent = App.solutions.length);
}

// ── Solutions Grid ──────────────────────────────────
function renderGrid() {
  applyFilters();
  const container = document.getElementById('solutions-grid');
  const countEl = document.getElementById('grid-count');

  if (countEl) countEl.innerHTML = `<strong>${App.filtered.length}</strong> solution${App.filtered.length !== 1 ? 's' : ''}`;

  if (!container) return;

  if (App.filtered.length === 0) {
    container.innerHTML = `
      <div class="no-results">
        <span class="no-results-icon">🔍</span>
        <h3>No solutions found</h3>
        <p style="font-size:0.82rem">Try different search terms or filters</p>
      </div>`;
    return;
  }

  container.innerHTML = App.filtered.map((s, i) => cardHTML(s, i * 40)).join('');
}

function statusConfig(s) {
  const map = {
    'Production Ready': { dot: '#22c55e', label: 'Production Ready' },
    'Beta':             { dot: '#f59e0b', label: 'Beta' },
    'Deprecated':       { dot: '#ef4444', label: 'Deprecated' },
    'Experimental':     { dot: '#ef4444', label: 'Experimental' }
  };
  return map[s] || { dot: '#8892a4', label: s || 'Unknown' };
}

function useCaseConfig(u) {
  const map = {
    'HR':         { emoji: '👤', label: 'HR' },
    'Finance':    { emoji: '💰', label: 'Finance' },
    'Automation': { emoji: '⚙️', label: 'Automation' },
    'Reporting':  { emoji: '📊', label: 'Reporting' }
  };
  return map[u] || { emoji: '🏷️', label: u || 'General' };
}

function getLikes(s)     { return (s.likes || 0) + (App.localLikeDelta ? (App.localLikeDelta[s.id] || 0) : 0); }
function getViews(s)     { return (s.views || 0) + (App.localViews[s.id] || 0); }
function getDownloads(s) { return (s.downloads || 0) + (App.localDownloads[s.id] || 0); }

// ── Card visual generator ── generates a CSS gradient "image" per solution
function cardVisual(s) {
  const color = s.color || '#0078d4';
  // Generate a unique abstract gradient using the solution color + icon
  const palettes = {
    '#0078d4': ['#667eea', '#764ba2', '#0078d4'],
    '#0066b8': ['#4facfe', '#00f2fe', '#0066b8'],
    '#038387': ['#0acf97', '#038387', '#00b4d8'],
    '#5c2d91': ['#a855f7', '#7c3aed', '#5c2d91'],
    '#107c10': ['#56ab2f', '#a8e063', '#107c10'],
    '#ca5010': ['#f7971e', '#ffd200', '#ca5010'],
    '#6264a7': ['#6264a7', '#8b5cf6', '#a78bfa'],
    '#d13438': ['#f953c6', '#b91d73', '#d13438']
  };
  const pal = palettes[color] || [color, color + 'aa', color + '55'];
  return `radial-gradient(ellipse at 30% 20%, ${pal[0]}cc 0%, transparent 60%),
          radial-gradient(ellipse at 80% 80%, ${pal[1]}99 0%, transparent 55%),
          radial-gradient(ellipse at 60% 50%, ${pal[2]}66 0%, transparent 70%),
          linear-gradient(135deg, #f8f9ff 0%, #eef0f8 100%)`;
}

// ── Metrics helpers ────────────────────────────────────
// Store daily view logs: { 'YYYY-MM-DD': count }
function logDailyView(id) {
  const key  = 'sb-daily-' + id;
  const data = JSON.parse(localStorage.getItem(key) || '{}');
  const today = new Date().toISOString().split('T')[0];
  data[today] = (data[today] || 0) + 1;
  // Keep only last 35 days
  const sorted = Object.keys(data).sort().slice(-35);
  const trimmed = {};
  sorted.forEach(d => { trimmed[d] = data[d]; });
  localStorage.setItem(key, JSON.stringify(trimmed));
}

function getDayMetrics(id, days) {
  const key  = 'sb-daily-' + id;
  const data = JSON.parse(localStorage.getItem(key) || '{}');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return Object.entries(data)
    .filter(([d]) => new Date(d) >= cutoff)
    .reduce((sum, [, v]) => sum + v, 0);
}

function getBarData(id) {
  // Returns last 7 days as array [{ label, count }]
  const key  = 'sb-daily-' + id;
  const data = JSON.parse(localStorage.getItem(key) || '{}');
  const bars = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label   = d.toLocaleDateString('en-GB', { weekday: 'short' });
    bars.push({ label, count: data[dateStr] || 0 });
  }
  return bars;
}

function flipCard(id, e) {
  if (e) e.stopPropagation();
  const wrap = document.getElementById('card-' + id);
  if (!wrap) return;
  const inner = wrap.querySelector('.flip-inner');
  if (!inner) return;
  const isFlipped = inner.classList.toggle('flipped');

  if (isFlipped) {
    // Reset to 7d tab and refresh
    const tabsEl = document.getElementById('bc-tabs-' + id);
    if (tabsEl) {
      tabsEl.querySelectorAll('.bc-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
    }
    refreshBackMetrics(id, 7);
  }
}

function refreshBackMetrics(id, days) {
  const period = days || 7;
  const sol = App.solutions.find(s => s.id === id);
  if (!sol) return;

  // Period-scoped views and downloads
  const vPeriod  = getDayMetrics(id, period) + Math.round((sol.views || 0) * (period / 200));
  const dlPeriod = Math.round(getDownloads(sol) * (period / 120));

  // Update top metric cards
  const setEl = (elId, val) => { const el = document.getElementById(elId); if (el) el.textContent = val; };
  setEl('bm-views-'    + id, formatNum(vPeriod));
  setEl('bm-views-lbl-'+ id, period + 'd period');
  setEl('bm-dls-'      + id, formatNum(dlPeriod));
  setEl('bm-dls-lbl-'  + id, period + 'd period');

  // Update totals
  setEl('bm-tot-v-'  + id, formatNum(getViews(sol)));
  setEl('bm-tot-dl-' + id, formatNum(getDownloads(sol)));
  setEl('bm-fav-'    + id, App.favourites.includes(id) ? '⭐ Yes' : '—');

  // Update chart label
  const lblEl = document.getElementById('bc-chart-lbl-' + id);
  if (lblEl) lblEl.textContent = 'Last ' + period + ' days — daily views';

  // Rebuild bar chart for selected period
  const chartEl = document.getElementById('bc-chart-' + id);
  if (chartEl) {
    // Build N bars for the period (max 14 bars shown, grouped for 30d)
    const barsToShow = period <= 14 ? period : 15;
    const groupSize  = period <= 14 ? 1 : Math.ceil(period / 15);
    const key = 'sb-daily-' + id;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    const bars = [];

    for (let i = barsToShow - 1; i >= 0; i--) {
      let count = 0;
      let label = '';
      for (let g = 0; g < groupSize; g++) {
        const d = new Date();
        d.setDate(d.getDate() - (i * groupSize + g));
        const ds = d.toISOString().split('T')[0];
        count += data[ds] || 0;
        if (g === 0) {
          label = groupSize === 1
            ? d.toLocaleDateString('en-GB', { weekday: 'short' })
            : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        }
      }
      bars.push({ label, count });
    }

    const maxB = Math.max(...bars.map(b => b.count), 1);

    chartEl.innerHTML = bars.map((b, i) => {
      const pct = Math.max(6, Math.round((b.count / maxB) * 100));
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:1;">
          <div style="width:100%;background:rgba(129,140,248,0.15);border-radius:3px;height:70px;display:flex;align-items:flex-end;">
            <div style="width:100%;height:${pct}%;background:linear-gradient(180deg,#818cf8,#6366f1);border-radius:3px;
                        transition:height 0.5s cubic-bezier(0.34,1.56,0.64,1) ${i*30}ms;">
            </div>
          </div>
          <span style="font-size:0.48rem;color:#475569;font-family:var(--font-mono);white-space:nowrap;">${b.label}</span>
        </div>`;
    }).join('');
  }
}

// Called by period tab buttons on the back face
function switchPeriod(id, days, btn) {
  // Update active tab
  const tabsEl = document.getElementById('bc-tabs-' + id);
  if (tabsEl) {
    tabsEl.querySelectorAll('.bc-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
  }
  // Refresh metrics for the chosen period
  refreshBackMetrics(id, days);
}

function cardHTML(s, delay = 0) {
  // Defensive defaults for submissions missing new fields
  const color   = s.color || '#0078d4';
  const isFav   = App.favourites.includes(s.id);
  const isLiked = !!App.likes[s.id];
  const sc      = statusConfig(s.status || 'Production Ready');
  const uc      = useCaseConfig(s.useCase || 'General');
  const sub     = s.submitter || {
    name:     s.author || 'SolutionBase',
    initials: (s.author || 'SB').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase(),
    color:    color
  };
  const likes   = getLikes(s);
  const views   = getViews(s);
  const dls     = getDownloads(s);
  const created = s.lastUpdated
    ? new Date(s.lastUpdated).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
    : '';
  const setupT  = s.setupTime || deployTime(s);
  const learnT  = s.learnTime || '—';
  const titleSafe = (s.title || '').replace(/'/g, "\\'");

  // Initial bar chart (7d) — rendered as inline HTML for the back face
  const bars = getBarData(s.id);
  const maxB = Math.max(...bars.map(b => b.count), 1);
  const barHTML = bars.map(b => {
    const pct = Math.max(6, Math.round((b.count / maxB) * 100));
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;">
      <div style="width:100%;background:rgba(99,102,241,0.15);border-radius:3px 3px 0 0;height:100%;display:flex;align-items:flex-end;">
        <div style="width:100%;height:${pct}%;background:linear-gradient(180deg,#818cf8,#6366f1);border-radius:3px 3px 0 0;transition:height 0.5s ease;"></div>
      </div>
      <span style="font-size:0.48rem;color:rgba(255,255,255,0.25);font-family:var(--font-mono);white-space:nowrap;">${b.label}</span>
    </div>`;
  }).join('');

  return `
    <div class="flip-wrap" id="card-${s.id}" style="animation-delay:${delay}ms"
         onmousemove="tiltCard(event,this)" onmouseleave="resetCard(this)">
      <div class="flip-inner" id="flip-inner-${s.id}">

        <!-- ══════════════ FRONT FACE ══════════════ -->
        <div class="flip-front">
          <!-- Animated border ring -->
          <div class="flip-border" style="--fc:${color}"></div>

          <!-- Top bar: status + controls -->
          <div class="fc-topbar">
            <span class="fc-status-pill" style="--sc:${sc.dot}">
              <span class="fc-dot"></span>${sc.label}
            </span>
            <div style="display:flex;gap:4px;align-items:center;">
              <button class="fc-icon-btn pin-btn ${isFav ? 'active' : ''}"
                      id="pin-${s.id}" title="${isFav ? 'Unpin' : 'Pin to favourites'}"
                      onclick="event.stopPropagation();toggleFavourite('${s.id}')">📌</button>
              <button class="fc-icon-btn" title="Share"
                      onclick="event.stopPropagation();openShare('${s.id}','${titleSafe}')">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
              <button class="fc-flip-btn" title="View analytics"
                      onclick="flipCard('${s.id}',event)">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              </button>
            </div>
          </div>

          <!-- Hero: icon + title -->
          <div class="fc-hero" onclick="openDetail(App.solutions.find(x=>x.id==='${s.id}'))">
            <div class="fc-icon-wrap">${s.icon}</div>
            <div style="min-width:0;">
              <div class="fc-uc-badge">${uc.emoji} ${uc.label} · ${s.tool}</div>
              <h3 class="fc-title">${s.title}</h3>
              <p class="fc-subtitle">${(s.description || '').slice(0, 65)}…</p>
            </div>
          </div>

          <hr class="fc-line" />

          <!-- Tag checklist -->
          <ul class="fc-list" onclick="openDetail(App.solutions.find(x=>x.id==='${s.id}'))">
            ${(s.tags || []).slice(0, 4).map(t => `
              <li class="fc-list-item">
                <span class="fc-check">
                  <svg viewBox="0 0 16 16" fill="currentColor" class="fc-check-svg">
                    <path fill-rule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"/>
                  </svg>
                </span>
                <span class="fc-list-text">${t}</span>
              </li>`).join('')}
          </ul>

          <!-- Times + difficulty -->
          <div class="fc-times">
            <span class="fc-time-item">⏱ ${setupT}</span>
            <span class="fc-sep">·</span>
            <span class="fc-time-item">🧠 ${learnT}</span>
            <span class="fc-diff fc-diff-${(s.difficulty || 'Intermediate').toLowerCase()}">${s.difficulty || 'Intermediate'}</span>
          </div>

          <!-- Footer: submitter + stats -->
          <div class="fc-footer">
            <div class="fc-submitter" onclick="openDetail(App.solutions.find(x=>x.id==='${s.id}'))">
              <div class="fc-avatar" style="background:${sub.color}">${sub.initials}</div>
              <div style="min-width:0;overflow:hidden;">
                <div class="fc-sub-name">${sub.name}</div>
                <div class="fc-sub-date">${created}</div>
              </div>
            </div>
            <div class="fc-stats">
              <button class="fc-stat-btn like-btn ${isLiked ? 'liked' : ''}"
                      id="like-btn-${s.id}"
                      onclick="event.stopPropagation();toggleLike('${s.id}')">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <span id="like-count-${s.id}">${formatNum(likes)}</span>
              </button>
              <span class="fc-stat-item">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <span id="view-count-${s.id}">${formatNum(views)}</span>
              </span>
              <button class="fc-stat-btn dl-btn"
                      onclick="event.stopPropagation();handleDownload('${s.id}','${s.packagePath || ''}')">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span id="dl-count-${s.id}">${formatNum(dls)}</span>
              </button>
            </div>
          </div>

          <!-- CTA -->
          <button class="fc-cta" onclick="openDetail(App.solutions.find(x=>x.id==='${s.id}'))">
            View Solution →
          </button>
        </div><!-- /flip-front -->

        <!-- ══════════════ BACK FACE ══════════════ -->
        <div class="flip-back">
          <!-- Animated border ring -->
          <div class="flip-border" style="--fc:${color}"></div>

          <!-- Top bar -->
          <div class="fc-topbar">
            <div style="display:flex;align-items:center;gap:7px;">
              <div class="bc-icon-wrap" style="background:linear-gradient(135deg,${color},${color}99)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <span class="bc-heading">Analytics</span>
            </div>
            <div style="display:flex;align-items:center;gap:5px;">
              <span class="bc-live-badge"><span class="bc-live-dot"></span>Live</span>
              <button class="fc-flip-btn" title="Back to card" onclick="flipCard('${s.id}',event)">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              </button>
            </div>
          </div>

          <!-- Period tabs -->
          <div class="bc-period-tabs" id="bc-tabs-${s.id}">
            <button class="bc-tab active" onclick="switchPeriod('${s.id}',7,this)">7 days</button>
            <button class="bc-tab" onclick="switchPeriod('${s.id}',14,this)">14 days</button>
            <button class="bc-tab" onclick="switchPeriod('${s.id}',30,this)">30 days</button>
          </div>

          <!-- Metrics -->
          <div class="bc-grid">
            <div class="bc-metric">
              <p class="bc-metric-label">Views</p>
              <p class="bc-metric-val" id="bm-views-${s.id}">${formatNum(views)}</p>
              <span class="bc-metric-sub" id="bm-views-lbl-${s.id}">all time</span>
            </div>
            <div class="bc-metric">
              <p class="bc-metric-label">Downloads</p>
              <p class="bc-metric-val" id="bm-dls-${s.id}">${formatNum(dls)}</p>
              <span class="bc-metric-sub" id="bm-dls-lbl-${s.id}">all time</span>
            </div>
          </div>

          <!-- Bar chart -->
          <div class="bc-chart-wrap">
            <div class="bc-chart-label" id="bc-chart-lbl-${s.id}">Last 7 days — daily views</div>
            <div class="bc-chart" id="bc-chart-${s.id}" style="height:70px;">${barHTML}</div>
          </div>

          <!-- Summary totals -->
          <div class="bc-summary-row">
            <div class="bc-summary-item">
              <span class="bc-summary-label">Total Views</span>
              <span class="bc-summary-val" id="bm-tot-v-${s.id}">${formatNum(views)}</span>
            </div>
            <div class="bc-summary-divider"></div>
            <div class="bc-summary-item">
              <span class="bc-summary-label">Downloads</span>
              <span class="bc-summary-val" id="bm-tot-dl-${s.id}">${formatNum(dls)}</span>
            </div>
            <div class="bc-summary-divider"></div>
            <div class="bc-summary-item">
              <span class="bc-summary-label">Pinned</span>
              <span class="bc-summary-val" id="bm-fav-${s.id}">${isFav ? '⭐' : '—'}</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="bc-footer" style="margin-top:auto;">
            <span style="font-size:0.6rem;color:rgba(255,255,255,0.25);font-family:var(--font-mono);">Local analytics</span>
            <button class="bc-detail-btn" onclick="openDetail(App.solutions.find(x=>x.id==='${s.id}'))">
              View Details
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div><!-- /flip-back -->

      </div><!-- /flip-inner -->
    </div>`;
}

function deployTime(sol) {
  const mins = sol.components.length * 20 + (sol.difficulty === 'Beginner' ? 0 : sol.difficulty === 'Intermediate' ? 30 : 60);
  if (mins < 60) return mins + 'm';
  return (mins / 60).toFixed(1).replace('.0','') + 'h';
}

// ── Favourites ────────────────────────────────────────
function toggleFavourite(id) {
  const idx = App.favourites.indexOf(id);
  if (idx > -1) {
    App.favourites.splice(idx, 1);
    toast('Removed from favourites');
  } else {
    App.favourites.unshift(id);
    toast('📌 Pinned to favourites!');
  }
  localStorage.setItem('sb-favourites', JSON.stringify(App.favourites));
  updateFavCount();

  // Toggle pin button state on card
  const btn = document.getElementById('pin-' + id);
  if (btn) {
    const isFav = App.favourites.includes(id);
    btn.classList.toggle('active', isFav);
    btn.title = isFav ? 'Unpin from favourites' : 'Pin to favourites';
  }
}

function updateFavCount() {
  const el = document.getElementById('fav-count');
  if (el) el.textContent = App.favourites.length;
}

function renderFavouritesView() {
  const el = document.getElementById('view-favourites');
  if (!el) return;

  const favSolutions = App.favourites
    .map(id => App.solutions.find(s => s.id === id))
    .filter(Boolean);

  if (favSolutions.length === 0) {
    el.innerHTML = `
      <div style="padding:64px 28px; text-align:center; color:var(--text-tertiary);">
        <div style="font-size:3rem; margin-bottom:16px;">📌</div>
        <div style="font-family:var(--font-display); font-style:italic; font-size:1.1rem; color:var(--text-secondary); margin-bottom:8px;">No pinned solutions yet</div>
        <p style="font-size:0.85rem; margin-bottom:20px; max-width:320px; margin-inline:auto;">Click the 📌 icon on any solution card to pin it here for quick access.</p>
        <button class="btn-primary" onclick="showView('solutions')">Browse Solutions</button>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div style="padding:24px 28px 8px;">
      <h1 style="font-family:var(--font-display); font-style:italic; font-size:1.4rem; font-weight:800; letter-spacing:-0.03em; margin-bottom:4px;">📌 Pinned Solutions</h1>
      <p style="font-size:0.82rem; color:var(--text-tertiary); margin-bottom:0;">${favSolutions.length} solution${favSolutions.length !== 1 ? 's' : ''} pinned</p>
    </div>
    <div class="solutions-grid" style="border-top:1px solid var(--border); margin-top:16px;">
      ${favSolutions.map((s, i) => cardHTML(s, i * 50)).join('')}
    </div>`;
}

// ── Likes ─────────────────────────────────────────────
if (!App.localLikeDelta) App.localLikeDelta = JSON.parse(localStorage.getItem('sb-like-delta') || '{}');

function toggleLike(id) {
  const wasLiked = !!App.likes[id];
  if (wasLiked) {
    delete App.likes[id];
    App.localLikeDelta[id] = (App.localLikeDelta[id] || 0) - 1;
  } else {
    App.likes[id] = true;
    App.localLikeDelta[id] = (App.localLikeDelta[id] || 0) + 1;
  }
  localStorage.setItem('sb-likes', JSON.stringify(App.likes));
  localStorage.setItem('sb-like-delta', JSON.stringify(App.localLikeDelta));

  const sol = App.solutions.find(s => s.id === id);
  if (!sol) return;
  const newCount = getLikes(sol);
  const isLiked  = !!App.likes[id];

  // Update card button
  const btn   = document.getElementById('like-btn-' + id);
  const count = document.getElementById('like-count-' + id);
  if (btn)   btn.classList.toggle('liked', isLiked);
  if (count) count.textContent = formatNum(newCount);

  // Update detail page like button if open
  const detailBtn   = document.getElementById('detail-like-btn-' + id);
  const detailCount = document.getElementById('detail-like-count-' + id);
  if (detailBtn)   detailBtn.classList.toggle('liked', isLiked);
  if (detailCount) detailCount.textContent = formatNum(newCount);

  toast(isLiked ? '❤️ Liked!' : 'Like removed');
}

// ── Views ─────────────────────────────────────────────
function trackView(id) {
  App.localViews[id] = (App.localViews[id] || 0) + 1;
  localStorage.setItem('sb-views', JSON.stringify(App.localViews));
  logDailyView(id);
  const el  = document.getElementById('view-count-' + id);
  const sol = App.solutions.find(s => s.id === id);
  if (el && sol) el.textContent = formatNum(getViews(sol));
}

// ── Downloads ─────────────────────────────────────────
function handleDownload(id, url) {
  App.localDownloads[id] = (App.localDownloads[id] || 0) + 1;
  localStorage.setItem('sb-downloads', JSON.stringify(App.localDownloads));
  // Update card download count
  const el = document.getElementById('dl-count-' + id);
  const sol = App.solutions.find(s => s.id === id);
  if (el && sol) el.textContent = formatNum(getDownloads(sol));
  // Update detail page count
  const detailEl = document.getElementById('detail-dl-count-' + id);
  if (detailEl && sol) detailEl.textContent = formatNum(getDownloads(sol));
  // Open the download
  if (url) window.open(url, '_blank');
}

// ── Share Popup ───────────────────────────────────────
function openShare(id, title) {
  const url = location.origin + location.pathname + '#solution/' + id;
  document.getElementById('share-title').textContent = title;
  document.getElementById('share-url-input').value   = url;
  document.getElementById('share-copied').textContent = '';
  document.getElementById('share-overlay').classList.add('open');
}

function closeSharePopup() {
  document.getElementById('share-overlay').classList.remove('open');
}

function closeShare(e) {
  if (e.target.id === 'share-overlay') closeSharePopup();
}

function copyShareUrl() {
  const input = document.getElementById('share-url-input');
  navigator.clipboard.writeText(input.value).then(() => {
    const el = document.getElementById('share-copied');
    el.textContent = '✓ Copied to clipboard!';
    setTimeout(() => { el.textContent = ''; }, 2500);
  });
}

function mailShare() {
  const input = document.getElementById('share-url-input');
  const title = document.getElementById('share-title').textContent;
  const body  = 'Hi,%0A%0AI thought you might find this useful:%0A%0A' + encodeURIComponent(title) + '%0A' + encodeURIComponent(input.value) + '%0A%0AFound on SolutionBase — a library of production-ready Microsoft Power Platform solutions.';
  window.location.href = 'mailto:?subject=' + encodeURIComponent('Check out: ' + title) + '&body=' + body;
}

// ── Typing animation (sidebar tagline) ───────────────
function startTypingAnimation() {
  const el     = document.getElementById('typing-tagline');
  const cursor = document.querySelector('.typing-cursor');
  if (!el) return;
  const text   = 'Build smarter. Deliver faster.';
  let i        = 0;
  el.textContent = '';

  const type = () => {
    if (i < text.length) {
      el.textContent += text[i++];
      setTimeout(type, 55 + Math.random() * 30);
    } else {
      // Blink cursor forever after done
      if (cursor) cursor.style.animation = 'cursorBlink 1s step-end infinite';
    }
  };
  setTimeout(type, 600); // small delay before starting
}

function tiltCard(e, wrap) {
  const inner = wrap.querySelector('.flip-inner');
  if (!inner || inner.classList.contains('flipped')) return;
  const rect = wrap.getBoundingClientRect();
  const rotX = ((e.clientY - rect.top)  / rect.height - 0.5) * -10;
  const rotY = ((e.clientX - rect.left) / rect.width  - 0.5) *  10;
  inner.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
}

function resetCard(wrap) {
  const inner = wrap.querySelector('.flip-inner');
  if (!inner || inner.classList.contains('flipped')) return;
  inner.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
}

// ── Detail View ─────────────────────────────────────
function openDetail(sol, pushState = true) {
  if (!sol) return;
  App.currentSolution = sol;
  App.currentView = 'detail';

  // Track recently viewed
  App.recentlyViewed = [sol.id, ...App.recentlyViewed.filter(id => id !== sol.id)].slice(0, 6);
  localStorage.setItem('sb-recent', JSON.stringify(App.recentlyViewed));

  // Track view
  trackView(sol.id);

  const color = sol.color || '#0078d4';

  // Hide other views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  const detailEl = document.getElementById('view-detail');
  detailEl.classList.add('active');

  // Update topbar title
  const titleEl = document.querySelector('.topbar-title');
  if (titleEl) titleEl.textContent = sol.title;

  if (pushState) {
    history.pushState(null, '', `#solution/${sol.id}`);
  }

  updateSidebarActive('');

  // Render detail main
  const main = document.getElementById('detail-main');
  if (main) {
    main.innerHTML = `
      <button class="detail-back" onclick="goBack()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Back to solutions
      </button>

      <div class="detail-header">
        <div class="detail-icon" style="background:${color}18; border:1px solid ${color}28; font-size:1.8rem; width:56px; height:56px">${sol.icon}</div>
        <div style="flex:1; min-width:0">
          <div class="detail-meta-row">
            <span class="badge badge-tool">${sol.tool}</span>
            <span class="badge ${sol.status === 'Production Ready' ? 'badge-production' : 'badge-beta'}">${sol.status}</span>
            <span class="badge badge-${sol.difficulty.toLowerCase()}">${sol.difficulty}</span>
            <span id="detail-rating-badge-${sol.id}"
              onclick="document.getElementById('stars-${sol.id}')?.scrollIntoView({behavior:'smooth', block:'center'})"
              title="${App.ratings[sol.id] ? `Your rating: ${App.ratings[sol.id]}/5 — click to change` : 'Click to rate this solution'}"
              style="display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:4px; cursor:pointer;
                     background:${App.ratings[sol.id] ? 'rgba(245,158,11,0.1)' : 'var(--bg-subtle)'};
                     border:1px solid ${App.ratings[sol.id] ? 'rgba(245,158,11,0.35)' : 'var(--border)'};
                     font-size:0.72rem; font-family:var(--font-mono); transition:all 0.15s ease;">
              <span style="color:#f59e0b; letter-spacing:0.5px; font-size:0.8rem;">
                ${App.ratings[sol.id] ? '★'.repeat(App.ratings[sol.id]) + '☆'.repeat(5 - App.ratings[sol.id]) : '☆☆☆☆☆'}
              </span>
              <span style="color:${App.ratings[sol.id] ? '#d97706' : 'var(--text-tertiary)'}; font-weight:600;">
                ${App.ratings[sol.id] ? `${App.ratings[sol.id]}/5 · ${STAR_LABELS[App.ratings[sol.id]]}` : 'Rate this'}
              </span>
            </span>
          </div>
          <h1 class="detail-title">${sol.title}</h1>
        </div>
      </div>

      <p class="detail-description">${sol.description}</p>

      <div class="detail-actions">
        <a href="${sol.githubRepo}" target="_blank" rel="noopener" class="btn-github">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          View on GitHub
        </a>
        <button onclick="handleDownload('${sol.id}','${sol.packagePath}')" class="btn-download">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
          <span id="detail-dl-count-${sol.id}" style="opacity:0.75;font-family:var(--font-mono);font-size:0.78em;">(${formatNum(getDownloads(sol))})</span>
        </button>
        <button class="btn-outline detail-like-btn ${App.likes[sol.id] ? 'liked' : ''}"
                id="detail-like-btn-${sol.id}"
                onclick="toggleLike('${sol.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${App.likes[sol.id] ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <span id="detail-like-count-${sol.id}">${formatNum(getLikes(sol))}</span>
        </button>
        <button class="btn-outline" onclick="openShare('${sol.id}','${sol.title.replace(/'/g,"\\'")}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Share
        </button>
        <button class="btn-outline" onclick="toggleFavourite('${sol.id}')" id="detail-pin-${sol.id}">
          📌 ${App.favourites.includes(sol.id) ? 'Pinned' : 'Pin'}
        </button>
      </div>

      <div class="content-block">
        <h2 class="section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Key Features
        </h2>
        <div class="features-grid">
          ${sol.features.map(f => `
            <div class="feature-row">
              <span class="feature-check">✓</span>
              <span>${f}</span>
            </div>`).join('')}
        </div>
      </div>

      <div class="content-block">
        <h2 class="section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Components
        </h2>
        <div class="components-list">
          ${sol.components.map(c => `
            <div class="comp-row">
              <span class="comp-type">${c.type}</span>
              <div>
                <div class="comp-name">${c.name}</div>
                <div class="comp-desc">${c.description}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>

      <div class="content-block">
        <h2 class="section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Prerequisites
        </h2>
        <div class="prereq-list">
          ${sol.prerequisites.map(p => `
            <div class="prereq-row">
              <span class="prereq-icon">⚠</span>
              ${p}
            </div>`).join('')}
        </div>
      </div>

      ${renderDeploymentTracker(sol)}

      <div class="content-block" id="readme-block">
        <h2 class="section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Documentation
        </h2>
        <div id="readme-content" class="markdown-content">
          <div class="markdown-loading">
            <span>Loading documentation...</span>
          </div>
        </div>
      </div>

      ${renderCommentsHTML(sol.id)}
    `;

    // Load README
    loadReadme(sol);
    renderComments(sol.id);
    initRating(sol.id);
  }

  // Render sidebar
  const sb = document.getElementById('detail-sidebar');
  if (sb) {
    const related = App.solutions
      .filter(r => r.id !== sol.id && (r.tool === sol.tool || r.tags.some(t => sol.tags.includes(t))))
      .slice(0, 3);

    sb.innerHTML = `
      <div class="sidebar-widget">
        <div class="widget-title">Statistics</div>
        <div class="stat-grid">
          <div class="stat-cell"><div class="stat-num">${sol.stars}</div><div class="stat-lbl">GH Stars</div></div>
          <div class="stat-cell"><div class="stat-num">${formatNum(sol.downloads)}</div><div class="stat-lbl">Downloads</div></div>
          <div class="stat-cell"><div class="stat-num">${sol.components.length}</div><div class="stat-lbl">Components</div></div>
          <div class="stat-cell">
            <div class="stat-num" id="sidebar-tracker-stat-${sol.id}" style="color:${(() => { const p = trackerProgress(sol.id, sol); return p.total > 0 && p.done === p.total ? 'var(--green)' : 'var(--text-primary)'; })()}">
              ${(() => { const p = trackerProgress(sol.id, sol); return p.total > 0 ? p.done + '/' + p.total : '—'; })()}
            </div>
            <div class="stat-lbl">Deployed</div>
          </div>
        </div>

        <!-- Community rating row inside stats -->
        <div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between;">
          <div>
            <div style="font-size:0.62rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-tertiary); font-family:var(--font-mono); margin-bottom:3px;">Community Rating</div>
            <div style="display:flex; align-items:baseline; gap:6px;">
              <span id="sb-comm-avg-${sol.id}" style="font-family:var(--font-mono); font-size:1.1rem; font-weight:700; color:#f59e0b; line-height:1;">
                ${Ratings.isConfigured() ? '…' : '—'}
              </span>
              <span style="font-size:0.7rem; color:var(--text-tertiary);">/ 5</span>
            </div>
            <div id="sb-comm-count-${sol.id}" style="font-size:0.68rem; color:var(--text-tertiary); font-family:var(--font-mono);">
              ${Ratings.isConfigured() ? 'Loading…' : 'Set up Firebase'}
            </div>
          </div>
          <div style="color:#f59e0b; font-size:1.0rem; letter-spacing:1px; opacity:${Ratings.isConfigured() ? '1' : '0.2'};">★★★★★</div>
        </div>

        <!-- User rating inside stats widget -->
        <div id="sidebar-rating-${sol.id}" style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border);">
          <div style="font-size:0.65rem; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-tertiary); font-family:var(--font-mono); margin-bottom:8px;">Your Rating</div>
          ${App.ratings[sol.id]
            ? `<div style="display:flex; align-items:center; justify-content:space-between;">
                 <div>
                   <div style="color:#f59e0b; font-size:1.1rem; letter-spacing:1px; line-height:1; margin-bottom:3px;">${'★'.repeat(App.ratings[sol.id])}${'☆'.repeat(5 - App.ratings[sol.id])}</div>
                   <div style="font-family:var(--font-mono); font-size:0.72rem; color:var(--text-secondary);">${App.ratings[sol.id]}/5 — ${STAR_LABELS[App.ratings[sol.id]]}</div>
                 </div>
                 <button onclick="document.getElementById('stars-${sol.id}')?.scrollIntoView({behavior:'smooth',block:'center'})"
                   style="font-size:0.7rem; color:var(--accent); background:none; border:none; cursor:pointer; padding:4px 0; text-decoration:underline; text-underline-offset:2px;">
                   Change
                 </button>
               </div>`
            : `<div style="display:flex; align-items:center; justify-content:space-between;">
                 <div style="font-size:0.8rem; color:var(--text-tertiary);">You haven't rated this yet.</div>
                 <button onclick="document.getElementById('stars-${sol.id}')?.scrollIntoView({behavior:'smooth',block:'center'})"
                   style="font-size:0.7rem; color:var(--accent); background:none; border:none; cursor:pointer; padding:4px 0; text-decoration:underline; text-underline-offset:2px;">
                   Rate it ↓
                 </button>
               </div>`
          }
        </div>
      </div>

      <div class="sidebar-widget">
        <div class="widget-title">Repository</div>
        <a href="${sol.githubRepo}" target="_blank" rel="noopener" class="github-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          View Repository
        </a>
        <a href="${sol.packagePath}" class="download-btn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download Package
        </a>
      </div>

      <div class="sidebar-widget">
        <div class="widget-title">Details</div>
        <div class="info-rows">
          <div class="info-row"><span class="info-key">Version</span><span class="info-val">v${sol.version}</span></div>
          <div class="info-row"><span class="info-key">Updated</span><span class="info-val">${new Date(sol.lastUpdated).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})}</span></div>
          <div class="info-row"><span class="info-key">Difficulty</span><span class="info-val">${sol.difficulty}</span></div>
          <div class="info-row"><span class="info-key">Status</span><span class="info-val">${sol.status}</span></div>
          <div class="info-row"><span class="info-key">Category</span><span class="info-val">${sol.tool}</span></div>
        </div>
      </div>

      <div class="sidebar-widget">
        <div class="widget-title">Tags</div>
        <div class="tag-cloud">
          ${sol.tags.map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>

      ${related.length > 0 ? `
      <div class="sidebar-widget">
        <div class="widget-title">Related</div>
        ${related.map(r => `
          <div class="related-item" onclick="openDetail(App.solutions.find(x=>x.id==='${r.id}'))">
            <span class="related-icon">${r.icon}</span>
            <div>
              <div class="related-name">${r.title}</div>
              <div class="related-tool">${r.tool}</div>
            </div>
          </div>`).join('')}
      </div>` : ''}
    `;
  }
}

// ── README Loading ───────────────────────────────────
async function loadReadme(sol) {
  const el = document.getElementById('readme-content');
  if (!el) return;

  try {
    const res = await fetch(sol.readmePath);
    if (!res.ok) throw new Error('Not found');
    const md = await res.text();

    // Use marked if available (loaded in index.html), fallback to basic render
    if (typeof marked !== 'undefined') {
      el.innerHTML = marked.parse(md);
    } else {
      el.innerHTML = simpleMarkdown(md);
    }
  } catch (e) {
    el.innerHTML = `
      <div style="padding:20px; text-align:center; color:var(--text-tertiary)">
        <div style="font-size:1.5rem; margin-bottom:8px">📄</div>
        <div style="font-size:0.82rem">Documentation coming soon.</div>
        <div style="margin-top:10px">
          <a href="${sol.githubRepo}" target="_blank" rel="noopener" style="color:var(--accent); font-size:0.8rem">View on GitHub →</a>
        </div>
      </div>`;
  }
}

// Simple markdown fallback
function simpleMarkdown(md) {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, (_, l) => l.startsWith('<') ? l : `<p>${l}</p>`);
}

// ── Comments ─────────────────────────────────────────
function renderCommentsHTML(id) {
  const sol = App.currentSolution;
  // Always link to the repo's top-level Discussions tab, with a pre-filled title
  const discussionTitle = encodeURIComponent(`Discussion: ${sol?.title || id}`);
  const repoBase = 'https://github.com/Andsta91/solutionbase.github.io';
  const discussionsUrl = `${repoBase}/discussions/new?category=solutions&title=${discussionTitle}&body=${encodeURIComponent(`**Solution:** ${sol?.title || id}\n\n<!-- Describe your question, issue, or feedback below -->`)}`;
  const allDiscussionsUrl = `${repoBase}/discussions`;

  return `
    <div class="content-block" style="border-top:1px solid var(--border); padding-top:28px; margin-top:12px">

      <!-- ── Star Rating ── -->
      <div style="margin-bottom:24px; padding:18px; background:var(--bg-subtle); border:1px solid var(--border); border-radius:10px;">

        <!-- Community aggregate row -->
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; padding-bottom:14px; border-bottom:1px solid var(--border);">
          <div>
            <div style="font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-tertiary); font-family:var(--font-mono); margin-bottom:4px;">Community Rating</div>
            <div style="display:flex; align-items:baseline; gap:8px;">
              <span id="rating-avg-${id}" style="font-family:var(--font-mono); font-size:1.6rem; font-weight:700; color:${Ratings.isConfigured() ? '#f59e0b' : 'var(--text-tertiary)'}; line-height:1;">
                ${Ratings.isConfigured() ? '…' : '—'}
              </span>
              <span style="font-size:0.75rem; color:var(--text-tertiary);">/ 5</span>
            </div>
            <div id="rating-count-${id}" style="font-size:0.72rem; color:var(--text-tertiary); font-family:var(--font-mono); margin-top:2px;">
              ${Ratings.isConfigured() ? 'Loading…' : 'Firebase not configured'}
            </div>
          </div>
          <div style="text-align:right;">
            <div style="color:#f59e0b; font-size:1.4rem; letter-spacing:2px; line-height:1; opacity:${Ratings.isConfigured() ? '1' : '0.25'};">★★★★★</div>
            <div style="font-size:0.68rem; color:var(--text-tertiary); margin-top:4px;">from all users</div>
          </div>
        </div>

        <!-- Personal rating row -->
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-tertiary); font-family:var(--font-mono); margin-bottom:6px;">Your Rating</div>
            <div class="star-rating" id="stars-${id}" style="display:flex; gap:4px;">
              ${[1,2,3,4,5].map(n => `
                <button
                  onclick="setRating('${id}', ${n})"
                  onmouseover="hoverStars('${id}', ${n})"
                  onmouseout="resetStarHover('${id}')"
                  data-star="${n}"
                  style="background:none; border:none; font-size:1.5rem; cursor:pointer; padding:2px; line-height:1; transition:transform 0.1s ease; color:var(--border-strong);"
                  aria-label="Rate ${n} star${n > 1 ? 's' : ''}"
                >☆</button>`).join('')}
            </div>
          </div>
          <div id="rating-display-${id}" style="text-align:right;">
            <div style="font-size:1.25rem; font-weight:700; font-family:var(--font-mono); color:var(--text-primary); line-height:1;" id="rating-value-${id}">—</div>
            <div style="font-size:0.72rem; color:var(--text-tertiary); margin-top:2px;" id="rating-label-${id}">not rated yet</div>
          </div>
        </div>

      </div>

      <!-- ── Discussion tabs ── -->
      <h2 class="section-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Discussion
      </h2>

      <div style="margin-bottom:16px">
        <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
          <button onclick="setCommentTab(this,'local','${id}')" class="btn-outline" data-tab="local" style="padding:6px 12px; font-size:0.78rem; border-color:var(--accent); color:var(--accent); background:var(--accent-light)">
            💬 Comments
          </button>
          <button onclick="setCommentTab(this,'github','${id}')" class="btn-outline" data-tab="github" style="padding:6px 12px; font-size:0.78rem">
            🐙 GitHub Discussions
          </button>
        </div>

        <!-- Local comments -->
        <div id="tab-local-${id}">
          <div style="background:var(--bg-subtle); border:1px solid var(--border); border-radius:8px; padding:14px; margin-bottom:14px">
            <textarea id="comment-input-${id}" placeholder="Share your experience, ask a question, or suggest an improvement..." style="width:100%; min-height:80px; background:var(--bg-white); border:1px solid var(--border); border-radius:6px; padding:10px; font-family:var(--font-sans); font-size:0.85rem; color:var(--text-primary); outline:none; resize:vertical; margin-bottom:8px; transition:border-color var(--duration) var(--ease);" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"></textarea>
            <div style="display:flex; justify-content:flex-end; gap:6px">
              <button class="btn-outline" style="padding:6px 12px; font-size:0.78rem" onclick="document.getElementById('comment-input-${id}').value=''">Clear</button>
              <button class="btn-primary" style="padding:6px 12px; font-size:0.78rem; background:var(--text-primary)" onclick="postComment('${id}')">Post Comment</button>
            </div>
          </div>
          <div id="comments-list-${id}"></div>
        </div>

        <!-- GitHub Discussions panel -->
        <div id="tab-github-${id}" style="display:none">
          <div style="padding:28px; border:1px solid var(--border); border-radius:10px; background:var(--bg-subtle);">

            <div style="display:flex; align-items:flex-start; gap:16px; margin-bottom:20px; flex-wrap:wrap;">
              <div style="font-size:2.5rem; flex-shrink:0;">💬</div>
              <div>
                <div style="font-family:var(--font-display); font-style:italic; font-size:1.05rem; font-weight:700; margin-bottom:6px;">GitHub Discussions</div>
                <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.6; max-width:480px;">
                  GitHub Discussions is a permanent forum built into the repository. Use it to ask installation questions, share deployment notes, report bugs, or suggest improvements. Unlike the Comments tab above, discussions are stored in GitHub and visible to everyone — even without this site.
                </div>
              </div>
            </div>

            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <a href="${discussionsUrl}" target="_blank" rel="noopener" class="btn-primary" style="background:var(--text-primary); font-size:0.82rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                Start a Discussion about this Solution
              </a>
              <a href="${allDiscussionsUrl}" target="_blank" rel="noopener" class="btn-outline" style="font-size:0.82rem;">
                Browse All Discussions →
              </a>
            </div>

            <div style="margin-top:16px; padding:12px; background:var(--bg-white); border:1px solid var(--border); border-radius:7px; font-size:0.78rem; color:var(--text-tertiary); line-height:1.6;">
              <strong style="color:var(--text-secondary);">Note:</strong> GitHub Discussions must be enabled on the repository. Go to <strong>Settings → Features → Discussions</strong> to activate it. Once enabled, the link above will open a pre-filled discussion form for this solution.
            </div>
          </div>
        </div>

      </div>
    </div>`;
}

function setCommentTab(btn, tab, id) {
  document.querySelectorAll('[data-tab]').forEach(b => {
    b.style.borderColor = 'var(--border)';
    b.style.color = 'var(--text-secondary)';
    b.style.background = 'transparent';
  });
  btn.style.borderColor = 'var(--accent)';
  btn.style.color = 'var(--accent)';
  btn.style.background = 'var(--accent-light)';

  document.getElementById(`tab-local-${id}`).style.display = tab === 'local' ? 'block' : 'none';
  document.getElementById(`tab-github-${id}`).style.display = tab === 'github' ? 'block' : 'none';
}

function renderComments(id) {
  const listEl = document.getElementById(`comments-list-${id}`);
  if (!listEl) return;

  const sample = App.sampleComments[id] || [];
  const local = App.comments[id] || [];
  const all = [...sample, ...local];

  if (all.length === 0) {
    listEl.innerHTML = `<p style="text-align:center; color:var(--text-tertiary); font-size:0.82rem; padding:16px">Be the first to comment.</p>`;
    return;
  }

  const avatarColors = ['#0078d4', '#038387', '#5c2d91', '#107c10', '#ca5010', '#d13438'];
  listEl.innerHTML = all.map((c, i) => {
    const bg = c.color || avatarColors[i % avatarColors.length];
    const initials = c.initials || c.author.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    return `
      <div style="display:flex; gap:12px; margin-bottom:16px; animation:fadeUp 0.3s var(--ease) ${i * 50}ms both">
        <div style="width:34px; height:34px; border-radius:50%; background:${bg}; display:flex; align-items:center; justify-content:center; font-size:0.72rem; font-weight:700; color:white; flex-shrink:0">${initials}</div>
        <div style="flex:1">
          <div style="display:flex; align-items:baseline; gap:8px; margin-bottom:4px">
            <span style="font-size:0.85rem; font-weight:600">${c.author}</span>
            <span style="font-size:0.7rem; color:var(--text-tertiary); font-family:var(--font-mono)">${c.time}</span>
          </div>
          <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.6">${c.text}</div>
        </div>
      </div>`;
  }).join('');
}

function postComment(id) {
  const input = document.getElementById(`comment-input-${id}`);
  if (!input || !input.value.trim()) { toast('Write something first 💬'); return; }

  if (!App.comments[id]) App.comments[id] = [];
  App.comments[id].push({ author: 'You', initials: 'YO', color: '#0052cc', text: input.value.trim(), time: 'just now' });
  input.value = '';
  renderComments(id);
  toast('Comment posted ✅');
}

// ── Star Rating System ────────────────────────────
const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

function initRating(id) {
  // Render personal rating immediately from localStorage
  const saved = App.ratings[id];
  if (saved) applyStars(id, saved, true);

  // Subscribe to live community aggregate from Firestore
  Ratings.subscribe(id, (avg, count) => {
    updateCommunityRatingDisplay(id, avg, count);
  });
}

// Renders the community aggregate (avg + count) in the rating widget and sidebar
function updateCommunityRatingDisplay(id, avg, count) {
  // In the rating widget (detail page)
  const avgEl   = document.getElementById('rating-avg-' + id);
  const countEl = document.getElementById('rating-count-' + id);
  if (avgEl)   avgEl.textContent   = count > 0 ? avg.toFixed(1) : '—';
  if (countEl) countEl.textContent = count > 0 ? count + ' rating' + (count !== 1 ? 's' : '') : 'No ratings yet';

  // In the sidebar community stats cell
  const sbAvgEl   = document.getElementById('sb-comm-avg-' + id);
  const sbCountEl = document.getElementById('sb-comm-count-' + id);
  if (sbAvgEl)   sbAvgEl.textContent   = count > 0 ? avg.toFixed(1) + ' ★' : '—';
  if (sbCountEl) sbCountEl.textContent = count > 0 ? count + ' rating' + (count !== 1 ? 's' : '') : 'No ratings yet';
}

function hoverStars(id, n) {
  const saved = App.ratings[id];
  // Only show hover if not yet rated, or hovering over different value
  const btns = document.querySelectorAll(`#stars-${id} button`);
  btns.forEach((btn, i) => {
    btn.style.color = i < n ? '#f59e0b' : 'var(--border-strong)';
    btn.textContent = i < n ? '★' : '☆';
    btn.style.transform = i === n - 1 ? 'scale(1.2)' : 'scale(1)';
  });
}

function resetStarHover(id) {
  const saved = App.ratings[id];
  if (saved) {
    applyStars(id, saved, false);
  } else {
    const btns = document.querySelectorAll(`#stars-${id} button`);
    btns.forEach(btn => {
      btn.style.color = 'var(--border-strong)';
      btn.textContent = '☆';
      btn.style.transform = 'scale(1)';
    });
  }
}

function applyStars(id, n, animate) {
  const btns = document.querySelectorAll(`#stars-${id} button`);
  btns.forEach((btn, i) => {
    btn.style.color = i < n ? '#f59e0b' : 'var(--border-strong)';
    btn.textContent = i < n ? '★' : '☆';
    btn.style.transform = 'scale(1)';
    if (animate && i < n) {
      btn.style.animation = `none`;
      setTimeout(() => {
        btn.style.transition = `transform 0.15s ease ${i * 40}ms, color 0.15s ease`;
        btn.style.transform = 'scale(1.15)';
        setTimeout(() => btn.style.transform = 'scale(1)', 200 + i * 40);
      }, 10);
    }
  });
  updateRatingDisplay(id, n);
}

function updateRatingDisplay(id, n) {
  const valEl = document.getElementById(`rating-value-${id}`);
  const lblEl = document.getElementById(`rating-label-${id}`);
  if (valEl) valEl.textContent = n ? `${n}/5` : '—';
  if (lblEl) lblEl.textContent = n ? `${STAR_LABELS[n]} — your rating` : 'not rated yet';
}

function setRating(id, n) {
  const previous = App.ratings[id] || 0;

  if (previous === n) {
    // Click same star again = remove rating
    delete App.ratings[id];
    localStorage.setItem('sb-ratings', JSON.stringify(App.ratings));
    Ratings.submit(id, previous, 0); // remove from Firestore aggregate
    resetStarHover(id);
    updateRatingDisplay(id, 0);
    syncRatingUI(id, 0);
    toast('Rating removed');
    return;
  }

  App.ratings[id] = n;
  localStorage.setItem('sb-ratings', JSON.stringify(App.ratings));
  Ratings.submit(id, previous, n); // update Firestore aggregate
  applyStars(id, n, true);
  syncRatingUI(id, n);
  toast('Rated ' + n + '/5 — ' + STAR_LABELS[n] + '! ' + '★'.repeat(n));
}

// Updates the hero badge + sidebar widget live after a rating is set/changed
function syncRatingUI(id, n) {
  // 1. Hero badge (top of detail page)
  const heroBadge = document.getElementById(`detail-rating-badge-${id}`);
  if (heroBadge) {
    if (n > 0) {
      heroBadge.style.background = 'rgba(245,158,11,0.1)';
      heroBadge.style.borderColor = 'rgba(245,158,11,0.35)';
      heroBadge.innerHTML = `
        <span style="color:#f59e0b; letter-spacing:0.5px; font-size:0.8rem;">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>
        <span style="color:#d97706; font-weight:600;">${n}/5 · ${STAR_LABELS[n]}</span>`;
    } else {
      heroBadge.style.background = 'var(--bg-subtle)';
      heroBadge.style.borderColor = 'var(--border)';
      heroBadge.innerHTML = `
        <span style="color:#f59e0b; letter-spacing:0.5px; font-size:0.8rem;">☆☆☆☆☆</span>
        <span style="color:var(--text-tertiary); font-weight:600;">Rate this</span>`;
    }
  }

  // 2. Sidebar rating block
  const sidebarRating = document.getElementById(`sidebar-rating-${id}`);
  if (sidebarRating) {
    const inner = sidebarRating.querySelector('div:last-child') || sidebarRating;
    if (n > 0) {
      sidebarRating.innerHTML = `
        <div style="font-size:0.65rem; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-tertiary); font-family:var(--font-mono); margin-bottom:8px;">Your Rating</div>
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div>
            <div style="color:#f59e0b; font-size:1.1rem; letter-spacing:1px; line-height:1; margin-bottom:3px;">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</div>
            <div style="font-family:var(--font-mono); font-size:0.72rem; color:var(--text-secondary);">${n}/5 — ${STAR_LABELS[n]}</div>
          </div>
          <button onclick="document.getElementById('stars-${id}')?.scrollIntoView({behavior:'smooth',block:'center'})"
            style="font-size:0.7rem; color:var(--accent); background:none; border:none; cursor:pointer; padding:4px 0; text-decoration:underline; text-underline-offset:2px;">
            Change
          </button>
        </div>`;
    } else {
      sidebarRating.innerHTML = `
        <div style="font-size:0.65rem; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-tertiary); font-family:var(--font-mono); margin-bottom:8px;">Your Rating</div>
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div style="font-size:0.8rem; color:var(--text-tertiary);">You haven't rated this yet.</div>
          <button onclick="document.getElementById('stars-${id}')?.scrollIntoView({behavior:'smooth',block:'center'})"
            style="font-size:0.7rem; color:var(--accent); background:none; border:none; cursor:pointer; padding:4px 0; text-decoration:underline; text-underline-offset:2px;">
            Rate it ↓
          </button>
        </div>`;
    }
  }
}

// ── Utilities ────────────────────────────────────────
function goBack() {
  history.back();
  showView('solutions');
}

function copyLink(id) {
  const url = `${location.origin}${location.pathname}#solution/${id}`;
  navigator.clipboard.writeText(url).then(() => toast('Link copied 📋'));
}

function formatNum(n) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
}

function toggleDark() {
  App.darkMode = !App.darkMode;
  document.body.classList.toggle('dark', App.darkMode);
  localStorage.setItem('sb-dark', App.darkMode);
  document.querySelectorAll('.theme-icon').forEach(el => el.textContent = App.darkMode ? '☀️' : '🌙');
}

function toast(msg) {
  const wrap = document.getElementById('toast-wrap');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── About View ───────────────────────────────────────
function renderAboutView() {
  const el = document.getElementById('view-about');
  if (!el) return;
  el.innerHTML = `
    <div class="about-view">
      <div class="about-hero-text fade-in">
        <h1>Built by practitioners,<br>for practitioners.</h1>
        <p>SolutionBase exists because building production-grade Power Platform solutions takes more than a YouTube tutorial. It takes real architecture decisions, battle-tested patterns, and working code you can actually deploy on Monday morning.</p>
      </div>

      <div class="about-section fade-in">
        <h2>The Problem</h2>
        <p>The Microsoft Power Platform ecosystem is enormous, but finding <em>complete</em>, deployable solutions is genuinely hard. Most resources show isolated components — a Power Automate flow here, a Canvas App there. What teams actually need are end-to-end solutions that show how all the pieces connect.</p>
        <p>SolutionBase bridges that gap. Every solution is a complete, documented, downloadable package that solves a real business problem from start to finish — not a tutorial, not a proof of concept.</p>
      </div>

      <div class="about-section fade-in">
        <h2>What We Cover</h2>
        <div class="about-tech-grid">
          <div class="about-tech-item"><span class="about-tech-icon">📱</span> Power Apps (Canvas + Model-Driven)</div>
          <div class="about-tech-item"><span class="about-tech-icon">⚡</span> Power Automate Flows</div>
          <div class="about-tech-item"><span class="about-tech-icon">🏢</span> SharePoint Online</div>
          <div class="about-tech-item"><span class="about-tech-icon">🧩</span> SPFx Web Parts (React)</div>
          <div class="about-tech-item"><span class="about-tech-icon">💻</span> PnP PowerShell</div>
          <div class="about-tech-item"><span class="about-tech-icon">📊</span> Microsoft Dataverse</div>
          <div class="about-tech-item"><span class="about-tech-icon">🤖</span> Teams Bots &amp; Cards</div>
          <div class="about-tech-item"><span class="about-tech-icon">🔗</span> Microsoft Graph API</div>
        </div>
      </div>

      <div class="about-section fade-in">
        <h2>How Solutions Are Structured</h2>
        <p>Every solution in this library follows the same pattern. A <strong>solutions.json</strong> entry provides metadata and is the single source of truth for the solution browser. A <strong>README.md</strong> inside the solution folder provides full installation, architecture, and configuration documentation. A <strong>package.zip</strong> is the importable artifact you drop into your environment.</p>
        <p>When you open a solution page, the README is loaded dynamically — so documentation updates in the repo are reflected immediately on the site.</p>
      </div>

      <div class="about-section fade-in">
        <h2>Contributing</h2>
        <p>SolutionBase is 100% open source under the MIT license. If you've built something on the Power Platform that solved a real business problem, package it and submit a pull request. We review every submission for completeness, documentation quality, and security before publishing.</p>
        <p>See the contribution guide for submission requirements, README templates, and the review criteria.</p>
      </div>

      <div class="about-section fade-in">
        <h2>This Site</h2>
        <p>SolutionBase is a fully static site — no server, no build step, no framework. It's plain HTML, CSS, and JavaScript hosted on GitHub Pages. Solutions are defined in a JSON file; the site loads it at runtime and generates every page dynamically. Adding a solution means editing one JSON file and dropping a folder in the repo.</p>
      </div>

      <div class="about-actions fade-in">
        <a href="https://github.com/Andsta91/solutionbase.github.io" target="_blank" rel="noopener" class="btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          View on GitHub
        </a>
        <a href="https://github.com/Andsta91/solutionbase.github.io/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener" class="btn-outline">
          Read Contributing Guide
        </a>
        <button class="btn-outline" onclick="App.activeFilter='all'; applyFilters(); showView('solutions')">
          Browse Solutions →
        </button>
      </div>
    </div>
  `;

  // Trigger fade-ins
  setTimeout(() => initFadeIns(el), 50);
}

// ── Command Palette ───────────────────────────────────
let cmdHighlight = -1;
let cmdResults = [];

function openCmdPalette() {
  const overlay = document.getElementById('cmd-overlay');
  const input = document.getElementById('cmd-input');
  if (!overlay || !input) return;
  overlay.classList.add('open');
  input.value = '';
  cmdHighlight = -1;
  renderCmdResults('');
  setTimeout(() => input.focus(), 50);
}

function closeCmdPalette() {
  document.getElementById('cmd-overlay')?.classList.remove('open');
}

function renderCmdResults(q) {
  const container = document.getElementById('cmd-results');
  if (!container) return;

  const query = q.toLowerCase().trim();
  const navItems = [
    { type: 'nav', icon: '🏠', name: 'Home', sub: 'Go to homepage', action: () => { showView('home'); closeCmdPalette(); } },
    { type: 'nav', icon: '📚', name: 'All Solutions', sub: 'Browse all solutions', action: () => { App.activeFilter='all'; applyFilters(); showView('solutions'); closeCmdPalette(); } },
    { type: 'nav', icon: 'ℹ️', name: 'About', sub: 'About SolutionBase', action: () => { showView('about'); closeCmdPalette(); } },
    { type: 'nav', icon: '🐙', name: 'GitHub Repository', sub: 'Open in new tab', action: () => { window.open('https://github.com/Andsta91/solutionbase.github.io', '_blank'); closeCmdPalette(); } },
  ];

  const catItems = ['Power Apps','Power Automate','SharePoint','PowerShell'].map(cat => ({
    type: 'cat',
    icon: { 'Power Apps':'📱','Power Automate':'⚡','SharePoint':'🏢','PowerShell':'💻' }[cat],
    name: cat,
    sub: `Filter by ${cat}`,
    action: () => { App.activeFilter = cat; applyFilters(); showView('solutions'); closeCmdPalette(); }
  }));

  const solItems = App.solutions
    .filter(s => !query || s.title.toLowerCase().includes(query) || s.tool.toLowerCase().includes(query) || s.tags.some(t => t.toLowerCase().includes(query)))
    .slice(0, 6)
    .map(s => ({
      type: 'sol',
      icon: s.icon,
      name: s.title,
      sub: s.tool,
      color: s.color,
      action: () => { openDetail(s); closeCmdPalette(); }
    }));

  const all = query
    ? [...solItems, ...navItems.filter(i => i.name.toLowerCase().includes(query)), ...catItems.filter(i => i.name.toLowerCase().includes(query))]
    : [...navItems, ...catItems, ...solItems];

  cmdResults = all;
  cmdHighlight = -1;

  if (all.length === 0) {
    container.innerHTML = `<div class="cmd-empty">No results for "<strong>${q}</strong>"</div>`;
    return;
  }

  const groups = { nav: 'Navigation', cat: 'Categories', sol: 'Solutions' };
  let lastType = null;
  container.innerHTML = all.map((item, i) => {
    let header = '';
    if (item.type !== lastType && !query) {
      header = `<div style="padding:6px 10px 2px; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-tertiary); font-family:var(--font-mono)">${groups[item.type]}</div>`;
      lastType = item.type;
    }
    return `${header}<div class="cmd-item" data-cmd-idx="${i}" onclick="cmdResults[${i}].action()">
      <span class="cmd-item-icon">${item.icon}</span>
      <div>
        <div class="cmd-item-name">${item.name}</div>
        <div class="cmd-item-sub">${item.sub}</div>
      </div>
      <div class="cmd-item-right">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-tertiary)"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
    </div>`;
  }).join('');
}

function cmdNavigate(dir) {
  const items = document.querySelectorAll('.cmd-item');
  items.forEach(i => i.classList.remove('highlighted'));
  cmdHighlight = Math.max(0, Math.min(items.length - 1, cmdHighlight + dir));
  items[cmdHighlight]?.classList.add('highlighted');
  items[cmdHighlight]?.scrollIntoView({ block: 'nearest' });
}

function cmdExecute() {
  const highlighted = document.querySelector('.cmd-item.highlighted');
  if (highlighted) {
    highlighted.click();
  } else if (cmdResults.length > 0) {
    cmdResults[0].action();
  }
}

// ── Keyboard Shortcuts ────────────────────────────────
function initKeyboard() {
  document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    // Cmd/Ctrl+K — open command palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openCmdPalette();
      return;
    }

    // Escape — close command palette / back
    if (e.key === 'Escape') {
      if (document.getElementById('cmd-overlay')?.classList.contains('open')) {
        closeCmdPalette();
      } else if (App.currentView === 'detail') {
        goBack();
      }
      return;
    }

    if (document.getElementById('cmd-overlay')?.classList.contains('open')) {
      if (e.key === 'ArrowDown') { e.preventDefault(); cmdNavigate(1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); cmdNavigate(-1); }
      if (e.key === 'Enter') { e.preventDefault(); cmdExecute(); }
      return;
    }

    if (inInput) return;

    // / — focus search
    if (e.key === '/') {
      e.preventDefault();
      document.getElementById('sidebar-search')?.focus();
      return;
    }

    // g h — go home
    if (e.key === 'h') { showView('home'); return; }
    // g s — go solutions
    if (e.key === 's') { App.activeFilter='all'; applyFilters(); showView('solutions'); return; }
    // g a — go about
    if (e.key === 'a') { showView('about'); return; }
    // t — toggle dark
    if (e.key === 't') { toggleDark(); return; }
  });
}

// ── Scroll Animations ─────────────────────────────────
function initFadeIns(root = document) {
  const els = root.querySelectorAll('.fade-in');
  if (!els.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  els.forEach((el, i) => {
    el.style.transitionDelay = `${i * 60}ms`;
    observer.observe(el);
  });
}

// ── What's New Banner ─────────────────────────────────
// ── Recently Viewed ───────────────────────────────────
function renderRecentlyViewed() {
  const container = document.getElementById('recently-viewed-section');
  if (!container) return;

  const recent = App.recentlyViewed
    .map(id => App.solutions.find(s => s.id === id))
    .filter(Boolean)
    .slice(0, 4);

  if (recent.length === 0) { container.innerHTML = ''; return; }

  container.innerHTML = `
    <div class="home-section" style="border-bottom:1px solid var(--border); background:var(--bg-subtle);">
      <div class="home-section-header">
        <h2 class="home-section-title">🕐 Recently Viewed</h2>
        <span class="home-section-more" onclick="clearRecentlyViewed()" style="color:var(--text-tertiary)">Clear</span>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:10px;">
        ${recent.map(s => `
          <div onclick="openDetail(App.solutions.find(x=>x.id==='${s.id}'))"
               style="display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--bg-white); border:1px solid var(--border); border-radius:9px; cursor:pointer; transition:all 0.18s ease;"
               onmouseover="this.style.borderColor='var(--accent)'; this.style.background='var(--accent-light)'"
               onmouseout="this.style.borderColor='var(--border)'; this.style.background='var(--bg-white)'">
            <span style="font-size:1.3rem; flex-shrink:0;">${s.icon}</span>
            <div style="min-width:0;">
              <div style="font-size:0.82rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.title}</div>
              <div style="font-size:0.68rem; color:var(--text-tertiary); font-family:var(--font-mono);">${s.tool}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

function clearRecentlyViewed() {
  App.recentlyViewed = [];
  localStorage.removeItem('sb-recent');
  document.getElementById('recently-viewed-section').innerHTML = '';
}

// ── Deployment Tracker ───────────────────────────────
// Stores per-solution checklist progress in localStorage
// Keys: 'sb-track-{solutionId}' → { prereqs: [bool,...], components: [bool,...] }

function getTrackerData(id) {
  try { return JSON.parse(localStorage.getItem('sb-track-' + id) || 'null'); } catch(e) { return null; }
}

function saveTrackerData(id, data) {
  localStorage.setItem('sb-track-' + id, JSON.stringify(data));
}

function trackerProgress(id, sol) {
  const data = getTrackerData(id);
  if (!data) return { done: 0, total: 0 };
  const total = sol.prerequisites.length + sol.components.length;
  const done  = [...(data.prereqs || []), ...(data.components || [])].filter(Boolean).length;
  return { done, total };
}

function renderDeploymentTracker(sol) {
  const id   = sol.id;
  const data = getTrackerData(id) || {
    prereqs:    sol.prerequisites.map(() => false),
    components: sol.components.map(() => false)
  };

  const total = sol.prerequisites.length + sol.components.length;
  const done  = [...data.prereqs, ...data.components].filter(Boolean).length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const prereqRows = sol.prerequisites.map((p, i) => `
    <label class="tracker-row ${data.prereqs[i] ? 'checked' : ''}" onclick="trackToggle('${id}','prereq',${i})">
      <span class="tracker-check">${data.prereqs[i] ? '✓' : ''}</span>
      <span class="tracker-text">${p}</span>
    </label>`).join('');

  const compRows = sol.components.map((c, i) => `
    <label class="tracker-row ${data.components[i] ? 'checked' : ''}" onclick="trackToggle('${id}','comp',${i})">
      <span class="tracker-check">${data.components[i] ? '✓' : ''}</span>
      <div>
        <span class="tracker-text">${c.name}</span>
        <span class="tracker-sub">${c.description}</span>
      </div>
    </label>`).join('');

  return `
    <div class="content-block" id="tracker-block-${id}">
      <h2 class="section-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        Deployment Tracker
      </h2>

      <!-- Progress bar -->
      <div style="margin-bottom:18px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
          <span style="font-size:0.78rem; color:var(--text-secondary);">
            ${done === total && total > 0 ? '🎉 Fully deployed!' : done + ' of ' + total + ' steps complete'}
          </span>
          <span style="font-family:var(--font-mono); font-size:0.78rem; font-weight:700; color:${pct === 100 ? 'var(--green)' : 'var(--accent)'};">${pct}%</span>
        </div>
        <div style="height:6px; background:var(--border); border-radius:3px; overflow:hidden;">
          <div id="tracker-bar-${id}" style="height:100%; width:${pct}%; background:${pct === 100 ? 'var(--green)' : 'var(--accent)'}; border-radius:3px; transition:width 0.4s ease;"></div>
        </div>
      </div>

      <!-- Prerequisites -->
      ${sol.prerequisites.length > 0 ? `
      <div style="margin-bottom:14px;">
        <div style="font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-tertiary); font-family:var(--font-mono); margin-bottom:8px;">Prerequisites</div>
        <div class="tracker-list">${prereqRows}</div>
      </div>` : ''}

      <!-- Components -->
      ${sol.components.length > 0 ? `
      <div style="margin-bottom:14px;">
        <div style="font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-tertiary); font-family:var(--font-mono); margin-bottom:8px;">Components</div>
        <div class="tracker-list">${compRows}</div>
      </div>` : ''}

      <!-- Reset -->
      ${done > 0 ? `
      <button onclick="resetTracker('${id}')" style="font-size:0.72rem; color:var(--text-tertiary); background:none; border:none; cursor:pointer; text-decoration:underline; padding:0;">
        Reset progress
      </button>` : ''}
    </div>`;
}

function trackToggle(id, type, idx) {
  const sol  = App.solutions.find(s => s.id === id);
  if (!sol) return;
  const data = getTrackerData(id) || {
    prereqs:    sol.prerequisites.map(() => false),
    components: sol.components.map(() => false)
  };

  if (type === 'prereq') data.prereqs[idx] = !data.prereqs[idx];
  else                   data.components[idx] = !data.components[idx];

  saveTrackerData(id, data);

  // Re-render only the tracker block (fast, no full page reload)
  const block = document.getElementById('tracker-block-' + id);
  if (block) block.outerHTML = renderDeploymentTracker(sol);

  // Update sidebar tracker stat if visible
  updateSidebarTrackerStat(id, sol);

  // Toast on completion
  const total = sol.prerequisites.length + sol.components.length;
  const done  = [...data.prereqs, ...data.components].filter(Boolean).length;
  if (done === total && total > 0) toast('🎉 All steps complete! Solution deployed.');
}

function resetTracker(id) {
  localStorage.removeItem('sb-track-' + id);
  const sol = App.solutions.find(s => s.id === id);
  if (!sol) return;
  const block = document.getElementById('tracker-block-' + id);
  if (block) block.outerHTML = renderDeploymentTracker(sol);
  updateSidebarTrackerStat(id, sol);
  toast('Tracker reset');
}

function updateSidebarTrackerStat(id, sol) {
  const el = document.getElementById('sidebar-tracker-stat-' + id);
  if (!el) return;
  const { done, total } = trackerProgress(id, sol);
  el.textContent = done + '/' + total;
  el.style.color = done === total && total > 0 ? 'var(--green)' : 'var(--text-primary)';
}

function renderWhatsNew() {
  if (!App.solutions.length) return '';

  // Sort by lastUpdated descending, take the 2 most recent
  const recent = [...App.solutions]
    .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
    .slice(0, 2);

  // Build a dismissal key from the two latest solution IDs + versions
  // If anything changes (new solution added, version bumped) the banner reappears
  const bannerKey = recent.map(s => s.id + '-' + s.version).join('|');
  const dismissedKey = localStorage.getItem('sb-banner-key');
  if (dismissedKey === bannerKey) return '';

  // Build the message text
  let message = '';
  if (recent.length === 2) {
    message = recent[0].title + ' v' + recent[0].version +
              ' and ' + recent[1].title + ' v' + recent[1].version + ' just added';
  } else if (recent.length === 1) {
    message = recent[0].title + ' v' + recent[0].version + ' just added';
  } else {
    return '';
  }

  return `
    <div class="whats-new-banner" id="whats-new" onclick="App.activeFilter='all'; applyFilters(); showView('solutions')" style="cursor:pointer">
      <span class="whats-new-icon">🎉</span>
      <div class="whats-new-text">
        <div class="whats-new-label">What's New</div>
        <div class="whats-new-title">${message}</div>
      </div>
      <button class="whats-new-close" onclick="dismissBanner(event, '${bannerKey}')" aria-label="Dismiss">✕</button>
    </div>`;
}

function dismissBanner(e, key) {
  e.stopPropagation();
  document.getElementById('whats-new')?.remove();
  // Store the specific key so the banner reappears when new solutions are added
  localStorage.setItem('sb-banner-key', key);
}

// ── Active Filter Pills ───────────────────────────────
function renderFilterPills() {
  const container = document.getElementById('active-filters');
  if (!container) return;
  const pills = [];

  if (App.searchQuery) pills.push({ label: `"${App.searchQuery}"`, clear: () => { App.searchQuery=''; document.getElementById('sidebar-search').value=''; } });
  if (App.activeFilter && App.activeFilter !== 'all') pills.push({ label: App.activeFilter, clear: () => { App.activeFilter='all'; document.getElementById('toolFilter').value=''; } });
  if (App.difficultyFilter) pills.push({ label: App.difficultyFilter, clear: () => { App.difficultyFilter=''; document.getElementById('difficultyFilter').value=''; } });

  if (pills.length === 0) { container.innerHTML = ''; return; }

  container.innerHTML = `
    <span style="font-size:0.72rem; color:var(--text-tertiary); font-family:var(--font-mono)">Filters:</span>
    ${pills.map((p, i) => `
      <span class="filter-pill">
        ${p.label}
        <button class="filter-pill-remove" onclick="clearFilter(${i})">✕</button>
      </span>`).join('')}
    <button onclick="clearAllFilters()" style="font-size:0.72rem; color:var(--accent); background:none; border:none; cursor:pointer; padding:2px 4px;">Clear all</button>`;

  // Store pill clear actions for onclick
  App._pillClears = pills.map(p => p.clear);
}

function clearFilter(idx) {
  App._pillClears[idx]?.();
  applyFilters();
  renderGrid();
  renderFilterPills();
}

function clearAllFilters() {
  App.searchQuery = '';
  App.activeFilter = 'all';
  App.difficultyFilter = '';
  if (document.getElementById('sidebar-search')) document.getElementById('sidebar-search').value = '';
  if (document.getElementById('toolFilter')) document.getElementById('toolFilter').value = '';
  if (document.getElementById('difficultyFilter')) document.getElementById('difficultyFilter').value = '';
  applyFilters();
  renderGrid();
  renderFilterPills();
}

// ── Start ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', boot);
