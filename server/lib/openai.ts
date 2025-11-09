import OpenAI from "openai";
import pLimit from "p-limit";
import pRetry from "p-retry";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
// Blueprint reference: javascript_openai_ai_integrations
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// Helper function to check if error is rate limit or quota violation
function isRateLimitError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("RATELIMIT_EXCEEDED") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit")
  );
}

interface TranslationRequest {
  key: string;
  sourceText: string;
  targetLanguage: string;
  context?: Record<string, string>;
}

interface TranslationResult {
  key: string;
  translatedText: string;
  success: boolean;
  error?: string;
}

export async function translateText(
  sourceText: string,
  targetLanguage: string,
  context?: Record<string, string>
): Promise<string> {
  const contextStr = context
    ? `\n\nContext (related translations):\n${Object.entries(context)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")}`
    : "";

  const prompt = `Translate the following text to ${targetLanguage}. Maintain the same tone, formality, and any placeholders (like {{variable}}).${contextStr}

Text to translate: "${sourceText}"

Respond with ONLY the translated text, nothing else.`;

  return await pRetry(
    async () => {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
          messages: [{ role: "user", content: prompt }],
          max_completion_tokens: 1000,
        });
        return response.choices[0]?.message?.content?.trim() || sourceText;
      } catch (error: any) {
        if (isRateLimitError(error)) {
          throw error; // Rethrow to trigger p-retry
        }
        throw new pRetry.AbortError(error);
      }
    },
    {
      retries: 5,
      minTimeout: 2000,
      maxTimeout: 64000,
      factor: 2,
    }
  );
}

export async function batchTranslate(
  requests: TranslationRequest[]
): Promise<TranslationResult[]> {
  const limit = pLimit(3); // Process up to 3 requests concurrently

  const processingPromises = requests.map((request) =>
    limit(async (): Promise<TranslationResult> => {
      try {
        const translatedText = await translateText(
          request.sourceText,
          request.targetLanguage,
          request.context
        );
        return {
          key: request.key,
          translatedText,
          success: true,
        };
      } catch (error: any) {
        return {
          key: request.key,
          translatedText: request.sourceText,
          success: false,
          error: error.message,
        };
      }
    })
  );

  return await Promise.all(processingPromises);
}
