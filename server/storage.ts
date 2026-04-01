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
import path from "path";
import fs from "fs";

// Use /app/data in Docker (volume-mounted), otherwise local directory
const dataDir = fs.existsSync("/app/data") ? "/app/data" : ".";
const dbPath = path.join(dataDir, "data.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

// Auto-create tables if they don't exist (no need for drizzle-kit push at runtime)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    link TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    snippet TEXT,
    published_at TEXT,
    fetched_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL REFERENCES articles(id),
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS custom_feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'personal',
    created_at TEXT NOT NULL
  );
`);
console.log(`Database initialized at ${dbPath}`);

export const db = drizzle(sqlite);

export interface CustomFeed {
  id: number;
  url: string;
  name: string;
  category: string;
  created_at: string;
}

export interface IStorage {
  getArticles(): Article[];
  getArticlesByCategory(category: string): Article[];
  getArticleById(id: number): Article | undefined;
  upsertArticle(article: InsertArticle): Article;
  getSummaryByArticleId(articleId: number): Summary | undefined;
  createSummary(summary: InsertSummary): Summary;
  getCustomFeeds(): CustomFeed[];
  addCustomFeed(url: string, name: string, category: string): CustomFeed;
  removeCustomFeed(id: number): void;
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

  getCustomFeeds(): CustomFeed[] {
    return sqlite
      .prepare("SELECT * FROM custom_feeds ORDER BY created_at DESC")
      .all() as CustomFeed[];
  }

  addCustomFeed(url: string, name: string, category: string): CustomFeed {
    return sqlite
      .prepare(
        "INSERT INTO custom_feeds (url, name, category, created_at) VALUES (?, ?, ?, ?) RETURNING *",
      )
      .get(url, name, category, new Date().toISOString()) as CustomFeed;
  }

  removeCustomFeed(id: number): void {
    sqlite.prepare("DELETE FROM custom_feeds WHERE id = ?").run(id);
  }
}

export const storage = new DatabaseStorage();
