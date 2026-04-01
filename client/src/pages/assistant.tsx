import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  ChevronDown,
  ChevronUp,
  Settings2,
  Save,
  Play,
  Database,
  Cloud,
  ShieldCheck,
  Code2,
  GitBranch,
  Github,
  Server,
  Network,
  ShoppingCart,
  Search,
  Tag,
  FileCheck,
  SpellCheck,
  Languages,
  Palette,
  Wand2,
} from "lucide-react";

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
    title: "Containers & Orchestration",
    templates: [
      {
        id: "dockerfile",
        label: "Dockerfile",
        icon: Box,
        color: "text-blue-400",
        placeholder: "Node.js 22 app with pnpm, multi-stage build, non-root user",
        description: "Generate a production-ready multi-stage Dockerfile",
      },
      {
        id: "compose",
        label: "Compose",
        icon: Layers,
        color: "text-purple-400",
        placeholder: "Nginx proxy, Python API, PostgreSQL with migrations",
        description: "Generate docker-compose.yml with volumes & networks",
      },
      {
        id: "helm",
        label: "Helm Chart",
        icon: Ship,
        color: "text-cyan-400",
        placeholder: "App with ingress, horizontal pod autoscaling, and secret management",
        description: "Generate Kubernetes Helm chart templates",
      },
    ],
  },
  {
    title: "Infrastructure as Code",
    templates: [
      {
        id: "terraform",
        label: "Terraform",
        icon: Code2,
        color: "text-indigo-400",
        placeholder: "S3 bucket with versioning and encryption, OIDC provider for GitHub",
        description: "Generate HCL code for cloud resources",
      },
      {
        id: "ansible",
        label: "Ansible",
        icon: Server,
        color: "text-red-400",
        placeholder: "Playbook to install and harden Nginx on Ubuntu 24.04",
        description: "Generate Ansible playbooks or roles",
      },
    ],
  },
  {
    title: "Cloud Architecture",
    templates: [
      {
        id: "aws_architect",
        label: "AWS Expert",
        icon: Cloud,
        color: "text-orange-400",
        placeholder: "Serverless web app with API Gateway, Lambda, and DynamoDB",
        description: "Design highly available AWS infrastructure",
      },
      {
        id: "gcp_architect",
        label: "GCP Expert",
        icon: Cloud,
        color: "text-sky-400",
        placeholder: "Scalable GKE cluster with Cloud SQL and GCS storage",
        description: "Design secure Google Cloud architecture",
      },
      {
        id: "azure_architect",
        label: "Azure Expert",
        icon: Cloud,
        color: "text-blue-500",
        placeholder: "Azure App Service with SQL Database and Key Vault",
        description: "Design enterprise Azure solutions",
      },
    ],
  },
  {
    title: "Databases & Scrapers",
    templates: [
      {
        id: "sql",
        label: "SQL Expert",
        icon: Database,
        color: "text-green-500",
        placeholder: "Complex JOIN query for sales reporting by region and date",
        description: "Generate optimized SQL queries and schemas",
      },
      {
        id: "scraper_python",
        label: "Python",
        icon: FileCode,
        color: "text-yellow-400",
        placeholder: "Scrape product prices with error handling and JSON output",
        description: "Python scraper with BeautifulSoup",
      },
      {
        id: "scraper_go",
        label: "Go",
        icon: FileCode,
        color: "text-sky-400",
        placeholder: "Fast scraper using Colly for recursive site crawling",
        description: "High-performance Go scraper",
      },
    ],
  },
  {
    title: "CI/CD & Security",
    templates: [
      {
        id: "gitlab_expert",
        label: "GitLab CI",
        icon: GitBranch,
        color: "text-orange-500",
        placeholder: "Pipeline with component catalog and Vault integration",
        description: "Advanced GitLab CI/CD configurations",
      },
      {
        id: "github_actions_expert",
        label: "GH Actions",
        icon: Github,
        color: "text-slate-300",
        placeholder: "Reusable workflow with OIDC for AWS deployment",
        description: "Modern GitHub Actions workflows",
      },
      {
        id: "container_security",
        label: "Sec Expert",
        icon: ShieldCheck,
        color: "text-red-500",
        placeholder: "Harden K8s deployment: non-root, seccomp, and network policy",
        description: "Container and Kubernetes security hardening",
      },
    ],
  },
  {
    title: "Databases & Scrapers",
    templates: [
      {
        id: "scraper_node",
        label: "Node/TS",
        icon: FileCode,
        color: "text-green-400",
        placeholder: "Scrape news headlines and output as JSON array",
        description: "TypeScript scraper with cheerio",
      },
      {
        id: "scraper_bash",
        label: "Bash",
        icon: FileCode,
        color: "text-orange-400",
        placeholder: "Scrape SSL certificate expiry dates from a list of domains",
        description: "Bash scraper with curl + jq",
      },
    ],
  },
  {
    title: "Writing & Language Tools",
    templates: [
      {
        id: "grammar_check",
        label: "Grammar",
        icon: FileCheck,
        color: "text-emerald-400",
        placeholder: "Paste your text here to check for grammar and punctuation errors",
        description: "Fix grammar, punctuation, and sentence structure",
      },
      {
        id: "spelling_check",
        label: "Spelling",
        icon: SpellCheck,
        color: "text-teal-400",
        placeholder: "Paste your text here to check for spelling errors",
        description: "Catch typos, homophones, and misspellings",
      },
      {
        id: "translate",
        label: "Translate",
        icon: Languages,
        color: "text-violet-400",
        placeholder: "Paste text in English or French to translate to the other language",
        description: "EN ↔ FR translation (Canadian French)",
      },
      {
        id: "tone_rewrite",
        label: "Tone",
        icon: Palette,
        color: "text-pink-400",
        placeholder: "Rewrite this in a professional tone: hey dude the server is down again lol",
        description: "Rewrite text to match any tone (professional, casual, formal)",
      },
      {
        id: "text_improve",
        label: "Improve",
        icon: Wand2,
        color: "text-amber-400",
        placeholder: "Paste your text to improve clarity, structure, and readability",
        description: "Full rewrite for clarity, structure, and flow",
      },
    ],
  },
  {
    title: "Shopping Assistant",
    templates: [
      {
        id: "shopping_expert",
        label: "Shopping Expert",
        icon: ShoppingCart,
        color: "text-rose-400",
        placeholder: "Find a second-hand MacBook Pro 14 M3 at the best price",
        description: "Deal hunter for Kijiji, FB Marketplace, and more",
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
  const [showPromptLab, setShowPromptLab] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState("");

  const { data: prompts } = useQuery<any>({
    queryKey: ["/api/prompts"],
  });

  const savePromptsMutation = useMutation({
    mutationFn: async (newPrompts: any) => {
      const res = await apiRequest("POST", "/api/prompts", newPrompts);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
    },
  });

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
          <div className="flex items-center gap-2">
            <Button
              variant={showPromptLab ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowPromptLab(!showPromptLab)}
              className="text-xs gap-1.5 text-muted-foreground"
              data-testid="button-prompt-lab"
            >
              <Settings2 className={`h-3.5 w-3.5 ${showPromptLab ? "text-primary animate-pulse" : ""}`} />
              Prompt Lab
            </Button>
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
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {showPromptLab ? (
          <div className="space-y-6 mb-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-primary" />
                  Prompt Engineering Lab
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Modify the instructions for your AI models. Changes save directly to <code>prompts.yaml</code>.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPromptLab(false)}
                className="text-xs"
              >
                Close Lab
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-1 space-y-2">
                <span className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2 block">
                  Select System Prompt
                </span>
                <Button
                  variant={selectedTemplate === "summarization" ? "secondary" : "ghost"}
                  className="w-full justify-start text-[11px] h-8 gap-2"
                  onClick={() => {
                    setSelectedTemplate("summarization");
                    setEditingPrompt(prompts?.summarization?.system || "");
                    setShowPrompt(false);
                  }}
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                  Summarizer
                </Button>
                {TEMPLATE_GROUPS.flatMap(g => g.templates).map(t => (
                  <Button
                    key={t.id}
                    variant={selectedTemplate === t.id ? "secondary" : "ghost"}
                    className="w-full justify-start text-[11px] h-8 gap-2"
                    onClick={() => {
                      setSelectedTemplate(t.id);
                      setEditingPrompt(prompts?.assistant?.[t.id] || "");
                      setShowPrompt(false);
                    }}
                  >
                    <t.icon className={`h-3 w-3 ${t.color}`} />
                    {t.label}
                  </Button>
                ))}
              </div>

              <div className="lg:col-span-3">
                {selectedTemplate ? (
                  <Card className="p-4 bg-card border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground tracking-wide uppercase">
                        Instructions for: <span className="text-primary">{selectedTemplate}</span>
                      </span>
                      <Button
                        size="sm"
                        className="h-7 text-[10px] gap-1.5"
                        onClick={() => {
                          const newPrompts = { ...prompts };
                          if (selectedTemplate === "summarization") {
                            newPrompts.summarization.system = editingPrompt;
                          } else {
                            if (!newPrompts.assistant) newPrompts.assistant = {};
                            newPrompts.assistant[selectedTemplate] = editingPrompt;
                          }
                          savePromptsMutation.mutate(newPrompts);
                        }}
                        disabled={savePromptsMutation.isPending}
                      >
                        {savePromptsMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        Save to prompts.yaml
                      </Button>
                    </div>
                    <Textarea
                      value={editingPrompt}
                      onChange={(e) => setEditingPrompt(e.target.value)}
                      className="min-h-[300px] bg-background border-border text-[12px] font-mono resize-none leading-relaxed"
                      spellCheck={false}
                    />
                    <p className="text-[10px] text-muted-foreground italic flex items-center gap-1.5">
                      <Sparkles className="h-2.5 w-2.5" />
                      Tip: Changes take effect immediately after saving. No restart required.
                    </p>
                  </Card>
                ) : (
                  <div className="h-[400px] flex flex-col items-center justify-center border border-dashed border-border rounded-lg bg-muted/5">
                    <Settings2 className="h-8 w-8 mb-3 text-muted-foreground/20" />
                    <p className="text-xs text-muted-foreground">Select a prompt template to start engineering</p>
                  </div>
                )}
              </div>
            </div>
            <div className="border-t border-border pt-6" />
          </div>
        ) : null}
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
                        setShowPrompt(false);
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

              {/* Prompt Engineering Section */}
              <div className="border border-border rounded overflow-hidden">
                <button
                  onClick={() => setShowPrompt(!showPrompt)}
                  className="w-full flex items-center justify-between px-3 py-1.5 bg-muted/50 text-[10px] text-muted-foreground hover:bg-muted transition-colors"
                >
                  <span className="flex items-center gap-1.5 uppercase tracking-wide">
                    <Terminal className="h-3 w-3" />
                    System Prompt Configuration
                  </span>
                  {showPrompt ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
                {showPrompt && (
                  <div className="p-3 bg-muted/20 border-t border-border">
                    <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed italic">
                      This is the prompt being sent to the AI. You can modify it in <code>prompts.yaml</code>.
                    </p>
                    <pre className="text-[9px] font-mono text-muted-foreground/80 whitespace-pre-wrap break-words bg-background/50 p-2 rounded border border-border/50 max-h-[150px] overflow-y-auto">
                      {prompts?.assistant?.[activeTemplate.id] || "Loading system prompt..."}
                    </pre>
                  </div>
                )}
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
                  <div className="p-4 prose prose-invert prose-sm max-w-none prose-pre:p-0 prose-pre:bg-transparent">
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>
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
