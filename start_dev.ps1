# ============================================
# Fantasy Realm - Development Environment Startup Script
# ============================================

try {
    # Best-effort: ensure the console is in UTF-8 so accents render correctly.
    chcp 65001 | Out-Null
} catch {
    # ignore
}

try {
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [Console]::InputEncoding = $utf8NoBom
    [Console]::OutputEncoding = $utf8NoBom
    $OutputEncoding = $utf8NoBom
} catch {
    # ignore
}

Write-Host "Starting Fantasy Realm Dev Environment..." -ForegroundColor Cyan
Write-Host "" 

$projectPath = $PSScriptRoot
$xamppPath = if ($env:XAMPP_PATH) { $env:XAMPP_PATH } else { "C:\xampp" }

$phpCandidate = Join-Path $xamppPath "php\php.exe"
$phpPath = if (Test-Path $phpCandidate) {
    $phpCandidate
} else {
    $phpCmd = Get-Command php -ErrorAction SilentlyContinue
    if ($phpCmd -and $phpCmd.Source) { $phpCmd.Source } else { $null }
}

function Test-PortListening {
    param([Parameter(Mandatory = $true)][int]$Port)

    $connCmd = Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue
    if ($connCmd) {
        return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
    }

    $netstat = & cmd /c "netstat -ano | findstr /r /c:\":$Port .*LISTENING\"" 2>$null
    return [bool]($netstat)
}

$projectName = Split-Path -Leaf $projectPath
$apacheApiUrl = "http://localhost/$projectName/backend"
$builtinApiUrl = 'http://127.0.0.1:8000/backend'
$useApacheBackend = $false

function Wait-ForApache {
    param(
        [Parameter(Mandatory = $true)][string]$XamppRoot
    )

    if (Test-PortListening -Port 80) {
        return $true
    }

    Write-Host "Apache n'est pas demarre (port 80)." -ForegroundColor $warning

    $xamppControl = Join-Path $XamppRoot 'xampp-control.exe'
    if (Test-Path $xamppControl) {
        try {
            Start-Process $xamppControl -WindowStyle Normal | Out-Null
            Write-Host "Ouverture du panneau XAMPP (demarre Apache), puis reviens ici." -ForegroundColor $info
        } catch {
            # ignore
        }
    } else {
        Write-Host "Demarre Apache via XAMPP (ou ton service Apache), puis reviens ici." -ForegroundColor $info
    }

    while (-not (Test-PortListening -Port 80)) {
        $answer = Read-Host "Quand Apache est demarre, appuie sur Entree (ou tape q pour quitter)"
        if ($answer -match '^(q|quit|exit)$') {
            return $false
        }

        if (-not (Test-PortListening -Port 80)) {
            Write-Host "Toujours rien sur le port 80. Apache est-il bien demarre ?" -ForegroundColor $warning
        }
    }

    return $true
}

$host.UI.RawUI.WindowTitle = "Fantasy Realm - Local Dev Control"

$script:startedProcesses = New-Object System.Collections.Generic.List[System.Diagnostics.Process]

function Get-ParentProcessId {
    param([Parameter(Mandatory = $true)][int]$ProcessId)
    try {
        $p = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction Stop
        return [int]$p.ParentProcessId
    } catch {
        return $null
    }
}

function Test-IsDescendantProcess {
    param(
        [Parameter(Mandatory = $true)][int]$ChildProcessId,
        [Parameter(Mandatory = $true)][int]$AncestorProcessId
    )

    $current = $ChildProcessId
    $guard = 0
    while ($current -and $guard -lt 128) {
        if ($current -eq $AncestorProcessId) {
            return $true
        }
        $current = Get-ParentProcessId -ProcessId $current
        $guard++
    }

    return $false
}

function Test-IsOwnedByStartedProcess {
    param([Parameter(Mandatory = $true)][int]$ProcessId)

    foreach ($p in $script:startedProcesses) {
        try {
            if ($p -and -not $p.HasExited) {
                if (Test-IsDescendantProcess -ChildProcessId $ProcessId -AncestorProcessId $p.Id) {
                    return $true
                }
            }
        } catch {
            # ignore
        }
    }

    return $false
}

