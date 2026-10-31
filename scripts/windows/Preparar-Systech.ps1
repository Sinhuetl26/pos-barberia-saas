param(
    [ValidateRange(0,120)][int]$MinutosDespierta = 0,
    [switch]$AbrirApp,
    [ValidatePattern('^[A-Za-z0-9_.!\-]+$')][string]$AppId = 'OpenAI.Codex_2p2nqsd0c76g0!App'
)
$ErrorActionPreference = 'Stop'
$proyectoSystech = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$registroSystech = Join-Path $proyectoSystech '.tools\windows-preparacion'
New-Item -ItemType Directory -Path $registroSystech -Force | Out-Null
$eventoSystech = [ordered]@{
    fecha = [DateTimeOffset]::Now.ToString('o')
    proyectoDisponible = Test-Path -LiteralPath (Join-Path $proyectoSystech 'package.json')
    aperturaSolicitada = [bool]$AbrirApp
    minutosDespierta = $MinutosDespierta
    estado = 'iniciando'
    aviso = 'Preparar Windows no inicia trabajo del chat. Requiere una tarea independiente en la app.'
}
$archivoSystech = Join-Path $registroSystech 'ultimo-resultado.json'
function Guardar-RegistroSystech { $eventoSystech | ConvertTo-Json | Set-Content -LiteralPath $archivoSystech -Encoding UTF8 }
try {
    if (-not $eventoSystech.proyectoDisponible) { throw 'No se encuentra el proyecto esperado.' }
    if ($AbrirApp) {
        Start-Process -FilePath (Join-Path $env:WINDIR 'explorer.exe') -ArgumentList "shell:AppsFolder\$AppId" -WindowStyle Hidden
        $eventoSystech['apertura'] = 'Solicitud enviada a Windows; no confirma sesion ni app lista.'
    }
    $eventoSystech.estado = 'preparacion_iniciada'
    Guardar-RegistroSystech
    if ($MinutosDespierta -gt 0) {
        Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class SystechPreparacionEnergia {
    [DllImport("kernel32.dll", SetLastError=true)]
    public static extern uint SetThreadExecutionState(uint flags);
}
'@
        $resultadoEnergiaSystech = [SystechPreparacionEnergia]::SetThreadExecutionState([uint32]2147483649)
        if ($resultadoEnergiaSystech -eq 0) { throw 'Windows rechazo mantener el sistema despierto.' }
        try {
            $finSystech = (Get-Date).AddMinutes($MinutosDespierta)
            while ((Get-Date) -lt $finSystech) { Start-Sleep -Seconds 15 }
        } finally { [void][SystechPreparacionEnergia]::SetThreadExecutionState([uint32]2147483648) }
    }
    $eventoSystech.estado = 'completado'
    Guardar-RegistroSystech
} catch {
    $eventoSystech.estado = 'fallido'
    $eventoSystech['error'] = $_.Exception.Message
    Guardar-RegistroSystech
    throw
}
