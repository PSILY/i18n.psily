import { supabase, toCamelCase, toSnakeCase } from "./lib/supabase";
import type {
  Translation,
  InsertTranslation,
  Language,
  InsertLanguage,
  LanguageNamespace,
  InsertLanguageNamespace,
  LanguageWithNamespaceStatus,
  TranslationFilters,
  NamespaceStats,
  AnalyticsData,
} from "@shared/schema";

export interface IStorage {
  // Languages
  getAllLanguages(): Promise<Language[]>;
  getLanguagesWithNamespaceStatus(namespace: string): Promise<LanguageWithNamespaceStatus[]>;
  getLiveLanguagesForNamespace(namespace: string): Promise<LanguageWithNamespaceStatus[]>;
  getLanguage(locale: string): Promise<Language | null>;
  createLanguage(language: InsertLanguage): Promise<Language>;
  updateLanguage(locale: string, updates: Partial<Language>): Promise<Language>;
  
  // Language-Namespace junction
  getLanguageNamespace(locale: string, namespace: string): Promise<LanguageNamespace | null>;
  createLanguageNamespace(languageNamespace: InsertLanguageNamespace): Promise<LanguageNamespace>;
  updateLanguageNamespace(locale: string, namespace: string, updates: Partial<LanguageNamespace>): Promise<LanguageNamespace>;
  updateLanguageNamespaceCompletion(locale: string, namespace: string): Promise<void>;

  // Translations
  getTranslations(filters?: TranslationFilters): Promise<Translation[]>;
  getTranslation(
    key: string,
    locale: string,
    namespace: string
  ): Promise<Translation | null>;
  getTranslationsByLocaleAndNamespace(
    locale: string,
    namespace: string
  ): Promise<Translation[]>;
  createTranslation(translation: InsertTranslation): Promise<Translation>;
  createTranslationWithoutCompletion(translation: InsertTranslation): Promise<Translation>;
  updateTranslation(
    key: string,
    locale: string,
    namespace: string,
    updates: Partial<Translation>
  ): Promise<Translation>;
  deleteTranslation(key: string, locale: string, namespace: string): Promise<void>;

  // Analytics
  getNamespaces(): Promise<string[]>;
  getNamespaceStats(locale?: string): Promise<NamespaceStats[]>;
  getRecentTranslations(limit?: number): Promise<Translation[]>;
  getUntranslatedKeys(): Promise<{ namespace: string; keys: string[] }[]>;
  getAnalytics(): Promise<AnalyticsData>;
}

export class SupabaseStorage implements IStorage {
  // Languages
  async getAllLanguages(): Promise<Language[]> {
    const { data, error } = await supabase
      .from("languages")
      .select("*")
      .order("display_order");

    if (error) throw error;
    return toCamelCase<Language[]>(data || []);
  }

  async getLanguagesWithNamespaceStatus(namespace: string): Promise<LanguageWithNamespaceStatus[]> {
    // Get all languages first
    const languages = await this.getAllLanguages();
    
    // Get English baseline count once (optimization to avoid duplicate queries)
    const { count: englishCount } = await supabase
      .from("translations")
      .select("*", { count: "exact", head: true })
      .eq("locale", "en")
      .eq("namespace", namespace);
    
    // Calculate status and completion dynamically from translations table
    const withStatus = await Promise.all(
      languages.map(async (lang) => {
        // Optimization: reuse English count if this is the English language
        const langCount = lang.locale === "en" 
          ? englishCount 
          : (await supabase
              .from("translations")
              .select("*", { count: "exact", head: true })
              .eq("locale", lang.locale)
              .eq("namespace", namespace)).count;

        const completionPercent =
          englishCount && englishCount > 0
            ? Math.round(((langCount || 0) / englishCount) * 100)
            : 0;

        // Determine status: live if 95%+ complete, otherwise draft
        const status = completionPercent >= 95 ? 'live' : 'draft';

        return {
          ...lang,
          status,
          completionPercent,
        };
      })
    );

    return withStatus;
  }

  async getLiveLanguagesForNamespace(namespace: string): Promise<LanguageWithNamespaceStatus[]> {
    // Get all languages with namespace status, then filter for live ones
    const allLanguages = await this.getLanguagesWithNamespaceStatus(namespace);
    return allLanguages.filter(lang => lang.status === 'live');
  }

  async getLanguage(locale: string): Promise<Language | null> {
    const { data, error } = await supabase
      .from("languages")
      .select("*")
      .eq("locale", locale)
      .single();

    if (error) return null;
    return toCamelCase<Language>(data);
  }

  async createLanguage(language: InsertLanguage): Promise<Language> {
    // Convert camelCase input to snake_case for Supabase
    const snakeCaseLanguage = toSnakeCase(language);
    
    const { data, error } = await supabase
      .from("languages")
      .insert(snakeCaseLanguage)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase<Language>(data);
  }

