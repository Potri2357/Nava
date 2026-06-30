import mammoth from "mammoth";
import Papa from "papaparse";
import { PDFParse } from "pdf-parse";

export async function extractCandidateText(file: File, buffer: Buffer) {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
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
