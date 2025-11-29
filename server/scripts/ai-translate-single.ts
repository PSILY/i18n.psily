import { storage } from "../storage";
import { batchTranslate } from "../lib/openai";

const LIV_NAMESPACE = "liv-psilyou";

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

  // Check what already exists
  const existingTranslations = await storage.getTranslationsByLocaleAndNamespace(
    targetLocale,
    LIV_NAMESPACE
  );
  const existingKeys = new Set(existingTranslations.map(t => t.key));
  
  // Filter out translations that already exist
  const missingTranslations = sourceTranslations.filter(t => !existingKeys.has(t.key));
  
  if (missingTranslations.length === 0) {
    console.log(`   ✅ All translations already exist for ${targetLocale}`);
    return { created: 0, failed: 0 };
  }

  console.log(`   Found ${missingTranslations.length} missing translations (${existingKeys.size} already exist)`);

  // Prepare translation requests
  const requests = missingTranslations.map((source, index) => {
    const contextSize = 3;
    const contextStart = Math.max(0, index - contextSize);
    const contextEnd = Math.min(missingTranslations.length, index + contextSize + 1);
    const contextTranslations = missingTranslations.slice(contextStart, contextEnd);

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
        await storage.createTranslationWithoutCompletion({
          key: result.key,
          locale: targetLocale,
          text: result.translatedText,
          namespace: LIV_NAMESPACE,
          reviewed: false,
        });
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

  console.log(`   ✅ Created: ${created}, Failed: ${failed}`);
  return { created, failed };
}

const targetLocale = process.argv[2];
if (!targetLocale) {
  console.error("Usage: npx tsx server/scripts/ai-translate-single.ts <locale>");
  console.error("Example: npx tsx server/scripts/ai-translate-single.ts sv");
  process.exit(1);
}

translateToLocale(targetLocale)
  .then((result) => {
    console.log(`\n✨ Done! Created ${result.created} translations for ${targetLocale}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
