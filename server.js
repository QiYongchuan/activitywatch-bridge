const express = require('express');
const WebSocket = require('ws');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());

// 任务状态存储
const TASKS_FILE = '/Users/qyc/.openclaw/workspace/tasks-sync.json';

// 确保任务文件存在
async function ensureTasksFile() {
  try {
    await fs.access(TASKS_FILE);
  } catch {
    await fs.writeFile(TASKS_FILE, JSON.stringify({
      tasks: [],
      lastSync: new Date().toISOString(),
      devices: {
        macmini: { status: 'online', lastSeen: null },
        windows: { status: 'offline', lastSeen: null }
      }
    }, null, 2));
  }
}

// 读取任务状态
async function loadTasks() {
  await ensureTasksFile();
  const data = await fs.readFile(TASKS_FILE, 'utf8');
  return JSON.parse(data);
}

// 保存任务状态
async function saveTasks(tasks) {
  await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

// ActivityWatch 事件接收端点
app.post('/aw/event', async (req, res) => {
  const { hostname, timestamp, duration, data } = req.body;
  
  console.log(`[ActivityWatch] 收到来自 ${hostname} 的事件:`, {
    app: data?.app,
    title: data?.title?.substring(0, 50),
    duration: duration
  });
  
  // 更新设备状态
  const tasks = await loadTasks();
  const deviceKey = hostname.includes('mac') || hostname.includes('mini') ? 'macmini' : 'windows';
  tasks.devices[deviceKey] = {
    status: 'online',
    lastSeen: new Date().toISOString(),
    currentApp: data?.app,
    currentTitle: data?.title
  };
  await saveTasks(tasks);
  
  res.json({ status: 'received' });
});

// 任务状态同步端点（供 CC/Codex 调用）
app.post('/sync/task', async (req, res) => {
  const { taskId, status, device, metadata } = req.body;
  
  const tasks = await loadTasks();
  const existingTask = tasks.tasks.find(t => t.id === taskId);
  
  if (existingTask) {
    existingTask.status = status;
    existingTask.updatedAt = new Date().toISOString();
    existingTask.device = device;
    if (metadata) existingTask.metadata = { ...existingTask.metadata, ...metadata };
  } else {
    tasks.tasks.push({
      id: taskId,
      status,
      device,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: metadata || {}
    });
  }
  
  tasks.lastSync = new Date().toISOString();
  await saveTasks(tasks);
  
  console.log(`[Sync] 任务 ${taskId} 状态更新为 ${status} (来自 ${device})`);
  res.json({ status: 'synced' });
});

// 获取所有任务状态
app.get('/tasks', async (req, res) => {
  const tasks = await loadTasks();
  res.json(tasks);
});

// 设备心跳检测
cron.schedule('*/5 * * * *', async () => {
  const tasks = await loadTasks();
  const now = new Date();
  
  Object.keys(tasks.devices).forEach(device => {
    const lastSeen = tasks.devices[device].lastSeen;
    if (lastSeen) {
      const diff = now - new Date(lastSeen);
      if (diff > 10 * 60 * 1000) { // 10分钟无响应
        tasks.devices[device].status = 'offline';
      }
    }
  });
  
  await saveTasks(tasks);
  console.log('[Heartbeat] 设备状态已更新');
});

const PORT = process.env.PORT || 5601;
app.listen(PORT, () => {
  console.log(`🚀 ActivityWatch Bridge 运行在端口 ${PORT}`);
  console.log(`📊 任务同步文件: ${TASKS_FILE}`);
});
