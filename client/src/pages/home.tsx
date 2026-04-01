import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  Brain,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Terminal,
  Clock,
  Rss,
  ChevronRight,
  Loader2,
  ArrowLeft,
  BookOpen,
  Swords,
  Wrench,
  MonitorSmartphone,
  User,
  Plus,
  Trash2,
  Settings,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

interface Article {
  id: number;
  title: string;
  link: string;
  source: string;
  category: string;
  snippet: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  hasSummary: boolean;
}

interface ArticleContent {
  title: string;
  content: string | null;
  author: string | null;
  published: string | null;
  url: string;
  source: string;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium tracking-wide uppercase">
      {source}
    </span>
  );
}

function ArticleSkeleton() {
  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-start gap-3">
        <Skeleton className="h-4 w-4 mt-1 rounded-sm shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    </div>
  );
}

// ── Article Reader View ──
function ArticleReader({
  articleId,
  articleMeta,
  onBack,
}: {
  articleId: number;
  articleMeta: Article;
  onBack: () => void;
}) {
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // Fetch article content
  const { data: content, isLoading: contentLoading } =
    useQuery<ArticleContent>({
      queryKey: ["/api/articles", articleId, "content"],
      queryFn: async () => {
        const res = await apiRequest(
          "GET",
          `/api/articles/${articleId}/content`,
        );
        return res.json();
      },
    });

  // Summarize mutation
  const summarizeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/articles/${articleId}/summarize`,
      );
      return res.json();
    },
    onSuccess: (data) => {
      setSummaryText(data.summary);
      setShowSummary(true);
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
    },
  });

  function handleSummarize() {
    setShowSummary(true);
    setSummaryText(null);
    // Check for cached summary first
    apiRequest("GET", `/api/articles/${articleId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.summary) {
          setSummaryText(data.summary);
        } else {
          summarizeMutation.mutate();
        }
      });
  }

  return (
    <div className="space-y-4">
      {/* Reader toolbar */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-xs gap-1.5 text-muted-foreground"
          data-testid="button-back"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to feed
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSummarize}
            disabled={summarizeMutation.isPending}
            className="text-xs gap-1.5"
            data-testid="button-summarize"
          >
            {summarizeMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Summarize
          </Button>
          <a
            href={articleMeta.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5"
              data-testid="button-open-original"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Original
            </Button>
          </a>
        </div>
      </div>

      {/* AI Summary (collapsible) */}
      {showSummary && (
        <Card className="bg-primary/5 border-primary/20 overflow-hidden">
          <div className="px-4 py-2 border-b border-primary/10 flex items-center justify-between">
            <span className="text-[11px] text-primary tracking-wide uppercase flex items-center gap-1.5 font-medium">
              <Sparkles className="h-3 w-3" />
              AI Summary
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-muted-foreground"
              onClick={() => setShowSummary(false)}
              data-testid="button-close-summary"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="px-4 py-3">
            {!summaryText && summarizeMutation.isPending ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-primary">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generating summary...
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            ) : summarizeMutation.isError && !summaryText ? (
              <p className="text-xs text-destructive">
                {summarizeMutation.error?.message ||
                  "Failed to generate summary."}
              </p>
            ) : summaryText ? (
              <div className="text-xs text-foreground/90 leading-relaxed space-y-1">
                {summaryText.split("\n").map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;
                  if (
                    trimmed.startsWith("- ") ||
                    trimmed.startsWith("• ")
                  ) {
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-2 py-0.5"
                      >
                        <span className="text-primary mt-px shrink-0">
                          ›
                        </span>
                        <span>{trimmed.slice(2)}</span>
                      </div>
                    );
                  }
                  return (
                    <p key={i} className="py-0.5">
                      {trimmed}
                    </p>
                  );
                })}
              </div>
            ) : null}
          </div>
        </Card>
      )}

      {/* Article content */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="p-5 sm:p-6">
          {contentLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
              <div className="space-y-2 mt-6">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-base sm:text-lg font-bold text-foreground leading-snug mb-3">
                {content?.title || articleMeta.title}
              </h1>
              <div className="flex items-center gap-3 mb-5 text-[11px] text-muted-foreground">
                <SourceBadge source={articleMeta.source} />
                {content?.author && (
                  <>
                    <span>·</span>
                    <span>{content.author}</span>
                  </>
                )}
                {articleMeta.publishedAt && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {timeAgo(articleMeta.publishedAt)}
                    </span>
                  </>
                )}
                <Badge
                  variant="secondary"
                  className={`text-[9px] h-4 px-1.5 border-0 ${
                    articleMeta.category === "security"
                      ? "bg-yellow-500/10 text-yellow-500"
                      : articleMeta.category === "military"
                        ? "bg-orange-400/10 text-orange-400"
                        : articleMeta.category === "devops"
                          ? "bg-blue-400/10 text-blue-400"
                          : articleMeta.category === "linux"
                            ? "bg-amber-400/10 text-amber-400"
                            : articleMeta.category === "personal"
                              ? "bg-rose-400/10 text-rose-400"
                              : "bg-primary/10 text-primary"
                  }`}
                >
                  {articleMeta.category === "llm" ? "ai" : articleMeta.category}
                </Badge>
              </div>

              {content?.content ? (
                <article
                  className="prose prose-invert prose-sm max-w-none
                    prose-headings:text-foreground prose-headings:font-semibold prose-headings:text-sm
                    prose-p:text-foreground/85 prose-p:text-[13px] prose-p:leading-relaxed
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-foreground
                    prose-img:rounded prose-img:border prose-img:border-border
                    prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground
                    prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px]
                    prose-pre:bg-muted prose-pre:border prose-pre:border-border
                    prose-li:text-foreground/85 prose-li:text-[13px]"
                  dangerouslySetInnerHTML={{ __html: content.content }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mb-3 opacity-20" />
                  <p className="text-xs text-center mb-3">
                    Could not extract article content.
                  </p>
                  <a
                    href={articleMeta.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs gap-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Read on {articleMeta.source}
                    </Button>
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

// ── Feed Manager Component ──
interface CustomFeed {
  id: number;
  url: string;
  name: string;
  category: string;
  created_at: string;
}

function FeedManager({ onClose }: { onClose: () => void }) {
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("personal");

  const { data: feeds, isLoading } = useQuery<CustomFeed[]>({
    queryKey: ["/api/feeds/custom"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/feeds/custom");
      return res.json();
    },
  });

  const addFeedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/feeds/custom", {
        url: newUrl,
        name: newName,
        category: newCategory,
      });
      return res.json();
    },
    onSuccess: () => {
      setNewUrl("");
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/custom"] });
    },
  });

  const removeFeedMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/feeds/custom/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/custom"] });
    },
  });

  return (
    <Card className="bg-card border-border overflow-hidden mb-4">
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground tracking-wide uppercase flex items-center gap-1.5">
          <Settings className="h-3 w-3" />
          Manage Personal Feeds
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={onClose}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="p-4 space-y-4">
        {/* Add new feed */}
        <div className="space-y-2">
          <span className="text-[10px] text-muted-foreground tracking-widest uppercase">
            Add RSS Feed
          </span>
          <div className="flex gap-2">
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              className="text-xs h-8 bg-background"
              data-testid="input-feed-url"
            />
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Feed name"
              className="text-xs h-8 bg-background w-40"
              data-testid="input-feed-name"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="text-xs h-8 bg-background border border-border rounded px-2 text-foreground"
            >
              <option value="personal">Personal</option>
              <option value="security">Security</option>
              <option value="llm">AI</option>
              <option value="military">Military</option>
              <option value="devops">DevOps</option>
              <option value="linux">Linux</option>
            </select>
            <Button
              size="sm"
              className="h-8 text-xs gap-1"
              disabled={!newUrl.trim() || !newName.trim() || addFeedMutation.isPending}
              onClick={() => addFeedMutation.mutate()}
              data-testid="button-add-feed"
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>
          {addFeedMutation.isError && (
            <p className="text-[10px] text-destructive">
              {addFeedMutation.error?.message || "Failed to add feed"}
            </p>
          )}
        </div>

        {/* Feed list */}
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground tracking-widest uppercase">
            Your Feeds ({feeds?.length || 0})
          </span>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : feeds && feeds.length > 0 ? (
            <div className="space-y-1">
              {feeds.map((feed) => (
                <div
                  key={feed.id}
                  className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/30 border border-border"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Rss className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-xs text-foreground truncate">
                      {feed.name}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[9px] h-4 px-1.5 border-0 shrink-0"
                    >
                      {feed.category}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFeedMutation.mutate(feed.id)}
                    data-testid={`button-remove-feed-${feed.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground py-2">
              No custom feeds yet. Add an RSS feed URL above.
            </p>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground italic">
          After adding feeds, click Refresh to fetch articles. Custom feeds are included in the "Personal" tab and "All".
        </p>
      </div>
    </Card>
  );
}

// ── Main Page ──
export default function Home() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [readingArticleId, setReadingArticleId] = useState<number | null>(
    null,
  );
  const [showFeedManager, setShowFeedManager] = useState(false);

  const [refreshError, setRefreshError] = useState<string | null>(null);

  const refreshMutation = useMutation({
    mutationFn: async () => {
      setRefreshError(null);
      const res = await apiRequest("POST", "/api/feeds/refresh");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      if (data.fetched === 0) {
        setRefreshError(
          "All feeds timed out. Check your network or try again.",
        );
      }
    },
    onError: (err: Error) => {
      setRefreshError(err.message || "Failed to refresh feeds");
    },
  });

  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
    staleTime: 60000,
  });

  useEffect(() => {
    refreshMutation.mutate();
  }, []);

  const filteredArticles = articles?.filter((a) =>
    activeTab === "all" ? true : a.category === activeTab,
  );

  const readingArticleMeta = articles?.find((a) => a.id === readingArticleId);

  // If reading an article, show the reader
  if (readingArticleId && readingArticleMeta) {
    return (
      <div className="min-h-screen bg-background scanlines">
        <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <h1 className="text-sm font-bold tracking-tight">
                <span className="text-primary">$</span> linux-feed
              </h1>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <ArticleReader
            articleId={readingArticleId}
            articleMeta={readingArticleMeta}
            onBack={() => setReadingArticleId(null)}
          />
        </div>
        <footer className="border-t border-border mt-8 py-4 text-center">
          <PerplexityAttribution />
        </footer>
      </div>
    );
  }

  // Feed list view
  return (
    <div className="min-h-screen bg-background scanlines">
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <h1 className="text-sm font-bold tracking-tight">
                <span className="text-primary">$</span> linux-feed
              </h1>
            </div>
            <span className="text-[10px] text-muted-foreground tracking-widest uppercase hidden sm:inline">
              security + devops + military + ai
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/assistant")}
              className="text-xs gap-1.5"
              data-testid="button-assistant"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">AI Assistant</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              data-testid="button-refresh"
              className="text-xs gap-1.5"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="bg-card border border-border h-8 flex-wrap">
            <TabsTrigger
              value="all"
              className="text-xs h-6 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              data-testid="tab-all"
            >
              <Rss className="h-3 w-3 mr-1.5" />
              All
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="text-xs h-6 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              data-testid="tab-security"
            >
              <Shield className="h-3 w-3 mr-1.5" />
              Security
            </TabsTrigger>
            <TabsTrigger
              value="llm"
              className="text-xs h-6 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              data-testid="tab-llm"
            >
              <Brain className="h-3 w-3 mr-1.5" />
              AI
            </TabsTrigger>
            <TabsTrigger
              value="military"
              className="text-xs h-6 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              data-testid="tab-military"
            >
              <Swords className="h-3 w-3 mr-1.5" />
              Military
            </TabsTrigger>
            <TabsTrigger
              value="devops"
              className="text-xs h-6 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              data-testid="tab-devops"
            >
              <Wrench className="h-3 w-3 mr-1.5" />
              DevOps
            </TabsTrigger>
            <TabsTrigger
              value="linux"
              className="text-xs h-6 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              data-testid="tab-linux"
            >
              <MonitorSmartphone className="h-3 w-3 mr-1.5" />
              Linux
            </TabsTrigger>
            <TabsTrigger
              value="personal"
              className="text-xs h-6 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              data-testid="tab-personal"
            >
              <User className="h-3 w-3 mr-1.5" />
              Personal
            </TabsTrigger>
          </TabsList>
          {activeTab === "personal" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFeedManager(!showFeedManager)}
              className="text-xs gap-1.5 ml-2"
              data-testid="button-manage-feeds"
            >
              <Settings className="h-3 w-3" />
              Manage
            </Button>
          )}
        </Tabs>

        {showFeedManager && activeTab === "personal" && (
          <FeedManager onClose={() => setShowFeedManager(false)} />
        )}

        {refreshError && (
          <div className="mb-4 px-3 py-2 rounded border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
            <span>&#x26A0;</span>
            <span>{refreshError}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-5 text-[10px] text-destructive hover:text-destructive"
              onClick={() => refreshMutation.mutate()}
              data-testid="button-retry"
            >
              Retry
            </Button>
          </div>
        )}

        <Card className="bg-card border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground tracking-wide uppercase">
              Feed
            </span>
            <span className="text-[11px] text-muted-foreground">
              {filteredArticles?.length || 0} articles
            </span>
          </div>
          <ScrollArea className="h-[calc(100vh-180px)]">
            {isLoading || refreshMutation.isPending ? (
              <div>
                {Array.from({ length: 10 }).map((_, i) => (
                  <ArticleSkeleton key={i} />
                ))}
              </div>
            ) : filteredArticles && filteredArticles.length > 0 ? (
              filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="p-3 border-b border-border transition-colors cursor-pointer hover:bg-accent/50"
                  onClick={() => setReadingArticleId(article.id)}
                  data-testid={`article-card-${article.id}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">
                      {article.category === "security" ? (
                        <Shield className="h-3.5 w-3.5 text-yellow-500/80" />
                      ) : article.category === "military" ? (
                        <Swords className="h-3.5 w-3.5 text-orange-400/80" />
                      ) : article.category === "devops" ? (
                        <Wrench className="h-3.5 w-3.5 text-blue-400/80" />
                      ) : article.category === "linux" ? (
                        <MonitorSmartphone className="h-3.5 w-3.5 text-amber-400/80" />
                      ) : article.category === "personal" ? (
                        <User className="h-3.5 w-3.5 text-rose-400/80" />
                      ) : (
                        <Brain className="h-3.5 w-3.5 text-primary/80" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-medium leading-snug text-foreground line-clamp-2">
                        {article.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <SourceBadge source={article.source} />
                        {article.publishedAt && (
                          <>
                            <span className="text-[10px] text-muted-foreground">
                              ·
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {timeAgo(article.publishedAt)}
                            </span>
                          </>
                        )}
                        {article.hasSummary && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] h-4 px-1.5 bg-primary/10 text-primary border-0"
                          >
                            summarized
                          </Badge>
                        )}
                      </div>
                      {article.snippet && (
                        <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                          {article.snippet}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Rss className="h-8 w-8 mb-3 opacity-30" />
                <p className="text-xs">No articles yet</p>
                <p className="text-[10px] mt-1">
                  Click refresh to fetch feeds
                </p>
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>

      <footer className="border-t border-border mt-8 py-4 text-center">
        <PerplexityAttribution />
      </footer>
    </div>
  );
}
