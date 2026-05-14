# 服务器启动方式

```bash
# 终端1 - 日志服务器 (端口 8000)
npx ts-node server_log.ts

# 终端2 - stats服务器 (端口 8001)
npx ts-node server_stats.ts
```

## 服务器说明

| 服务器 | 端口 | 用途 |
|--------|------|------|
| server_log.ts | 8000 | 日志、阶段状态 |
| server_stats.ts | 8001 | 接收 /stats 数据 |

## 数据存储

- 日志: `/tmp/worker_log.txt`
- Stats: `/tmp/stats/`
