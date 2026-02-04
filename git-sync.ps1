# Git Sync Script
Set-Location "c:\Users\nares\OneDrive\Desktop\FreeLancing\innerspark"

# Configure git to not open editor
git config --global core.editor "true"

# Stage all changes
git add .

# Commit changes
git commit -m "fix: cleanup module system, remove lesson routes, fix status fields"

# Fetch latest from origin
git fetch origin main

# Merge with no-edit flag
git merge origin/main --no-edit

# Push to origin
git push origin main

Write-Host "Git sync completed successfully!" -ForegroundColor Green
