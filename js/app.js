let solutions = [];

/* LOAD DATA */
async function loadSolutions() {
  const res = await fetch('./data/solutions.json');
  solutions = await res.json();
  router();
}

loadSolutions();

/* ROUTER */
function router() {
  const hash = window.location.hash;

  if (hash.startsWith("#solution=")) {
    const slug = hash.replace("#solution=", "");
    renderSolutionPage(slug);
  } else {
    renderSolutions(solutions);
  }
}

window.addEventListener("hashchange", router);

/* RENDER LIST */
function renderSolutions(list) {
  const app = document.getElementById("app");

  app.innerHTML = `<div class="container"><div class="grid" id="grid"></div></div>`;

  const grid = document.getElementById("grid");

  list.forEach(s => {
    const el = document.createElement("div");
    el.className = "card";

    el.innerHTML = `
      ${s.verified ? '<span class="badge verified">Verified</span>' : ''}
      ${s.new ? '<span class="badge new">New</span>' : ''}

      <div class="title">${s.title}</div>
      <div class="desc">${s.description}</div>
    `;

    el.onclick = () => {
      window.location.hash = `solution=${s.slug}`;
    };

    grid.appendChild(el);
  });
}

/* FILTERS */
function applyFilters() {
  const search = document.getElementById("search").value.toLowerCase();
  const tool = document.getElementById("toolFilter").value;
  const difficulty = document.getElementById("difficultyFilter").value;

  const filtered = solutions.filter(s =>
    s.title.toLowerCase().includes(search) ||
    s.description.toLowerCase().includes(search) ||
    (s.tags && s.tags.join(" ").toLowerCase().includes(search))
  ).filter(s =>
    (tool === "" || s.tool === tool) &&
    (difficulty === "" || s.difficulty === difficulty)
  );

  renderSolutions(filtered);
}

/* EVENTS */
document.getElementById("search").addEventListener("input", applyFilters);
document.getElementById("toolFilter").addEventListener("change", applyFilters);
document.getElementById("difficultyFilter").addEventListener("change", applyFilters);

/* SOLUTION PAGE */
function renderSolutionPage(slug) {
  const s = solutions.find(x => x.slug === slug);

  document.getElementById("app").innerHTML = `
    <div class="container">
      <button onclick="window.location.hash=''">← Back</button>

      <h1>${s.title}</h1>
      <p>${s.description}</p>

      ${s.package ? `<a href="${s.package}">Download</a>` : ''}

      <div class="solution-content">
        <div id="readme">Loading...</div>
      </div>
    </div>
  `;

  loadReadme(slug);
}

/* LOAD README */
async function loadReadme(slug) {
  const url = `https://raw.githubusercontent.com/Andsta91/solutionbase.github.io/main/solutions/${slug}/README.md`;

  try {
    const res = await fetch(url);
    const text = await res.text();

    document.getElementById("readme").innerHTML = marked.parse(text);

  } catch {
    document.getElementById("readme").innerHTML = "Failed to load content.";
  }
}

/* THEME */
const toggleBtn = document.getElementById("themeToggle");

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
}

toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
});
