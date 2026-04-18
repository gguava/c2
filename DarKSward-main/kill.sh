#!/bin/bash
fuser -k 8000/tcp 2>/dev/null
fuser -k 8001/tcp 2>/dev/null
sleep 1
npx ts-node http_server.ts &
npx ts-node ws_server.ts &
echo "Servers started"