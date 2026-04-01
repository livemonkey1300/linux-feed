import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Parser from "rss-parser";
import { extract } from "@extractus/article-extractor";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

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
// ──────────────────────────────────────────────

function loadPrompts() {
  const defaultPrompts = {
    summarization: {
      system: `You are a technical news summarizer for Linux sysadmins and DevOps engineers.

Summarize this article in 3-5 bullet points. Be concise and technical. Focus on:
- What happened / what is this about
- Why it matters for Linux admins or AI/ML practitioners
- Any action items or key takeaways

Return ONLY the bullet points as markdown, no intro text. Each bullet should be 1-2 sentences max.`
    },
    assistant: {
      dockerfile: `You are an expert DevOps engineer. Generate a production-ready, multi-stage Dockerfile based on the user's description. Include:
- Multi-stage build where appropriate
- Security best practices (non-root user, minimal base image)
- Proper layer caching
- Health check
- Labels and comments

Return ONLY the Dockerfile content as a code block. No explanation outside the code block.

User request: `,
      compose: `You are an expert DevOps engineer. Generate a production-ready docker-compose.yml based on the user's description. Include:
- Named volumes for persistence
- Health checks
- Restart policies
- Network configuration
- Environment variable placeholders
- Comments explaining each service

Return ONLY the docker-compose.yml content as a code block. No explanation outside the code block.

User request: `,
      helm: `You are an expert Kubernetes/Helm engineer. Convert the user's description (or Docker Compose setup) into a set of Helm chart templates. Generate:
- Chart.yaml
- values.yaml
- templates/deployment.yaml
- templates/service.yaml
- templates/configmap.yaml (if needed)
- templates/ingress.yaml (if needed)

Separate each file with a comment header like: # --- FILE: templates/deployment.yaml ---
Use Helm best practices (templating, values references, labels).

Return ONLY the file contents as code blocks. No explanation outside.

User request: `,
      scraper_python: `You are an expert developer. Write a production-quality web scraper in Python using requests + BeautifulSoup. Include:
- Proper error handling and retries
- Rate limiting / polite delays
- User-Agent header
- JSON output
- CLI arguments (URL, output file)
- Type hints
- Docstrings

Return ONLY the Python code as a code block.

User request: `,
      scraper_go: `You are an expert developer. Write a production-quality web scraper in Go using colly. Include:
- Proper error handling
- Rate limiting
- JSON output
- CLI flags (URL, output file)
- Clean struct definitions
- Comments

Return ONLY the Go code as a code block.

User request: `,
      scraper_node: `You are an expert developer. Write a production-quality web scraper in Node.js (TypeScript) using cheerio + node-fetch. Include:
- Proper error handling and retries
- Rate limiting
- JSON output
- CLI arguments (URL, output file)
- TypeScript types/interfaces
- ESM imports

Return ONLY the TypeScript code as a code block.

User request: `,
      scraper_bash: `You are an expert developer. Write a production-quality web scraper as a Bash script using curl + grep/sed/awk or pup/jq. Include:
- Proper error handling (set -euo pipefail)
- User-Agent header
- Rate limiting (sleep between requests)
- JSON output via jq
- CLI arguments
- Usage function
- Comments

Return ONLY the Bash script as a code block.

User request: `,
      pipeline: `You are an expert CI/CD engineer. Generate a CI/CD pipeline configuration based on the user's description. Default to GitLab CI (.gitlab-ci.yml) unless the user specifies otherwise. Include:
- Build, test, lint, security scan stages
- Docker image build and push
- Multi-environment deployment (staging, production)
- Caching
- Artifacts
- Comments explaining each stage

Return ONLY the pipeline YAML as a code block.

User request: `,
      terraform: ``,
      ansible: ``,
      sql: ``,
      aws_architect: ``,
      gcp_architect: ``,
      azure_architect: ``,
      gitlab_expert: ``,
      github_actions_expert: ``,
      container_security: ``,
      shopping_expert: ``,
    }
  };

  try {
    const promptsPath = path.join(process.cwd(), "prompts.yaml");
    if (fs.existsSync(promptsPath)) {
      const fileContents = fs.readFileSync(promptsPath, "utf8");
      const loaded = yaml.load(fileContents) as any;
      console.log(`✓ Loaded prompts from ${promptsPath}`);
      console.log(`  Assistant keys: ${Object.keys(loaded?.assistant || {}).join(", ")}`);
      return {
        summarization: {
          system: loaded?.summarization?.system || defaultPrompts.summarization.system
        },
        assistant: {
          ...defaultPrompts.assistant,
          ...loaded?.assistant
        }
      };
    } else {
      console.log(`✗ prompts.yaml NOT FOUND at ${promptsPath}`);
    }
  } catch (err) {
    console.error("✗ Error loading prompts.yaml, using defaults:", err);
  }
  return defaultPrompts;
}

