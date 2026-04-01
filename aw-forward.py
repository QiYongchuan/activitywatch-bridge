#!/usr/bin/env python3
"""
ActivityWatch 数据转发器
安装在每台设备上，将 AW 事件转发到中央桥接服务
"""

import requests
import json
import time
from datetime import datetime

BRIDGE_URL = "http://100.80.153.60:5601/aw/event"  # Mac mini Tailscale IP

def forward_event(event):
    try:
        response = requests.post(BRIDGE_URL, json=event, timeout=5)
        return response.json()
    except Exception as e:
        print(f"转发失败: {e}")
        return None

if __name__ == "__main__":
    print("ActivityWatch 转发器已启动")
    print(f"目标: {BRIDGE_URL}")
    
    # 这里会集成 ActivityWatch 的 watcher
    # 目前作为示例，定期发送心跳
    while True:
        heartbeat = {
            "hostname": "device-name",
            "timestamp": datetime.utcnow().isoformat(),
            "duration": 0,
            "data": {
                "app": "heartbeat",
                "title": "ActivityWatch Bridge Active"
            }
        }
        forward_event(heartbeat)
        time.sleep(60)
