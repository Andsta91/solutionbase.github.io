/* ============================================
   SOLUTIONBASE — Main App JS
============================================ */

// ── State ──────────────────────────────────
const state = {
  currentPage: 'home',
  currentSolution: null,
  searchQuery: '',
  filters: { category: 'All', difficulty: 'All', status: 'All' },
  sort: 'stars',
  comments: {}
};

// ── Sample Comments Data ───────────────────
const SAMPLE_COMMENTS = {
  "powerapp-employee-onboarding": [
    { id: 1, author: "Alex Chen", initials: "AC", color: "#0078d4", text: "We deployed this last month and it cut our onboarding time by 40%. The Teams integration is seamless. Had to tweak the permission structure for our enterprise setup but the docs were clear.", time: "3 days ago" },
    { id: 2, author: "Maria Santos", initials: "MS", color: "#038387", text: "Does anyone have experience using this with GCC (Government Community Cloud)? We have some connector restrictions.", time: "1 day ago" },
    { id: 3, author: "James Whitfield", initials: "JW", color: "#5c2d91", text: "Great solution overall. One suggestion: add a way to clone onboarding templates for different departments — right now it's a single template.", time: "6 hours ago" }
  ],
  "powerautomate-approval-engine": [
    { id: 1, author: "Priya Narayan", initials: "PN", color: "#ca5010", text: "This is exactly what we needed. We've configured 12 different approval workflows without touching the flow code once. The SharePoint config list approach is brilliant.", time: "1 week ago" },
    { id: 2, author: "Tom Richards", initials: "TR", color: "#107c10", text: "Ran into an issue with the parallel approval mode when using external users. Filed an issue on the repo. The team responded within 24 hours — impressive support.", time: "4 days ago" }
  ],
  "sharepoint-modern-intranet": [
    { id: 1, author: "Sarah Kim", initials: "SK", color: "#0078d4", text: "Deployed to our 5000-person org. The OrgChart web part is fast and the configurability is excellent. News targeting by audience saved us weeks of custom dev.", time: "2 weeks ago" },
    { id: 2, author: "Dev Patel", initials: "DP", color: "#038387", text: "Is there a roadmap for Viva Connections integration? The quick links web part would be perfect as an ACE.", time: "5 days ago" }
  ]
};

// ── Router ─────────────────────────────────
function navigate(page, data = {}) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  state.currentPage = page;

  if (page === 'home') {
    document.getElementById('page-home').classList.add('active');
    document.querySelector('[data-nav="home"]')?.classList.add('active');
    window.scrollTo(0, 0);
    renderFeaturedSolutions();
  } else if (page === 'solutions') {
    document.getElementById('page-solutions').classList.add('active');
    document.querySelector('[data-nav="solutions"]')?.classList.add('active');
    window.scrollTo(0, 0);
    if (data.category) {
      state.filters.category = data.category;
      updateFilterUI();
    }
    renderSolutionsList();
  } else if (page === 'solution') {
    document.getElementById('page-detail').classList.add('active');
    window.scrollTo(0, 0);
    renderSolutionDetail(data.id);
  } else if (page === 'about') {
    document.getElementById('page-about').classList.add('active');
    document.querySelector('[data-nav="about"]')?.classList.add('active');
    window.scrollTo(0, 0);
  }

  // Update URL hash
  if (page === 'solution') {
    history.pushState(null, '', `#solution-${data.id}`);
  } else if (page === 'solutions') {
    history.pushState(null, '', '#solutions');
  } else if (page === 'about') {
    history.pushState(null, '', '#about');
  } else {
    history.pushState(null, '', '#');
  }
}

// ── Utility Functions ──────────────────────
function getCategoryColor(category) {
  const map = {
    'Power Apps': '#0078d4',
    'Power Automate': '#0066b8',
    'SharePoint': '#038387',
    'SharePoint Webparts': '#ca5010',
    'PowerShell': '#5c2d91'
  };
  return map[category] || '#0078d4';
}

function getCategoryIcon(category) {
  const map = {
    'Power Apps': '📱',
    'Power Automate': '⚡',
    'SharePoint': '🏢',
    'SharePoint Webparts': '🧩',
    'PowerShell': '💻'
  };
  return map[category] || '📦';
}

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

