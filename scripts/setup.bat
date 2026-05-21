@echo off
chcp 65001 >nul
title AI Company 一键部署

echo ========================================
echo   AI Company 框架 - 一键部署
echo ========================================
echo.

:: 检测 Docker
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到 Docker Desktop
    echo 请先安装 Docker Desktop: https://www.docker.com/products/docker-desktop/
    echo 安装完成后重新运行此脚本
    pause
    exit /b 1
)

echo [1/3] 检测 Docker 运行状态...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] Docker Desktop 未运行
    echo 请启动 Docker Desktop 后重试
    pause
    exit /b 1
)

echo [2/3] 启动 AI Company 服务...
docker compose -f docker/docker-compose.aicompany.yml up -d --build

echo [3/3] 等待服务就绪...
:waitloop
timeout /t 3 /nobreak >nul
docker compose -f docker/docker-compose.aicompany.yml exec server curl -s http://localhost:3100/api/health >nul 2>&1
if errorlevel 1 goto waitloop

echo.
echo ========================================
echo   部署完成！
echo.
echo   访问地址: http://localhost:3100
echo   项目路径: %~dp0projects
echo ========================================
pause
