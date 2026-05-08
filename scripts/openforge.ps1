param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet("dev-db", "dev-db-down", "dev-api", "dev-web", "dev-all", "check", "smoke")]
    [string]$Task
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true

$RootDir = Split-Path -Parent $PSScriptRoot

function Set-EnvFromFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    Get-Content -LiteralPath $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) {
            return
        }

        $separatorIndex = $line.IndexOf("=")
        if ($separatorIndex -lt 1) {
            return
        }

        $name = $line.Substring(0, $separatorIndex).Trim()
        $value = $line.Substring($separatorIndex + 1)
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

function Get-EnvOrDefault {
    param(
        [string]$Name,
        [string]$DefaultValue
    )

    $value = [Environment]::GetEnvironmentVariable($Name, "Process")
    if ([string]::IsNullOrWhiteSpace($value)) {
        return $DefaultValue
    }

    return $value
}

function Prepend-PathIfExists {
    param([string]$PathEntry)

    if (-not $PathEntry -or -not (Test-Path -LiteralPath $PathEntry)) {
        return
    }

    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Process")
    $segments = $currentPath -split ";"
    if ($segments -contains $PathEntry) {
        return
    }

    [Environment]::SetEnvironmentVariable("PATH", "$PathEntry;$currentPath", "Process")
}

function Initialize-ToolPaths {
    $javaHomes = @(
        [Environment]::GetEnvironmentVariable("JAVA_HOME", "Machine"),
        [Environment]::GetEnvironmentVariable("JAVA_HOME", "User"),
        [Environment]::GetEnvironmentVariable("JAVA_HOME", "Process"),
        "C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot",
        "C:\Program Files\Microsoft\jdk-21"
    ) | Where-Object { $_ } | Select-Object -Unique

    foreach ($javaHome in $javaHomes) {
        Prepend-PathIfExists (Join-Path $javaHome "bin")
        if (Test-Path -LiteralPath (Join-Path $javaHome "bin\java.exe")) {
            [Environment]::SetEnvironmentVariable("JAVA_HOME", $javaHome, "Process")
            break
        }
    }

    Prepend-PathIfExists "$env:LOCALAPPDATA\Microsoft\WinGet\Links"
    Prepend-PathIfExists "C:\Program Files\Docker\Docker\resources\bin"
    Prepend-PathIfExists "C:\Program Files\nodejs"
}

function Assert-CommandAvailable {
    param(
        [string]$CommandName,
        [string]$InstallHint
    )

    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        throw "$CommandName not found. $InstallHint"
    }
}

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,

        [string[]]$Arguments = @()
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $Command $($Arguments -join ' ')"
    }
}

function Assert-PortAvailable {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port,

        [Parameter(Mandatory = $true)]
        [string]$ServiceName
    )

    $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $listeners) {
        return
    }

    $processIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
    $processNames =
        $processIds |
            ForEach-Object {
                try {
                    (Get-Process -Id $_ -ErrorAction Stop).ProcessName
                }
                catch {
                    "PID $_"
                }
            }

    throw "$ServiceName cannot start because port $Port is already in use by $($processNames -join ', ')."
}

function Invoke-InRepo {
    param(
        [string]$WorkingDirectory,
        [scriptblock]$Action
    )

    Push-Location $WorkingDirectory
    try {
        & $Action
    }
    finally {
        Pop-Location
    }
}

function Stop-ProcessIfRunning {
    param([System.Diagnostics.Process]$Process)

    if (-not $Process) {
        return
    }

    try {
        if (-not $Process.HasExited) {
            Stop-Process -Id $Process.Id -Force
            $Process.WaitForExit()
        }
    }
    catch {
        if (-not $Process.HasExited) {
            throw
        }
    }
}

