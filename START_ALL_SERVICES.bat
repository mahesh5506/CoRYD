@echo off
REM Carpool Application - Start All Services
REM This script starts all microservices and the frontend

setlocal enabledelayedexpansion

cd /d C:\Users\kanch\Downloads\carpoolApp

echo.
echo ========================================
echo  CARPOOL APP - STARTING ALL SERVICES
echo ========================================
echo.
echo Frontend will run on: http://localhost:3002
echo API Gateway will run on: http://localhost:8080
echo.

REM Define services
set services=^
EurekaServer^
ApiGateway^
user-service^
ride-services^
matching-service^
notification^
payment

REM Start Eureka Server first (dependency for others)
echo [1/8] Starting Eureka Server...
start "Eureka Server" cmd /k "cd backend_carpool\EurekaServer && mvn spring-boot:run"
timeout /t 5 /nobreak

REM Start other microservices
echo [2/8] Starting API Gateway...
start "API Gateway" cmd /k "cd backend_carpool\ApiGateway && mvn spring-boot:run"
timeout /t 3 /nobreak

echo [3/8] Starting User Service...
start "User Service" cmd /k "cd backend_carpool\user-service && mvn spring-boot:run"
timeout /t 2 /nobreak

echo [4/8] Starting Ride Service...
start "Ride Service" cmd /k "cd backend_carpool\ride-services && mvn spring-boot:run"
timeout /t 2 /nobreak

echo [5/8] Starting Matching Service...
start "Matching Service" cmd /k "cd backend_carpool\matching-service && mvn spring-boot:run"
timeout /t 2 /nobreak

echo [6/8] Starting Notification Service...
start "Notification Service" cmd /k "cd backend_carpool\notification && mvn spring-boot:run"
timeout /t 2 /nobreak

echo [7/8] Starting Payment Service...
start "Payment Service" cmd /k "cd backend_carpool\payment && mvn spring-boot:run"
timeout /t 2 /nobreak

echo [8/8] Starting Frontend (React)...
start "Frontend" cmd /k "cd carpool-frontend && npm install && npm run dev"

echo.
echo ========================================
echo  ALL SERVICES STARTED
echo ========================================
echo.
echo Services Status:
echo   [✓] Eureka Server:     http://localhost:8761
echo   [✓] API Gateway:       http://localhost:8080
echo   [✓] User Service:      http://localhost:8081
echo   [✓] Ride Service:      http://localhost:8082
echo   [✓] Matching Service:  http://localhost:8083
echo   [✓] Notification Svc:  http://localhost:8084
echo   [✓] Payment Service:   http://localhost:8085
echo   [✓] Frontend (React):  http://localhost:3002
echo.
echo Wait 30-45 seconds for all services to fully initialize...
echo.
pause
