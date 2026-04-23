# Contributing to SolutionBase

Thank you for considering a contribution. SolutionBase is community-powered — every solution in this library came from someone solving a real problem and choosing to share it.

## What We Accept

We accept complete, end-to-end solutions for:

- **Power Apps** — Canvas Apps, Model-Driven Apps
- **Power Automate** — Cloud flows, desktop flows, AI Builder
- **SharePoint** — SPFx web parts, site templates, provisioning scripts
- **PowerShell** — PnP PowerShell, Graph PowerShell, M365 automation
- **Mixed** — solutions that span multiple tools (e.g. Power Apps + Power Automate + SharePoint)

We do **not** accept:
- Single-file snippets or utility functions (these belong in a Gist)
- Solutions without documentation
- Solutions requiring paid third-party services
- Proof-of-concepts without production validation

## Submission Process

### 1. Fork the repository

```bash
git clone https://github.com/Andsta91/solutionbase.github.io
cd solutionbase.github.io
```

### 2. Create your solution folder

```
solutions/
└── your-solution-name/       # kebab-case, descriptive
    ├── README.md             # Required — see template below
    ├── package.zip           # Required — importable package
    └── screenshot.png        # Optional but encouraged
```

### 3. Add your entry to data/solutions.json

Copy an existing entry and update all fields. Required fields:

```json
{
  "id": "your-solution-name",
  "title": "Human Readable Title",
  "tool": "Power Apps",
  "tags": ["Canvas App", "SharePoint"],
  "difficulty": "Intermediate",
  "status": "Production Ready",
  "version": "1.0.0",
  "lastUpdated": "YYYY-MM-DD",
  "stars": 0,
  "downloads": 0,
  "featured": false,
  "icon": "📱",
  "color": "#0078d4",
  "description": "One paragraph (2-3 sentences) — what problem does this solve and for whom?",
  "readmePath": "solutions/your-solution-name/README.md",
  "packagePath": "solutions/your-solution-name/package.zip",
  "githubRepo": "https://github.com/Andsta91/solutionbase.github.io/tree/main/solutions/your-solution-name",
  "features": ["Feature 1", "Feature 2", "Feature 3"],
  "components": [
    { "name": "Component Name", "description": "What it does", "type": "Power Apps" }
  ],
  "prerequisites": ["Prerequisite 1", "Prerequisite 2"]
}
```

### 4. Write your README.md

Your README must include:

- **Overview** — what the solution does and why
- **Architecture** — how the components connect (a diagram or text description)
- **Installation** — step-by-step from zero to working
- **Configuration** — all environment variables, settings, or list configuration
- **Version History** — at minimum the current version and date

### 5. Package your solution

Your `package.zip` should be importable directly into the target environment:

- **Power Apps / Power Automate**: Export from Power Platform as a managed or unmanaged solution package
- **SharePoint SPFx**: Include the `.sppkg` file and a PnP provisioning template if needed
- **PowerShell**: Zip the script folder with a `requirements.txt` or equivalent

### 6. Submit a pull request

Open a PR with:
- Title: `Add: [Solution Name]`
- Description: What the solution does, who it's for, and what environments you've tested it in

## Review Criteria

Maintainers review for:

1. **Completeness** — does it work end-to-end as described?
2. **Documentation** — can someone install this without prior knowledge of the solution?
3. **Code quality** — is the Power Automate flow / PowerShell script readable and maintainable?
4. **Security** — no hardcoded credentials, no excessive permissions
5. **Compatibility** — works on current Microsoft 365 commercial cloud (GCC notes are a bonus)

## Updating an Existing Solution

For bug fixes or improvements to existing solutions:

1. Update the version in `data/solutions.json`
2. Update the `lastUpdated` field
3. Add an entry to the README's version history
4. Replace `package.zip` with the new release
5. Submit a PR with title: `Update: [Solution Name] v[version]`

## Questions?

Open a [GitHub Discussion](https://github.com/Andsta91/solutionbase.github.io/discussions) or file an [Issue](https://github.com/Andsta91/solutionbase.github.io/issues).
