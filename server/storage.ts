import {
  type Article,
  type InsertArticle,
  type Summary,
  type InsertSummary,
  articles,
  summaries,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  getArticles(): Article[];
  getArticlesByCategory(category: string): Article[];
  getArticleById(id: number): Article | undefined;
  upsertArticle(article: InsertArticle): Article;
  getSummaryByArticleId(articleId: number): Summary | undefined;
  createSummary(summary: InsertSummary): Summary;
}

export class DatabaseStorage implements IStorage {
  getArticles(): Article[] {
    return db.select().from(articles).orderBy(desc(articles.fetchedAt)).all();
  }

  getArticlesByCategory(category: string): Article[] {
    return db
      .select()
      .from(articles)
      .where(eq(articles.category, category))
      .orderBy(desc(articles.fetchedAt))
      .all();
  }

  getArticleById(id: number): Article | undefined {
    return db.select().from(articles).where(eq(articles.id, id)).get();
  }

  upsertArticle(article: InsertArticle): Article {
    // Try insert, if link already exists just return existing
    const existing = db
      .select()
      .from(articles)
      .where(eq(articles.link, article.link))
      .get();
    if (existing) return existing;
    return db.insert(articles).values(article).returning().get();
  }

  getSummaryByArticleId(articleId: number): Summary | undefined {
    return db
      .select()
      .from(summaries)
      .where(eq(summaries.articleId, articleId))
      .get();
  }

  createSummary(summary: InsertSummary): Summary {
    return db.insert(summaries).values(summary).returning().get();
  }
}

export const storage = new DatabaseStorage();
