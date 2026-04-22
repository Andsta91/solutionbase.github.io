# SolutionBase ⚡

> A modern, open-source platform for discovering, learning, and deploying real-world solutions for the Microsoft Power Platform.

**[🌐 Live Site](https://andsta91.github.io/solutionbase.github.io/#)**

---

## 🚀 What is SolutionBase?

SolutionBase is a **static, GitHub-powered knowledge platform** that provides complete, end-to-end solutions for:

- 📱 Power Apps  
- ⚡ Power Automate  
- 💻 PowerShell  
- 🏢 SharePoint  

Unlike scattered tutorials, SolutionBase delivers:

✅ Full working solutions  
✅ Step-by-step documentation  
✅ Downloadable packages  
✅ Visual guides (images inside docs)  
✅ Community-driven contributions  

---

## 🧠 Key Concept

Each solution is:

- Defined in a central JSON file  
- Stored as a folder in the repository  
- Documented using Markdown (`README.md`)  
- Rendered dynamically on the website  

👉 This creates a **single source of truth** for code, docs, and assets.

---

## 📁 Repository Structure


/
├── index.html
├── css/
│ └── main.css
├── js/
│ └── app.js
├── data/
│ └── solutions.json
├── solutions/
│ ├── employee-onboarding/
│ │ ├── README.md
│ │ ├── package.zip
│ │ └── image1.png
│ ├── invoice-approval/
│ ├── README.md
│ └── image1.png
└── assets/
└── logo.png

## Adding a Solution

Solutions are defined in `js/solutions-data.js`. Each solution object follows this schema:

```javascript
{
  id: "unique-kebab-case-id",
  title: "Solution Title",
  category: "Power Apps", // or Power Automate, SharePoint, etc.
  tags: ["Tag1", "Tag2"],
  difficulty: "Intermediate", // Beginner | Intermediate | Advanced
  status: "Production Ready", // Production Ready | Beta | Experimental
  description: "One paragraph summary...",
  longDescription: `Multi-paragraph detailed description...`,
  features: ["Feature 1", "Feature 2"],
  components: [
    { name: "Component Name", description: "What it does", type: "Power Apps" }
  ],
  prerequisites: ["License requirement", "Module requirement"],
  githubRepo: "https://github.com/org/repo",
  githubPackage: "https://github.com/org/repo/releases/latest",
  author: "Author Name",
  lastUpdated: "YYYY-MM-DD",
  version: "1.0.0",
  stars: 0,
  downloads: 0,
  featured: false,
  icon: "📱",
  color: "#0078d4"
}
```

## Contributing

1. Fork this repository
2. Add your solution to `js/solutions-data.js`
3. Ensure your solution's GitHub repo has a tagged release with a downloadable `.zip` package
4. Submit a pull request with a description of what your solution does

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## Deployment

This site is deployed automatically to GitHub Pages from the `main` branch. No build step required — pure HTML, CSS, and JavaScript.

## License

MIT © SolutionBase Contributors
