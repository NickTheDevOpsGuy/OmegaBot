#!/bin/bash

set -e

echo "🔇 Fixing PR Notification Noise"
echo "================================"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

FILE="src/services/github/issueAssigneePoller.ts"

if [ ! -f "$FILE" ]; then
    print_error "$FILE not found"
    exit 1
fi

echo "Backing up..."
cp "$FILE" "$FILE.backup"
print_success "Created backup"

echo ""
echo "Applying fixes..."

# Fix 1: Filter assignee notifications to Issues only
perl -i -pe 's/for \(const n of notifications\) \{/const issueNotifications = notifications.filter(n => n.kind === "Issue");\n\n  for (const n of issueNotifications) {/' "$FILE"

# Fix 2: Simplify message (remove **Kind** since it's always Issue)
perl -i -pe 's/parts\.push\(`\*\*\$\{n\.kind\} #\$\{n\.number\}\*\* assignees updated`\);/parts.push(`Issue #${n.number} assignees updated`);/' "$FILE"

# Fix 3: Filter closed notifications to Issues only
perl -i -pe 's/for \(const c of closedNotifications\) \{/const closedIssues = closedNotifications.filter(c => c.kind === "Issue");\n\n  for (const c of closedIssues) {/' "$FILE"

# Fix 4: Simplify closed message
perl -i -pe 's/parts\.push\(`\*\*\$\{c\.kind\} #\$\{c\.number\}\*\* is no longer open`\);/parts.push(`Issue #${c.number} closed`);/' "$FILE"

print_success "Fixes applied"

echo ""
echo "Building..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "╔════════════════════════════════════════════════════╗"
    echo "║  ✅ Fixed! Build Successful!                      ║"
    echo "╚════════════════════════════════════════════════════╝"
    echo ""
    echo "Changes:"
    echo "  ✅ Only Issues trigger notifications (no PR noise)"
    echo "  ✅ Cleaner message format"
    echo ""
    echo "What gets announced now:"
    echo "  ✅ Issue #60 assignees updated"
    echo "  ✅ Issue #60 closed"
    echo ""
    echo "What is now silent:"
    echo "  🔇 PR assignee changes"
    echo "  🔇 PR merges/closes"
    echo ""
    echo "Restart your bot:"
    echo "  npm start"
    echo ""
    echo "To rollback:"
    echo "  cp $FILE.backup $FILE"
    echo "  npm run build"
    echo ""
else
    echo ""
    print_error "Build failed"
    echo "Restoring backup..."
    cp "$FILE.backup" "$FILE"
    exit 1
fi
