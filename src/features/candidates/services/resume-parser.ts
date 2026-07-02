import { z } from 'zod';
import { llmClient } from '@/lib/llm/client';
import { ParsedProfile } from '../types';

export const ParsedProfileSchema = z.object({
  full_name: z.string().nullable().describe('Candidate full name from the resume header. Null if not confidently present.'),
  email: z.string().email().nullable().describe('Candidate email address if present.'),
  skills: z.array(z.object({
    name: z.string().describe('The name of the skill/technology (e.g. "React", "Python")'),
    years: z.number().nullable().describe('Estimated years of experience using this skill, based on work history. Null if indeterminable.'),
  })).describe('List of technical and hard skills found in the resume.'),
  
  experience: z.array(z.object({
    company: z.string().describe('Company name'),
    title: z.string().describe('Job title'),
    seniority_level: z.number().describe('Numeric seniority level from 1-8. (1=intern, 2=junior, 3=mid, 4=senior, 5=lead, 6=director, 7=vp, 8=c-suite)'),
    start_date: z.string().describe('Start date in YYYY-MM format'),
    end_date: z.string().nullable().describe('End date in YYYY-MM format. Use null if current.'),
    duration_months: z.number().describe('Duration in months'),
    description: z.string().describe('Summary of achievements and responsibilities in this role. Keep the core metric-driven bullet points.'),
    is_gap: z.boolean().describe('Set to true if there is an unexplained gap of more than 3 months BEFORE this role.'),
  })).describe('Chronological work experience, sorted from most recent to oldest.'),
  
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    field: z.string(),
    graduation_year: z.number().nullable(),
  })),
  
  total_years_experience: z.number().describe('Total years of professional experience'),
  certifications: z.array(z.string()),
  summary: z.string().describe('A 2-3 sentence overall summary of the candidate.'),
  inferred_github: z.string().nullable().describe('If a github.com URL or username is present in the resume, extract the username here.'),
});

const RESUME_PARSER_SYSTEM_PROMPT = `
You are an expert technical recruiter and resume parsing system.
Extract structured profile data from the provided resume text.
Important Rules:
1. Preserve structural boundaries (EXPERIENCE, EDUCATION).
2. For each experience entry, calculate the 'duration_months' and assign a 'seniority_level' from 1 to 8:
   (1=Intern, 2=Junior/Associate, 3=Mid-level, 4=Senior, 5=Lead/Principal/Manager, 6=Director, 7=VP, 8=C-level/Founder).
3. If you detect a gap of >3 months between the end_date of one role and the start_date of the next (more recent) role, set 'is_gap: true' on the more recent role, and include any context about the gap in its description if mentioned.
4. Attempt to estimate 'years' for key skills based on how long the candidate worked at roles where those skills were used.
5. Search for a GitHub link (e.g. github.com/username) and extract the username if present.
`;

export async function parseResumeText(rawText: string): Promise<
  ParsedProfile & { full_name: string | null; email: string | null; inferred_github: string | null }
> {
  if (!process.env.GEMINI_API_KEY) {
    return parseResumeTextHeuristic(rawText);
  }

  let parsed: z.infer<typeof ParsedProfileSchema>;
  try {
    parsed = await llmClient.generateStructured<z.infer<typeof ParsedProfileSchema>>({
      systemPrompt: RESUME_PARSER_SYSTEM_PROMPT,
      userPrompt: `Resume Text:\n\n${rawText}`,
      schema: ParsedProfileSchema,
      schemaName: 'ParsedProfile',
      config: {
        model: 'gemini-2.0-flash',
        temperature: 0.0, // Deterministic extraction
      },
    });
  } catch (error) {
    console.warn('Resume LLM parsing failed; using heuristic parser.', error);
    return parseResumeTextHeuristic(rawText);
  }

  return parsed as ParsedProfile & { full_name: string | null; email: string | null; inferred_github: string | null };
}