function Test-TcpPortOpen {
    param(
        [Parameter(Mandatory = $true)]
        [string]$HostName,

        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    try {
        return Test-NetConnection -ComputerName $HostName -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
    }
    catch {
        return $false
    }
}

function Wait-ForTcpPort {
    param(
        [Parameter(Mandatory = $true)]
        [string]$HostName,

        [Parameter(Mandatory = $true)]
        [int]$Port,

        [int]$TimeoutSeconds = 60
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-TcpPortOpen -HostName $HostName -Port $Port) {
            return
        }

        Start-Sleep -Seconds 2
    }

    throw "Timed out waiting for PostgreSQL at $HostName`:$Port after $TimeoutSeconds seconds."
}

function Ensure-LocalDevDb {
    $dbHost = Get-EnvOrDefault "DB_HOST" "127.0.0.1"
    if ($dbHost -notin @("localhost", "127.0.0.1")) {
        return
    }

    $dbPort = [int](Get-EnvOrDefault "DB_PORT" "5432")
    if (Test-TcpPortOpen -HostName $dbHost -Port $dbPort) {
        return
    }

    Write-Host "Local PostgreSQL is not reachable at $dbHost`:$dbPort; starting dev DB..."
    Start-DevDb
    Wait-ForTcpPort -HostName $dbHost -Port $dbPort -TimeoutSeconds 60
}

function Start-DevDb {
    Assert-CommandAvailable "docker" "Open Docker Desktop or install Docker Desktop first."
    Invoke-NativeCommand "docker" @("compose", "-f", (Join-Path $RootDir "infra\docker-compose.yml"), "up", "-d", "db")
}

function Stop-DevDb {
    Assert-CommandAvailable "docker" "Open Docker Desktop or install Docker Desktop first."
    Invoke-NativeCommand "docker" @("compose", "-f", (Join-Path $RootDir "infra\docker-compose.yml"), "down")
}

function Start-Api {
    Assert-CommandAvailable "java" "Install Java 21 and reopen PowerShell."

    $apiPort = Get-EnvOrDefault "API_PORT" (Get-EnvOrDefault "SERVER_PORT" "8080")
    $webPort = Get-EnvOrDefault "WEB_PORT" "3000"
    $webOrigin = Get-EnvOrDefault "WEB_ORIGIN" "http://127.0.0.1:$webPort"

    Assert-PortAvailable -Port ([int]$apiPort) -ServiceName "API"

    [Environment]::SetEnvironmentVariable("API_PORT", $apiPort, "Process")
    [Environment]::SetEnvironmentVariable("SERVER_PORT", $apiPort, "Process")
    [Environment]::SetEnvironmentVariable("WEB_PORT", $webPort, "Process")
    [Environment]::SetEnvironmentVariable("WEB_ORIGIN", $webOrigin, "Process")

    Invoke-InRepo (Join-Path $RootDir "apps\api") {
        Invoke-NativeCommand ".\gradlew.bat" @("--no-daemon", "bootRun")
    }
}

function Start-Web {
    Assert-CommandAvailable "pnpm" "Install pnpm and reopen PowerShell."

    $webPort = Get-EnvOrDefault "WEB_PORT" (Get-EnvOrDefault "PORT" "3000")
    $apiPort = Get-EnvOrDefault "API_PORT" "8080"
    $apiBaseUrl = Get-EnvOrDefault "API_BASE_URL" "http://127.0.0.1:$apiPort"
    $webOrigin = Get-EnvOrDefault "WEB_ORIGIN" "http://127.0.0.1:$webPort"

    Assert-PortAvailable -Port ([int]$webPort) -ServiceName "Web"

    [Environment]::SetEnvironmentVariable("WEB_PORT", $webPort, "Process")
    [Environment]::SetEnvironmentVariable("PORT", $webPort, "Process")
    [Environment]::SetEnvironmentVariable("API_PORT", $apiPort, "Process")
    [Environment]::SetEnvironmentVariable("API_BASE_URL", $apiBaseUrl, "Process")
    [Environment]::SetEnvironmentVariable("WEB_ORIGIN", $webOrigin, "Process")

    Invoke-InRepo (Join-Path $RootDir "apps\web") {
        Invoke-NativeCommand "pnpm" @("dev")
    }
}