function Stop-ProcessTree {
    param([Parameter(Mandatory = $true)][int]$ProcessId)

    try {
        $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$ProcessId" -ErrorAction SilentlyContinue
        foreach ($c in ($children | Where-Object { $_ -and $_.ProcessId })) {
            $childId = [int]$c.ProcessId
            if ($childId -ne $ProcessId) {
                Stop-ProcessTree -ProcessId $childId
            }
        }
    } catch {
        # ignore
    }

    try {
        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
    } catch {
        # ignore
    }
}

function Stop-StartedProcesses {
    foreach ($proc in $script:startedProcesses) {
        try {
            if ($proc -and -not $proc.HasExited) {
                Stop-ProcessTree -ProcessId $proc.Id
            }
        } catch {
            # ignore
        }
    }
}

function Stop-DevServersByPort {
    param(
        [Parameter(Mandatory = $true)][string]$ProjectRoot
    )

    $projectRootNorm = $ProjectRoot.TrimEnd('\\')
    $portsToStop = @(5173, 8000)

    foreach ($port in $portsToStop) {
        $connCmd = Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue
        $owningProcessId = $null

        if ($connCmd) {
            $conn = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($conn) {
                $owningProcessId = $conn.OwningProcess
            }
        } else {
            $netstat = & cmd /c "netstat -ano | findstr /r /c:\":$port .*LISTENING\"" 2>$null
            if ($netstat) {
                $pidMatch = ($netstat | Select-Object -First 1) -match "\s+(\d+)\s*$"
                if ($pidMatch) {
                    $owningProcessId = [int]$Matches[1]
                }
            }
        }

        if (-not $owningProcessId) { continue }

        try {
            $procInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$owningProcessId" -ErrorAction Stop
            $name = (($(if ($procInfo.Name) { $procInfo.Name } else { '' })).ToString()).ToLowerInvariant()
            $cmd = ($(if ($procInfo.CommandLine) { $procInfo.CommandLine } else { '' })).ToString()
            $cmdLower = $cmd.ToLowerInvariant()
            $rootLower = $projectRootNorm.ToLowerInvariant()

            $shouldKill = $false

            # If this listening process belongs to something we started, we can always stop it.
            if (Test-IsOwnedByStartedProcess -ProcessId $owningProcessId) {
                $shouldKill = $true
            }

            if ($port -eq 5173) {
                # Vite dev server
                if (-not $shouldKill) {
                    $shouldKill = ($name -eq 'node.exe') -and ($cmdLower -match 'vite|npm(\.cmd)?\s+run\s+dev|npm')
                }
            } elseif ($port -eq 8000) {
                # PHP built-in dev server
                if (-not $shouldKill) {
                    $shouldKill = ($name -eq 'php.exe') -and ($cmdLower -match '-s\s+127\.0\.0\.1:8000|localhost:8000|dev-router\.php')
                }
            }

            if ($shouldKill) {
                Stop-ProcessTree -ProcessId $owningProcessId
            }
        } catch {
            # ignore
        }
    }
}

function Get-ListeningProcessInfo {
    param(
        [Parameter(Mandatory = $true)][int]$Port
    )

    $conn = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $conn) { return $null }

    $owningProcessId = $conn.OwningProcess
    if (-not $owningProcessId) { return $null }

    try {
        $procInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$owningProcessId" -ErrorAction Stop
        return [pscustomobject]@{
            Port = $Port
            OwningProcessId = $owningProcessId
            Name = $procInfo.Name
            CommandLine = $procInfo.CommandLine
        }
    } catch {
        return [pscustomobject]@{
            Port = $Port
            OwningProcessId = $owningProcessId
            Name = $null
            CommandLine = $null
        }
    }
}

