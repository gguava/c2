#!/bin/bash
fuser -k 8001/tcp 2>/dev/null
sleep 1
npx ts-node ws_server.ts