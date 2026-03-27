import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; LinuxFeedAggregator/1.0; +https://github.com/livemonkey1300/linux-feed)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

// ──────────────────────────────────────────────
//  Multi-provider LLM summarization
//  Set ONE of these env vars:
//    GEMINI_API_KEY      — Google Gemini (free tier available)
//    PERPLEXITY_API_KEY  — Perplexity (OpenAI-compatible)
//    OPENAI_API_KEY      — OpenAI / GitHub Copilot
//    ANTHROPIC_API_KEY   — Anthropic Claude
// ──────────────────────────────────────────────

const SUMMARY_PROMPT = `You are a technical news summarizer for Linux sysadmins and DevOps engineers.

Summarize this article in 3-5 bullet points. Be concise and technical. Focus on:
- What happened / what is this about
- Why it matters for Linux admins or AI/ML practitioners
- Any action items or key takeaways

Return ONLY the bullet points as markdown, no intro text. Each bullet should be 1-2 sentences max.`;

function detectProvider(): {
  name: string;
  url: string;
  model: string;
  apiKey: string;
  buildBody: (prompt: string) => object;
  extractText: (json: any) => string;
} {
  if (process.env.GEMINI_API_KEY) {
    return {
      name: "Gemini",
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      model: "gemini-2.0-flash",
      apiKey: process.env.GEMINI_API_KEY,
      buildBody: (prompt) => ({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1024 },
      }),
      extractText: (json) =>
        json?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Unable to generate summary.",
    };
  }

  if (process.env.PERPLEXITY_API_KEY) {
    return {
      name: "Perplexity",
      url: "https://api.perplexity.ai/chat/completions",
      model: "sonar",
      apiKey: process.env.PERPLEXITY_API_KEY,
      buildBody: (prompt) => ({
        model: "sonar",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
      extractText: (json) =>
        json?.choices?.[0]?.message?.content ||
        "Unable to generate summary.",
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      name: "OpenAI",
      url: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
      apiKey: process.env.OPENAI_API_KEY,
      buildBody: (prompt) => ({
        model: "gpt-4o-mini",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
      extractText: (json) =>
        json?.choices?.[0]?.message?.content ||
        "Unable to generate summary.",
    };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return {
      name: "Anthropic",
      url: "https://api.anthropic.com/v1/messages",
      model: "claude-3-5-haiku-latest",
      apiKey: process.env.ANTHROPIC_API_KEY,
      buildBody: (prompt) => ({
        model: "claude-3-5-haiku-latest",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
      extractText: (json) =>
        json?.content?.[0]?.text || "Unable to generate summary.",
    };
  }

  throw new Error(
    "No LLM API key configured. Set one of: GEMINI_API_KEY, PERPLEXITY_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY",
  );
}

async function summarizeWithLLM(articlePrompt: string): Promise<string> {
  const provider = detectProvider();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Gemini uses key in URL, others use Authorization header
  if (provider.name === "Anthropic") {
    headers["x-api-key"] = provider.apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else if (provider.name !== "Gemini") {
    headers["Authorization"] = `Bearer ${provider.apiKey}`;
  }

  console.log(`Summarizing with ${provider.name} (${provider.model})...`);

  const res = await fetch(provider.url, {
    method: "POST",
    headers,
    body: JSON.stringify(provider.buildBody(articlePrompt)),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${provider.name} API error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  return provider.extractText(json);
}

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

type FeedItem = {
  title: string;
  link: string;
  source: string;
  category: string;
  snippet: string | null;
  publishedAt: string | null;
};

async function fetchSingleFeed(feed: (typeof FEEDS)[number]): Promise<FeedItem[]> {
  try {
    console.log(`Fetching ${feed.source} (${feed.url})...`);
    const parsed = await parser.parseURL(feed.url);
    const items = (parsed.items || []).slice(0, 15);
    const results: FeedItem[] = [];
    for (const item of items) {
      if (!item.title || !item.link) continue;
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
    console.log(`  ✓ ${feed.source}: ${results.length} articles`);
    return results;
  } catch (err: any) {
    console.error(`  ✗ ${feed.source} failed: ${err.message || err}`);
    return [];
  }
}

async function fetchAllFeeds() {
  console.log(`Refreshing ${FEEDS.length} feeds in parallel...`);
  // Fetch all feeds in parallel — one slow feed won't block the others
  const feedResults = await Promise.allSettled(
    FEEDS.map((feed) => fetchSingleFeed(feed)),
  );
  const results: FeedItem[] = [];
  for (const result of feedResults) {
    if (result.status === "fulfilled") {
      results.push(...result.value);
    }
  }
  console.log(`Total: ${results.length} articles from ${FEEDS.length} feeds`);
  return results;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Show which LLM provider is configured on startup
  app.get("/api/status", (_req, res) => {
    try {
      const provider = detectProvider();
      res.json({ provider: provider.name, model: provider.model });
    } catch {
      res.json({ provider: null, error: "No API key configured" });
    }
  });

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

  // Summarize an article using whichever LLM is configured
  app.post("/api/articles/:id/summarize", async (req, res) => {
    const id = parseInt(req.params.id);
    const article = storage.getArticleById(id);
    if (!article) return res.status(404).json({ error: "Article not found" });

    const existing = storage.getSummaryByArticleId(id);
    if (existing) {
      return res.json({ summary: existing.summary });
    }

    try {
      const prompt = `${SUMMARY_PROMPT}

Article title: ${article.title}
Source: ${article.source}
Content: ${article.snippet || "No preview available — summarize based on the title and source."}`;

      const summaryText = await summarizeWithLLM(prompt);

      const saved = storage.createSummary({
        articleId: id,
        summary: summaryText,
        createdAt: new Date().toISOString(),
      });

      res.json({ summary: saved.summary });
    } catch (err) {
      console.error("Summarization error:", err);
      const message =
        err instanceof Error ? err.message : "Failed to summarize article";
      res.status(422).json({ error: message });
    }
  });

  return httpServer;
}
