.PHONY: help install dev build start clean \
       docker-build docker-up docker-down docker-logs docker-shell \
       docker-clean docker-nuke db-push docker-install

# ──────────────────────────────────────────────
#  linux-feed — Makefile
# ──────────────────────────────────────────────

APP_NAME    := linux-feed
PORT        ?= 5000

# Auto-detect: docker compose (v2 plugin) → docker-compose (standalone) → not found
ifeq ($(shell docker compose version >/dev/null 2>&1 && echo ok),ok)
  COMPOSE := docker compose
else ifeq ($(shell docker-compose version >/dev/null 2>&1 && echo ok),ok)
  COMPOSE := docker-compose
else
  COMPOSE := echo "\n  ✗ Docker is not installed.\n    Run 'make docker-install' or visit https://docs.docker.com/get-docker/\n" && exit 1; \#
endif

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ──────────────────────────────────────────────
#  Local development
# ──────────────────────────────────────────────

install: ## Install npm dependencies
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
#  Docker — install
# ──────────────────────────────────────────────

docker-install: ## Install Docker Engine + Compose (Ubuntu/Debian)
	@echo "── Installing Docker Engine ──"
	sudo apt-get update
	sudo apt-get install -y ca-certificates curl gnupg
	sudo install -m 0755 -d /etc/apt/keyrings
	curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
	sudo chmod a+r /etc/apt/keyrings/docker.gpg
	echo "deb [arch=$$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $$(. /etc/os-release && echo $$VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
	sudo apt-get update
	sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
	sudo usermod -aG docker $$USER
	@echo ""
	@echo "  ✓ Docker installed. Log out and back in (or run 'newgrp docker') for group changes to take effect."
	@echo ""

# ──────────────────────────────────────────────
#  Docker — run
# ──────────────────────────────────────────────

docker-build: ## Build the Docker image
	$(COMPOSE) build

docker-rebuild: ## Rebuild from scratch (no cache)
	$(COMPOSE) build --no-cache

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
