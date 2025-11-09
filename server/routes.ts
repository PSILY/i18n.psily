import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateJWT } from "./lib/auth";
import { batchTranslate } from "./lib/openai";
import { initializeDatabase, seedLanguages } from "./lib/supabase";
import { insertTranslationSchema, insertLanguageSchema } from "@shared/schema";
import { z } from "zod";

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

  // Recalculate completion percentages for all languages
  app.post("/api/setup/recalculate-completion", async (req, res) => {
    try {
      const languages = await storage.getAllLanguages();
      for (const lang of languages) {
        await storage.updateLanguageCompletion(lang.locale);
      }
      const updated = await storage.getAllLanguages();
      res.json({
        message: "Completion percentages updated successfully",
        languages: updated,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // PUBLIC ENDPOINTS - No authentication required

  // Get all live languages for language switchers
  app.get("/api/languages", async (req, res) => {
    try {
      const languages = await storage.getLiveLanguages();
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

  // Get all languages (including draft and archived)
  app.get("/api/admin/languages", authenticateJWT, async (req, res) => {
    try {
      const languages = await storage.getAllLanguages();
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

      // Update completion percentage once at the end
      await storage.updateLanguageCompletion(targetLocale);

      res.json({
        message: `AI translation completed: ${created.length} translations created`,
        created: created.length,
        failed: failed.length,
        failures: failed,
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

  const httpServer = createServer(app);

  return httpServer;
}
