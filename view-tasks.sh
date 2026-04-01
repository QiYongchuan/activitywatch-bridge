#!/bin/bash
echo "📋 当前任务状态"
echo "================"
curl -s http://localhost:5601/tasks | python3 -m json.tool 2>/dev/null || curl -s http://localhost:5601/tasks
echo ""
echo "💡 使用: ./cc-sync.sh <task-id> <status> <device>"
