const SOLUTIONS_DATA = [
  {
    id: "powerapp-employee-onboarding",
    title: "Employee Onboarding Hub",
    category: "Power Apps",
    tags: ["Canvas App", "SharePoint", "Power Automate", "Adaptive Cards"],
    difficulty: "Intermediate",
    status: "Production Ready",
    description: "A complete employee onboarding solution built on Power Apps Canvas. New hires walk through a structured journey: documentation submission, equipment requests, team introductions, and policy acknowledgments — all tracked in SharePoint and triggered via Power Automate flows.",
    longDescription: `This end-to-end onboarding solution eliminates manual HR processes by providing a guided digital experience for new hires from day one. The Canvas App serves as the primary interface, backed by SharePoint lists for data persistence and Power Automate flows for notifications and approvals.

The solution includes multi-stage onboarding checklists, document upload functionality with version control, automated email sequences to managers and IT, integration with Microsoft Teams for welcome card posting, and a dashboard for HR to track onboarding completion rates across the organization.`,
    features: [
      "Multi-step onboarding wizard with progress tracking",
      "Document upload with SharePoint integration",
      "Automated notifications via Power Automate",
      "Manager approval workflows",
      "Teams welcome card via Adaptive Cards",
      "HR Dashboard with completion analytics",
      "Mobile-responsive Canvas App design",
      "Role-based access control"
    ],
    components: [
      { name: "Canvas App", description: "Main onboarding interface for new hires", type: "Power Apps" },
      { name: "SharePoint Lists", description: "OnboardingTasks, Employees, Documents lists", type: "SharePoint" },
      { name: "Automate Flow - Welcome", description: "Triggers on new employee record, sends Teams card", type: "Power Automate" },
      { name: "Automate Flow - IT Request", description: "Routes equipment requests to IT helpdesk", type: "Power Automate" },
      { name: "Model-Driven App", description: "HR admin view for managing onboarding templates", type: "Power Apps" }
    ],
    prerequisites: [
      "Microsoft 365 E3 or above",
      "Power Apps per user or per app license",
      "SharePoint Online",
      "Power Automate standard connectors"
    ],
    githubRepo: "https://github.com/solutionbase/employee-onboarding-hub",
    githubPackage: "https://github.com/solutionbase/employee-onboarding-hub/releases/latest",
    author: "SolutionBase Team",
    lastUpdated: "2024-11-15",
    version: "2.1.0",
    stars: 247,
    downloads: 1842,
    featured: true,
    icon: "👥",
    color: "#0078d4"
  },
  {
    id: "powerautomate-approval-engine",
    title: "Universal Approval Engine",
    category: "Power Automate",
    tags: ["Approvals", "SharePoint", "Teams", "HTTP Connector"],
    difficulty: "Advanced",
    status: "Production Ready",
    description: "A reusable, configurable approval framework that handles sequential, parallel, and delegated approvals across any business process. Driven entirely by SharePoint configuration lists — no flow editing required to add new approval workflows.",
    longDescription: `The Universal Approval Engine solves the problem of building one-off approval flows for every new process. Instead, it reads workflow configuration from a SharePoint list, allowing business users to define multi-step approval chains, set SLAs, configure escalation paths, and enable delegation without any development involvement.

The engine supports sequential approvals (one after another), parallel approvals (all must approve), and quorum-based approvals (majority must approve). It integrates natively with Microsoft Teams for inline approvals and sends rich Adaptive Card notifications with full context.`,
    features: [
      "Configuration-driven — no code changes for new workflows",
      "Sequential, parallel, and quorum approval modes",
      "Automatic escalation after configurable SLA",
      "Delegation support with audit trail",
      "Teams Adaptive Card approvals (approve without leaving Teams)",
      "Full audit log to SharePoint",
      "Recall and reassignment capabilities",
      "Email fallback when Teams is unavailable"
    ],
    components: [
      { name: "Main Orchestrator Flow", description: "Core routing engine that reads config and dispatches", type: "Power Automate" },
      { name: "Approval Step Child Flow", description: "Reusable child flow for each approval step", type: "Power Automate" },
      { name: "Escalation Monitor Flow", description: "Scheduled flow checking SLA breaches", type: "Power Automate" },
      { name: "Config SharePoint Lists", description: "WorkflowDefinitions, ApprovalGroups, AuditLog", type: "SharePoint" },
      { name: "Teams Bot Manifest", description: "Adaptive Card templates for inline approvals", type: "Teams" }
    ],
    prerequisites: [
      "Power Automate Premium (for HTTP connector)",
      "SharePoint Online",
      "Microsoft Teams",
      "Azure AD for user lookup"
    ],
    githubRepo: "https://github.com/solutionbase/universal-approval-engine",
    githubPackage: "https://github.com/solutionbase/universal-approval-engine/releases/latest",
    author: "SolutionBase Team",
    lastUpdated: "2024-12-01",
    version: "3.0.2",
    stars: 389,
    downloads: 2910,
    featured: true,
    icon: "⚙️",
    color: "#0066b8"
  },
  {
    id: "sharepoint-modern-intranet",
    title: "Modern Intranet Starter Kit",
    category: "SharePoint",
    tags: ["SPFx", "React", "Viva Connections", "SharePoint Framework"],
    difficulty: "Advanced",
    status: "Production Ready",
    description: "A complete SharePoint Framework intranet solution with custom web parts: news aggregator, org chart, quick links, weather, events calendar, and CEO message banner. Fully packaged as a .sppkg for one-click deployment.",
    longDescription: `Building a modern intranet from scratch is time-consuming. This starter kit provides a collection of polished SPFx web parts that work independently or together to form a complete intranet homepage experience.

All web parts are built with React and PnPjs, follow Fluent UI design system, and are fully configurable via property panes. The package includes a SharePoint site template that sets up all required lists and content types automatically.`,
    features: [
      "9 custom SPFx web parts included",
      "News aggregator with category filtering",
      "Interactive org chart from Azure AD",
      "Events calendar with SharePoint list integration",
      "Quick links with drag-and-drop reordering",
      "Department news targeting by audience",
      "One-click .sppkg deployment",
      "Site template XML for automated setup"
    ],
    components: [
      { name: "News Aggregator Web Part", description: "Pulls from multiple news sources/lists with filtering", type: "SPFx" },
      { name: "OrgChart Web Part", description: "Renders org hierarchy from Azure AD Graph", type: "SPFx" },
      { name: "Events Calendar Web Part", description: "Calendar view backed by SharePoint Events list", type: "SPFx" },
      { name: "Quick Links Web Part", description: "Configurable tile grid with icons", type: "SPFx" },
      { name: "Site Template", description: "PnP provisioning template for automated setup", type: "SharePoint" }
    ],
    prerequisites: [
      "SharePoint Online",
      "Node.js 18+ for development",
      "SharePoint Framework 1.18+",
      "Tenant App Catalog access"
    ],
    githubRepo: "https://github.com/solutionbase/modern-intranet-kit",
    githubPackage: "https://github.com/solutionbase/modern-intranet-kit/releases/latest",
    author: "SolutionBase Team",
    lastUpdated: "2024-10-20",
    version: "1.4.0",
    stars: 512,
    downloads: 3650,
    featured: true,
    icon: "🏢",
    color: "#038387"
  },
  {
    id: "powershell-sharepoint-provisioning",
    title: "SharePoint Site Provisioner",
    category: "PowerShell",
    tags: ["PnP PowerShell", "Site Provisioning", "Automation", "Teams"],
    difficulty: "Intermediate",
    status: "Production Ready",
    description: "A PowerShell script suite using PnP PowerShell to provision SharePoint sites from JSON templates. Supports project sites, team sites, and communication sites with full library structure, permissions, and Teams team creation.",
    longDescription: `Manual SharePoint site creation is inconsistent and error-prone. This script suite reads a JSON site template and provisions everything: site collection, subsites, document libraries, lists, content types, permissions groups, navigation, and optionally creates a linked Microsoft Teams team.

Designed for IT admins and DevOps engineers who need repeatable, auditable site provisioning. Includes dry-run mode, logging, and rollback capability. Can be run interactively or unattended via Azure Automation runbooks.`,
    features: [
      "JSON-driven site templates",
      "Creates site collections, libraries, lists, and content types",
      "Applies permission groups and role assignments",
      "Creates linked Teams team with channels",
      "Dry-run mode for safe testing",
      "Comprehensive logging to file and console",
      "Parallel provisioning for bulk operations",
      "Azure Automation runbook compatible"
    ],
    components: [
      { name: "Invoke-SiteProvisioning.ps1", description: "Main entry point script", type: "PowerShell" },
      { name: "New-TeamSite.ps1", description: "Creates team site with standard libraries", type: "PowerShell" },
      { name: "Set-SitePermissions.ps1", description: "Applies permission templates", type: "PowerShell" },
      { name: "New-TeamsTeam.ps1", description: "Creates Teams team from site", type: "PowerShell" },
      { name: "templates/", description: "JSON site template examples", type: "Config" }
    ],
    prerequisites: [
      "PnP.PowerShell module 2.x",
      "PowerShell 7.2+",
      "SharePoint Admin role",
      "Azure AD App Registration (for unattended)"
    ],
    githubRepo: "https://github.com/solutionbase/sharepoint-provisioner",
    githubPackage: "https://github.com/solutionbase/sharepoint-provisioner/releases/latest",
    author: "SolutionBase Team",
    lastUpdated: "2024-11-30",
    version: "2.0.1",
    stars: 198,
    downloads: 1520,
    featured: false,
    icon: "⚡",
    color: "#5c2d91"
  },
  {
    id: "powerapp-leave-management",
    title: "Leave Management System",
    category: "Power Apps",
    tags: ["Canvas App", "Power Automate", "SharePoint", "Teams"],
    difficulty: "Beginner",
    status: "Production Ready",
    description: "A full-featured leave request and management system. Employees submit leave requests in a Canvas App, managers approve via Teams notifications, and HR tracks balances with a model-driven reporting dashboard.",
    longDescription: `This solution replaces email-based leave requests with a structured, trackable system. The employee-facing Canvas App provides leave balance visibility, request submission, and request history. Managers receive Teams notifications for quick approval or rejection directly from their mobile device.

HR administrators use a Model-Driven App to manage leave policies, adjust balances, and generate reports on leave usage across teams. All data is stored in Dataverse for enterprise-grade reliability.`,
    features: [
      "Employee self-service leave request portal",
      "Real-time leave balance display",
      "Manager approval via Teams Adaptive Cards",
      "Multi-level approval for extended leave",
      "Calendar view of team leave for conflict detection",
      "HR admin dashboard with leave analytics",
      "Public holiday management",
      "Annual balance rollover automation"
    ],
    components: [
      { name: "Employee Canvas App", description: "Self-service leave request interface", type: "Power Apps" },
      { name: "HR Model-Driven App", description: "Admin interface for policy and reporting", type: "Power Apps" },
      { name: "Approval Flow", description: "Routes requests to manager with Teams card", type: "Power Automate" },
      { name: "Balance Recalculation Flow", description: "Scheduled monthly balance updates", type: "Power Automate" },
      { name: "Dataverse Tables", description: "LeaveRequests, Employees, LeaveTypes, Balances", type: "Dataverse" }
    ],
    prerequisites: [
      "Power Apps per user license",
      "Dataverse environment",
      "Power Automate standard",
      "Microsoft Teams"
    ],
    githubRepo: "https://github.com/solutionbase/leave-management-system",
    githubPackage: "https://github.com/solutionbase/leave-management-system/releases/latest",
    author: "SolutionBase Team",
    lastUpdated: "2024-09-15",
    version: "1.2.0",
    stars: 334,
    downloads: 2780,
    featured: false,
    icon: "📅",
    color: "#107c10"
  },
  {
    id: "spfx-document-management",
    title: "Document Lifecycle Manager",
    category: "SharePoint Webparts",
    tags: ["SPFx", "Document Management", "Approval", "Version Control"],
    difficulty: "Advanced",
    status: "Beta",
    description: "An SPFx web part that adds document lifecycle management directly to SharePoint document libraries: draft → review → approved → published states with inline approval workflows, version locking, and expiry notifications.",
    longDescription: `SharePoint document libraries lack native lifecycle management. This SPFx web part overlays a complete document state machine on any document library without modifying the underlying library structure.

Documents progress through configurable states with mandatory reviewer assignments. The web part tracks state transitions, locks document versions at approval points, and sends expiry reminders when documents need review. Perfect for quality management systems, policy repositories, and regulated industries.`,
    features: [
      "Configurable document state machine",
      "Inline approval from document library view",
      "Version locking at approval milestones",
      "Document expiry tracking and notifications",
      "Bulk state transitions for administrators",
      "Audit trail overlay in document panel",
      "Works with any SharePoint document library",
      "Export compliance reports to Excel"
    ],
    components: [
      { name: "DocLifecycle Web Part", description: "Main library view overlay web part", type: "SPFx" },
      { name: "Approval Panel Extension", description: "Field customizer for state display", type: "SPFx" },
      { name: "Expiry Monitor Flow", description: "Weekly scheduled expiry check", type: "Power Automate" },
      { name: "State Config List", description: "SharePoint list defining state transitions", type: "SharePoint" }
    ],
    prerequisites: [
      "SharePoint Online",
      "SharePoint Framework 1.18+",
      "Power Automate (for notifications)",
      "Site Collection Admin for deployment"
    ],
    githubRepo: "https://github.com/solutionbase/document-lifecycle-manager",
    githubPackage: "https://github.com/solutionbase/document-lifecycle-manager/releases/latest",
    author: "SolutionBase Team",
    lastUpdated: "2024-12-10",
    version: "0.9.2",
    stars: 156,
    downloads: 890,
    featured: false,
    icon: "📄",
    color: "#ca5010"
  },
  {
    id: "powerautomate-teams-bot",
    title: "IT Helpdesk Teams Bot",
    category: "Power Automate",
    tags: ["Teams Bot", "HTTP", "SharePoint", "Adaptive Cards", "Power Virtual Agents"],
    difficulty: "Advanced",
    status: "Production Ready",
    description: "A Teams-native IT helpdesk bot that accepts ticket submissions via Adaptive Cards, routes them to the right team, updates users on status, and tracks SLA compliance — all without leaving Microsoft Teams.",
    longDescription: `This solution delivers a fully functional IT helpdesk experience inside Microsoft Teams. Users interact with the bot to submit tickets, check status, add comments, and escalate issues. IT staff manage tickets through a dedicated Teams channel with Adaptive Card controls for assignment, status updates, and resolution.

Built on Power Automate with HTTP triggers and Teams connectors, the bot uses no third-party services. All ticket data is stored in SharePoint, making it accessible via the web even without Teams.`,
    features: [
      "Conversational ticket submission in Teams",
      "Category-based routing to IT sub-teams",
      "Proactive status update notifications",
      "SLA timer tracking with escalation",
      "Screenshot/attachment support",
      "IT staff management view in Teams channel",
      "Knowledge base search before ticket creation",
      "Weekly SLA compliance report"
    ],
    components: [
      { name: "Bot Orchestrator Flow", description: "HTTP trigger flow handling all bot messages", type: "Power Automate" },
      { name: "Ticket Router Flow", description: "Routes tickets to correct team channel", type: "Power Automate" },
      { name: "SLA Monitor Flow", description: "Scheduled SLA breach detector", type: "Power Automate" },
      { name: "Tickets SharePoint List", description: "Ticket storage with all metadata", type: "SharePoint" },
      { name: "Adaptive Card Templates", description: "JSON templates for all bot messages", type: "Teams" }
    ],
    prerequisites: [
      "Power Automate Premium (HTTP trigger)",
      "Microsoft Teams",
      "SharePoint Online",
      "Teams App deployment permissions"
    ],
    githubRepo: "https://github.com/solutionbase/helpdesk-teams-bot",
    githubPackage: "https://github.com/solutionbase/helpdesk-teams-bot/releases/latest",
    author: "SolutionBase Team",
    lastUpdated: "2024-11-05",
    version: "2.3.0",
    stars: 421,
    downloads: 3100,
    featured: true,
    icon: "🤖",
    color: "#6264a7"
  },
  {
    id: "powershell-m365-audit",
    title: "M365 Tenant Audit Reporter",
    category: "PowerShell",
    tags: ["Audit", "Compliance", "Exchange", "SharePoint", "Azure AD"],
    difficulty: "Intermediate",
    status: "Production Ready",
    description: "Comprehensive Microsoft 365 tenant audit script suite generating HTML and CSV reports on SharePoint permissions, inactive users, guest access, external sharing, MFA status, and Teams governance across the entire tenant.",
    longDescription: `Security audits of M365 tenants are complex and time-consuming. This script suite connects to SharePoint, Exchange, Azure AD, and Teams in one session and generates a full compliance picture in under 30 minutes for most tenants.

Reports are generated as standalone HTML files with sortable tables and summary dashboards, plus raw CSV exports for further analysis in Excel or Power BI. Designed for IT security teams, compliance officers, and MSPs managing multiple tenants.`,
    features: [
      "SharePoint external sharing audit",
      "Guest user access review",
      "MFA adoption report",
      "Inactive user detection (90/180/365 day)",
      "Teams without owners detection",
      "Service account license usage",
      "Mailbox delegation audit",
      "HTML dashboard + CSV export"
    ],
    components: [
      { name: "Start-TenantAudit.ps1", description: "Main script that runs all audit modules", type: "PowerShell" },
      { name: "Get-SharePointAudit.ps1", description: "SharePoint permissions and sharing audit", type: "PowerShell" },
      { name: "Get-UserAudit.ps1", description: "Azure AD user activity and MFA audit", type: "PowerShell" },
      { name: "Get-TeamsAudit.ps1", description: "Teams governance audit", type: "PowerShell" },
      { name: "Export-HtmlReport.ps1", description: "Renders HTML report from audit data", type: "PowerShell" }
    ],
    prerequisites: [
      "Microsoft Graph PowerShell SDK",
      "PnP.PowerShell module",
      "Exchange Online Management module",
      "Global Reader or higher role"
    ],
    githubRepo: "https://github.com/solutionbase/m365-audit-reporter",
    githubPackage: "https://github.com/solutionbase/m365-audit-reporter/releases/latest",
    author: "SolutionBase Team",
    lastUpdated: "2024-12-05",
    version: "3.1.0",
    stars: 287,
    downloads: 2100,
    featured: false,
    icon: "🔍",
    color: "#d13438"
  }
];

const CATEGORIES = ["All", "Power Apps", "Power Automate", "SharePoint", "SharePoint Webparts", "PowerShell"];
const DIFFICULTIES = ["All", "Beginner", "Intermediate", "Advanced"];
const STATUSES = ["All", "Production Ready", "Beta", "Experimental"];