function Invoke-PreflightForceStop {
    param(
        [Parameter(Mandatory = $true)][string]$ProjectRoot
    )

    Write-Host "0. Force stop (dev servers existants)..." -ForegroundColor $info

    # First try: safe stop only for processes that look like this project.
    Stop-DevServersByPort -ProjectRoot $ProjectRoot

    $stillListening = @()
    foreach ($p in @(5173, 8000)) {
        if (Test-PortListening -Port $p) {
            $stillListening += $p
        }
    }

    if ($stillListening.Count -eq 0) {
        Write-Host "   OK (aucun serveur dev sur 5173/8000)" -ForegroundColor $success
        Write-Host ""
        return
    }

    foreach ($p in $stillListening) {
        $pi = Get-ListeningProcessInfo -Port $p
        $pidText = if ($pi -and $pi.OwningProcessId) { $pi.OwningProcessId } else { '?' }
        Write-Host "   WARN: le port $p est deja utilise (PID: $pidText)." -ForegroundColor $warning

        $cmdLower = ($(if ($pi -and $pi.CommandLine) { $pi.CommandLine } else { '' })).ToString().ToLowerInvariant()
        $rootLower = $ProjectRoot.TrimEnd('\\').ToLowerInvariant()
        $looksLikeProject = ($cmdLower -like "*$rootLower*") -and ($cmdLower -match 'vite|npm|php\s+-s')

        if ($looksLikeProject -and $pi -and $pi.OwningProcessId) {
            Stop-ProcessTree -ProcessId $pi.OwningProcessId
            if (-not (Test-PortListening -Port $p)) {
                Write-Host "      Stop OK." -ForegroundColor $success
                continue
            }
        }

        Write-Host "      Je ne peux pas confirmer que c'est bien le serveur du projet." -ForegroundColor $warning
        $answer = Read-Host "      Tape KILL pour forcer l'arret de ce PID, sinon Entrer pour ignorer"
        if ($answer -eq 'KILL' -and $pi -and $pi.OwningProcessId) {
            Stop-ProcessTree -ProcessId $pi.OwningProcessId
            if (-not (Test-PortListening -Port $p)) {
                Write-Host "      Stop OK." -ForegroundColor $success
            } else {
                Write-Host "      Toujours en ecoute (verifie les droits / autre service)." -ForegroundColor $error_color
            }
        }
    }

    Write-Host ""
}

# Best-effort cleanup when the window is closed.
$cleanupAction = {
    try {
        Stop-StartedProcesses
        Stop-DevServersByPort -ProjectRoot $projectPath
    } catch {
        # ignore
    }
}
Register-EngineEvent PowerShell.Exiting -Action $cleanupAction | Out-Null

function Repair-MariaDbReplicationArtifacts {
    param(
        [Parameter(Mandatory = $true)][string]$DataDir
    )

    if (-not (Test-Path $DataDir)) {
        return
    }

    $patterns = @(
        'multi-master.info',
        'master-*',
        'relay-log-*',
        'mysql-relay-bin-*'
    )

    $matches = @()
    foreach ($pattern in $patterns) {
        $matches += Get-ChildItem -Path $DataDir -Filter $pattern -File -ErrorAction SilentlyContinue
    }

    if ($matches.Count -eq 0) {
        return
    }

    $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $backupDir = Join-Path $DataDir "_replication_backup_$timestamp"
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

    foreach ($file in $matches) {
        try {
            Move-Item -LiteralPath $file.FullName -Destination $backupDir -Force
        } catch {
            # If a file is locked, don't break startup.
        }
    }
}

# Colors
$success = [System.ConsoleColor]::Green
$info = [System.ConsoleColor]::Cyan
$warning = [System.ConsoleColor]::Yellow
$error_color = [System.ConsoleColor]::Red

# 0. Force stop dev servers (before anything else)
Invoke-PreflightForceStop -ProjectRoot $projectPath

