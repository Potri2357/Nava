import * as fs from 'fs';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';
import { parseResumeText } from '../src/features/candidates/services/resume-parser';
import { parseJobDescription } from '../src/features/jobs/services/jd-parser';
import { createAdminClient } from '../src/lib/supabase/admin';
import crypto from 'crypto';

async function extractPdfText(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const data = await parser.getText();
    return data.text;
  } finally {
    await parser.destroy();
  }
}

// Ensure you run this with tsx and have env variables loaded
// e.g. npx tsx --env-file=.env.local scripts/seed-demo-data.ts

async function runSeed() {
  const supabase = createAdminClient();
  const datasetDir = path.join(process.cwd(), 'dataset');
  const resumesDir = path.join(datasetDir, 'resumes');
  const jdsDir = path.join(datasetDir, 'jds');

  console.log('Starting seed process...');

  // 1. Process Job Descriptions
  if (fs.existsSync(jdsDir)) {
    const jdFiles = fs.readdirSync(jdsDir).filter(f => f.endsWith('.txt') || f.endsWith('.pdf'));
    for (const file of jdFiles) {
      console.log(`Processing JD: ${file}`);
      const filePath = path.join(jdsDir, file);
      const buffer = fs.readFileSync(filePath);
      let text = '';
      if (file.endsWith('.pdf')) {
        text = await extractPdfText(buffer);
      } else {
        text = buffer.toString('utf-8');
      }

      console.log('Parsing JD with LLM...');
      const parsedJD = await parseJobDescription(text);
      
      const { data, error } = await supabase.from('jobs').insert({
        title: file.replace(/\.(pdf|txt)$/, '').replace(/_/g, ' '),
        raw_description: text,
        parsed_requirements: parsedJD,
        status: 'active',
        source: 'demo'
      }).select('id').single();

      if (error) console.error('Error inserting JD:', error);
      else {
        console.log(`Inserted JD with ID: ${data.id}`);
        // In a real run, we'd trigger the Edge Function to generate the embedding here
      }
    }
  }

  // 2. Process Candidates
  if (fs.existsSync(resumesDir)) {
    const resumeFiles = fs.readdirSync(resumesDir).filter(f => f.endsWith('.pdf'));
    for (const file of resumeFiles) {
      console.log(`Processing Resume: ${file}`);
      const filePath = path.join(resumesDir, file);
      const buffer = fs.readFileSync(filePath);
      
      const text = await extractPdfText(buffer);
      const fileHash = crypto.createHash('sha256').update(text).digest('hex');

      console.log('Parsing Profile with LLM...');
      const parsedProfile = await parseResumeText(text);

      const { data: inserted, error } = await supabase.from('candidates').insert({
        full_name: file.replace(/\.pdf$/, '').replace(/_/g, ' '),
        raw_resume_text: text,
        file_hash: fileHash,
        parsed_profile: parsedProfile,
        github_username: parsedProfile.inferred_github || null,
        source: 'demo'
      }).select('id').single();

      if (error) console.error('Error inserting candidate:', error);
      else {
        console.log(`Inserted Candidate with ID: ${inserted.id}`);
        // In a real run, we'd trigger the Edge Function to generate the embedding here
      }
    }
  }

  console.log('Seed process completed.');
}

runSeed().catch(console.error);
