let solutions = [];

async function loadSolutions() {
  const res = await fetch('./data/solutions.json');
  solutions = await res.json();
  renderSolutions(solutions);
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
