import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  X,
} from "lucide-react";
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

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedArticle, setSelectedArticle] = useState<number | null>(null);
  const [summaryText, setSummaryText] = useState<string | null>(null);

  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Auto-refresh feeds on first load
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

  // Fetch articles
  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
    staleTime: 60000,
  });

  // Summarize mutation
  const summarizeMutation = useMutation({
    mutationFn: async (articleId: number) => {
      const res = await apiRequest(
        "POST",
        `/api/articles/${articleId}/summarize`,
      );
      return res.json();
    },
    onSuccess: (data) => {
      setSummaryText(data.summary);
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
    },
  });

  // Auto-refresh on mount
  useEffect(() => {
    refreshMutation.mutate();
  }, []);

  const filteredArticles = articles?.filter((a) =>
    activeTab === "all" ? true : a.category === activeTab,
  );

  const selectedArticleData = articles?.find((a) => a.id === selectedArticle);

  function handleSummarize(articleId: number) {
    setSelectedArticle(articleId);
    setSummaryText(null);
    // First try to get cached summary
    apiRequest("GET", `/api/articles/${articleId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.summary) {
          setSummaryText(data.summary);
        } else {
          summarizeMutation.mutate(articleId);
        }
      });
  }

  return (
    <div className="min-h-screen bg-background scanlines">
      {/* Header */}
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
              security + llm news
            </span>
          </div>
          <div className="flex items-center gap-2">
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

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="mb-4"
        >
          <TabsList className="bg-card border border-border h-8">
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
              LLM / AI
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Error banner */}
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

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Article list */}
          <div className="lg:col-span-3">
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
                    {Array.from({ length: 8 }).map((_, i) => (
                      <ArticleSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredArticles && filteredArticles.length > 0 ? (
                  filteredArticles.map((article) => (
                    <div
                      key={article.id}
                      className={`p-3 border-b border-border transition-colors cursor-pointer hover:bg-accent/50 ${
                        selectedArticle === article.id
                          ? "bg-accent/70"
                          : ""
                      }`}
                      onClick={() => handleSummarize(article.id)}
                      data-testid={`article-card-${article.id}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">
                          {article.category === "security" ? (
                            <Shield className="h-3.5 w-3.5 text-yellow-500/80" />
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

          {/* Summary panel */}
          <div className="lg:col-span-2">
            <Card className="bg-card border-border overflow-hidden sticky top-16">
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground tracking-wide uppercase flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  AI Summary
                </span>
                {selectedArticle && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => {
                      setSelectedArticle(null);
                      setSummaryText(null);
                    }}
                    data-testid="button-close-summary"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <div className="p-4 min-h-[300px]">
                {!selectedArticle ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <Terminal className="h-8 w-8 mb-3 opacity-20" />
                    <p className="text-xs text-center">
                      Select an article to get an
                      <br />
                      AI-powered summary
                    </p>
                    <p className="text-[10px] mt-2 text-muted-foreground/60 cursor-blink">
                      awaiting input
                    </p>
                  </div>
                ) : summarizeMutation.isPending && !summaryText ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-primary">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generating summary...
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ) : summarizeMutation.isError && !summaryText ? (
                  <div className="text-xs text-destructive">
                    Failed to generate summary. Try again.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedArticleData && (
                      <div className="space-y-2 pb-3 border-b border-border">
                        <h2 className="text-xs font-semibold text-foreground leading-snug">
                          {selectedArticleData.title}
                        </h2>
                        <div className="flex items-center gap-2">
                          <SourceBadge source={selectedArticleData.source} />
                          <a
                            href={selectedArticleData.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                            data-testid="link-article-source"
                          >
                            Read full article
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      </div>
                    )}
                    {summaryText && (
                      <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap space-y-1.5">
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
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-8 py-4 text-center">
        <PerplexityAttribution />
      </footer>
    </div>
  );
}
