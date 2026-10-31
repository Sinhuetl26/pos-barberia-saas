param(
    [ValidateSet('Prueba','Programar','Consultar','Retirar')][string]$Modo = 'Consultar',
    [datetime]$Fecha,
    [ValidateRange(1,120)][int]$MinutosDespierta = 45,
    [ValidateRange(1,30)][int]$RetrasoPruebaMinutos = 1,
    [switch]$AbrirAppPrueba,
    [switch]$SoloHoraPrevista
)
$ErrorActionPreference = 'Stop'
$nombreSystech = if ($Modo -eq 'Prueba') { 'Systech-Preparacion-Prueba' } else { 'Systech-Preparacion' }
if ($Modo -eq 'Consultar') {
    Get-ScheduledTask -TaskName 'Systech-Preparacion*' -ErrorAction SilentlyContinue | Select-Object TaskName, State
    exit
}
if ($Modo -eq 'Retirar') {
    foreach ($tareaSystech in @('Systech-Preparacion-Prueba','Systech-Preparacion')) {
        if (Get-ScheduledTask -TaskName $tareaSystech -ErrorAction SilentlyContinue) {
            Unregister-ScheduledTask -TaskName $tareaSystech -Confirm:$false
        }
    }
    exit
}
if (Get-ScheduledTask -TaskName $nombreSystech -ErrorAction SilentlyContinue) {
    throw "Ya existe $nombreSystech. Revisarla antes de sustituirla."
}
if ($Modo -eq 'Prueba') { $Fecha = (Get-Date).AddMinutes($RetrasoPruebaMinutos) }
elseif (-not $PSBoundParameters.ContainsKey('Fecha') -or $Fecha -le (Get-Date)) {
    throw 'Indicar una fecha futura explicita, en la hora local de Windows.'
}
$rutaSystech = Join-Path $PSScriptRoot 'Preparar-Systech.ps1'
if ($rutaSystech.Contains('"')) { throw 'Ruta de script no admitida.' }
$argumentosSystech = '-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $rutaSystech + '"'
if ($Modo -eq 'Programar' -or $AbrirAppPrueba) { $argumentosSystech += " -AbrirApp -MinutosDespierta $MinutosDespierta" }
$comandoSystech = Get-Command pwsh.exe -ErrorAction SilentlyContinue
$ejecutableSystech = if ($comandoSystech) { $comandoSystech.Source } else { Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe' }
if (-not (Test-Path -LiteralPath $ejecutableSystech)) { throw 'No se encuentra el ejecutable de PowerShell.' }
$accionSystech = New-ScheduledTaskAction -Execute $ejecutableSystech -Argument $argumentosSystech -WorkingDirectory ([IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..')))
$disparoSystech = New-ScheduledTaskTrigger -Once -At $Fecha
$ajustesSystech = New-ScheduledTaskSettingsSet -WakeToRun -StartWhenAvailable:(-not $SoloHoraPrevista) -ExecutionTimeLimit (New-TimeSpan -Minutes ($MinutosDespierta + 5)) -MultipleInstances IgnoreNew
$usuarioSystech = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$principalSystech = New-ScheduledTaskPrincipal -UserId $usuarioSystech -LogonType Interactive -RunLevel Limited
$definicionSystech = New-ScheduledTask -Action $accionSystech -Trigger $disparoSystech -Settings $ajustesSystech -Principal $principalSystech -Description 'Prepara el equipo local para Systech. No ejecuta instrucciones de chat ni inicia desarrollo.'
Register-ScheduledTask -TaskName $nombreSystech -InputObject $definicionSystech | Select-Object TaskName, State
[pscustomobject]@{ FechaLocal = $Fecha.ToString('o'); Despertar = $true; RequiereSesionIniciada = $true; SinContraseñasGuardadas = $true; TrabajoChatProgramado = $false }
