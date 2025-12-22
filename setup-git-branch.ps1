# Git Setup Script for INEED_AFFILIATES
# Run this script after ensuring Git is installed and in your PATH

$repoPath = "C:\Users\Jessica\Downloads\INEED_AFFILIATES\INDEED_AFFILIATES"
$remoteUrl = "https://github.com/Joshuabpayne87/INEED_AFFILIATES.git"
$branchName = "feature/messaging-system-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

Write-Host "Setting up Git repository..." -ForegroundColor Cyan
Write-Host "Repository path: $repoPath" -ForegroundColor Gray
Write-Host "Remote URL: $remoteUrl" -ForegroundColor Gray
Write-Host "New branch: $branchName" -ForegroundColor Gray
Write-Host ""

# Navigate to repository
Set-Location $repoPath

# Check if git is available
try {
    $gitVersion = git --version
    Write-Host "Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Git is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Git from https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

# Check current remote
Write-Host "`nChecking current remote configuration..." -ForegroundColor Cyan
$currentRemote = git remote get-url origin 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Current remote: $currentRemote" -ForegroundColor Gray
    if ($currentRemote -ne $remoteUrl) {
        Write-Host "Updating remote URL..." -ForegroundColor Yellow
        git remote set-url origin $remoteUrl
    }
} else {
    Write-Host "No remote configured. Adding remote..." -ForegroundColor Yellow
    git remote add origin $remoteUrl
}

# Fetch latest from remote
Write-Host "`nFetching latest from remote..." -ForegroundColor Cyan
git fetch origin

# Check current branch
$currentBranch = git branch --show-current
Write-Host "Current branch: $currentBranch" -ForegroundColor Gray

# Create and checkout new branch
Write-Host "`nCreating new branch: $branchName" -ForegroundColor Cyan
git checkout -b $branchName

Write-Host "`n✅ Successfully created and switched to branch: $branchName" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Make your changes" -ForegroundColor Gray
Write-Host "2. git add ." -ForegroundColor Gray
Write-Host "3. git commit -m 'Your commit message'" -ForegroundColor Gray
Write-Host "4. git push -u origin $branchName" -ForegroundColor Gray

