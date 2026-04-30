#!/bin/bash
fuser -k 8000/tcp 2>/dev/null
fuser -k 8001/tcp 2>/dev/null
sleep 1
npx ts-node server_log.ts