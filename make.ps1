param(
    [Parameter(Position=0)]
    [string]$Target = "up"
)

switch ($Target.ToLower()) {
    "up" {
        docker-compose up -d --build
    }
    "down" {
        docker-compose down
    }
    "build" {
        docker-compose build
    }
    "logs" {
        docker-compose logs -f
    }
    "test" {
        pytest backend/tests -v
    }
    "clean" {
        docker-compose down -v --remove-orphans
    }
    default {
        Write-Host "Unknown target: $Target. Available targets: up, down, build, logs, test, clean"
    }
}
