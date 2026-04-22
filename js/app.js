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

  app.innerHTML = `
    <div class="container">
      <h1>Solutions</h1>
      <div class="grid" id="grid"></div>
    </div>
  `;

  const grid = document.getElementById("grid");

  list.forEach(s => {
    const el = document.createElement("div");
    el.className = "card";

    el.innerHTML = `
      <div class="tag">${s.tool}</div>
      <div class="title">${s.title}</div>
      <div class="desc">${s.description}</div>
      <div class="meta">${s.difficulty} • ${s.time}</div>
    `;

    // 🔥 THIS is Step 4 (click navigation)
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
  const url = `https://github.com/Andsta91/solutionbase.github.io/main/solutions/${slug}/README.md`;

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