  async updateLanguage(locale: string, updates: Partial<Language>): Promise<Language> {
    // Convert camelCase updates to snake_case for Supabase
    const snakeCaseUpdates = toSnakeCase({ ...updates, updated_at: new Date().toISOString() });
    
    const { data, error } = await supabase
      .from("languages")
      .update(snakeCaseUpdates)
      .eq("locale", locale)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase<Language>(data);
  }

  // Language-Namespace junction methods (calculating dynamically - no separate table needed)
  async getLanguageNamespace(locale: string, namespace: string): Promise<LanguageNamespace | null> {
    // Calculate completion percentage dynamically
    const { count: englishCount } = await supabase
      .from("translations")
      .select("*", { count: "exact", head: true })
      .eq("locale", "en")
      .eq("namespace", namespace);

    const { count: langCount } = await supabase
      .from("translations")
      .select("*", { count: "exact", head: true })
      .eq("locale", locale)
      .eq("namespace", namespace);

    const completionPercent =
      englishCount && englishCount > 0
        ? Math.round(((langCount || 0) / englishCount) * 100)
        : 0;

    const status = completionPercent >= 95 ? 'live' : 'draft';

    return {
      locale,
      namespace,
      status,
      completionPercent,
      updatedAt: new Date(),
    };
  }

  async createLanguageNamespace(languageNamespace: InsertLanguageNamespace): Promise<LanguageNamespace> {
    // No-op: we're calculating dynamically now
    return {
      ...languageNamespace,
      updatedAt: new Date(),
    };
  }

  async updateLanguageNamespace(
    locale: string, 
    namespace: string, 
    updates: Partial<LanguageNamespace>
  ): Promise<LanguageNamespace> {
    // No-op: we're calculating dynamically now
    const current = await this.getLanguageNamespace(locale, namespace);
    return {
      ...current!,
      ...updates,
      updatedAt: new Date(),
    };
  }

  async updateLanguageNamespaceCompletion(locale: string, namespace: string): Promise<void> {
    // No-op: completion is calculated dynamically on-the-fly
    // This method is kept for API compatibility but does nothing
    return;
  }

  // Translations
  async getTranslations(filters: TranslationFilters = {}): Promise<Translation[]> {
    let query = supabase.from("translations").select("*");

    if (filters.namespace) {
      query = query.eq("namespace", filters.namespace);
    }
    if (filters.locale) {
      query = query.eq("locale", filters.locale);
    }
    if (filters.reviewed !== undefined) {
      query = query.eq("reviewed", filters.reviewed);
    }
    if (filters.search) {
      query = query.or(
        `key.ilike.%${filters.search}%,text.ilike.%${filters.search}%`
      );
    }

    // Sort by namespace, key, and locale alphabetically for stable ordering
    // This ensures translations don't jump around when edited
    query = query
      .order("namespace", { ascending: true })
      .order("key", { ascending: true })
      .order("locale", { ascending: true })
      .limit(1000);

    const { data, error } = await query;

    if (error) throw error;
    return toCamelCase<Translation[]>(data || []);
  }

  async getTranslation(
    key: string,
    locale: string,
    namespace: string
  ): Promise<Translation | null> {
    const { data, error } = await supabase
      .from("translations")
      .select("*")
      .eq("key", key)
      .eq("locale", locale)
      .eq("namespace", namespace)
      .single();

    if (error) return null;
    return toCamelCase<Translation>(data);
  }

  async getTranslationsByLocaleAndNamespace(
    locale: string,
    namespace: string
  ): Promise<Translation[]> {
    const { data, error } = await supabase
      .from("translations")
      .select("*")
      .eq("locale", locale)
      .eq("namespace", namespace);

    if (error) throw error;
    return toCamelCase<Translation[]>(data || []);
  }

  async createTranslation(translation: InsertTranslation): Promise<Translation> {
    // Convert camelCase input to snake_case for Supabase
    const snakeCaseTranslation = toSnakeCase(translation);
    
    const { data, error } = await supabase
      .from("translations")
      .insert(snakeCaseTranslation)
      .select()
      .single();

    if (error) throw error;

    // Update language-namespace completion
    await this.updateLanguageNamespaceCompletion(translation.locale, translation.namespace);

    return toCamelCase<Translation>(data);
  }

  async createTranslationWithoutCompletion(translation: InsertTranslation): Promise<Translation> {
    // Same as createTranslation but without updating completion (for batch operations)
    const snakeCaseTranslation = toSnakeCase(translation);
    
    const { data, error } = await supabase
      .from("translations")
      .insert(snakeCaseTranslation)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase<Translation>(data);
  }

