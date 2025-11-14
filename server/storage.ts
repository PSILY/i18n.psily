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
    
    // Then get namespace status for each language
    const withStatus = await Promise.all(
      languages.map(async (lang) => {
        const langNamespace = await this.getLanguageNamespace(lang.locale, namespace);
        return {
          ...lang,
          status: langNamespace?.status || 'draft',
          completionPercent: langNamespace?.completionPercent || 0,
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

  // Language-Namespace junction methods
  async getLanguageNamespace(locale: string, namespace: string): Promise<LanguageNamespace | null> {
    // Use raw SQL query since Supabase client schema cache doesn't see the new table
    const { data, error } = await supabase.rpc('exec_sql_query', {
      query: `SELECT * FROM language_namespaces WHERE locale = $1 AND namespace = $2 LIMIT 1`,
      params: [locale, namespace]
    });

    if (error || !data || data.length === 0) return null;
    return toCamelCase<LanguageNamespace>(data[0]);
  }

  async createLanguageNamespace(languageNamespace: InsertLanguageNamespace): Promise<LanguageNamespace> {
    const snakeCaseData = toSnakeCase(languageNamespace);
    
    const { data, error } = await supabase
      .from("language_namespaces")
      .insert(snakeCaseData)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase<LanguageNamespace>(data);
  }

  async updateLanguageNamespace(
    locale: string, 
    namespace: string, 
    updates: Partial<LanguageNamespace>
  ): Promise<LanguageNamespace> {
    const snakeCaseUpdates = toSnakeCase({ ...updates, updated_at: new Date().toISOString() });
    
    const { data, error } = await supabase
      .from("language_namespaces")
      .update(snakeCaseUpdates)
      .eq("locale", locale)
      .eq("namespace", namespace)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase<LanguageNamespace>(data);
  }

  async updateLanguageNamespaceCompletion(locale: string, namespace: string): Promise<void> {
    // Skip completion calculation for English (source language)
    if (locale === "en") {
      // Ensure English namespace exists and is set to 100%
      const existing = await this.getLanguageNamespace(locale, namespace);
      if (existing) {
        await this.updateLanguageNamespace(locale, namespace, { 
          completionPercent: 100,
          status: 'live'
        });
      } else {
        await this.createLanguageNamespace({ 
          locale, 
          namespace, 
          completionPercent: 100,
          status: 'live'
        });
      }
      return;
    }

    // Get total translations for this locale and namespace
    const { count: targetCount } = await supabase
      .from("translations")
      .select("*", { count: "exact", head: true })
      .eq("locale", locale)
      .eq("namespace", namespace);

    // Get total English translations for this namespace (source language)
    const { count: englishCount } = await supabase
      .from("translations")
      .select("*", { count: "exact", head: true })
      .eq("locale", "en")
      .eq("namespace", namespace);

    const completionPercent =
      englishCount && englishCount > 0
        ? Math.round(((targetCount || 0) / englishCount) * 100)
        : 0;

    // Check if language_namespace record exists
    const existing = await this.getLanguageNamespace(locale, namespace);
    
    if (existing) {
      await this.updateLanguageNamespace(locale, namespace, { completionPercent });
    } else {
      // Create new language_namespace record
      await this.createLanguageNamespace({ locale, namespace, completionPercent, status: 'draft' });
    }
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

    query = query.order("updated_at", { ascending: false }).limit(1000);

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
