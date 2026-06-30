import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import mammoth from "mammoth";
import Papa from "papaparse";

const execFileAsync = promisify(execFile);

async function extractPdfText(buffer: Buffer) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "nava-pdf-"));
  const pdfPath = path.join(tempDir, `${randomUUID()}.pdf`);
  const cliPath = path.join(process.cwd(), "node_modules", "pdf-parse", "bin", "cli.mjs");

  try {
    await writeFile(pdfPath, buffer);
    const { stdout } = await execFileAsync(process.execPath, [cliPath, "text", pdfPath], {
      cwd: process.cwd(),
      maxBuffer: 20 * 1024 * 1024,
      timeout: 30_000,
    });

    return stdout;
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}

export async function extractCandidateText(file: File, buffer: Buffer) {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return extractPdfText(buffer);
  }

  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (type === "text/csv" || name.endsWith(".csv")) {
    const text = buffer.toString("utf-8");
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });

    if (parsed.data.length === 0) return text;

    return parsed.data
      .map((row, index) => {
        const values = Object.entries(row)
          .filter(([, value]) => value)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n");
        return `Candidate row ${index + 1}\n${values}`;
      })
      .join("\n\n---\n\n");
  }

  if (type === "application/json" || name.endsWith(".json")) {
    const parsed = JSON.parse(buffer.toString("utf-8"));
    return JSON.stringify(parsed, null, 2);
  }

  if (type === "text/plain" || name.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  throw new Error("Unsupported file type. Upload PDF, DOCX, CSV, JSON, or TXT.");
}
