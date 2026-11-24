.PHONY: up down build logs test clean

# Start both services locally via Docker Compose
up:
	docker-compose up -d --build

# Stop both services and tear down containers
down:
	docker-compose down

# Rebuild containers
build:
	docker-compose build

# Stream container logs
logs:
	docker-compose logs -f

# Run automated backend test suite
test:
	pytest backend/tests -v

# Clean docker volumes and cached containers
clean:
	docker-compose down -v --remove-orphans
