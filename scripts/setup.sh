#!/bin/bash
set -e

echo "========================================"
echo "  AI Company 框架 - 一键部署"
echo "========================================"

if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker not found. Please install Docker first."
    exit 1
fi

echo "[1/3] Checking Docker..."
docker info > /dev/null 2>&1 || { echo "[ERROR] Docker is not running"; exit 1; }

echo "[2/3] Starting AI Company..."
docker compose -f docker/docker-compose.aicompany.yml up -d --build

echo "[3/3] Waiting for service..."
until curl -s http://localhost:3100/api/health > /dev/null 2>&1; do
    sleep 3
done

echo ""
echo "========================================"
echo "  Deployment complete!"
echo ""
echo "  URL: http://localhost:3100"
echo "========================================"
