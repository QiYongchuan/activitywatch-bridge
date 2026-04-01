# ActivityWatch Bridge - 多设备状态同步

## 功能
- 📊 实时监控多设备屏幕活动
- 🔄 任务状态跨设备同步
- 🤖 支持 CC/Codex 自动上报
- 📱 Telegram 频道任务监听

## 快速开始

### 1. 启动桥接服务（Mac mini）
```bash
cd /Users/qyc/Okx-darkness/activitywatch-bridge
npm install
npm start
```

### 2. CC/Codex 任务完成时同步
```bash
./cc-sync.sh "task-id" "completed" "macmini"
```

### 3. 查看任务状态
```bash
curl http://localhost:5601/tasks
```

## ActivityWatch 集成
每个设备安装 aw-forward.py，将屏幕活动实时转发到中央服务。

## API 端点
- `POST /aw/event` - 接收 ActivityWatch 事件
- `POST /sync/task` - 同步任务状态
- `GET /tasks` - 获取所有任务状态
