# Switch to New Multi-Source Exchange Rate Service
# Run this script to replace the old service with the new one

Write-Host "`n🔄 Switching to Multi-Source Exchange Rate Service..." -ForegroundColor Cyan
Write-Host "=" * 60

# Backup old service
$oldService = "c:\Users\Admin\Desktop\catalyst-project\backend\src\services\exchange-rate.service.ts"
$backupService = "c:\Users\Admin\Desktop\catalyst-project\backend\src\services\exchange-rate.service.ts.backup"
$newService = "c:\Users\Admin\Desktop\catalyst-project\backend\src\services\exchange-rate-multi-source.service.ts"

# Check if files exist
if (-not (Test-Path $newService)) {
    Write-Host "❌ New service not found: $newService" -ForegroundColor Red
    exit 1
}

# Backup old service
Write-Host "`n📦 Backing up old service..." -ForegroundColor Yellow
if (Test-Path $oldService) {
    Copy-Item $oldService $backupService -Force
    Write-Host "   ✅ Backup created: exchange-rate.service.ts.backup" -ForegroundColor Green
}

# Read new service and update export name
Write-Host "`n✏️  Updating export name..." -ForegroundColor Yellow
$content = Get-Content $newService -Raw
$updatedContent = $content -replace 'export const multiSourceExchangeRateService', 'export const exchangeRateService'

# Write to old service location
Set-Content $oldService $updatedContent -NoNewline

Write-Host "   ✅ Export renamed: multiSourceExchangeRateService → exchangeRateService" -ForegroundColor Green

# Delete the multi-source file (now replaced)
Remove-Item $newService -Force
Write-Host "   ✅ Removed old multi-source file" -ForegroundColor Green

# Run tests to verify
Write-Host "`n🧪 Running tests to verify..." -ForegroundColor Yellow
cd "c:\Users\Admin\Desktop\catalyst-project\backend"
npm run test:exchange-rate

Write-Host "`n" + "=" * 60
Write-Host "✅ Service upgrade complete!" -ForegroundColor Green
Write-Host "`nThe new exchange rate service is now active with:" -ForegroundColor Cyan
Write-Host "  • CoinGecko API for ADA prices (free)" -ForegroundColor White
Write-Host "  • ExchangeRate-API for USD/NGN rates (free)" -ForegroundColor White
Write-Host "  • Automatic fallback to multiple sources" -ForegroundColor White
Write-Host "  • Manual override support via .env" -ForegroundColor White
Write-Host "`nBackup of old service: exchange-rate.service.ts.backup" -ForegroundColor Gray
Write-Host ""
