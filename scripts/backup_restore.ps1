param (
    [string]$Action = "backup",
    [string]$BackupDir = ".\backups"
)

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

if ($Action -eq "backup") {
    $SqlitePath = "packages\database\prisma\dev.db"
    if (Test-Path $SqlitePath) {
        $DestFile = Join-Path $BackupDir "dev_backup_$Timestamp.db"
        Copy-Item -Path $SqlitePath -Destination $DestFile -Force
        Write-Host "[SQLite] Respaldo generado con exito en: $DestFile" -ForegroundColor Green
    } else {
        Write-Host "No se encontro la base de datos dev.db para respaldar." -ForegroundColor Yellow
    }
} elseif ($Action -eq "list") {
    Write-Host "Respaldos disponibles en $BackupDir" -ForegroundColor Cyan
    Get-ChildItem -Path $BackupDir | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
} else {
    Write-Host "Uso: .\scripts\backup_restore.ps1 -Action backup" -ForegroundColor White
}
