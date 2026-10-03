$ErrorActionPreference = 'Stop'
$root = (Get-Item (Join-Path $PSScriptRoot '..')).FullName
$dest = Join-Path $root 'POS_Barberia_Software.zip'

if (Test-Path $dest) {
    Remove-Item $dest -Force
}

$stagingDir = Join-Path $env:TEMP 'pos_barberia_staging'
if (Test-Path $stagingDir) {
    Remove-Item $stagingDir -Recurse -Force
}
New-Item -ItemType Directory -Path $stagingDir | Out-Null

$files = Get-ChildItem -Path $root -Recurse -File | Where-Object {
    $_.FullName -notmatch '\\node_modules(\\|$)' -and
    $_.FullName -notmatch '\\\.git(\\|$)' -and
    $_.FullName -notmatch '\\dist(\\|$)' -and
    $_.FullName -notmatch '\.zip$' -and
    $_.FullName -notmatch '\.db$' -and
    $_.FullName -notmatch '\.db-journal$'
}

foreach ($f in $files) {
    $rel = $f.FullName.Substring($root.Length + 1)
    $targetFile = Join-Path $stagingDir $rel
    $targetDir = Split-Path $targetFile -Parent
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    Copy-Item $f.FullName -Destination $targetFile -Force
}

Compress-Archive -Path "$stagingDir\*" -DestinationPath $dest -Force
Remove-Item $stagingDir -Recurse -Force

Write-Host "ZIP generado con éxito en: $dest (Tamaño: $((Get-Item $dest).Length) bytes)"
