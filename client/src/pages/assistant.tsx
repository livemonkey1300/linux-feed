import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Terminal,
  Loader2,
  Copy,
  Check,
  Box,
  Layers,
  Ship,
  Globe,
  FileCode,
  Workflow,
  Sparkles,
} from "lucide-react";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

interface Template {
  id: string;
  label: string;
  icon: typeof Box;
  color: string;
  placeholder: string;
  description: string;
}

const TEMPLATE_GROUPS = [
  {
    title: "Containers",
    templates: [
      {
        id: "dockerfile",
        label: "Dockerfile",
        icon: Box,
        color: "text-blue-400",
        placeholder:
          "Node.js 20 app with npm ci, multi-stage build, runs on port 3000, uses alpine",
        description: "Generate a production-ready multi-stage Dockerfile",
      },
      {
        id: "compose",
        label: "Compose",
        icon: Layers,
        color: "text-purple-400",
        placeholder:
          "A stack with nginx reverse proxy, Node.js API, PostgreSQL, and Redis. API connects to both DB and cache.",
        description: "Generate a docker-compose.yml with networking and volumes",
      },
      {
        id: "helm",
        label: "Helm Chart",
        icon: Ship,
        color: "text-cyan-400",
        placeholder:
          "Convert my compose with nginx + api + postgres into Helm templates with configurable replicas and resource limits",
        description:
          "Generate Kubernetes Helm chart templates from a description",
      },
    ],
  },
  {
    title: "Web Scrapers",
    templates: [
      {
        id: "scraper_python",
        label: "Python",
        icon: FileCode,
        color: "text-yellow-400",
        placeholder:
          "Scrape job listings from a careers page. Extract title, company, location, and link. Handle pagination.",
        description: "Python scraper with requests + BeautifulSoup",
      },
      {
        id: "scraper_go",
        label: "Go",
        icon: FileCode,
        color: "text-sky-400",
        placeholder:
          "Scrape product prices from an e-commerce site. Extract name, price, and availability.",
        description: "Go scraper with colly framework",
      },
      {
        id: "scraper_node",
        label: "Node/TS",
        icon: FileCode,
        color: "text-green-400",
        placeholder:
          "Scrape news headlines and summaries from a tech news site. Output as JSON array.",
        description: "TypeScript scraper with cheerio + node-fetch",
      },
      {
        id: "scraper_bash",
        label: "Bash",
        icon: FileCode,
        color: "text-orange-400",
        placeholder:
          "Scrape SSL certificate expiry dates from a list of domains. Output CSV with domain, issuer, expiry.",
        description: "Bash scraper with curl + jq",
      },
    ],
  },
  {
    title: "CI/CD",
    templates: [
      {
        id: "pipeline",
        label: "Pipeline",
        icon: Workflow,
        color: "text-primary",
        placeholder:
          "GitLab CI pipeline for a Python app: lint with ruff, test with pytest, build Docker image, push to registry, deploy to staging then production",
        description:
          "Generate CI/CD pipeline config (GitLab CI, GitHub Actions, etc.)",
      },
    ],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="text-xs gap-1.5 h-7"
      data-testid="button-copy"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-green-400" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy
        </>
      )}
    </Button>
  );
}

export default function Assistant({
  onBack,
}: {
  onBack: () => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/assistant/generate", {
        template: selectedTemplate,
        userInput,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data.result);
    },
  });

  const allTemplates = TEMPLATE_GROUPS.flatMap((g) => g.templates);
  const activeTemplate = allTemplates.find((t) => t.id === selectedTemplate);

  return (
    <div className="min-h-screen bg-background scanlines">
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <h1 className="text-sm font-bold tracking-tight">
                <span className="text-primary">$</span> linux-feed
              </h1>
            </div>
            <Badge
              variant="secondary"
              className="text-[9px] h-4 px-1.5 bg-primary/10 text-primary border-0"
            >
              AI Assistant
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-xs text-muted-foreground"
            data-testid="button-back-feed"
          >
            Back to feed
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            DevOps Code Generator
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Pick a template, describe what you need, and get production-ready
            code.
          </p>
        </div>

        {/* Template picker */}
        <div className="space-y-4 mb-6">
          {TEMPLATE_GROUPS.map((group) => (
            <div key={group.title}>
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2 block">
                {group.title}
              </span>
              <div className="flex flex-wrap gap-2">
                {group.templates.map((tmpl) => {
                  const Icon = tmpl.icon;
                  const isActive = selectedTemplate === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => {
                        setSelectedTemplate(tmpl.id);
                        setResult(null);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded border text-xs transition-colors ${
                        isActive
                          ? "bg-primary/10 border-primary/40 text-foreground"
                          : "bg-card border-border text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                      }`}
                      data-testid={`template-${tmpl.id}`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${tmpl.color}`} />
                      {tmpl.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Input + Output */}
        {selectedTemplate && activeTemplate && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Input */}
            <Card className="bg-card border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground tracking-wide uppercase">
                  Describe what you need
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {activeTemplate.description}
                </span>
              </div>
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={activeTemplate.placeholder}
                className="min-h-[200px] bg-background border-border text-xs font-mono resize-none"
                data-testid="input-description"
              />
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={
                  !userInput.trim() || generateMutation.isPending
                }
                className="w-full text-xs gap-2"
                data-testid="button-generate"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate {activeTemplate.label}
                  </>
                )}
              </Button>
              {generateMutation.isError && (
                <p className="text-[11px] text-destructive">
                  {generateMutation.error?.message || "Generation failed"}
                </p>
              )}
            </Card>

            {/* Output */}
            <Card className="bg-card border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground tracking-wide uppercase">
                  Output
                </span>
                {result && <CopyButton text={result} />}
              </div>
              <ScrollArea className="h-[400px]">
                {generateMutation.isPending ? (
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-primary">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating code...
                    </div>
                    <div className="space-y-1.5">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-3 skeleton rounded"
                          style={{
                            width: `${40 + Math.random() * 55}%`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : result ? (
                  <pre className="p-4 text-[12px] font-mono text-foreground/90 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {result}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                    <Terminal className="h-8 w-8 mb-3 opacity-20" />
                    <p className="text-xs text-center">
                      Describe your requirements and
                      <br />
                      hit Generate
                    </p>
                    <p className="text-[10px] mt-2 text-muted-foreground/60 cursor-blink">
                      awaiting input
                    </p>
                  </div>
                )}
              </ScrollArea>
            </Card>
          </div>
        )}
      </div>

      <footer className="border-t border-border mt-8 py-4 text-center">
        <PerplexityAttribution />
      </footer>
    </div>
  );
}
