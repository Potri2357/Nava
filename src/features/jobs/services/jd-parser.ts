import { z } from 'zod';
import { llmClient } from '@/lib/llm/client';
import { ParsedJD } from '../types';

export const ParsedJDSchema = z.object({
  required_skills: z.array(z.string()).describe('Specific required technologies/frameworks (not vague categories)'),
  nice_to_have_skills: z.array(z.string()).describe('Preferred or nice-to-have technologies'),
  seniority: z.enum(['junior', 'mid', 'senior', 'lead', 'director', 'vp']).describe('Infer seniority from title or description'),
  min_years_exp: z.number().describe('Minimum years of experience required. Infer from seniority if not explicitly stated (e.g. senior = 5+)'),
  max_years_exp: z.number().nullable().describe('Maximum years of experience if stated, otherwise null'),
  domain: z.string().describe('Industry vertical (e.g. fintech, healthtech, e-commerce, general software)'),
  key_responsibilities: z.array(z.string()).describe('List of 3-5 key responsibilities'),
  education: z.string().nullable().describe('Required education level (e.g. Bachelor, Master) if stated, otherwise null'),
  role_summary: z.string().describe('A single, highly dense sentence summarizing the core requirements and role purpose, optimized for vector embeddings.'),
});

const JD_PARSER_SYSTEM_PROMPT = `
You are an expert technical recruiter and AI parsing system.
Extract structured requirements from the provided job description text.
Follow these rules strictly:
1. Skills must be specific technologies, frameworks, or methodologies (e.g., "React", "Docker", "Agile"). Avoid vague categories like "programming".
2. Seniority must map exactly to one of: junior, mid, senior, lead, director, vp.
3. If years of experience aren't stated, infer them from the seniority level (e.g. junior: 0-2, mid: 2-4, senior: 5+, lead: 7+, director: 10+).
4. Domain represents the industry vertical (e.g. fintech, edtech, healthtech, e-commerce, crypto, enterprise saas). Use a concise term.
5. 'role_summary' must be a single, information-rich sentence that combines the key skills, domain, and seniority. This field is critical as it will be used for semantic vector embeddings to find matching candidates.
`;

export async function parseJobDescription(rawDescription: string): Promise<ParsedJD> {
  if (!process.env.GEMINI_API_KEY) {
    return parseJobDescriptionHeuristic(rawDescription);
  }

  let parsed: ParsedJD;
  try {
    parsed = await llmClient.generateStructured<ParsedJD>({
      systemPrompt: JD_PARSER_SYSTEM_PROMPT,
      userPrompt: `Job Description:\n\n${rawDescription}`,
      schema: ParsedJDSchema,
      schemaName: 'ParsedJD',
      config: {
        model: 'gemini-2.0-flash',
        temperature: 0.0, // Zero temperature for deterministic extraction
      },
    });
  } catch (error) {
    console.warn('JD LLM parsing failed; using heuristic parser.', error);
    return parseJobDescriptionHeuristic(rawDescription);
  }

  return parsed;
}

function parseJobDescriptionHeuristic(rawDescription: string): ParsedJD {
  const text = rawDescription.toLowerCase();
  const knownSkills = [
    'TypeScript', 'JavaScript', 'React', 'Next.js', 'Node.js', 'Python', 'Go', 'Rust',
    'PostgreSQL', 'MongoDB', 'Redis', 'Kafka', 'Kubernetes', 'Docker', 'AWS',
    'GCP', 'Azure', 'LLM APIs', 'Machine Learning', 'Observability', 'Distributed Systems',
  ];
  const required_skills = knownSkills.filter((skill) => text.includes(skill.toLowerCase()));
  const seniority = text.includes('director')
    ? 'director'
    : text.includes('lead') || text.includes('staff') || text.includes('principal')
      ? 'lead'
      : text.includes('senior')
        ? 'senior'
        : text.includes('junior')
          ? 'junior'
          : 'mid';
  const minYearsBySeniority = { junior: 0, mid: 2, senior: 5, lead: 7, director: 10, vp: 12 };
  const explicitYears = rawDescription.match(/(\d+)\+?\s*(?:years|yrs)/i)?.[1];
  const domain = text.includes('fintech') || text.includes('payment')
    ? 'fintech'
    : text.includes('health')
      ? 'healthtech'
      : text.includes('ai') || text.includes('llm')
        ? 'enterprise saas'
        : 'general software';

  return {
    required_skills: required_skills.length > 0 ? required_skills.slice(0, 8) : ['Software Engineering'],
    nice_to_have_skills: knownSkills.filter((skill) => !required_skills.includes(skill)).slice(0, 4),
    seniority,
    min_years_exp: explicitYears ? Number(explicitYears) : minYearsBySeniority[seniority],
    max_years_exp: null,
    domain,
    key_responsibilities: rawDescription
      .split(/[.\n]/)
      .map((line) => line.trim())
      .filter((line) => line.length > 30)
      .slice(0, 5),
    education: text.includes('bachelor') ? 'Bachelor' : null,
    role_summary: `${seniority} role in ${domain} requiring ${required_skills.slice(0, 6).join(', ') || 'software engineering'} experience.`,
  };
}
