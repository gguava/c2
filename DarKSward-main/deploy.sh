#!/bin/bash
# Deploy script for DarKSward exploit files
# Usage: ./deploy.sh [user@host[:port]]

LOCAL_DIR="$(pwd)"
REMOTE_HOST="${1:-guava@192.168.10.188}"
REMOTE_DIR="/home/guava/Projects/c3/DarKSward-main"

# Extract port if specified (format: host:port or user@host:port)
if [[ "$REMOTE_HOST" =~ :([0-9]+)$ ]]; then
    PORT="${BASH_REMATCH[1]}"
    REMOTE_HOST="${REMOTE_HOST%:$PORT}"
    SSH_OPTS="-P $PORT"
else
    PORT="22"
    SSH_OPTS=""
fi

echo "=== DarKSward Deploy Script ==="
echo "Local:  $LOCAL_DIR"
echo "Remote: $REMOTE_HOST:$PORT:$REMOTE_DIR"
echo ""

# Check if running on the server directly
if [[ "$LOCAL_DIR" == "$REMOTE_DIR" ]]; then
    echo "Already on server, skipping deployment"
    exit 0
fi

# Check if sbx1_main.js has local modifications
if git diff --quiet sbx1_main.js 2>/dev/null; then
    echo "WARNING: No local modifications to sbx1_main.js"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "Local changes detected:"
    git diff --stat sbx1_main.js
    echo ""
fi

# Sync files to server
echo "=== Syncing files to server ==="

# Primary files: sbx1_main.js + pe_main_minimal.js
if command -v rsync &> /dev/null; then
    echo "Using rsync..."
    if [[ -n "$SSH_OPTS" ]]; then
        rsync -avz --progress -e "ssh -p $PORT" \
            "$LOCAL_DIR/sbx1_main.js" "$LOCAL_DIR/pe_main_minimal.js" \
            "$REMOTE_HOST:$REMOTE_DIR/"
    else
        rsync -avz --progress \
            "$LOCAL_DIR/sbx1_main.js" "$LOCAL_DIR/pe_main_minimal.js" \
            "$REMOTE_HOST:$REMOTE_DIR/"
    fi
else
    echo "Using scp..."
    if [[ -n "$SSH_OPTS" ]]; then
        scp -P "$PORT" "$LOCAL_DIR/sbx1_main.js" "$LOCAL_DIR/pe_main_minimal.js" \
            "$REMOTE_HOST:$REMOTE_DIR/"
    else
        scp "$LOCAL_DIR/sbx1_main.js" "$LOCAL_DIR/pe_main_minimal.js" \
            "$REMOTE_HOST:$REMOTE_DIR/"
    fi
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "=== Deployment successful! ==="
    echo ""
    echo "Next steps:"
    echo "1. Hard refresh the browser (Ctrl+F5 or Cmd+Shift+R)"
    echo "2. Check browser console for '[A2-PRE] Phase 2:' messages"
    echo "3. Monitor /tmp/worker_log.txt on the server"
else
    echo ""
    echo "=== Deployment failed! ==="
    exit 1
fi