  async updateTranslation(
    key: string,
    locale: string,
    namespace: string,
    updates: Partial<Translation>
  ): Promise<Translation> {
    // Convert camelCase updates to snake_case for Supabase
    const snakeCaseUpdates = toSnakeCase({ ...updates, updated_at: new Date().toISOString() });
    
    const { data, error } = await supabase
      .from("translations")
      .update(snakeCaseUpdates)
      .eq("key", key)
      .eq("locale", locale)
      .eq("namespace", namespace)
      .select()
      .single();

    if (error) throw error;

    // Update language-namespace completion
    await this.updateLanguageNamespaceCompletion(locale, namespace);

    return toCamelCase<Translation>(data);
  }

  async deleteTranslation(
    key: string,
    locale: string,
    namespace: string
  ): Promise<void> {
    const { error} = await supabase
      .from("translations")
      .delete()
      .eq("key", key)
      .eq("locale", locale)
      .eq("namespace", namespace);

    if (error) throw error;

    // Update language-namespace completion
    await this.updateLanguageNamespaceCompletion(locale, namespace);
  }

  // Analytics
  async getNamespaces(): Promise<string[]> {
    const { data, error } = await supabase
      .from("translations")
      .select("namespace")
      .order("namespace");

    if (error) throw error;

    const uniqueNamespaces = new Set<string>();
    (data || []).forEach((t) => uniqueNamespaces.add(t.namespace));
    return Array.from(uniqueNamespaces);
  }

  async getNamespaceStats(locale?: string): Promise<NamespaceStats[]> {
    const namespaces = await this.getNamespaces();
    const stats: NamespaceStats[] = [];

    for (const namespace of namespaces) {
      let query = supabase.from("translations").select("reviewed", { count: "exact" });

      query = query.eq("namespace", namespace);
      if (locale) {
        query = query.eq("locale", locale);
      }

      const { data, error } = await query;

      if (!error && data) {
        const totalKeys = data.length;
        const reviewedKeys = data.filter((t) => t.reviewed).length;
        const completionPercent =
          totalKeys > 0 ? Math.round((reviewedKeys / totalKeys) * 100) : 0;

        stats.push({
          namespace,
          totalKeys,
          translatedKeys: totalKeys,
          reviewedKeys,
          completionPercent,
        });
      }
    }

    return stats.sort((a, b) => b.completionPercent - a.completionPercent);
  }

  async getRecentTranslations(limit: number = 20): Promise<Translation[]> {
    const { data, error } = await supabase
      .from("translations")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return toCamelCase<Translation[]>(data || []);
  }

  async getUntranslatedKeys(): Promise<{ namespace: string; keys: string[] }[]> {
    // Get all English keys (source language)
    const { data: englishKeys } = await supabase
      .from("translations")
      .select("key, namespace")
      .eq("locale", "en");

    if (!englishKeys) return [];

    // Group by namespace
    const namespaceKeys = new Map<string, Set<string>>();
    for (const item of englishKeys) {
      if (!namespaceKeys.has(item.namespace)) {
        namespaceKeys.set(item.namespace, new Set());
      }
      namespaceKeys.get(item.namespace)!.add(item.key);
    }

    // For each non-English language, find missing keys
    const languages = await this.getAllLanguages();
    const untranslated: { namespace: string; keys: string[] }[] = [];

    const entries = Array.from(namespaceKeys.entries());
    for (const [namespace, keys] of entries) {
      const missingKeys = new Set(Array.from(keys));

      for (const lang of languages) {
        if (lang.locale === "en") continue;

        const { data: translations } = await supabase
          .from("translations")
          .select("key")
          .eq("locale", lang.locale)
          .eq("namespace", namespace);

        if (translations) {
          for (const t of translations) {
            missingKeys.delete(t.key);
          }
        }
      }

      if (missingKeys.size > 0) {
        untranslated.push({
          namespace,
          keys: Array.from(missingKeys),
        });
      }
    }

    return untranslated;
  }

  async getAnalytics(): Promise<AnalyticsData> {
    const languages = await this.getAllLanguages();
    const namespaceStats = await this.getNamespaceStats();
    const recentTranslations = await this.getRecentTranslations(10);
    const untranslatedKeys = await this.getUntranslatedKeys();

    // Count total unique keys
    const { data: allTranslations } = await supabase
      .from("translations")
      .select("key, reviewed")
      .eq("locale", "en");

    const totalKeys = allTranslations?.length || 0;
    const totalReviewed =
      allTranslations?.filter((t) => t.reviewed).length || 0;
    const reviewedPercent =
      totalKeys > 0 ? Math.round((totalReviewed / totalKeys) * 100) : 0;

    // Note: languages no longer have completionPercent - this is now per namespace
    // We'll calculate average from namespace stats instead
    const averageCompletion =
      namespaceStats.length > 0
        ? Math.round(
            namespaceStats.reduce((sum, ns) => sum + ns.completionPercent, 0) /
              namespaceStats.length
          )
        : 0;

    return {
      totalKeys,
      totalLanguages: languages.length,
      averageCompletion,
      reviewedPercent,
      namespaceStats,
      recentTranslations,
      untranslatedKeys,
    };
  }
}

export const storage = new SupabaseStorage();