function getDifficultyClass(d) {
  return `badge-difficulty-${d.toLowerCase()}`;
}

function getStatusClass(s) {
  return s === 'Production Ready' ? 'badge-status-production' : 'badge-status-beta';
}

function filterAndSort() {
  let results = [...SOLUTIONS_DATA];

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    results = results.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  if (state.filters.category !== 'All')
    results = results.filter(s => s.category === state.filters.category);

  if (state.filters.difficulty !== 'All')
    results = results.filter(s => s.difficulty === state.filters.difficulty);

  if (state.filters.status !== 'All')
    results = results.filter(s => s.status === state.filters.status);

  const sortFns = {
    stars: (a, b) => b.stars - a.stars,
    downloads: (a, b) => b.downloads - a.downloads,
    newest: (a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated),
    title: (a, b) => a.title.localeCompare(b.title)
  };
  results.sort(sortFns[state.sort] || sortFns.stars);

  return results;
}

// ── Card HTML ──────────────────────────────
function createSolutionCardHTML(solution, delay = 0) {
  const color = getCategoryColor(solution.category);
  return `
    <div class="solution-card" onclick="navigate('solution', {id:'${solution.id}'})" style="animation-delay:${delay}ms">
      <div class="card-header">
        <div class="card-icon" style="background:${color}20; color:${color}; border:1px solid ${color}30">
          ${solution.icon}
        </div>
        <div class="card-badges">
          <span class="badge badge-category">${solution.category}</span>
          <span class="badge ${getStatusClass(solution.status)}">${solution.status}</span>
        </div>
      </div>
      <div class="card-title">${solution.title}</div>
      <div class="card-description">${solution.description}</div>
      <div class="card-tags">
        ${solution.tags.slice(0, 4).map(t => `<span class="tag">${t}</span>`).join('')}
        ${solution.tags.length > 4 ? `<span class="tag">+${solution.tags.length - 4}</span>` : ''}
      </div>
      <div class="card-footer">
        <div class="card-meta">
          <span class="card-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${solution.stars}
          </span>
          <span class="card-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ${formatNumber(solution.downloads)}
          </span>
          <span class="card-meta-item">
            <span class="badge ${getDifficultyClass(solution.difficulty)}" style="border:none; padding:0; background:none;">${solution.difficulty}</span>
          </span>
        </div>
        <div class="card-arrow">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>
      </div>
    </div>
  `;
}

// ── Render Featured ────────────────────────
function renderFeaturedSolutions() {
  const featured = SOLUTIONS_DATA.filter(s => s.featured);
  const container = document.getElementById('featured-grid');
  if (!container) return;
  container.innerHTML = featured.map((s, i) => createSolutionCardHTML(s, i * 80)).join('');
}

// ── Render Solutions List ──────────────────
function renderSolutionsList() {
  const results = filterAndSort();
  const container = document.getElementById('solutions-grid');
  const countEl = document.getElementById('results-count');

  if (countEl) countEl.innerHTML = `<span>${results.length}</span> solution${results.length !== 1 ? 's' : ''} found`;

  if (!container) return;

  if (results.length === 0) {
    container.innerHTML = `
      <div class="no-results" style="grid-column:1/-1">
        <span class="no-results-icon">🔍</span>
        <h3>No solutions found</h3>
        <p>Try adjusting your search or filters</p>
      </div>
    `;
    return;
  }

  container.innerHTML = results.map((s, i) => createSolutionCardHTML(s, i * 50)).join('');
}

function updateFilterUI() {
  document.querySelectorAll('[data-filter-category]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filterCategory === state.filters.category);
  });
  document.querySelectorAll('[data-filter-difficulty]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filterDifficulty === state.filters.difficulty);
  });
  document.querySelectorAll('[data-filter-status]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filterStatus === state.filters.status);
  });
}

