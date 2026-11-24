@echo off
if "%1"=="" goto up
if "%1"=="up" goto up
if "%1"=="down" goto down
if "%1"=="build" goto build
if "%1"=="logs" goto logs
if "%1"=="test" goto test
if "%1"=="clean" goto clean

echo Unknown target: %1
echo Usage: make [up^|down^|build^|logs^|test^|clean]
exit /b 1

:up
docker-compose up -d --build
exit /b 0

:down
docker-compose down
exit /b 0

:build
docker-compose build
exit /b 0

:logs
docker-compose logs -f
exit /b 0

:test
if exist "backend\.venv\Scripts\pytest.exe" (
    backend\.venv\Scripts\pytest.exe backend/tests -v
) else (
    pytest backend/tests -v
)
exit /b 0

:clean
docker-compose down -v --remove-orphans
exit /b 0
