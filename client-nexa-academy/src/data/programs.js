export const programs = [
  {
    id: 1,
    title: "Software Engineering",
    description:
      "Learn to build scalable web applications using modern tools and frameworks.",
    duration: "6 Months",
    level: "Beginner to Advanced",
    students: "-",
    price: 150000,
    originalPrice: 175000,
    slug: "software-engineering",
    icon: "/icons/react.png",
    image: "/react.jpg",
    topics: [
      { name: "HTML and CSS", icon: "/icons/html.png" },
      { name: "Git", icon: "/icons/git.png" },
      { name: "Javascript", icon: "/icons/javascript.png" },
      { name: "React", icon: "/icons/react.png" },
      { name: "Python", icon: "/icons/python.png" },
      { name: "Postgres", icon: "/icons/postgres.png" },
      { name: "Docker", icon: "/icons/docker.png" },
    ],
    durationMonths: 6,
    subtitle: "From Frontend Basics to Production-Ready Software Engineering",
    features: [
      {
        icon: "code",
        title: "Structured Learning Path",
        desc: "Frontend Basics -> React -> Python -> Django -> Full-Stack Integration",
      },
      {
        icon: "users",
        title: "Mentor-Led Delivery",
        desc: "Weekly guidance and practical reviews from industry mentors",
      },
      {
        icon: "book",
        title: "Build-First Curriculum",
        desc: "Portfolio projects across frontend, backend, and full-stack deployment",
      },
      {
        icon: "target",
        title: "Job Readiness",
        desc: "Interview prep, CV support, and real project presentation coaching",
      },
    ],
    curriculum: [
      {
        phase: "Month 1",
        title: "Frontend Basics",
        weeks: "4 weeks",
        topics: [
          "CLI workflow and developer tooling",
          "Git and GitHub collaboration flow",
          "HTML, CSS, and responsive layouts",
          "Tailwind CSS utility-first styling",
          "JavaScript ES6 fundamentals",
        ],
        project: "Developer Portfolio Landing Page",
      },
      {
        phase: "Month 2",
        title: "React",
        weeks: "4 weeks",
        topics: [
          "React basics and component architecture",
          "React Hooks and state patterns",
          "API integration and async data flows",
          "Redux state management",
          "BaaS options: Firebase and Supabase",
          "Backend option: Express + MongoDB",
        ],
        project: "React Product Dashboard with API + Redux",
      },
      {
        phase: "Month 3",
        title: "Python",
        weeks: "4 weeks",
        topics: [
          "Python syntax and clean coding fundamentals",
          "Data structures and algorithmic thinking",
          "OOP and module structuring",
          "Working with files, JSON, and APIs",
        ],
        project: "Python Automation and API Utility Toolkit",
      },
      {
        phase: "Month 4",
        title: "Django",
        weeks: "4 weeks",
        topics: [
          "Django project architecture and apps",
          "Django ORM and PostgreSQL integration",
          "REST APIs with Django REST Framework",
          "Auth, permissions, and secure endpoints",
        ],
        project: "Django API with Auth and Role Access",
      },
      {
        phase: "Month 5",
        title: "Full-Stack Integration & Advanced Topics",
        weeks: "4 weeks",
        topics: [
          "Connecting React frontend to Django backend",
          "State, caching, and performance tuning",
          "Testing strategy for frontend and backend",
          "Authentication flows and deployment readiness",
        ],
        project: "Full-Stack Team Collaboration Platform",
      },
      {
        phase: "Month 6",
        title: "Capstone Project & DevOps",
        weeks: "4 weeks",
        topics: [
          "Capstone scoping, architecture, and delivery",
          "Docker containerization and environment setup",
          "CI/CD pipelines and cloud deployment",
          "Monitoring, logs, and presentation readiness",
        ],
        project: "Production-Ready Capstone Application",
      },
    ],
    outcomes: [
      "Build responsive interfaces with HTML, CSS, Tailwind, and modern JavaScript",
      "Develop React applications with Hooks, Redux, and API integrations",
      "Work with BaaS solutions (Firebase, Supabase) and backend integrations",
      "Write backend services with Python and Django REST Framework",
      "Integrate full-stack applications and deploy with DevOps workflows",
      "Implement testing, security, and performance optimization in production apps",
      "Ship a production-ready capstone for your portfolio",
      "Present project outcomes confidently for technical interviews",
    ],
    faq: [
      {
        question: "Do I need prior programming experience?",
        answer:
          "Basic understanding of programming concepts is helpful, but we start from fundamentals. Complete beginners can succeed with dedication.",
      },
      {
        question: "What kind of projects will I build?",
        answer:
          "You'll build 6+ projects including a portfolio site, e-commerce catalog, blog API, social dashboard, chat app, and a capstone project.",
      },
      {
        question: "Will I get a certificate?",
        answer:
          "Yes! Upon successful completion, you'll receive a verified certificate from Nexa Academy.",
      },
      {
        question: "What support is available?",
        answer:
          "You'll have weekly 1:1 mentorship, access to our community Discord, live Q&A sessions, and detailed code reviews.",
      },
    ],
  },
  {
    id: 2,
    title: "Cloud Computing and AI",
    description:
      "Master cloud infrastructure, CI/CD pipelines, and scalable deployments.",
    duration: "3 Months",
    level: "Intermediate",
    students: "-",
    price: 120000,
    originalPrice: 145000,
    slug: "cloud-engineering",
    icon: "/icons/azure.png",
    image: "/devops.png",
    topics: [
      { name: "Azure", icon: "/icons/azure.png" },
      { name: "GitHub Actions", icon: "/icons/github.png" },
      { name: "DevOps", icon: "/icons/devops.png" },
      { name: "CI/CD", icon: "/icons/git.png" },
      { name: "Docker", icon: "/icons/docker.png" },
      { name: "Monitoring", icon: "/icons/scripting.png" },
    ],
    durationMonths: 3,
    subtitle: "Cloud Operations, Analytics, and Applied AI on Azure",
    features: [
      {
        icon: "cloud",
        title: "Modern Cloud Stack",
        desc: "Azure infrastructure, security, and reliability operations",
      },
      {
        icon: "chart",
        title: "Data + AI Workflow",
        desc: "Fabric pipelines, Power BI, and applied Azure OpenAI usage",
      },
      {
        icon: "tool",
        title: "Production Delivery",
        desc: "CI/CD, observability, incident response, and governance practices",
      },
      {
        icon: "clipboard",
        title: "Certification Ready",
        desc: "Structured preparation for AZ-104 and DP-600 paths",
      },
    ],
    curriculum: [
      {
        phase: "Month 1",
        title: "Cloud Foundations & Azure Core",
        weeks: "4 weeks",
        topics: [
          "Cloud architecture principles (IaaS/PaaS/SaaS)",
          "Azure networking, storage, and compute services",
          "Identity, RBAC, and security baselines",
          "Monitoring, alerts, and cost management",
        ],
        project: "Cloud Operations Baseline Setup",
      },
      {
        phase: "Month 2",
        title: "Data, Analytics & AI Workloads",
        weeks: "4 weeks",
        topics: [
          "Microsoft Fabric pipelines and lakehouse workflow",
          "Power BI semantic modeling and dashboarding",
          "Azure OpenAI fundamentals and responsible AI",
          "Prompt patterns, retrieval workflows, and evaluation",
        ],
        project: "AI-Enhanced Analytics Workspace",
      },
      {
        phase: "Month 3",
        title: "Cloud + AI Engineering & Delivery",
        weeks: "4 weeks",
        topics: [
          "CI/CD for cloud and analytics workloads",
          "Automated testing and quality gates for data apps",
          "Incident response, reliability, and observability",
          "Capstone deployment and certification prep (AZ-104, DP-600)",
        ],
        project: "Cloud + AI Production Capstone",
      },
    ],
    outcomes: [
      "Provision and manage secure Azure cloud infrastructure",
      "Design analytics workflows with Microsoft Fabric and Power BI",
      "Apply Azure OpenAI and prompt design in practical business workflows",
      "Implement CI/CD and monitoring for cloud and data services",
      "Respond to incidents using structured reliability practices",
      "Improve cost, performance, and governance across environments",
      "Prepare for AZ-104 and DP-600 with hands-on project experience",
      "Deliver a cloud and AI capstone ready for portfolio and interviews",
    ],
    faq: [
      {
        question: "What background is required for this Program?",
        answer:
          "Basic understanding of IT concepts and networking is helpful. No prior cloud experience required.",
      },
      {
        question: "Will I get hands-on experience with Azure?",
        answer:
          "Yes! You'll get Azure credits for hands-on labs and work on real support ticket simulations.",
      },
      {
        question: "What certifications will this prepare me for?",
        answer:
          "The Program prepares you for Microsoft AZ-104 (Azure Administrator) and DP-600 (Fabric Analytics Engineer).",
      },
      {
        question: "What career paths are available after completion?",
        answer:
          "Cloud Support Engineer, Azure Administrator, Cloud Operations Engineer, Fabric Analytics Engineer, Site Reliability Engineer.",
      },
    ],
  },
  {
    id: 3,
    title: "Data Science (Coming Soon)",
    description:
      "Coming soon — practical Data Science and Machine Learning with Python, model evaluation, and applied AI workflows.",
    duration: "6 Months",
    level: "Intermediate",
    students: "—",
    price: null,
    originalPrice: null,
    slug: "data-science",
    icon: "/icons/python.png",
    image: "/hero-img.jpg",
    topics: [
      { name: "CI/CD", icon: "/icons/git.png" },
      { name: "Python", icon: "/icons/python.png" },
      { name: "Data Analysis", icon: "/icons/postgres.png" },
    ],
    durationMonths: null,
    comingSoon: true,
    subtitle: "Data analysis, ML pipelines, and production ML workflows",
    features: [
      {
        icon: "python",
        title: "Python for Data Science",
        desc: "Pandas, NumPy, data cleaning and EDA",
      },
      {
        icon: "ml",
        title: "Machine Learning",
        desc: "Supervised learning, evaluation, and model selection",
      },
      {
        icon: "deployment",
        title: "Model Deployment",
        desc: "Containerize and serve models; introduce CI/CD for ML",
      },
      {
        icon: "ethics",
        title: "Responsible AI",
        desc: "Bias, fairness, and evaluation best practices",
      },
    ],
    curriculum: [
      {
        phase: "Phase 1",
        title: "Python & Statistics",
        weeks: "Weeks 1–4",
        topics: [
          "Python for data analysis (Pandas, NumPy)",
          "Exploratory data analysis and visualization",
          "Basic statistics and probability for ML",
        ],
      },
      {
        phase: "Phase 2",
        title: "Supervised & Unsupervised Learning",
        weeks: "Weeks 5–12",
        topics: [
          "Regression and classification",
          "Feature engineering and pipelines",
          "Clustering and dimensionality reduction",
        ],
      },
      {
        phase: "Phase 3",
        title: "Model Evaluation & Deployment",
        weeks: "Weeks 13–20",
        topics: [
          "Model validation, metrics, and A/B testing",
          "Serving models with APIs and containers",
          "Monitoring, retraining, and MLops basics",
        ],
      },
      {
        phase: "Phase 4",
        title: "Applied Project",
        weeks: "Weeks 21–24",
        topics: [
          "End-to-end project: data -> model -> deploy",
          "Presentation & evaluation",
        ],
      },
    ],
    faq: [
      {
        question: "Do I need a background in ML?",
        answer:
          "Basic programming and statistics are helpful; we cover core concepts and practical workflows.",
      },
    ],
  },
];