# 1. Start MySQL (XAMPP)
Write-Host "1. Checking MySQL..." -ForegroundColor $info
$mysqlPort = 3307
if (Test-PortListening -Port $mysqlPort) {
    Write-Host "   MySQL is already running on port $mysqlPort" -ForegroundColor $success
} else {
    # Prevent random startup aborts caused by broken replication/multi-master state files.
    $dataDir = Join-Path $xamppPath 'mysql\data'
    Repair-MariaDbReplicationArtifacts -DataDir $dataDir

    Write-Host "   Starting MySQL..." -ForegroundColor $warning
    $mysqlStartBat = Join-Path $xamppPath "mysql_start.bat"
    if (Test-Path $mysqlStartBat) {
        Start-Process $mysqlStartBat -WindowStyle Hidden
        Start-Sleep -Seconds 2
        Write-Host "   mysql_start.bat launched" -ForegroundColor $success
    } elseif (Test-Path (Join-Path $xamppPath "xampp-control.exe")) {
        Start-Process "$xamppPath\xampp-control.exe" -WindowStyle Hidden
        Start-Sleep -Seconds 2
        Write-Host "   XAMPP Control Panel opened (start MySQL if needed)" -ForegroundColor $success
    } else {
        Write-Host "   WARN: XAMPP not found at $xamppPath (set XAMPP_PATH if needed)" -ForegroundColor $warning
    }
}

if (-not (Test-PortListening -Port 3307)) {
    Write-Host "" 
    Write-Host "   WARN: MySQL is not listening on port 3307." -ForegroundColor $warning
    Write-Host "   Login/API will fail until MySQL is started and the DB exists (fantasy_realm)." -ForegroundColor $warning
    Write-Host "   You can run: .\database\setup_database.bat (after starting MySQL)" -ForegroundColor $warning
}
Write-Host ""

# 2. Waiting for Apache (required by default)
$requireApache = $true
if ($env:DEV_REQUIRE_APACHE) {
    $val = $env:DEV_REQUIRE_APACHE.ToString().Trim().ToLowerInvariant()
    if ($val -eq '0' -or $val -eq 'false' -or $val -eq 'no') {
        $requireApache = $false
    }
}

Write-Host "2. Checking Apache..." -ForegroundColor $info
if (Test-PortListening -Port 80) {
    $useApacheBackend = $true
    Write-Host "   Apache detected (port 80)." -ForegroundColor $success
} elseif ($requireApache) {
    Write-Host "   Apache is required for this start_dev." -ForegroundColor $warning
    if (-not (Wait-ForApache -XamppRoot $xamppPath)) {
        throw "Apache not started. Aborting start_dev."
    }
    $useApacheBackend = $true
    Write-Host "   Apache detected (port 80). Continuing..." -ForegroundColor $success
} else {
    $useApacheBackend = $false
    Write-Host "   Apache not detected (port 80). Will use PHP built-in server." -ForegroundColor $warning
}
Write-Host ""

# 3. Check MongoDB
Write-Host "3. Checking MongoDB..." -ForegroundColor $info
$mongoProcess = Get-Process mongod -ErrorAction SilentlyContinue
if ($mongoProcess) {
    Write-Host "   MongoDB is running" -ForegroundColor $success
} else {
    Write-Host "   ERROR: MongoDB is required and was not detected" -ForegroundColor $error_color
    Write-Host "   Start MongoDB before launching the app." -ForegroundColor $error_color
    exit 1
}
Write-Host ""

# 4. Start Backend PHP Dev Server
Write-Host "4. Starting Backend (PHP Dev Server)..." -ForegroundColor $info
if ($useApacheBackend) {
    Write-Host "   Apache detected (port 80). Using backend at $apacheApiUrl" -ForegroundColor $success
} elseif (Test-PortListening -Port 8000) {
    Write-Host "   Backend is already running on port 8000" -ForegroundColor $success
} else {
    Write-Host "   Launching backend server..." -ForegroundColor $warning
    if (-not $phpPath) {
        Write-Host "   ERROR: PHP not found. Set XAMPP_PATH or add php.exe to PATH." -ForegroundColor $error_color
    } else {
        $backendRoot = Join-Path $projectPath 'backend'
        $routerPath = Join-Path $backendRoot 'dev-router.php'
        $logDir = Join-Path $projectPath 'logs'
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        $backendOut = Join-Path $logDir 'backend.out.log'
        $backendErr = Join-Path $logDir 'backend.err.log'

        $proc = Start-Process -FilePath $phpPath -ArgumentList @(
            '-S', '127.0.0.1:8000',
            '-t', $backendRoot,
            $routerPath
        ) -PassThru -WindowStyle Hidden -RedirectStandardOutput $backendOut -RedirectStandardError $backendErr
        $script:startedProcesses.Add($proc)

        Start-Sleep -Seconds 2
        if (Test-PortListening -Port 8000) {
            Write-Host "   Backend server launched on $builtinApiUrl" -ForegroundColor $success
        } else {
            Write-Host "   ERROR: Backend did not start (port 8000 not listening). Check the backend window for PHP errors." -ForegroundColor $error_color
        }
    }
}
Write-Host ""

