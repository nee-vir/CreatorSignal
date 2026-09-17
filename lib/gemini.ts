import { serverEnv } from './env';

export const GEMINI_WORKING_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
];

export interface GeminiCallConfig {
  prompt: string;
  responseJson?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Execute a generation call to Gemini with an automatic multi-tier fallback cascade.
 * If the primary model hits temporary rate limits (429) or high-demand spikes (503),
 * it seamlessly cascades down to the next active model without failing.
 */
export async function generateWithGeminiFallback(config: GeminiCallConfig): Promise<string> {
  const apiKey = serverEnv.geminiApiKey;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }

  let lastError = '';

  for (const model of GEMINI_WORKING_MODELS) {
    try {
      const body: any = {
        contents: [{ parts: [{ text: config.prompt }] }],
        generationConfig: {
          temperature: config.temperature ?? 0.5,
          maxOutputTokens: config.maxOutputTokens ?? 3500,
        },
      };

      if (config.responseJson) {
        body.generationConfig.responseMimeType = 'application/json';
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return text.trim();
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        lastError = errData?.error?.message || `HTTP ${res.status}`;
        console.warn(`[GeminiClient] Model ${model} failed (${res.status}): ${lastError.slice(0, 150)}`);
      }
    } catch (err: any) {
      lastError = err.message;
      console.warn(`[GeminiClient] Exception calling ${model}: ${err.message}`);
    }
  }

  throw new Error(`Gemini API connection error: ${lastError || 'All models temporarily unavailable'}`);
}
