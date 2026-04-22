let solutions = [];

async function loadSolutions() {
  const res = await fetch('./data/solutions.json');
  solutions = await res.json();
  renderSolutions(solutions);
}

loadSolutions();