function parseResumeTextHeuristic(rawText: string): ParsedProfile & {
  full_name: string | null;
  email: string | null;
  inferred_github: string | null;
} {
  const text = rawText.toLowerCase();
  const cleanedLines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const email = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  const fullName = inferCandidateName(cleanedLines, email);
  const knownSkills = [
    'TypeScript', 'JavaScript', 'React', 'Next.js', 'Node.js', 'Python', 'Go', 'Rust',
    'PostgreSQL', 'MongoDB', 'Redis', 'Kafka', 'Kubernetes', 'Docker', 'AWS',
    'GCP', 'Azure', 'LLM APIs', 'Machine Learning', 'Observability', 'Distributed Systems',
    'People Management', 'Fintech', 'Java', 'C#', 'C++', 'Swift', 'Kotlin', 'React Native',
    'GraphQL', 'REST', 'MySQL', 'SQL', 'Snowflake', 'Databricks', 'Spark', 'TensorFlow',
    'PyTorch', 'scikit-learn', 'Pandas', 'NumPy', 'Terraform', 'CI/CD', 'Jenkins',
    'Testing', 'Playwright', 'Cypress', 'Debugging', 'Product Strategy', 'Analytics',
    'User Research', 'Roadmapping', 'Design Systems', 'Prototyping', 'Accessibility',
    'Figma', 'Threat Modeling', 'Compliance', 'Vector Search', 'AI Products',
  ];
  const skills = knownSkills
    .filter((skill) => text.includes(skill.toLowerCase()))
    .map((name) => ({ name, years: null }));
  const inferred_github = rawText.match(/github\.com\/([A-Za-z0-9-]+)/)?.[1] ?? null;
  const yearsMatch = rawText.match(/(\d+)\+?\s*(?:years|yrs)/i);
  const totalYears = yearsMatch ? Number(yearsMatch[1]) : 3;
  const title = rawText.match(/\b(Staff|Principal|Senior|Lead|Director|Manager|Engineer|Developer)[^\n,.]*/i)?.[0] ?? 'Software Engineer';
  const seniority = /director/i.test(title)
    ? 6
    : /staff|principal|lead|manager/i.test(title)
      ? 5
      : /senior/i.test(title)
        ? 4
        : 3;
  const graduationYear = rawText.match(/\b(20\d{2}|19\d{2})\b/)?.[1];

  return {
    full_name: fullName,
    email,
    skills,
    experience: [
      {
        company: 'Parsed from upload',
        title,
        seniority_level: seniority,
        start_date: `${new Date().getFullYear() - totalYears}-01`,
        end_date: null,
        duration_months: totalYears * 12,
        description: rawText.slice(0, 500),
        is_gap: /\bgap|leave|sabbatical|caregiving\b/i.test(rawText),
      },
    ],
    education: [
      {
        institution: 'Unknown',
        degree: rawText.match(/\b(BS|BA|MS|MBA|PhD|Bachelor|Master)\b/i)?.[0] ?? 'Unknown',
        field: 'Unknown',
        graduation_year: graduationYear ? Number(graduationYear) : null,
      },
    ],
    total_years_experience: totalYears,
    certifications: [],
    summary: rawText.replace(/\s+/g, ' ').slice(0, 240),
    inferred_github,
  };
}

function inferCandidateName(lines: string[], email: string | null) {
  const noisyHeader = /\b(resume|curriculum|vitae|cv|email|phone|linkedin|github|portfolio|address|summary|objective|profile)\b/i;
  const emailLocalName = email
    ?.split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\d+/g, "")
    .trim();

  for (const line of lines.slice(0, 8)) {
    if (noisyHeader.test(line) || /[@:/\\|]/.test(line)) continue;
    const words = line.match(/[A-Za-z][A-Za-z'-]+/g) ?? [];
    if (words.length >= 2 && words.length <= 4 && line.length <= 60) {
      return words.map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase()).join(" ");
    }
  }

  return emailLocalName
    ? emailLocalName
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
    : null;
}
