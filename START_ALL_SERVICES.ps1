# Carpool Application - Start All Services (PowerShell)
# This script starts all microservices and the frontend

$rootPath = "C:\Users\kanch\Downloads\carpoolApp"
Set-Location $rootPath

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CARPOOL APP - STARTING ALL SERVICES" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Frontend will run on: http://localhost:3002" -ForegroundColor Yellow
Write-Host "API Gateway will run on: http://localhost:8080`n" -ForegroundColor Yellow

# Define services to start in order
$services = @(
    @{ name = "Eureka Server"; path = "backend_carpool\EurekaServer"; port = "8761"; wait = 8 },
    @{ name = "API Gateway"; path = "backend_carpool\ApiGateway"; port = "8080"; wait = 6 },
    @{ name = "User Service"; path = "backend_carpool\user-service"; port = "8081"; wait = 4 },
    @{ name = "Ride Service"; path = "backend_carpool\ride-services"; port = "8082"; wait = 4 },
    @{ name = "Matching Service"; path = "backend_carpool\matching-service"; port = "8083"; wait = 4 },
    @{ name = "Notification Service"; path = "backend_carpool\notification"; port = "8084"; wait = 4 },
    @{ name = "Payment Service"; path = "backend_carpool\payment"; port = "8085"; wait = 4 },
    @{ name = "Frontend (React)"; path = "carpool-frontend"; port = "3002"; wait = 0 }
)

$count = 1
$total = $services.Count

foreach ($service in $services) {
    Write-Host "[$count/$total] Starting $($service.name)..." -ForegroundColor Green
    
    if ($service.path -eq "carpool-frontend") {
        # Special handling for frontend
        Start-Process -FilePath "powershell" -ArgumentList "-NoExit -Command `"cd '$rootPath\$($service.path)' ; npm install ; npm run dev`"" -WindowStyle Normal
    } else {
        # Start Java services
        Start-Process -FilePath "cmd" -ArgumentList "/K cd /d $rootPath\$($service.path) && mvn spring-boot:run" -WindowStyle Normal
    }
    
    if ($service.wait -gt 0) {
        Write-Host "  Waiting $($service.wait) seconds for $($service.name) to initialize..." -ForegroundColor DarkYellow
        Start-Sleep -Seconds $service.wait
    }
    
    $count++
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ALL SERVICES STARTED" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Services Status:" -ForegroundColor White
Write-Host "  [✓] Eureka Server:     http://localhost:8761" -ForegroundColor Green
Write-Host "  [✓] API Gateway:       http://localhost:8080" -ForegroundColor Green
Write-Host "  [✓] User Service:      http://localhost:8081" -ForegroundColor Green
Write-Host "  [✓] Ride Service:      http://localhost:8082" -ForegroundColor Green
Write-Host "  [✓] Matching Service:  http://localhost:8083" -ForegroundColor Green
Write-Host "  [✓] Notification Svc:  http://localhost:8084" -ForegroundColor Green
Write-Host "  [✓] Payment Service:   http://localhost:8085" -ForegroundColor Green
Write-Host "  [✓] Frontend (React):  http://localhost:3002" -ForegroundColor Green
Write-Host "`nWait 30-45 seconds for all services to fully initialize...`n" -ForegroundColor Yellow

Read-Host "Press Enter to continue"
