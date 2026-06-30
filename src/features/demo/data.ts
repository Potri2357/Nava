import type { ParsedProfile, GithubSignals } from "@/features/candidates/types";
import type { ParsedJD, ScoringWeights } from "@/features/jobs/types";

export interface DemoCandidate {
  id: string;
  full_name: string;
  title: string;
  location: string;
  raw_resume_text: string;
  parsed_profile: ParsedProfile;
  github_username: string | null;
  github_signals: GithubSignals | null;
  diversity_context: {
    review_name: string;
    graduation_decade: string;
    university_tier: "tier_1" | "tier_2" | "bootcamp" | "unknown";
  };
}

export interface DemoJob {
  id: string;
  title: string;
  company: string;
  raw_description: string;
  parsed_requirements: ParsedJD;
  scoring_weights: ScoringWeights;
}

export const defaultWeights: ScoringWeights = {
  technical_fit: 0.35,
  trajectory: 0.25,
  behavioral: 0.2,
  domain: 0.15,
  platform_activity: 0.05,
};

export const demoJobs: DemoJob[] = [
  {
    id: "job-senior-platform",
    title: "Senior Platform Engineer",
    company: "Northstar Fintech",
    raw_description:
      "We need a senior backend/platform engineer to build distributed payments infrastructure. Required: TypeScript or Go, PostgreSQL, event-driven systems, Kubernetes, observability, mentoring. Nice to have: fintech, open-source contributions, fraud or risk systems.",
    parsed_requirements: {
      required_skills: ["TypeScript", "Go", "PostgreSQL", "Kubernetes", "Distributed Systems", "Observability"],
      nice_to_have_skills: ["Fintech", "Open Source", "Fraud Systems", "Risk Systems"],
      seniority: "senior",
      min_years_exp: 5,
      max_years_exp: null,
      domain: "fintech",
      key_responsibilities: [
        "Build resilient payments infrastructure",
        "Design event-driven backend services",
        "Mentor engineers and improve operational maturity",
        "Own observability and incident response practices",
      ],
      education: null,
      role_summary:
        "Senior backend platform engineer for fintech payments systems requiring TypeScript or Go, PostgreSQL, Kubernetes, distributed systems, observability, and mentoring.",
    },
    scoring_weights: defaultWeights,
  },
  {
    id: "job-ml-product",
    title: "Applied AI Product Engineer",
    company: "Nava Labs",
    raw_description:
      "Build AI product workflows with React, Python, LLM APIs, evaluation harnesses, and user-facing product judgment. We value rapid prototyping, strong UX collaboration, and measurable business impact.",
    parsed_requirements: {
      required_skills: ["React", "Python", "LLM APIs", "Evaluation", "Product Engineering"],
      nice_to_have_skills: ["Next.js", "Prompt Engineering", "Analytics", "Design Systems"],
      seniority: "senior",
      min_years_exp: 4,
      max_years_exp: null,
      domain: "enterprise saas",
      key_responsibilities: [
        "Ship AI-assisted workflows",
        "Build evaluations for model quality",
        "Collaborate with design and customer teams",
        "Instrument product outcomes",
      ],
      education: null,
      role_summary:
        "Senior applied AI product engineer requiring React, Python, LLM APIs, evaluation systems, product judgment, and rapid prototyping.",
    },
    scoring_weights: defaultWeights,
  },
];

