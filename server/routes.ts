import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Anthropic from "@anthropic-ai/sdk";
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "LinuxFeedAggregator/1.0",
  },
});

// RSS feeds for Linux security and LLM news
const FEEDS = [
  // Linux Security
  {
    url: "https://www.bleepingcomputer.com/feed/",
    source: "BleepingComputer",
    category: "security",
  },
  {
    url: "https://feeds.feedburner.com/TheHackersNews",
    source: "The Hacker News",
    category: "security",
  },
  {
    url: "https://www.openwall.com/lists/oss-security/rss",
    source: "oss-security",
    category: "security",
  },
  {
    url: "https://lwn.net/headlines/rss",
    source: "LWN.net",
    category: "security",
  },
  // LLM / AI News
  {
    url: "https://blog.google/technology/ai/rss/",
    source: "Google AI Blog",
    category: "llm",
  },
  {
    url: "https://openai.com/blog/rss.xml",
    source: "OpenAI Blog",
    category: "llm",
  },
  {
    url: "https://www.technologyreview.com/feed/",
    source: "MIT Technology Review",
    category: "llm",
  },
  {
    url: "https://feeds.arstechnica.com/arstechnica/technology-lab",
    source: "Ars Technica",
    category: "llm",
  },
];

async function fetchAllFeeds() {
  const results: Array<{
    title: string;
    link: string;
    source: string;
    category: string;
    snippet: string | null;
    publishedAt: string | null;
  }> = [];

  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const items = (parsed.items || []).slice(0, 15); // limit per source
      for (const item of items) {
        if (!item.title || !item.link) continue;
        // Strip HTML from content snippet
        const rawSnippet =
          item.contentSnippet || item.content || item.summary || "";
        const snippet = rawSnippet
          .replace(/<[^>]*>/g, "")
          .substring(0, 300)
          .trim();
        results.push({
          title: item.title.trim(),
          link: item.link.trim(),
          source: feed.source,
          category: feed.category,
          snippet: snippet || null,
          publishedAt: item.isoDate || item.pubDate || null,
        });
      }
    } catch (err) {
      console.error(`Failed to fetch feed ${feed.source}:`, err);
    }
  }

  return results;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Fetch and store articles from RSS feeds
  app.post("/api/feeds/refresh", async (_req, res) => {
    try {
      const items = await fetchAllFeeds();
      let newCount = 0;
      for (const item of items) {
        const article = storage.upsertArticle({
          title: item.title,
          link: item.link,
          source: item.source,
          category: item.category,
          snippet: item.snippet,
          publishedAt: item.publishedAt,
          fetchedAt: new Date().toISOString(),
        });
        if (article) newCount++;
      }
      res.json({ fetched: items.length, stored: newCount });
    } catch (err) {
      console.error("Feed refresh error:", err);
      res.status(422).json({ error: "Failed to refresh feeds" });
    }
  });

  // Get all articles (optionally filtered by category)
  app.get("/api/articles", (_req, res) => {
    const category = _req.query.category as string | undefined;
    const articles = category
      ? storage.getArticlesByCategory(category)
      : storage.getArticles();
    // Attach summary status
    const withSummary = articles.map((a) => ({
      ...a,
      hasSummary: !!storage.getSummaryByArticleId(a.id),
    }));
    res.json(withSummary);
  });

  // Get single article with summary
  app.get("/api/articles/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const article = storage.getArticleById(id);
    if (!article) return res.status(404).json({ error: "Article not found" });
    const summary = storage.getSummaryByArticleId(id);
    res.json({ ...article, summary: summary?.summary || null });
  });

  // Summarize an article using LLM
  app.post("/api/articles/:id/summarize", async (req, res) => {
    const id = parseInt(req.params.id);
    const article = storage.getArticleById(id);
    if (!article) return res.status(404).json({ error: "Article not found" });

    // Check if already summarized
    const existing = storage.getSummaryByArticleId(id);
    if (existing) {
      return res.json({ summary: existing.summary });
    }

    try {
      const client = new Anthropic();

      const message = await client.messages.create({
        model: "gemini_3_flash",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `You are a technical news summarizer for Linux sysadmins and DevOps engineers.

Summarize this article in 3-5 bullet points. Be concise and technical. Focus on:
- What happened / what is this about
- Why it matters for Linux admins or AI/ML practitioners
- Any action items or key takeaways

Article title: ${article.title}
Source: ${article.source}
Content: ${article.snippet || "No preview available — summarize based on the title and source."}

Return ONLY the bullet points as markdown, no intro text. Each bullet should be 1-2 sentences max.`,
          },
        ],
      });

      const summaryText =
        message.content[0].type === "text"
          ? message.content[0].text
          : "Unable to generate summary.";

      const saved = storage.createSummary({
        articleId: id,
        summary: summaryText,
        createdAt: new Date().toISOString(),
      });

      res.json({ summary: saved.summary });
    } catch (err) {
      console.error("Summarization error:", err);
      res.status(422).json({ error: "Failed to summarize article" });
    }
  });

  return httpServer;
}