function detectProvider(): {
  name: string;
  url: string;
  model: string;
  apiKey: string;
  buildBody: (prompt: string) => object;
  extractText: (json: any) => string;
} {
  if (process.env.GEMINI_API_KEY) {
    // gemini-2.5-flash-lite is the cheapest available model:
    //   $0.10 / 1M input tokens, $0.40 / 1M output tokens
    //   Free tier: 30 req/min, 1500 req/day
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
    return {
      name: "Gemini",
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      model,
      apiKey: process.env.GEMINI_API_KEY,
      buildBody: (prompt) => ({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4096 },
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

// RSS feeds organized by category
const FEEDS = [
  // ── Security ──
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
    url: "https://lwn.net/headlines/rss",
    source: "LWN.net",
    category: "security",
  },
  {
    url: "https://www.cshub.com/rss/articles",
    source: "Cyber Security Hub",
    category: "security",
  },

  // ── LLM / AI ──
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

  // ── Canadian Military & Defence ──
  {
    url: "https://vanguardcanada.com/feed/",
    source: "Vanguard Canada",
    category: "military",
  },
  {
    url: "https://milnewsca.wordpress.com/feed/",
    source: "MILNEWS.ca",
    category: "military",
  },
  {
    url: "https://canadianarmytoday.com/feed/",
    source: "Canadian Army Today",
    category: "military",
  },
  {
    url: "https://www.canada.ca/en/department-national-defence/news.atom.xml",
    source: "DND Canada",
    category: "military",
  },

  // ── DevOps / IaC ──
  {
    url: "https://devops.com/feed/",
    source: "DevOps.com",
    category: "devops",
  },
  {
    url: "https://www.hashicorp.com/blog/feed.xml",
    source: "HashiCorp",
    category: "devops",
  },
  {
    url: "https://kubernetes.io/feed.xml",
    source: "Kubernetes Blog",
    category: "devops",
  },
  {
    url: "https://blog.gruntwork.io/feed",
    source: "Gruntwork",
    category: "devops",
  },
  {
    url: "https://www.ansible.com/blog/rss.xml",
    source: "Ansible Blog",
    category: "devops",
  },
  {
    url: "https://devblogs.microsoft.com/devops/feed/",
    source: "Azure DevOps Blog",
    category: "devops",
  },

  // ── Linux Tips & Tutorials ──
  {
    url: "https://www.linuxtoday.com/feed/",
    source: "Linux Today",
    category: "linux",
  },
  {
    url: "https://linuxhandbook.com/feed/",
    source: "Linux Handbook",
    category: "linux",
  },
  {
    url: "https://itsfoss.com/feed/",
    source: "It's FOSS",
    category: "linux",
  },
  {
    url: "https://www.phoronix.com/rss.php",
    source: "Phoronix",
    category: "linux",
  },
  {
    url: "https://www.tecmint.com/feed/",
    source: "Tecmint",
    category: "linux",
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

  // Get prompts from prompts.yaml
  app.get("/api/prompts", (_req, res) => {
    try {
      const prompts = loadPrompts();
      res.json(prompts);
    } catch (err) {
      res.status(500).json({ error: "Failed to load prompts" });
    }
  });

  // Save prompts to prompts.yaml
  app.post("/api/prompts", async (req, res) => {
    try {
      const newPrompts = req.body;
      const promptsPath = path.join(process.cwd(), "prompts.yaml");
      const yamlContent = yaml.dump(newPrompts, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
      });
      fs.writeFileSync(promptsPath, yamlContent, "utf8");
      console.log("✓ Updated prompts.yaml from UI");
      res.json({ success: true });
    } catch (err) {
      console.error("✗ Failed to save prompts:", err);
      res.status(500).json({ error: "Failed to save prompts" });
    }
  });

  // ── Custom Feeds Management ──
  app.get("/api/feeds/custom", (_req, res) => {
    const feeds = storage.getCustomFeeds();
    res.json(feeds);
  });

  app.post("/api/feeds/custom", (req, res) => {
    const { url, name, category } = req.body;
    if (!url || !name) {
      return res.status(400).json({ error: "url and name are required" });
    }
    try {
      const feed = storage.addCustomFeed(url, name, category || "personal");
      res.json(feed);
    } catch (err: any) {
      if (err.message?.includes("UNIQUE")) {
        return res.status(409).json({ error: "Feed URL already exists" });
      }
      res.status(500).json({ error: "Failed to add feed" });
    }
  });

  app.delete("/api/feeds/custom/:id", (req, res) => {
    const id = parseInt(req.params.id);
    storage.removeCustomFeed(id);
    res.json({ success: true });
  });

  // Fetch and store articles from RSS feeds (built-in + custom)
  app.post("/api/feeds/refresh", async (_req, res) => {
    try {
      // Merge built-in feeds with user's custom feeds
      const customFeeds = storage.getCustomFeeds().map((f) => ({
        url: f.url,
        source: f.name,
        category: f.category,
      }));
      const allFeeds = [...FEEDS, ...customFeeds];

      console.log(`Refreshing ${allFeeds.length} feeds (${FEEDS.length} built-in + ${customFeeds.length} custom)...`);
      const feedResults = await Promise.allSettled(
        allFeeds.map((feed) => fetchSingleFeed(feed)),
      );
      const items: FeedItem[] = [];
      for (const result of feedResults) {
        if (result.status === "fulfilled") {
          items.push(...result.value);
        }
      }
      console.log(`Total: ${items.length} articles`);

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

  // Get available feed categories (built-in + custom)
  app.get("/api/feeds/categories", (_req, res) => {
    const builtInCategories = [...new Set(FEEDS.map((f) => f.category))];
    const customFeeds = storage.getCustomFeeds();
    const customCategories = [...new Set(customFeeds.map((f) => f.category))];
    const allCategories = [...new Set([...builtInCategories, ...customCategories])];
    res.json(allCategories);
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
      const prompts = loadPrompts();
      const prompt = `${prompts.summarization.system}

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

  // Fetch full article content from its URL
  app.get("/api/articles/:id/content", async (req, res) => {
    const id = parseInt(req.params.id);
    const article = storage.getArticleById(id);
    if (!article) return res.status(404).json({ error: "Article not found" });

    try {
      console.log(`Extracting content from ${article.link}...`);
      const data = await extract(article.link, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
      });

      if (!data) {
        return res.json({
          title: article.title,
          content: null,
          author: null,
          published: article.publishedAt,
          url: article.link,
        });
      }

      res.json({
        title: data.title || article.title,
        content: data.content || null,
        author: data.author || null,
        published: data.published || article.publishedAt,
        url: article.link,
        source: article.source,
      });
    } catch (err) {
      console.error("Content extraction error:", err);
      // Fall back — return article metadata without content
      res.json({
        title: article.title,
        content: null,
        author: null,
        published: article.publishedAt,
        url: article.link,
        source: article.source,
      });
    }
  });

  // ── DevOps AI Assistant ──
  app.post("/api/assistant/generate", async (req, res) => {
    const { template, userInput } = req.body;
    if (!template || !userInput) {
      return res.status(400).json({ error: "template and userInput are required" });
    }

    const prompts = loadPrompts();
    const systemPrompt = (prompts.assistant as Record<string, string>)[template];
    if (!systemPrompt) {
      return res.status(400).json({
        error: `Unknown template: ${template}. Available: ${Object.keys(prompts.assistant).join(", ")}`,
      });
    }

    try {
      const fullPrompt = systemPrompt + userInput;
      const result = await summarizeWithLLM(fullPrompt);
      res.json({ result });
    } catch (err) {

      console.error("Assistant error:", err);
      const message = err instanceof Error ? err.message : "Generation failed";
      res.status(422).json({ error: message });
    }
  });

  return httpServer;
}
