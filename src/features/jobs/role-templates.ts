import type { ParsedJD, ScoringWeights } from "@/features/jobs/types";
import { defaultWeights } from "@/features/jobs/constants";

export type RoleTemplate = {
  title: string;
  company: string;
  raw_description: string;
  parsed_requirements: ParsedJD;
  scoring_weights: ScoringWeights;
};

const role = (
  title: string,
  domain: string,
  required_skills: string[],
  nice_to_have_skills: string[],
  seniority: ParsedJD["seniority"],
  min_years_exp: number,
  responsibilities: string[],
  weights: Partial<ScoringWeights> = {},
): RoleTemplate => ({
  title,
  company: "Nava Hiring",
  raw_description: `${title} role in ${domain}. Required skills: ${required_skills.join(", ")}. Preferred skills: ${nice_to_have_skills.join(", ")}. Responsibilities: ${responsibilities.join(" ")}`,
  parsed_requirements: {
    required_skills,
    nice_to_have_skills,
    seniority,
    min_years_exp,
    max_years_exp: null,
    domain,
    key_responsibilities: responsibilities,
    education: null,
    role_summary: `${seniority} ${title.toLowerCase()} focused on ${required_skills.slice(0, 5).join(", ")} for ${domain}.`,
  },
  scoring_weights: { ...defaultWeights, ...weights },
});

export const roleTemplates: RoleTemplate[] = [
  role("Frontend Engineer", "enterprise saas", ["React", "TypeScript", "Next.js", "JavaScript"], ["Testing", "Design Systems"], "mid", 2, [
    "Build responsive recruiter-facing product workflows.",
    "Own component quality, accessibility, and frontend performance.",
  ]),
  role("Backend Engineer", "enterprise saas", ["Node.js", "PostgreSQL", "REST", "Docker"], ["Redis", "Kafka", "AWS"], "mid", 3, [
    "Design reliable APIs and data models.",
    "Improve service observability, latency, and deployment safety.",
  ]),
  role("Full Stack Engineer", "enterprise saas", ["React", "TypeScript", "Node.js", "PostgreSQL"], ["Next.js", "AWS"], "senior", 5, [
    "Ship end-to-end product features across UI, APIs, and storage.",
    "Partner with product and design on ambiguous workflows.",
  ]),
  role("AI/ML Engineer", "ai products", ["Python", "Machine Learning", "TensorFlow", "PyTorch"], ["LLM APIs", "Vector Search"], "mid", 3, [
    "Build model-backed product features and evaluation workflows.",
    "Translate data science prototypes into production services.",
  ], { technical_fit: 0.42, domain: 0.18 }),
  role("Data Engineer", "analytics", ["Python", "SQL", "Spark", "Databricks"], ["Snowflake", "AWS"], "mid", 3, [
    "Create reliable data pipelines and warehouse models.",
    "Support analytics, monitoring, and data quality checks.",
  ]),
  role("DevOps Engineer", "cloud infrastructure", ["Docker", "Kubernetes", "AWS", "CI/CD"], ["Terraform", "Observability"], "senior", 5, [
    "Own cloud infrastructure, release automation, and runtime reliability.",
    "Reduce incident risk through monitoring and operational tooling.",
  ]),
  role("Mobile Engineer", "consumer apps", ["React Native", "TypeScript", "Swift", "Kotlin"], ["GraphQL", "Firebase"], "mid", 3, [
    "Build mobile app experiences with native-quality interactions.",
    "Improve app performance, release quality, and offline resilience.",
  ]),
  role("Product Manager", "enterprise saas", ["Product Strategy", "Analytics", "User Research", "Roadmapping"], ["SQL", "AI Products"], "senior", 5, [
    "Define roadmap, success metrics, and product discovery.",
    "Coordinate engineering, design, sales, and customer feedback.",
  ], { technical_fit: 0.25, behavioral: 0.35, domain: 0.25 }),
  role("UX Designer", "enterprise saas", ["User Research", "Design Systems", "Prototyping", "Accessibility"], ["Figma", "Frontend"], "mid", 3, [
    "Design dense, usable workflows for repeated operational tasks.",
    "Validate interaction patterns with users and product partners.",
  ], { technical_fit: 0.25, behavioral: 0.3, domain: 0.25 }),
  role("QA Automation Engineer", "software quality", ["JavaScript", "Python", "Testing", "CI/CD"], ["Playwright", "Cypress"], "mid", 3, [
    "Build automated test coverage for critical product paths.",
    "Improve release confidence through regression and API testing.",
  ]),
  role("Security Engineer", "cloud security", ["AWS", "Kubernetes", "Observability", "Python"], ["Threat Modeling", "Compliance"], "senior", 5, [
    "Review system design, runtime controls, and application security risks.",
    "Build practical security automation for engineering teams.",
  ], { domain: 0.22, behavioral: 0.18 }),
  role("Technical Support Engineer", "customer operations", ["SQL", "REST", "JavaScript", "Debugging"], ["PostgreSQL", "Python"], "mid", 2, [
    "Investigate customer issues across product, API, and data layers.",
    "Write clear escalations and improve support playbooks.",
  ], { behavioral: 0.3, technical_fit: 0.3 }),
];
