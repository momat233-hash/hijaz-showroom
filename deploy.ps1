param(
    [switch]$Build,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildDir = Join-Path $ProjectDir "build"

function Write-Step {
    param([string]$Message, [string]$Status = "INFO")
    $color = switch ($Status) { "OK" { "Green" } "FAIL" { "Red" } "WARN" { "Yellow" } default { "Cyan" } }
    Write-Host ("[{0}] {1}" -f $Status.PadRight(5), $Message) -ForegroundColor $color
}

function Test-Command {
    param([string]$Command)
    return [bool](Get-Command $Command -ErrorAction SilentlyContinue)
}

# Step 1: Build if requested
if ($Build) {
    Write-Step "Building project..."
    Push-Location $ProjectDir
    $env:NODE_OPTIONS = "--openssl-legacy-provider"
    $env:CI = "false"
    try {
        $buildResult = cmd /c "node node_modules\react-scripts\bin\react-scripts.js build 2>&1"
        if ($LASTEXITCODE -eq 0) {
            Write-Step "Build succeeded" "OK"
        } else {
            Write-Step "Build failed" "FAIL"
            Write-Host $buildResult
            exit 1
        }
    } finally {
        Pop-Location
    }
}

# Verify build directory exists
if (-not (Test-Path $BuildDir)) {
    Write-Step "Build directory not found at $BuildDir" "FAIL"
    Write-Step "Run: .\deploy.ps1 -Build" "WARN"
    exit 1
}

# Create .htaccess if missing
$htaccess = Join-Path $BuildDir ".htaccess"
if (-not (Test-Path $htaccess)) {
    @"
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
<FilesMatch "^\.">
    Order allow,deny
    Deny from all
</FilesMatch>
AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
<filesMatch "\.(ico|pdf|jpg|jpeg|png|gif|svg|js|css|woff2?)$">
    Header set Cache-Control "max-age=2592000, public"
</filesMatch>
"@ | Set-Content -Path $htaccess -Encoding ASCII
    Write-Step "Created .htaccess in build" "OK"
}

Write-Step "=== Hijaz Showroom Deployment ===" -Status "INFO"
Write-Step "Build: $BuildDir" "INFO"
Write-Step ""
Write-Step "Choose deployment method:" "INFO"
Write-Step "  1) FTP (recommended)" "INFO"
Write-Step "  2) cPanel Web (opens browser)" "INFO"
Write-Step "  3) GitHub Pages" "INFO"
Write-Step "  4) Netlify" "INFO"

$choice = Read-Host "`nEnter choice (1-4)"

switch ($choice) {
    "1" {
        # FTP deployment
        if (-not (Test-Command "ftp")) {
            Write-Step "Windows FTP client not found. Install via: dism /online /Add-Capability /CapabilityName:InternetServerManager.Client~~~~0.0.1.0" "FAIL"
            exit 1
        }

        $ftpHost = Read-Host "FTP Host (default: server2.web-hosting.com)"
        if ([string]::IsNullOrWhiteSpace($ftpHost)) { $ftpHost = "server2.web-hosting.com" }
        
        $ftpUser = Read-Host "FTP Username (default: gkldeed)"
        if ([string]::IsNullOrWhiteSpace($ftpUser)) { $ftpUser = "gkldeed" }
        
        $ftpPass = Read-Host "FTP Password (default: Alpha02#)" -AsSecureString
        if (-not $ftpPass) { $ftpPass = ConvertTo-SecureString "Alpha02#" -AsPlainText -Force }
        $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($ftpPass)
        $pass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)

        Write-Step "Connecting to $ftpHost via FTP..." "INFO"
        
        # Create FTP script
        $scriptFile = Join-Path $env:TEMP "ftp-upload.txt"
        @"
open $ftpHost
$ftpUser
$pass
binary
cd public_html
prompt
mput *.*
"@ | Set-Content -Path $scriptFile

        try {
            $result = cmd /c "ftp -s:`"$scriptFile`" 2>&1"
            Write-Host $result
            if ($LASTEXITCODE -eq 0) {
                Write-Step "FTP upload completed!" "OK"
            } else {
                Write-Step "FTP upload had errors" "WARN"
            }
        } finally {
            Remove-Item $scriptFile -Force -ErrorAction SilentlyContinue
        }
    }
    
    "2" {
        # cPanel web
        Write-Step "Opening cPanel in browser..." "INFO"
        Write-Step "URL: https://server2.web-hosting.com:2083" "INFO"
        Write-Step "User: gkldeed" "INFO"
        Write-Step "Pass: Alpha02#" "INFO"
        Write-Step "`nIn cPanel: File Manager → public_html → Upload" "INFO"
        Start-Process "https://server2.web-hosting.com:2083"
    }
    
    "3" {
        # Git push to GitHub Pages
        Write-Step "Checking git..." "INFO"
        if (-not (Test-Command "git")) {
            Write-Step "Git not installed" "FAIL"
            exit 1
        }
        
        Push-Location $ProjectDir
        try {
            if (-not (Test-Path ".git")) {
                git init
                Write-Step "Git repo initialized" "OK"
            }
            
            # Add build to git
            Add-Content -Path ".gitignore" -Value "`n!build/" -NoNewline
            
            # Commit
            git add build/ src/ public/ package.json tsconfig.json
            git commit -m "Update build $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
            
            # Check for GitHub remote
            $remote = git remote -v
            if (-not $remote) {
                $repoUrl = Read-Host "Enter GitHub repo URL (e.g., https://github.com/user/repo.git)"
                git remote add origin $repoUrl
            }
            
            Write-Step "Pushing to GitHub..." "INFO"
            Write-Step "After push, enable GitHub Pages in repo Settings → Pages → Source: main branch /docs or GitHub Actions" "WARN"
            git push -u origin master
        } finally {
            Pop-Location
        }
    }
    
    "4" {
        # Netlify deploy (needs netlify-cli)
        Write-Step "Installing netlify-cli..." "INFO"
        Push-Location $ProjectDir
        try {
            npm install netlify-cli --save-dev
            Write-Step "Running: npx netlify deploy --prod --dir=build" "INFO"
            npx netlify deploy --prod --dir=build
        } finally {
            Pop-Location
        }
    }
    
    default {
        Write-Step "Invalid choice" "FAIL"
    }
}

Write-Step "`n=== Done ===" "INFO"
