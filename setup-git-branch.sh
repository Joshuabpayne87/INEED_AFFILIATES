#!/bin/bash
# Git Setup Script for INEED_AFFILIATES
# Run this script to connect to the repository and create a new branch

REPO_PATH="$(pwd)"
REMOTE_URL="https://github.com/Joshuabpayne87/INEED_AFFILIATES.git"
BRANCH_NAME="feature/messaging-system-$(date +%Y%m%d-%H%M%S)"

echo "Setting up Git repository..."
echo "Repository path: $REPO_PATH"
echo "Remote URL: $REMOTE_URL"
echo "New branch: $BRANCH_NAME"
echo ""

# Check if git is available
if ! command -v git &> /dev/null; then
    echo "ERROR: Git is not installed or not in PATH"
    echo "Please install Git from https://git-scm.com/download/"
    exit 1
fi

echo "Git found: $(git --version)"
echo ""

# Check current remote
echo "Checking current remote configuration..."
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "Current remote: $CURRENT_REMOTE"
    if [ "$CURRENT_REMOTE" != "$REMOTE_URL" ]; then
        echo "Updating remote URL..."
        git remote set-url origin "$REMOTE_URL"
    fi
else
    echo "No remote configured. Adding remote..."
    git remote add origin "$REMOTE_URL"
fi

# Fetch latest from remote
echo ""
echo "Fetching latest from remote..."
git fetch origin

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"
echo ""

# Create and checkout new branch
echo "Creating new branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME"

echo ""
echo "✅ Successfully created and switched to branch: $BRANCH_NAME"
echo ""
echo "Next steps:"
echo "1. Make your changes"
echo "2. git add ."
echo "3. git commit -m 'Your commit message'"
echo "4. git push -u origin $BRANCH_NAME"

