import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateJWT, authenticateServiceApiKey } from "./lib/auth";
import { batchTranslate, translateText } from "./lib/openai";
import { initializeDatabase, seedLanguages } from "./lib/supabase";
import { insertTranslationSchema, insertLanguageSchema } from "@shared/schema";
import { z } from "zod";
import { redeemHandoffToken, startCleanupJob } from "./handoff-auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Database initialization endpoint (for setup)
  app.post("/api/setup/init-db", async (req, res) => {
    try {
      const sql = initializeDatabase();
      await seedLanguages();
      res.json({
        message: "Database initialized and languages seeded successfully",
        sql,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create languages table and seed data
  app.post("/api/setup/create-languages", async (req, res) => {
    try {
      await seedLanguages();
      res.json({
        message: "Languages table populated successfully",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Recalculate completion percentages for all language-namespace combinations
  app.post("/api/setup/recalculate-completion", async (req, res) => {
    try {
      const namespaces = await storage.getNamespaces();
      const languages = await storage.getAllLanguages();
      
      for (const namespace of namespaces) {
        for (const lang of languages) {
          await storage.updateLanguageNamespaceCompletion(lang.locale, namespace);
        }
      }
      
      res.json({
        message: "Completion percentages updated successfully for all namespaces",
        namespacesProcessed: namespaces.length,
        languagesProcessed: languages.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Start handoff token cleanup job
  startCleanupJob();

  // HANDOFF AUTHENTICATION - Redeem handoff code for JWT
  app.get("/api/auth/redeem-handoff/:code", async (req, res) => {
    try {
      const { code } = req.params;
      
      if (!code) {
        return res.status(400).json({ message: "Handoff code required" });
      }

      const ipAddress = req.ip || req.socket.remoteAddress;
      const result = await redeemHandoffToken(code, ipAddress);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ 
        token: result.jwt,
        message: "Handoff code redeemed successfully" 
      });
    } catch (error) {
      console.error("[HANDOFF] Redeem handoff error:", error);
      res.status(500).json({ message: "Failed to redeem handoff code" });
    }
  });

  // PUBLIC ENDPOINTS - No authentication required

  // Get all live languages for a specific namespace (for language switchers)
  app.get("/api/languages", async (req, res) => {
    try {
      const namespace = req.query.namespace as string;
      if (!namespace) {
        return res.status(400).json({ error: "namespace query parameter is required" });
      }
      
      const languages = await storage.getLiveLanguagesForNamespace(namespace);
      res.json(languages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get translations for a specific locale and namespace (for i18next)
  app.get("/api/translations/:locale/:namespace", async (req, res) => {
    try {
      const { locale, namespace } = req.params;
      const translations = await storage.getTranslationsByLocaleAndNamespace(
        locale,
        namespace
      );

      // Format for i18next consumption
      const formatted = translations.reduce((acc, t) => {
        acc[t.key] = t.text;
        return acc;
      }, {} as Record<string, string>);

      // Set cache headers for CDN
      res.set({
        "Cache-Control": "public, max-age=300, s-maxage=600",
        "Content-Type": "application/json",
      });

      res.json(formatted);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Log missing translation keys from client apps
  app.post("/api/translations/missing", async (req, res) => {
    try {
      const { key, locale, namespace } = req.body;
      console.log(`Missing translation: ${key} (${locale}/${namespace})`);
      res.json({ message: "Logged missing translation" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ADMIN ENDPOINTS - Require JWT authentication

  // Get all languages with status for a specific namespace
  app.get("/api/admin/languages", authenticateJWT, async (req, res) => {
    try {
      const namespace = req.query.namespace as string;
      
      if (!namespace) {
        // If no namespace specified, return basic language list
        const languages = await storage.getAllLanguages();
        return res.json(languages);
      }
      
      // Return languages with namespace-specific status
      const languages = await storage.getLanguagesWithNamespaceStatus(namespace);
      res.json(languages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get a specific language
  app.get("/api/admin/languages/:locale", authenticateJWT, async (req, res) => {
    try {
      const { locale } = req.params;
      const language = await storage.getLanguage(locale);
      if (!language) {
        return res.status(404).json({ error: "Language not found" });
      }
      res.json(language);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new language
  app.post("/api/admin/languages", authenticateJWT, async (req, res) => {
    try {
      const validated = insertLanguageSchema.parse(req.body);
      const language = await storage.createLanguage(validated);
      res.status(201).json(language);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Update a language
  app.patch("/api/admin/languages/:locale", authenticateJWT, async (req, res) => {
    try {
      const { locale } = req.params;
      const language = await storage.updateLanguage(locale, req.body);
      res.json(language);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all namespaces
  app.get("/api/admin/namespaces", authenticateJWT, async (req, res) => {
    try {
      const namespaces = await storage.getNamespaces();
      res.json(namespaces);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get translations with filters
  app.get("/api/admin/translations", authenticateJWT, async (req, res) => {
    try {
      const filters = {
        namespace: req.query.namespace as string | undefined,
        locale: req.query.locale as string | undefined,
        reviewed:
          req.query.reviewed === "true"
            ? true
            : req.query.reviewed === "false"
            ? false
            : undefined,
        search: req.query.search as string | undefined,
      };

      const translations = await storage.getTranslations(filters);
      res.json(translations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get a specific translation
  app.get(
    "/api/admin/translations/:key/:locale/:namespace",
    authenticateJWT,
    async (req, res) => {
      try {
        const { key, locale, namespace } = req.params;
        const translation = await storage.getTranslation(key, locale, namespace);
        if (!translation) {
          return res.status(404).json({ error: "Translation not found" });
        }
        res.json(translation);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Create a new translation
  app.post("/api/admin/translations", authenticateJWT, async (req, res) => {
    try {
      const validated = insertTranslationSchema.parse(req.body);
      const translation = await storage.createTranslation(validated);
      res.status(201).json(translation);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Update a translation
  app.patch(
    "/api/admin/translations/:key/:locale/:namespace",
    authenticateJWT,
    async (req, res) => {
      try {
        const { key, locale, namespace } = req.params;
        const translation = await storage.updateTranslation(
          key,
          locale,
          namespace,
          req.body
        );
        res.json(translation);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Delete a translation
  app.delete(
    "/api/admin/translations/:key/:locale/:namespace",
    authenticateJWT,
    async (req, res) => {
      try {
        const { key, locale, namespace } = req.params;
        await storage.deleteTranslation(key, locale, namespace);
        res.status(204).send();
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // AI Translation endpoint
  app.post("/api/admin/translations/ai-translate", authenticateJWT, async (req, res) => {
    try {
      const { targetLocale, namespace, contextSize = 3 } = req.body;

      if (!targetLocale || !namespace) {
        return res
          .status(400)
          .json({ error: "targetLocale and namespace are required" });
      }

      // Get all English translations for this namespace
      const sourceTranslations = await storage.getTranslationsByLocaleAndNamespace(
        "en",
        namespace
      );

      if (sourceTranslations.length === 0) {
        return res
          .status(404)
          .json({ error: "No English translations found for this namespace" });
      }

      // Get target language name
      const targetLanguage = await storage.getLanguage(targetLocale);
      if (!targetLanguage) {
        return res.status(404).json({ error: "Target language not found" });
      }

      // Prepare translation requests with context
      const requests = sourceTranslations.map((source, index) => {
        // Get surrounding translations for context
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
      const results = await batchTranslate(requests);

      // Save successful translations (without updating completion each time for performance)
      const created = [];
      const failed = [];

      for (const result of results) {
        if (result.success) {
          try {
            // Use bulk insert to skip individual completion updates
            const translation = await storage.createTranslationWithoutCompletion({
              key: result.key,
              locale: targetLocale,
              text: result.translatedText,
              namespace,
              reviewed: false,
            });
            created.push(translation);
          } catch (error: any) {
            failed.push({ key: result.key, error: error.message });
          }
        } else {
          failed.push({ key: result.key, error: result.error });
        }
      }

      // Update language-namespace completion percentage once at the end
      await storage.updateLanguageNamespaceCompletion(targetLocale, namespace);

      res.json({
        message: `AI translation completed: ${created.length} translations created for namespace "${namespace}"`,
        created: created.length,
        failed: failed.length,
        failures: failed,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Translation for a single key
  app.post("/api/admin/translations/ai-translate-single", authenticateJWT, async (req, res) => {
    try {
      const { key, namespace, targetLocale, sourceText } = req.body;

      if (!key || !namespace || !targetLocale || !sourceText) {
        return res
          .status(400)
          .json({ error: "key, namespace, targetLocale, and sourceText are required" });
      }

      // Get target language name
      const targetLanguage = await storage.getLanguage(targetLocale);
      if (!targetLanguage) {
        return res.status(404).json({ error: "Target language not found" });
      }

      // Translate the single text
      const translatedText = await translateText(
        sourceText,
        targetLanguage.nativeName
      );

      // Check if translation already exists
      const existing = await storage.getTranslation(key, targetLocale, namespace);

      let translation;
      if (existing) {
        // Update existing translation
        translation = await storage.updateTranslation(key, targetLocale, namespace, {
          text: translatedText,
          reviewed: false,
        });
      } else {
        // Create new translation
        translation = await storage.createTranslation({
          key,
          locale: targetLocale,
          text: translatedText,
          namespace,
          reviewed: false,
        });
      }

      res.json({
        message: "Translation completed successfully",
        translation,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get analytics data
  app.get("/api/admin/analytics", authenticateJWT, async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SERVICE-TO-SERVICE ENDPOINTS - Use API key authentication
  // These endpoints allow other psilyou Repls to register translation keys automatically

  // Bulk register translation keys (creates English entries that need translation)
  app.post("/api/service/translations/register", authenticateServiceApiKey, async (req, res) => {
    try {
      const { namespace, keys } = req.body;

      if (!namespace || !keys || !Array.isArray(keys)) {
        return res.status(400).json({
          error: "namespace and keys array are required",
          example: {
            namespace: "liv-psilyou",
            keys: [
              { key: "buttons.submit", text: "Submit" },
              { key: "messages.success", text: "Operation successful" }
            ]
          }
        });
      }

      const created: string[] = [];
      const skipped: string[] = [];
      const failed: { key: string; error: string }[] = [];

      for (const item of keys) {
        if (!item.key || !item.text) {
          failed.push({ key: item.key || "unknown", error: "Missing key or text" });
          continue;
        }

        try {
          // Check if English translation already exists
          const existing = await storage.getTranslation(item.key, "en", namespace);
          
          if (existing) {
            skipped.push(item.key);
            continue;
          }

          // Create English translation (source language)
          await storage.createTranslation({
            key: item.key,
            locale: "en",
            namespace,
            text: item.text,
            reviewed: true, // English source is considered reviewed
          });

          created.push(item.key);
        } catch (error: any) {
          failed.push({ key: item.key, error: error.message });
        }
      }

      res.status(201).json({
        message: `Registered ${created.length} keys, skipped ${skipped.length} existing keys`,
        created,
        skipped,
        failed,
        namespace,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Register a single translation key
  app.post("/api/service/translations/register-single", authenticateServiceApiKey, async (req, res) => {
    try {
      const { namespace, key, text, locale = "en" } = req.body;

      if (!namespace || !key || !text) {
        return res.status(400).json({
          error: "namespace, key, and text are required",
          example: {
            namespace: "liv-psilyou",
            key: "buttons.submit",
            text: "Submit",
            locale: "en" // optional, defaults to "en"
          }
        });
      }

      // Check if translation already exists
      const existing = await storage.getTranslation(key, locale, namespace);
      
      if (existing) {
        // Update existing translation
        const updated = await storage.updateTranslation(key, locale, namespace, { text });
        return res.json({
          message: "Translation updated",
          translation: updated,
          action: "updated"
        });
      }

      // Create new translation
      const translation = await storage.createTranslation({
        key,
        locale,
        namespace,
        text,
        reviewed: locale === "en", // English source is considered reviewed
      });

      res.status(201).json({
        message: "Translation created",
        translation,
        action: "created"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Bulk upsert translations from other services (e.g. admin.psilyou saving translated content)
  app.post("/api/service/translations/upsert", authenticateServiceApiKey, async (req, res) => {
    try {
      const { translations } = req.body;
      if (!Array.isArray(translations)) {
        return res.status(400).json({ error: "translations (array) is required" });
      }

      const results: { key: string; locale: string; action: string }[] = [];
      const errors: { key: string; locale: string; error: string }[] = [];

      for (const t of translations) {
        const { key, locale, namespace, text } = t;
        if (!key || !locale || !namespace || text === undefined) {
          errors.push({ key, locale, error: "key, locale, namespace, and text are required" });
          continue;
        }
        try {
          const existing = await storage.getTranslation(key, locale, namespace);
          if (existing) {
            await storage.updateTranslation(key, locale, namespace, { text });
            results.push({ key, locale, action: "updated" });
          } else {
            await storage.createTranslation({ key, locale, namespace, text, reviewed: locale === "en" });
            results.push({ key, locale, action: "created" });
          }
        } catch (e: any) {
          errors.push({ key, locale, error: e.message });
        }
      }

      res.json({ success: results, errors });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get active languages for a namespace (public version already exists at /api/languages)
  // This endpoint includes more details for service integrations
  app.get("/api/service/languages", authenticateServiceApiKey, async (req, res) => {
    try {
      const namespace = req.query.namespace as string;
      if (!namespace) {
        return res.status(400).json({ error: "namespace query parameter is required" });
      }

      const languages = await storage.getLanguagesWithNamespaceStatus(namespace);
      res.json({
        namespace,
        languages,
        liveLanguages: languages.filter(l => l.status === "live").map(l => l.locale),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
