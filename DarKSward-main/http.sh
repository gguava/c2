#!/bin/bash
fuser -k 8000/tcp 2>/dev/null
sleep 1
npx ts-node http_server.ts