export const demoCandidates: DemoCandidate[] = [
  {
    id: "C-0042",
    full_name: "Jane Doe",
    title: "Staff Backend Engineer",
    location: "Austin, TX",
    github_username: "janedoe-platform",
    raw_resume_text:
      "Staff Backend Engineer with 7 years building payment ledgers, TypeScript services, Go workers, PostgreSQL, Kafka, Kubernetes, and observability. Led 8 engineers through a ledger migration that reduced reconciliation defects by 38%. Open-source maintainer for a small tracing library.",
    parsed_profile: {
      skills: [
        { name: "TypeScript", years: 6 },
        { name: "Go", years: 4 },
        { name: "PostgreSQL", years: 7 },
        { name: "Kubernetes", years: 4 },
        { name: "Distributed Systems", years: 6 },
        { name: "Observability", years: 5 },
        { name: "Fintech", years: 5 },
      ],
      experience: [
        {
          company: "LedgerLoop",
          title: "Staff Backend Engineer",
          seniority_level: 5,
          start_date: "2023-01",
          end_date: null,
          duration_months: 42,
          description: "Led platform reliability and mentored eight engineers on event-driven payments systems.",
          is_gap: false,
        },
        {
          company: "PayGrid",
          title: "Senior Software Engineer",
          seniority_level: 4,
          start_date: "2020-04",
          end_date: "2022-12",
          duration_months: 32,
          description: "Built PostgreSQL-backed reconciliation services and Kafka settlement flows.",
          is_gap: false,
        },
        {
          company: "BrightApps",
          title: "Software Engineer",
          seniority_level: 3,
          start_date: "2017-07",
          end_date: "2020-03",
          duration_months: 33,
          description: "Owned TypeScript APIs and production observability.",
          is_gap: false,
        },
      ],
      education: [{ institution: "UT Austin", degree: "BS", field: "Computer Science", graduation_year: 2017 }],
      total_years_experience: 9,
      certifications: ["CKA"],
      summary: "Staff backend engineer with strong fintech, distributed systems, and leadership signals.",
    },
    github_signals: {
      public_repos: 42,
      total_stars: 380,
      top_languages: [
        { language: "TypeScript", bytes: 420000 },
        { language: "Go", bytes: 260000 },
      ],
      contribution_streak_days: 71,
      recent_activity_score: 0.86,
      notable_repos: [{ name: "trace-lite", stars: 214, description: "Small OpenTelemetry helper library." }],
      profile_created_at: "2016-03-10T00:00:00Z",
      followers: 690,
    },
    diversity_context: { review_name: "Candidate C-0042", graduation_decade: "2010s", university_tier: "tier_1" },
  },
  {
    id: "C-0188",
    full_name: "Arjun Mehta",
    title: "Engineering Manager, Platform",
    location: "New York, NY",
    github_username: null,
    raw_resume_text:
      "Engineering manager and former backend engineer. Managed a team of 12, migrated monolith services to Kubernetes, and implemented incident review rituals. Strong leadership, moderate hands-on Go, no recent public GitHub.",
    parsed_profile: {
      skills: [
        { name: "Kubernetes", years: 5 },
        { name: "PostgreSQL", years: 6 },
        { name: "Go", years: 2 },
        { name: "People Management", years: 4 },
        { name: "Incident Response", years: 4 },
      ],
      experience: [
        {
          company: "MarketStack",
          title: "Engineering Manager, Platform",
          seniority_level: 5,
          start_date: "2022-02",
          end_date: null,
          duration_months: 53,
          description: "Managed twelve engineers and improved incident response maturity.",
          is_gap: false,
        },
        {
          company: "CloudRelay",
          title: "Senior Backend Engineer",
          seniority_level: 4,
          start_date: "2018-08",
          end_date: "2022-01",
          duration_months: 41,
          description: "Migrated APIs to Kubernetes and PostgreSQL service ownership.",
          is_gap: false,
        },
      ],
      education: [{ institution: "Rutgers", degree: "BS", field: "Computer Engineering", graduation_year: 2016 }],
      total_years_experience: 8,
      certifications: [],
      summary: "Platform manager with strong leadership and operational maturity, but less hands-on fintech depth.",
    },
    github_signals: null,
    diversity_context: { review_name: "Candidate C-0188", graduation_decade: "2010s", university_tier: "tier_2" },
  },
  {
    id: "C-0219",
    full_name: "Maya Chen",
    title: "Senior Product Engineer",
    location: "San Francisco, CA",
    github_username: "mayac-builds",
    raw_resume_text:
      "Senior product engineer focused on React, Python, LLM apps, evaluation harnesses, analytics, and rapid prototyping. Built an AI support triage product that cut median handle time by 27%. Earlier backend experience with PostgreSQL and TypeScript.",
    parsed_profile: {
      skills: [
        { name: "React", years: 6 },
        { name: "Python", years: 5 },
        { name: "LLM APIs", years: 3 },
        { name: "Evaluation", years: 2 },
        { name: "TypeScript", years: 6 },
        { name: "PostgreSQL", years: 4 },
      ],
      experience: [
        {
          company: "HelpFlow AI",
          title: "Senior Product Engineer",
          seniority_level: 4,
          start_date: "2021-09",
          end_date: null,
          duration_months: 58,
          description: "Shipped LLM workflows, evaluations, and user-facing analytics with design partners.",
          is_gap: false,
        },
        {
          company: "AtlasCRM",
          title: "Full Stack Engineer",
          seniority_level: 3,
          start_date: "2018-06",
          end_date: "2021-08",
          duration_months: 38,
          description: "Built React and TypeScript product surfaces backed by PostgreSQL.",
          is_gap: false,
        },
      ],
      education: [{ institution: "UC Berkeley", degree: "BA", field: "Data Science", graduation_year: 2018 }],
      total_years_experience: 8,
      certifications: [],
      summary: "Applied AI product engineer with measurable UX and model-evaluation impact.",
    },
    github_signals: {
      public_repos: 26,
      total_stars: 92,
      top_languages: [
        { language: "TypeScript", bytes: 380000 },
        { language: "Python", bytes: 310000 },
      ],
      contribution_streak_days: 29,
      recent_activity_score: 0.72,
      notable_repos: [{ name: "eval-notebook", stars: 55, description: "Evaluation templates for LLM products." }],
      profile_created_at: "2017-11-22T00:00:00Z",
      followers: 210,
    },
    diversity_context: { review_name: "Candidate C-0219", graduation_decade: "2010s", university_tier: "tier_1" },
  },
  {
    id: "C-0311",
    full_name: "Sam Rivera",
    title: "Backend Engineer",
    location: "Remote",
    github_username: "sam-rivera",
    raw_resume_text:
      "Backend engineer with Rust, Python, PostgreSQL, and healthcare data pipelines. Took eight months of caregiving leave in 2022, then returned as a senior IC. Strong quantified reliability improvements but limited Kubernetes exposure.",
    parsed_profile: {
      skills: [
        { name: "Python", years: 6 },
        { name: "PostgreSQL", years: 5 },
        { name: "Rust", years: 3 },
        { name: "Data Pipelines", years: 5 },
        { name: "Reliability", years: 4 },
      ],
      experience: [
        {
          company: "HealthBridge",
          title: "Senior Backend Engineer",
          seniority_level: 4,
          start_date: "2023-01",
          end_date: null,
          duration_months: 42,
          description: "Returned after caregiving leave; reduced pipeline failures by 44%.",
          is_gap: true,
        },
        {
          company: "CareOS",
          title: "Backend Engineer",
          seniority_level: 3,
          start_date: "2018-04",
          end_date: "2022-04",
          duration_months: 48,
          description: "Built PostgreSQL data systems for healthcare operations.",
          is_gap: false,
        },
      ],
      education: [{ institution: "General Assembly", degree: "Certificate", field: "Software Engineering", graduation_year: 2018 }],
      total_years_experience: 8,
      certifications: [],
      summary: "Strong backend reliability engineer with an explained caregiving gap and adjacent domain background.",
    },
    github_signals: {
      public_repos: 18,
      total_stars: 36,
      top_languages: [
        { language: "Rust", bytes: 210000 },
        { language: "Python", bytes: 180000 },
      ],
      contribution_streak_days: 12,
      recent_activity_score: 0.58,
      notable_repos: [{ name: "pg-healthcheck", stars: 23, description: "PostgreSQL health checks." }],
      profile_created_at: "2018-01-05T00:00:00Z",
      followers: 88,
    },
    diversity_context: { review_name: "Candidate C-0311", graduation_decade: "2010s", university_tier: "bootcamp" },
  },
  {
    id: "C-0440",
    full_name: "Taylor Brooks",
    title: "AI-Optimized Full Stack Developer",
    location: "Chicago, IL",
    github_username: null,
    raw_resume_text:
      "Spearheaded game-changing solutions and leveraged synergized cross-functional paradigms. Orchestrated seamless scalable innovative platforms. Revolutionized modern stacks with thought leadership and catalyzed high-impact business outcomes across all technologies.",
    parsed_profile: {
      skills: [
        { name: "JavaScript", years: 4 },
        { name: "React", years: 3 },
        { name: "Node.js", years: 3 },
      ],
      experience: [
        {
          company: "Various",
          title: "Full Stack Developer",
          seniority_level: 3,
          start_date: "2020-01",
          end_date: null,
          duration_months: 78,
          description: "Resume uses broad claims with few concrete systems, metrics, or ownership details.",
          is_gap: false,
        },
      ],
      education: [{ institution: "Unknown", degree: "BS", field: "Computer Science", graduation_year: 2020 }],
      total_years_experience: 6,
      certifications: [],
      summary: "Generic full-stack profile with heavy buzzwording and limited evidence.",
    },
    github_signals: null,
    diversity_context: { review_name: "Candidate C-0440", graduation_decade: "2020s", university_tier: "unknown" },
  },
];
