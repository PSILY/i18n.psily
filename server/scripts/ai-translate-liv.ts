import { storage } from "../storage";
import { batchTranslate } from "../lib/openai";

const LIV_NAMESPACE = "liv-psilyou";
const TARGET_LOCALES = ["da", "sv", "de", "no"];

async function translateToLocale(targetLocale: string) {
  console.log(`\n🌍 Translating to ${targetLocale}...`);

  // Get target language info
  const targetLanguage = await storage.getLanguage(targetLocale);
  if (!targetLanguage) {
    console.error(`❌ Language ${targetLocale} not found in database`);
    return { created: 0, failed: 0 };
  }

  // Get all English translations for this namespace
  const sourceTranslations = await storage.getTranslationsByLocaleAndNamespace(
    "en",
    LIV_NAMESPACE
  );

  if (sourceTranslations.length === 0) {
    console.error("❌ No English translations found");
    return { created: 0, failed: 0 };
  }

  console.log(`   Found ${sourceTranslations.length} English translations`);

  // Prepare translation requests
  const requests = sourceTranslations.map((source, index) => {
    const contextSize = 3;
    const contextStart = Math.max(0, index - contextSize);
    const contextEnd = Math.min(sourceTranslations.length, index + contextSize + 1);
    const contextTranslations = sourceTranslations.slice(contextStart, contextEnd);

    const context = contextTranslations.reduce((acc, t) => {
      if (t.key !== source.key) {
        acc[t.key] = t.text;
      }
      return acc;
    }, {} as Record<string, string>);

    return {
      key: source.key,
      sourceText: source.text,
      targetLanguage: targetLanguage.nativeName,
      context,
    };
  });

  // Process translations in batches
  console.log(`   Running AI translation to ${targetLanguage.nativeName}...`);
  const results = await batchTranslate(requests);

  // Save successful translations
  let created = 0;
  let failed = 0;

  for (const result of results) {
    if (result.success) {
      try {
        // Check if already exists
        const existing = await storage.getTranslation(
          result.key,
          targetLocale,
          LIV_NAMESPACE
        );

        if (existing) {
          // Update existing
          await storage.updateTranslation(result.key, targetLocale, LIV_NAMESPACE, {
            text: result.translatedText,
            reviewed: false,
          });
        } else {
          // Create new
          await storage.createTranslationWithoutCompletion({
            key: result.key,
            locale: targetLocale,
            text: result.translatedText,
            namespace: LIV_NAMESPACE,
            reviewed: false,
          });
        }
        created++;
      } catch (error: any) {
        console.error(`   ❌ Error saving ${result.key}: ${error.message}`);
        failed++;
      }
    } else {
      console.error(`   ❌ Translation failed for ${result.key}: ${result.error}`);
      failed++;
    }
  }

  // Update completion percentage
  await storage.updateLanguageNamespaceCompletion(targetLocale, LIV_NAMESPACE);

  console.log(`   ✅ Created/Updated: ${created}, Failed: ${failed}`);
  return { created, failed };
}

async function main() {
  console.log("🚀 Starting AI translation for liv-psilyou namespace\n");
  console.log("Target languages:", TARGET_LOCALES.join(", "));

  const results: Record<string, { created: number; failed: number }> = {};

  for (const locale of TARGET_LOCALES) {
    results[locale] = await translateToLocale(locale);
  }

  console.log("\n📊 Final Summary:");
  console.log("═══════════════════════════════════════");
  for (const [locale, stats] of Object.entries(results)) {
    console.log(`   ${locale}: ${stats.created} created, ${stats.failed} failed`);
  }
  console.log("═══════════════════════════════════════");
  console.log("\n✨ AI translation complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
