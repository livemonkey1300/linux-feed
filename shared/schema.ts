import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const articles = sqliteTable("articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  link: text("link").notNull().unique(),
  source: text("source").notNull(),
  category: text("category").notNull(), // "security" | "llm"
  snippet: text("snippet"), // short description from RSS
  publishedAt: text("published_at"),
  fetchedAt: text("fetched_at").notNull(),
});

export const summaries = sqliteTable("summaries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  articleId: integer("article_id").notNull().references(() => articles.id),
  summary: text("summary").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertArticleSchema = createInsertSchema(articles).omit({ id: true });
export const insertSummarySchema = createInsertSchema(summaries).omit({ id: true });

export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;
export type InsertSummary = z.infer<typeof insertSummarySchema>;
export type Summary = typeof summaries.$inferSelect;