function Start-All {
    $hostPath = (Get-Process -Id $PID).Path
    $commonArguments = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $PSCommandPath)
    $logDir = Join-Path $RootDir "logs\dev-all"
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null

    Ensure-LocalDevDb

    $apiStdOut = Join-Path $logDir "api.out.log"
    $apiStdErr = Join-Path $logDir "api.err.log"
    $apiProcess = Start-Process -FilePath $hostPath -ArgumentList ($commonArguments + "dev-api") -WorkingDirectory $RootDir -PassThru -RedirectStandardOutput $apiStdOut -RedirectStandardError $apiStdErr
    Start-Sleep -Seconds 2
    $webStdOut = Join-Path $logDir "web.out.log"
    $webStdErr = Join-Path $logDir "web.err.log"
    $webProcess = Start-Process -FilePath $hostPath -ArgumentList ($commonArguments + "dev-web") -WorkingDirectory $RootDir -PassThru -RedirectStandardOutput $webStdOut -RedirectStandardError $webStdErr

    Write-Host "API PID: $($apiProcess.Id)"
    Write-Host "WEB PID: $($webProcess.Id)"
    Write-Host "API stdout: $apiStdOut"
    Write-Host "API stderr: $apiStdErr"
    Write-Host "WEB stdout: $webStdOut"
    Write-Host "WEB stderr: $webStdErr"
    Write-Host "Press Ctrl+C to stop both processes."

    try {
        while ($true) {
            $apiProcess.Refresh()
            $webProcess.Refresh()

            if ($apiProcess.HasExited) {
                $apiExitCode = try { $apiProcess.ExitCode } catch { "unknown" }
                throw "API process exited with code $apiExitCode. Check logs in $logDir."
            }

            if ($webProcess.HasExited) {
                $webExitCode = try { $webProcess.ExitCode } catch { "unknown" }
                throw "Web process exited with code $webExitCode. Check logs in $logDir."
            }

            Start-Sleep -Seconds 1
        }
    }
    finally {
        Stop-ProcessIfRunning $apiProcess
        Stop-ProcessIfRunning $webProcess
    }
}

function Invoke-Checks {
    Assert-CommandAvailable "java" "Install Java 21 and reopen PowerShell."
    Assert-CommandAvailable "pnpm" "Install pnpm and reopen PowerShell."

    Invoke-InRepo (Join-Path $RootDir "apps\api") {
        Invoke-NativeCommand ".\gradlew.bat" @("test", "spotlessCheck")
    }

    Invoke-InRepo (Join-Path $RootDir "apps\web") {
        Invoke-NativeCommand "pnpm" @("lint")
        Invoke-NativeCommand "pnpm" @("test", "--run")
    }
}

function Invoke-Smoke {
    $apiPort = Get-EnvOrDefault "API_PORT" "8080"
    $webPort = Get-EnvOrDefault "WEB_PORT" "3000"

    $apiUrl = "http://127.0.0.1:$apiPort/api/v1/health"
    $webUrl = "http://127.0.0.1:$webPort"

    $null = Invoke-WebRequest -Uri $apiUrl -UseBasicParsing
    $null = Invoke-WebRequest -Uri $webUrl -Method Head -UseBasicParsing
    Write-Host "Smoke check passed for $apiUrl and $webUrl"
}

Set-EnvFromFile (Join-Path $RootDir ".env")
Initialize-ToolPaths

switch ($Task) {
    "dev-db" { Start-DevDb }
    "dev-db-down" { Stop-DevDb }
    "dev-api" { Start-Api }
    "dev-web" { Start-Web }
    "dev-all" { Start-All }
    "check" { Invoke-Checks }
    "smoke" { Invoke-Smoke }
}
