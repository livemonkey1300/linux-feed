.PHONY: help install dev build start clean \
       docker-build docker-up docker-down docker-logs docker-shell \
       docker-clean docker-nuke db-push

# ──────────────────────────────────────────────
#  linux-feed — Makefile
# ──────────────────────────────────────────────

APP_NAME    := linux-feed
COMPOSE     := docker compose
PORT        ?= 5000

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ──────────────────────────────────────────────
#  Local development
# ──────────────────────────────────────────────

install: ## Install dependencies
	npm ci

dev: ## Start dev server (hot-reload)
	npm run dev

build: ## Build for production
	npm run build

start: build ## Build and start production server
	npm start

db-push: ## Push DB schema to SQLite
	npx drizzle-kit push

clean: ## Remove build artifacts and node_modules
	rm -rf dist node_modules .cache data.db data.db-shm data.db-wal

# ──────────────────────────────────────────────
#  Docker
# ──────────────────────────────────────────────

docker-build: ## Build the Docker image
	$(COMPOSE) build

docker-up: ## Start containers (detached)
	$(COMPOSE) up -d

docker-down: ## Stop containers
	$(COMPOSE) down

docker-logs: ## Tail container logs
	$(COMPOSE) logs -f $(APP_NAME)

docker-shell: ## Open a shell inside the running container
	docker exec -it $(APP_NAME) /bin/sh

docker-restart: ## Restart the container
	$(COMPOSE) restart $(APP_NAME)

docker-status: ## Show container status and health
	@docker ps --filter name=$(APP_NAME) --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

docker-clean: ## Stop containers and remove images
	$(COMPOSE) down --rmi local --remove-orphans

docker-nuke: ## Full teardown — containers, images, volumes, and data
	$(COMPOSE) down --rmi local --volumes --remove-orphans

# ──────────────────────────────────────────────
#  Quick combos
# ──────────────────────────────────────────────

up: docker-build docker-up ## Build image and start (one-liner)
	@echo "\n  ✓ $(APP_NAME) running at http://localhost:$(PORT)\n"

down: docker-down ## Alias for docker-down
