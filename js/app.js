/* =====================================================
   SOLUTIONBASE v2 — App JS
   Loads data from data/solutions.json
   Renders: home, listing, detail views
===================================================== */

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

function cardHTML(s, delay = 0) {
  const color = s.color || '#0078d4';
  return `
    <div class="sol-card" onclick="openDetail(App.solutions.find(x=>x.id==='${s.id}'))" style="animation-delay:${delay}ms">
      <div class="sol-card-top">
        <div class="sol-card-icon" style="background:${color}18; color:${color}; border:1px solid ${color}28">${s.icon}</div>
        <div class="sol-card-badges">
          <span class="badge badge-tool">${s.tool}</span>
          <span class="badge ${s.status === 'Production Ready' ? 'badge-production' : 'badge-beta'}">${s.status === 'Production Ready' ? 'Prod' : 'Beta'}</span>
        </div>
      </div>
      <div class="sol-card-title">${s.title}</div>
      <div class="sol-card-desc">${s.description}</div>
      <div class="sol-card-tags">
        ${s.tags.slice(0, 4).map(t => `<span class="tag">${t}</span>`).join('')}
        ${s.tags.length > 4 ? `<span class="tag">+${s.tags.length - 4}</span>` : ''}
      </div>
      <div class="sol-card-footer">
        <div class="sol-card-meta">
          <span class="meta-item">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${s.stars}
          </span>
          <span class="meta-item">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ${formatNum(s.downloads)}
          </span>
          <span class="badge badge-${s.difficulty.toLowerCase()}" style="border:none;background:none;padding:0">${s.difficulty}</span>
        </div>
        <div class="sol-card-arrow">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>
      </div>
    </div>`;
}

// ── Detail View ─────────────────────────────────────
function openDetail(sol, pushState = true) {
  if (!sol) return;
  App.currentSolution = sol;
  App.currentView = 'detail';

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
        <a href="${sol.packagePath}" class="btn-download">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download Package
        </a>
        <button class="btn-outline" onclick="copyLink('${sol.id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy Link
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
          <div class="stat-cell"><div class="stat-num">${sol.stars}</div><div class="stat-lbl">Stars</div></div>
          <div class="stat-cell"><div class="stat-num">${formatNum(sol.downloads)}</div><div class="stat-lbl">Downloads</div></div>
          <div class="stat-cell"><div class="stat-num">${sol.components.length}</div><div class="stat-lbl">Components</div></div>
          <div class="stat-cell"><div class="stat-num">${sol.features.length}</div><div class="stat-lbl">Features</div></div>
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
  return `
    <div class="content-block" style="border-top:1px solid var(--border); padding-top:28px; margin-top:12px">
      <h2 class="section-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Discussion
      </h2>

      <div style="margin-bottom:16px">
        <div style="display:flex; gap:8px; margin-bottom:12px">
          <button onclick="setCommentTab(this,'local','${id}')" class="btn-outline" data-tab="local" style="padding:6px 12px; font-size:0.78rem; border-color:var(--accent); color:var(--accent); background:var(--accent-light)">Comments</button>
          <button onclick="setCommentTab(this,'github','${id}')" class="btn-outline" data-tab="github" style="padding:6px 12px; font-size:0.78rem">GitHub Discussions</button>
        </div>

        <div id="tab-local-${id}">
          <div style="background:var(--bg-subtle); border:1px solid var(--border); border-radius:8px; padding:14px; margin-bottom:14px">
            <textarea id="comment-input-${id}" placeholder="Share your experience or ask a question..." style="width:100%; min-height:80px; background:var(--bg-white); border:1px solid var(--border); border-radius:6px; padding:10px; font-family:var(--font-sans); font-size:0.85rem; color:var(--text-primary); outline:none; resize:vertical; margin-bottom:8px; transition:border-color var(--duration) var(--ease);" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"></textarea>
            <div style="display:flex; justify-content:flex-end; gap:6px">
              <button class="btn-outline" style="padding:6px 12px; font-size:0.78rem" onclick="document.getElementById('comment-input-${id}').value=''">Clear</button>
              <button class="btn-primary" style="padding:6px 12px; font-size:0.78rem; background:var(--text-primary)" onclick="postComment('${id}')">Post</button>
            </div>
          </div>
          <div id="comments-list-${id}"></div>
        </div>

        <div id="tab-github-${id}" style="display:none">
          <div style="text-align:center; padding:32px; border:1px solid var(--border); border-radius:8px; background:var(--bg-subtle)">
            <div style="font-size:2rem; margin-bottom:12px">💬</div>
            <div style="font-family:var(--font-display); font-style:italic; font-size:1.05rem; margin-bottom:8px">GitHub Discussions</div>
            <div style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:16px">Ask questions and discuss this solution in the GitHub repository.</div>
            <a href="${App.currentSolution?.githubRepo || '#'}/discussions" target="_blank" rel="noopener" class="btn-github" style="display:inline-flex">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              Open GitHub Discussions
            </a>
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
function renderWhatsNew() {
  if (localStorage.getItem('sb-banner-dismissed') === 'true') return '';
  return `
    <div class="whats-new-banner" id="whats-new">
      <span class="whats-new-icon">🎉</span>
      <div class="whats-new-text">
        <div class="whats-new-label">What's New</div>
        <div class="whats-new-title">IT Helpdesk Teams Bot v2.3 and M365 Audit Reporter v3.1 just added</div>
      </div>
      <button class="whats-new-close" onclick="dismissBanner(event)" aria-label="Dismiss">✕</button>
    </div>`;
}

function dismissBanner(e) {
  e.stopPropagation();
  document.getElementById('whats-new')?.remove();
  localStorage.setItem('sb-banner-dismissed', 'true');
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
