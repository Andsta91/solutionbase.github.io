let solutions = [];

async function loadSolutions() {
  const res = await fetch('./data/solutions.json');
  solutions = await res.json();
  router(); // 🔥 important
}

loadSolutions();

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

function renderSolutions(list) {
  const app = document.getElementById("app");

  app.innerHTML = `<div class="grid" id="grid"></div>`;

  const grid = document.getElementById("grid");

  list.forEach(s => {
    const el = document.createElement("div");
    el.className = "card";

    el.innerHTML = `
      <div>
        ${s.verified ? '<span class="badge verified">Verified</span>' : ''}
        ${s.new ? '<span class="badge new">New</span>' : ''}
      </div>

      <div class="title">${s.title}</div>
      <div class="desc">${s.description}</div>
      <div class="meta">${s.tool} • ${s.difficulty}</div>
    `;

    el.onclick = () => {
      window.location.hash = `solution=${s.slug}`;
    };

    grid.appendChild(el);
  });
}

function renderSolutionPage(slug) {
  const solution = solutions.find(s => s.slug === slug);

  if (!solution) {
    document.getElementById("app").innerHTML = "<h2>Not found</h2>";
    return;
  }

  document.getElementById("app").innerHTML = `
    <div class="container">

      <button onclick="window.location.hash=''">← Back</button>

      <h1>${solution.title}</h1>
      <p>${solution.description}</p>

      <p><strong>Tool:</strong> ${solution.tool}</p>
      <p><strong>Difficulty:</strong> ${solution.difficulty}</p>
      <p><strong>Time:</strong> ${solution.time}</p>

      <div id="readme">Loading content...</div>

    </div>
  `;

  loadReadme(slug);
}

async function loadReadme(slug) {
  const url = `https://raw.githubusercontent.com/Andsta91/solutionbase.github.io/main/solutions/${slug}/README.md`;

  const res = await fetch(url);
  const text = await res.text();

  document.getElementById("readme").innerHTML = markdownToHtml(text);
}

function markdownToHtml(md) {
  return md
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
    .replace(/\n/g, '<br>');
}
const toggleBtn = document.getElementById("themeToggle");

// Load saved theme
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  toggleBtn.textContent = "☀️";
} else {
  toggleBtn.textContent = "🌙";
}

toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");

  localStorage.setItem("theme", isDark ? "dark" : "light");

  toggleBtn.textContent = isDark ? "☀️" : "🌙";
});

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

document.getElementById("search").addEventListener("input", applyFilters);

document.getElementById("toolFilter").addEventListener("change", applyFilters);

document.getElementById("difficultyFilter").addEventListener("change", applyFilters);