# 5. Start Frontend Vite Dev Server
Write-Host "5. Starting Frontend (Vite Dev Server)..." -ForegroundColor $info
if (Test-PortListening -Port 5173) {
    Write-Host "   Frontend is already running" -ForegroundColor $success
} else {
    Write-Host "   Launching frontend dev server..." -ForegroundColor $warning
    $apiUrl = if ($useApacheBackend) { $apacheApiUrl } else { $builtinApiUrl }
    $frontendDir = Join-Path $projectPath 'frontend'
    $logDir = Join-Path $projectPath 'logs'
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    $frontendOut = Join-Path $logDir 'frontend.out.log'
    $frontendErr = Join-Path $logDir 'frontend.err.log'

    # Use cmd.exe so VITE_API_URL is scoped to this process.
    $cmd = "cd /d `"$frontendDir`" && set VITE_API_URL=$apiUrl && npm run dev"
    $proc = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $cmd) -PassThru -WindowStyle Hidden -RedirectStandardOutput $frontendOut -RedirectStandardError $frontendErr
    $script:startedProcesses.Add($proc)

    Start-Sleep -Seconds 3
    if (Test-PortListening -Port 5173) {
        Write-Host "   Frontend dev server launched" -ForegroundColor $success
    } else {
        Write-Host "   ERROR: Frontend did not start (port 5173 not listening)." -ForegroundColor $error_color
        Write-Host "      See logs: $frontendErr" -ForegroundColor $warning
    }
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor $success
Write-Host "ALL SERVICES STARTED" -ForegroundColor $success
Write-Host "========================================" -ForegroundColor $success
Write-Host ""

$apiUrl = if ($useApacheBackend) { $apacheApiUrl } else { $builtinApiUrl }

Write-Host "Access Points:" -ForegroundColor $info
Write-Host "   Frontend:  http://localhost:5173" -ForegroundColor Cyan
Write-Host "   Backend:   $apiUrl" -ForegroundColor Cyan
Write-Host "   MySQL:     localhost:3307" -ForegroundColor Cyan
Write-Host "   MongoDB:   localhost:27017" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test Accounts:" -ForegroundColor $info
Write-Host "   player:   user1@example.com / password123" -ForegroundColor Yellow
Write-Host "   player:   user2@example.com / password456" -ForegroundColor Yellow
Write-Host "   employee: employee1@example.com / employee789" -ForegroundColor Yellow
Write-Host "   admin:    admin1@example.com / admin999" -ForegroundColor Yellow
Write-Host ""
Write-Host "Pour arrêter le site en local: ferme cette fenêtre (ou appuie sur Entrée ci-dessous)." -ForegroundColor $warning
Write-Host ""

Write-Host "========================================" -ForegroundColor $success
Write-Host "LOCAL DEV CONTROL" -ForegroundColor $success
Write-Host "========================================" -ForegroundColor $success
Write-Host "Frontend:  http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend:   $apiUrl" -ForegroundColor Cyan
Write-Host "Logs:      $(Join-Path $projectPath 'logs')" -ForegroundColor Gray
Write-Host "" 
Write-Host "Ferme cette fenêtre (ou appuie sur Entrée) pour arrêter le site en local." -ForegroundColor Yellow
Write-Host "(MySQL/Apache ne sont pas arrêtés automatiquement.)" -ForegroundColor DarkYellow
Write-Host ""

try {
    $null = Read-Host "Appuie sur Entrée pour arrêter"
} finally {
    Stop-StartedProcesses
    Stop-DevServersByPort -ProjectRoot $projectPath
}
