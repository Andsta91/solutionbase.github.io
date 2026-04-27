# SolutionBase ⚡

> A curated library of production-ready, end-to-end solutions for the Microsoft Power Platform.

**[🌐 Visit SolutionBase](https://solutionbase.github.io)** | **[Browse Solutions](https://solutionbase.github.io/#solutions)** | **[Contribute](#contributing)**

---

## What is SolutionBase?

SolutionBase is a static website and community resource providing complete, deployable solutions for:

- 📱 **Power Apps** — Canvas Apps, Model-Driven Apps
- ⚡ **Power Automate** — Flows, Approval Engines, Teams Bots
- 🏢 **SharePoint** — Site Provisioning, Governance
- 🧩 **SharePoint Webparts** — SPFx Components (React + TypeScript)
- 💻 **PowerShell** — PnP Scripts, M365 Automation

Every solution includes:
- Full documentation and architecture overview
- Component breakdown with descriptions
- Prerequisites and license requirements
- Packaged release for direct import
- GitHub Discussions for community support

## Repository Structure

```
/
├── index.html          # Main single-page app
├── css/
│   └── main.css        # All styles
├── js/
│   ├── solutions-data.js   # Solutions database
│   └── app.js              # SPA routing + rendering
└── _config.yml         # GitHub Pages config
```

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