// ── Render Detail Page ────────────────────
function renderSolutionDetail(id) {
  const s = SOLUTIONS_DATA.find(sol => sol.id === id);
  if (!s) { navigate('solutions'); return; }
  state.currentSolution = s;

  const color = getCategoryColor(s.category);
  const page = document.getElementById('page-detail');

  page.innerHTML = `
    <div class="detail-page">

      <div class="detail-hero">
        <div class="detail-hero-inner">

          <div class="detail-breadcrumb">
            <a onclick="navigate('home')" style="cursor:pointer">Home</a>
            <span class="sep">/</span>
            <a onclick="navigate('solutions')" style="cursor:pointer">Solutions</a>
            <span class="sep">/</span>
            <span class="current">${s.title}</span>
          </div>

          <div class="detail-title-row">
            <div class="detail-icon" style="background:${color}20; border:1px solid ${color}35; font-size:2rem; width:68px; height:68px;">
              ${s.icon}
            </div>
            <div>
              <div class="detail-meta-row" style="margin-bottom:10px">
                <span class="badge badge-category">${s.category}</span>
                <span class="badge ${getStatusClass(s.status)}">${s.status}</span>
                <span class="badge ${getDifficultyClass(s.difficulty)}">${s.difficulty}</span>
              </div>
              <h1 class="detail-title">${s.title}</h1>
            </div>
          </div>

          <p style="color:var(--text-secondary); font-size:1rem; max-width:700px; line-height:1.7; margin-bottom:var(--space-5)">
            ${s.description}
          </p>

          <div class="detail-actions">
            <a href="${s.githubRepo}" target="_blank" rel="noopener" class="btn-github">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              View on GitHub
            </a>
            <a href="${s.githubPackage}" target="_blank" rel="noopener" class="btn-download">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Package
            </a>
            <button class="btn-secondary" onclick="copyLink('${s.id}')" style="padding:12px var(--space-4)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy Link
            </button>
          </div>

        </div>
      </div>

      <div class="detail-body">
        <div class="detail-main">

          <div class="content-section">
            <h2 class="content-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Overview
            </h2>
            <div class="content-prose">
              ${s.longDescription.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('')}
            </div>
          </div>

          <div class="content-section">
            <h2 class="content-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              Key Features
            </h2>
            <div class="features-list">
              ${s.features.map(f => `
                <div class="feature-item">
                  <span class="feature-check">✓</span>
                  <span>${f}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="content-section">
            <h2 class="content-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Solution Components
            </h2>
            <div class="components-list">
              ${s.components.map(c => `
                <div class="component-item">
                  <span class="component-type">${c.type}</span>
                  <div>
                    <div class="component-name">${c.name}</div>
                    <div class="component-desc">${c.description}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="content-section">
            <h2 class="content-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Prerequisites
            </h2>
            <div class="prereqs-list">
              ${s.prerequisites.map(p => `
                <div class="prereq-item">
                  <span class="prereq-icon">⚠</span>
                  ${p}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Comments -->
          <div class="comments-section">
            <h2 class="content-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Discussion
            </h2>

            <div class="comments-tabs">
              <button class="comment-tab active" onclick="switchCommentTab(this, 'local')">Comments</button>
              <button class="comment-tab" onclick="switchCommentTab(this, 'github')">GitHub Discussions</button>
            </div>

            <div id="comments-local">
              <div class="comment-compose">
                <textarea class="comment-input" id="comment-input" placeholder="Share your experience, ask a question, or suggest an improvement..."></textarea>
                <div style="display:flex; justify-content:flex-end; gap:var(--space-2)">
                  <button class="btn-secondary" style="padding:8px 16px; font-size:0.85rem" onclick="clearComment()">Clear</button>
                  <button class="btn-primary" style="padding:8px 16px; font-size:0.85rem" onclick="postComment('${s.id}')">Post Comment</button>
                </div>
              </div>
              <div class="comments-list" id="comments-list"></div>
            </div>

            <div id="comments-github" style="display:none">
              <div class="github-discussions-widget">
                <div class="gd-icon">💬</div>
                <div class="gd-title">GitHub Discussions</div>
                <div class="gd-desc">Join the conversation on GitHub. Ask questions, report issues, and suggest features directly in the repository's discussion board.</div>
                <a href="${s.githubRepo}/discussions" target="_blank" rel="noopener" class="btn-github" style="display:inline-flex">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  Open GitHub Discussions
                </a>
              </div>
            </div>
          </div>

        </div>

        <!-- Sidebar -->
        <aside class="detail-sidebar">

          <div class="sidebar-card">
            <div class="sidebar-card-title">Statistics</div>
            <div class="sidebar-stat-grid">
              <div class="sidebar-stat">
                <div class="sidebar-stat-value">${s.stars}</div>
                <div class="sidebar-stat-label">Stars</div>
              </div>
              <div class="sidebar-stat">
                <div class="sidebar-stat-value">${formatNumber(s.downloads)}</div>
                <div class="sidebar-stat-label">Downloads</div>
              </div>
              <div class="sidebar-stat">
                <div class="sidebar-stat-value">${s.components.length}</div>
                <div class="sidebar-stat-label">Components</div>
              </div>
              <div class="sidebar-stat">
                <div class="sidebar-stat-value">${s.tags.length}</div>
                <div class="sidebar-stat-label">Tags</div>
              </div>
            </div>
          </div>

          <div class="sidebar-card github-link-card">
            <div class="sidebar-card-title">Repository</div>
            <div class="github-stats">
              <span class="github-stat">⭐ ${s.stars} stars</span>
              <span class="github-stat">📦 ${formatNumber(s.downloads)} downloads</span>
            </div>
            <a href="${s.githubRepo}" target="_blank" rel="noopener" class="btn-github" style="display:flex; width:100%; justify-content:center; margin-bottom:var(--space-2)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              View Repository
            </a>
            <a href="${s.githubPackage}" target="_blank" rel="noopener" class="btn-download" style="display:flex; width:100%; justify-content:center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Latest Release
            </a>
          </div>

          <div class="sidebar-card">
            <div class="sidebar-card-title">Details</div>
            <div class="version-info">
              <div class="version-row">
                <span class="version-key">Version</span>
                <span class="version-val">v${s.version}</span>
              </div>
              <div class="version-row">
                <span class="version-key">Author</span>
                <span class="version-val">${s.author}</span>
              </div>
              <div class="version-row">
                <span class="version-key">Updated</span>
                <span class="version-val">${new Date(s.lastUpdated).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})}</span>
              </div>
              <div class="version-row">
                <span class="version-key">Difficulty</span>
                <span class="version-val">${s.difficulty}</span>
              </div>
              <div class="version-row">
                <span class="version-key">Status</span>
                <span class="version-val">${s.status}</span>
              </div>
            </div>
          </div>

          <div class="sidebar-card">
            <div class="sidebar-card-title">Tags</div>
            <div class="card-tags" style="margin-bottom:0">
              ${s.tags.map(t => `<span class="tag">${t}</span>`).join('')}
            </div>
          </div>

          <div class="sidebar-card">
            <div class="sidebar-card-title">Related Solutions</div>
            ${SOLUTIONS_DATA
              .filter(r => r.id !== s.id && (r.category === s.category || r.tags.some(t => s.tags.includes(t))))
              .slice(0, 3)
              .map(r => `
                <div onclick="navigate('solution', {id:'${r.id}'})" style="display:flex; align-items:center; gap:10px; padding:10px; cursor:pointer; border-radius:var(--radius-md); transition:var(--transition);" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
                  <span style="font-size:1.1rem">${r.icon}</span>
                  <div>
                    <div style="font-size:0.82rem; font-weight:600; margin-bottom:2px">${r.title}</div>
                    <div style="font-size:0.72rem; color:var(--text-tertiary); font-family:var(--font-mono)">${r.category}</div>
                  </div>
                </div>
              `).join('')}
          </div>

        </aside>
      </div>

    </div>
  `;

  // Render comments
  renderComments(s.id);
}

// ── Comments ───────────────────────────────
function renderComments(solutionId) {
  const listEl = document.getElementById('comments-list');
  if (!listEl) return;

  const sampleComments = SAMPLE_COMMENTS[solutionId] || [];
  const localComments = state.comments[solutionId] || [];
  const allComments = [...sampleComments, ...localComments];

  if (allComments.length === 0) {
    listEl.innerHTML = `<p style="color:var(--text-tertiary); font-size:0.875rem; text-align:center; padding:var(--space-5)">Be the first to comment on this solution.</p>`;
    return;
  }

  const avatarColors = ['#0078d4', '#038387', '#5c2d91', '#107c10', '#ca5010', '#d13438'];

  listEl.innerHTML = allComments.map((c, i) => {
    const bgColor = c.color || avatarColors[i % avatarColors.length];
    return `
      <div class="comment-item" style="animation-delay:${i * 60}ms">
        <div class="comment-avatar" style="background:${bgColor}">${c.initials || c.author.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</div>
        <div class="comment-body">
          <div class="comment-header">
            <span class="comment-author">${c.author}</span>
            <span class="comment-time">${c.time}</span>
          </div>
          <div class="comment-text">${c.text}</div>
        </div>
      </div>
    `;
  }).join('');
}

function postComment(solutionId) {
  const input = document.getElementById('comment-input');
  if (!input || !input.value.trim()) {
    showToast('Please write a comment first', '💬');
    return;
  }

  if (!state.comments[solutionId]) state.comments[solutionId] = [];

  const comment = {
    id: Date.now(),
    author: 'You',
    initials: 'YO',
    color: '#4d9de0',
    text: input.value.trim(),
    time: 'just now'
  };

  state.comments[solutionId].push(comment);
  input.value = '';
  renderComments(solutionId);
  showToast('Comment posted!', '✅');
}

function clearComment() {
  const input = document.getElementById('comment-input');
  if (input) input.value = '';
}

function switchCommentTab(btn, tab) {
  document.querySelectorAll('.comment-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('comments-local').style.display = tab === 'local' ? 'block' : 'none';
  document.getElementById('comments-github').style.display = tab === 'github' ? 'block' : 'none';
}

// ── Utility ────────────────────────────────
function copyLink(id) {
  const url = window.location.origin + window.location.pathname + `#solution-${id}`;
  navigator.clipboard.writeText(url).then(() => showToast('Link copied to clipboard!', '📋'));
}

function showToast(message, icon = '✅') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${icon}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ── Init ───────────────────────────────────
function init() {
  // Nav scroll effect
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  });

  // Search on listing page
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      searchClear.classList.toggle('visible', e.target.value.length > 0);
      renderSolutionsList();
    });
  }
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      searchClear.classList.remove('visible');
      renderSolutionsList();
    });
  }

  // Sort
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sort = e.target.value;
      renderSolutionsList();
    });
  }

  // Filter buttons
  document.querySelectorAll('[data-filter-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filters.category = btn.dataset.filterCategory;
      updateFilterUI();
      renderSolutionsList();
    });
  });

  document.querySelectorAll('[data-filter-difficulty]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filters.difficulty = btn.dataset.filterDifficulty;
      updateFilterUI();
      renderSolutionsList();
    });
  });

  document.querySelectorAll('[data-filter-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filters.status = btn.dataset.filterStatus;
      updateFilterUI();
      renderSolutionsList();
    });
  });

  // Handle initial hash
  const hash = window.location.hash;
  if (hash.startsWith('#solution-')) {
    const id = hash.replace('#solution-', '');
    navigate('solution', { id });
  } else if (hash === '#solutions') {
    navigate('solutions');
  } else if (hash === '#about') {
    navigate('about');
  } else {
    navigate('home');
  }

  // Hamburger menu
  const hamburger = document.querySelector('.nav-hamburger');
  const navLinks = document.querySelector('.nav-links');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
      navLinks.style.flexDirection = 'column';
      navLinks.style.position = 'fixed';
      navLinks.style.top = 'var(--nav-height)';
      navLinks.style.left = '0'; navLinks.style.right = '0';
      navLinks.style.background = 'var(--bg-surface)';
      navLinks.style.padding = 'var(--space-4)';
      navLinks.style.borderBottom = '1px solid var(--border-default)';
    });
  }

  // Category counts
  document.querySelectorAll('[data-cat-count]').forEach(el => {
    const cat = el.dataset.catCount;
    const count = cat === 'All'
      ? SOLUTIONS_DATA.length
      : SOLUTIONS_DATA.filter(s => s.category === cat).length;
    el.textContent = count;
  });
}

document.addEventListener('DOMContentLoaded', init);
