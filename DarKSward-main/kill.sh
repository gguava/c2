#!/bin/bash
fuser -k 8000/tcp 2>/dev/null
sleep 1
python3 server_log.py