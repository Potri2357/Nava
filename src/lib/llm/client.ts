import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const MODEL_CONFIG = {
  scoring: {
    model: 'gemini-2.0-flash',
    temperature: 0.1,
  },
  parsing: {
    model: 'gemini-2.0-flash',
    temperature: 0.0,
  },
  comparison: {
    model: 'gemini-2.0-flash',
    temperature: 0.4,
  },
  interview: {
    model: 'gemini-2.0-flash',
    temperature: 0.7,
  },
};

export interface GenerateStructuredParams<T> {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodSchema<T>;
  schemaName?: string;
  schemaDescription?: string;
  config?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export interface GenerateTextParams {
  systemPrompt: string;
  userPrompt: string;
  config?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export const llmClient = {
  async generateStructured<T>({
    systemPrompt,
    userPrompt,
    schema,
    schemaName = 'StructuredOutput',
    config = MODEL_CONFIG.scoring,
  }: GenerateStructuredParams<T>): Promise<T> {
    const modelName = config.model || MODEL_CONFIG.scoring.model;
    
    // We convert Zod schema to JSON schema, which Gemini supports via Schema type
    // However, Gemini's responseMimeType: "application/json" and responseSchema
    // requires a specific Schema object format from the SDK.
    // For simplicity, if using zod-to-json-schema, we can coerce it, but standard
    // Gemini structured outputs support Schema natively.
    
    // Since Gemini supports strict JSON mode with responseSchema:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsonSchema = zodToJsonSchema(schema as any, schemaName) as any;
    
    // Extract the actual schema part since zodToJsonSchema wraps it
    const actualSchema = jsonSchema.definitions 
      ? jsonSchema.definitions[schemaName] 
      : jsonSchema;

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
        responseMimeType: 'application/json',
      },
    });

    // In a real production setup, we'd map the JSON Schema to the Gemini SDK Schema type
    // or rely on the prompt to enforce the JSON structure.
    // Given the complexity of deep mapping, we'll append the JSON schema to the prompt
    // to ensure Gemini follows it strictly.
    const promptWithSchema = `
${userPrompt}

Please return the response as a JSON object adhering to the following schema:
${JSON.stringify(actualSchema, null, 2)}
    `.trim();

    try {
      const result = await model.generateContent(promptWithSchema);
      const responseText = result.response.text();
      // Remove any markdown formatting if present (e.g. ```json ... ```)
      const cleanJson = responseText.replace(/^```json/m, '').replace(/```$/m, '').trim();
      
      const parsed = JSON.parse(cleanJson);
      // Validate with Zod to ensure type safety
      return schema.parse(parsed);
    } catch (error) {
      console.error('LLM Structured Generation Error:', error);
      throw new Error('Failed to generate structured output from LLM');
    }
  },

  async generateText({
    systemPrompt,
    userPrompt,
    config = MODEL_CONFIG.comparison,
  }: GenerateTextParams): Promise<string> {
    const modelName = config.model || MODEL_CONFIG.comparison.model;
    
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
      },
    });

    try {
      const result = await model.generateContent(userPrompt);
      return result.response.text();
    } catch (error) {
      console.error('LLM Text Generation Error:', error);
      throw new Error('Failed to generate text output from LLM');
    }
  }
};
