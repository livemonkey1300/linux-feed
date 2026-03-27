# linux-feed

A terminal-themed news aggregator for Linux security and LLM/AI news, with AI-powered article summarization.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)

## What it does

- Aggregates RSS feeds from 8 reputable sources across two categories:
  - **Security** — LWN.net, BleepingComputer, The Hacker News, oss-security
  - **LLM / AI** — Google AI Blog, OpenAI Blog, MIT Technology Review, Ars Technica
- Click any article to generate a concise bullet-point summary via the Anthropic API (Gemini Flash model)
- Summaries are cached in SQLite — generated once, loaded instantly on repeat views
- Filter by category (All / Security / LLM) using the tab bar
- Each article links back to its original source

## Tech stack

| Layer     | Tech                                                  |
|-----------|-------------------------------------------------------|
| Frontend  | React 18, Tailwind CSS 3, shadcn/ui, Wouter (router) |
| Backend   | Express 5, TypeScript (tsx)                           |
| Database  | SQLite via better-sqlite3 + Drizzle ORM               |
| AI        | Anthropic SDK (`@anthropic-ai/sdk`)                   |
| RSS       | rss-parser                                            |
| Build     | Vite 7, esbuild                                       |

## Prerequisites

- **Node.js** >= 18
- **npm** (comes with Node)
- An **Anthropic API key** (or compatible proxy) — set as `ANTHROPIC_API_KEY` env var

## Getting started

### 1. Clone and install

```bash
git clone <your-repo-url> linux-feed
cd linux-feed
npm install
```

### 2. Set up environment

The summarization feature requires an Anthropic API key:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

You can also create a `.env` file in the project root (not committed to git):

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Push the database schema

This creates the SQLite database (`data.db`) and the required tables:

```bash
npm run db:push
```

### 4. Start the dev server

```bash
npm run dev
```

The app will be available at **http://localhost:5000**.

Vite handles frontend hot-reload — changes to React components appear instantly. Backend changes require a server restart.

## Production build

```bash
# Build the frontend and bundle the server
npm run build

# Start the production server
npm start
```

The production server runs on port 5000 by default.

## Docker

### Quick start with Docker Compose

```bash
# Create a .env with your API key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

# Build and start
make up

# Or without make:
docker compose up -d --build
```

The app will be running at **http://localhost:5000**. SQLite data is persisted in a Docker volume (`feed-data`).

### Docker commands

```bash
# View logs
make docker-logs

# Open a shell in the container
make docker-shell

# Stop the container
make down

# Full teardown (remove images + volumes + data)
make docker-nuke
```

### Standalone Docker (no Compose)

```bash
# Build
docker build -t linux-feed .

# Run
docker run -d \
  --name linux-feed \
  -p 5000:5000 \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  -v feed-data:/app/data \
  linux-feed
```

## Makefile reference

Run `make help` to see all targets:

| Target | Description |
|--------|-------------|
| `make install` | Install npm dependencies |
| `make dev` | Start dev server with hot-reload |
| `make build` | Build for production |
| `make start` | Build and start production server |
| `make db-push` | Push DB schema to SQLite |
| `make clean` | Remove build artifacts and node_modules |
| `make up` | Build Docker image and start container |
| `make down` | Stop container |
| `make docker-build` | Build the Docker image |
| `make docker-up` | Start containers (detached) |
| `make docker-down` | Stop containers |
| `make docker-logs` | Tail container logs |
| `make docker-shell` | Shell into running container |
| `make docker-restart` | Restart the container |
| `make docker-status` | Show container status and health |
| `make docker-clean` | Stop and remove images |
| `make docker-nuke` | Full teardown — containers, images, volumes |

## Project structure

```
linux-feed/
├── client/                  # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/ui/   # shadcn/ui components
│   │   ├── pages/
│   │   │   └── home.tsx     # Main feed + summary page
│   │   ├── lib/
│   │   │   └── queryClient.ts
│   │   ├── App.tsx          # Router setup
│   │   ├── index.css        # Tailwind + terminal theme
│   │   └── main.tsx         # Entry point
│   └── index.html
├── server/
│   ├── index.ts             # Express server entry
│   ├── routes.ts            # API routes (feeds, articles, summarize)
│   ├── storage.ts           # Database layer (Drizzle)
│   └── vite.ts              # Vite dev middleware
├── shared/
│   └── schema.ts            # DB schema + Zod types (shared frontend/backend)
├── drizzle.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

## API routes

| Method | Endpoint                        | Description                         |
|--------|---------------------------------|-------------------------------------|
| POST   | `/api/feeds/refresh`            | Fetch all RSS feeds and store new articles |
| GET    | `/api/articles`                 | List articles (optional `?category=security\|llm`) |
| GET    | `/api/articles/:id`             | Get single article with cached summary |
| POST   | `/api/articles/:id/summarize`   | Generate AI summary for an article  |

## Adding / removing feeds

Edit the `FEEDS` array in `server/routes.ts`. Each entry needs:

```typescript
{
  url: "https://example.com/feed.xml",  // RSS/Atom feed URL
  source: "Example Source",              // Display name
  category: "security",                  // "security" or "llm"
}
```

Restart the server and hit Refresh in the UI to pull from the new feed.

## License

MIT
