import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Translation table
export const translations = pgTable("translations", {
  key: varchar("key", { length: 255 }).notNull(),
  locale: varchar("locale", { length: 10 }).notNull(),
  text: text("text").notNull(),
  namespace: varchar("namespace", { length: 50 }).notNull(),
  reviewed: boolean("reviewed").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => ({
  pk: sql`PRIMARY KEY (key, locale, namespace)`,
}));

export const insertTranslationSchema = createInsertSchema(translations).omit({
  updatedAt: true,
});

export type Translation = typeof translations.$inferSelect;
export type InsertTranslation = z.infer<typeof insertTranslationSchema>;

// Language table
export const languages = pgTable("languages", {
  locale: varchar("locale", { length: 10 }).primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  nativeName: varchar("native_name", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('draft'),
  completionPercent: integer("completion_percent").notNull().default(0),
  displayOrder: integer("display_order").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertLanguageSchema = createInsertSchema(languages).omit({
  updatedAt: true,
});

export type Language = typeof languages.$inferSelect;
export type InsertLanguage = z.infer<typeof insertLanguageSchema>;

// API response types
export interface TranslationWithStats extends Translation {
  totalInNamespace?: number;
  reviewedInNamespace?: number;
}

export interface NamespaceStats {
  namespace: string;
  totalKeys: number;
  translatedKeys: number;
  reviewedKeys: number;
  completionPercent: number;
}

export interface AnalyticsData {
  totalKeys: number;
  totalLanguages: number;
  averageCompletion: number;
  reviewedPercent: number;
  namespaceStats: NamespaceStats[];
  recentTranslations: Translation[];
  untranslatedKeys: {
    namespace: string;
    keys: string[];
  }[];
}

// Filter types
export interface TranslationFilters {
  namespace?: string;
  locale?: string;
  reviewed?: boolean;
  search?: string;
}
