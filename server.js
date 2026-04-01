const express = require('express');
const WebSocket = require('ws');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const TASKS_FILE = '/Users/qyc/.openclaw/workspace/tasks-sync.json';

async function ensureTasksFile() {
  try {
    await fs.access(TASKS_FILE);
  } catch {
    await fs.writeFile(TASKS_FILE, JSON.stringify({
      tasks: [],
      lastSync: new Date().toISOString(),
      devices: {
        macmini: { status: 'online', lastSeen: new Date().toISOString() },
        windows: { status: 'offline', lastSeen: null }
      }
    }, null, 2));
  }
}

async function loadTasks() {
  await ensureTasksFile();
  const data = await fs.readFile(TASKS_FILE, 'utf8');
  return JSON.parse(data);
}

async function saveTasks(tasks) {
  await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

app.post('/aw/event', async (req, res) => {
  const { hostname, timestamp, duration, data } = req.body;
  console.log(`[ActivityWatch] ${hostname}: ${data?.app}`);
  
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
  console.log(`[Sync] ${taskId} -> ${status} (${device})`);
  res.json({ status: 'synced' });
});

app.get('/tasks', async (req, res) => {
  const tasks = await loadTasks();
  res.json(tasks);
});

cron.schedule('*/5 * * * *', async () => {
  const tasks = await loadTasks();
  const now = new Date();
  Object.keys(tasks.devices).forEach(device => {
    const lastSeen = tasks.devices[device].lastSeen;
    if (lastSeen) {
      const diff = now - new Date(lastSeen);
      if (diff > 10 * 60 * 1000) tasks.devices[device].status = 'offline';
    }
  });
  await saveTasks(tasks);
});

const PORT = process.env.PORT || 5601;
app.listen(PORT, () => {
  console.log(`🚀 ActivityWatch Bridge: http://localhost:${PORT}`);
});
