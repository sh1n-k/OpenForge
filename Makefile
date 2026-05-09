SHELL := /bin/zsh
ROOT_DIR := $(CURDIR)
JAVA_HOME ?= $(shell \
	if command -v java >/dev/null 2>&1; then \
		dirname "$$(dirname "$$(command -v java)")"; \
	elif [ -d /opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home ]; then \
		echo /opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home; \
	elif [ -d /opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home ]; then \
		echo /opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home; \
	fi)
export JAVA_HOME
export PATH := $(JAVA_HOME)/bin:$(PATH)

ROOT_ENV = set -a; [ -f $(ROOT_DIR)/.env ] && source $(ROOT_DIR)/.env; set +a
DOCKER_COMPOSE = docker compose --project-directory $(ROOT_DIR) -f $(ROOT_DIR)/infra/docker-compose.yml
LEGACY_DOCKER_COMPOSE = docker compose -p infra -f $(ROOT_DIR)/infra/docker-compose.yml

dev-db:
	$(DOCKER_COMPOSE) up -d db

dev-db-down:
	$(DOCKER_COMPOSE) down --remove-orphans
	$(LEGACY_DOCKER_COMPOSE) down --remove-orphans

dev-db-reset:
	$(DOCKER_COMPOSE) down -v --remove-orphans
	$(LEGACY_DOCKER_COMPOSE) down -v --remove-orphans

dev-api:
	cd apps/api && $(ROOT_ENV) && export API_PORT="$${API_PORT:-$${SERVER_PORT:-8080}}" SERVER_PORT="$${API_PORT}" WEB_PORT="$${WEB_PORT:-3000}" WEB_ORIGIN="$${WEB_ORIGIN:-http://127.0.0.1:$${WEB_PORT}}" && ./gradlew --no-daemon bootRun

dev-web:
	cd apps/web && $(ROOT_ENV) && export WEB_PORT="$${WEB_PORT:-$${PORT:-3000}}" PORT="$${WEB_PORT}" API_PORT="$${API_PORT:-8080}" API_BASE_URL="$${API_BASE_URL:-http://127.0.0.1:$${API_PORT}}" WEB_ORIGIN="$${WEB_ORIGIN:-http://127.0.0.1:$${WEB_PORT}}" && if [ "$${VITE_API_BASE_URL:-}" = "$${API_BASE_URL}" ]; then unset VITE_API_BASE_URL; fi && pnpm dev

check:
	cd apps/api && $(ROOT_ENV) && ./gradlew test spotlessCheck
	cd apps/web && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build

jar:
	cd apps/api && $(ROOT_ENV) && ./gradlew bootJar

smoke:
	@$(ROOT_ENV) && API_PORT="$${API_PORT:-8080}" WEB_PORT="$${WEB_PORT:-3000}" && curl -fsS "http://127.0.0.1:$${API_PORT}/api/v1/health" >/dev/null && curl -I -fsS "http://127.0.0.1:$${WEB_PORT}"
