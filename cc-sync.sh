#!/bin/bash
# CC/Codex 任务完成时调用此脚本同步状态

TASK_ID="$1"
STATUS="$2"
DEVICE="${3:-$(hostname -s)}"

curl -s -X POST http://localhost:5601/sync/task \
  -H "Content-Type: application/json" \
  -d "{
    \"taskId\": \"$TASK_ID\",
    \"status\": \"$STATUS\",
    \"device\": \"$DEVICE\",
    \"metadata\": {
      \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }
  }"

echo "任务 $TASK_ID 已同步"
