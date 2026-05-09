# 开发计划：sbx1 内实现 PE fcall 与数据提取

## 当前状态（2025-05-10 深夜）

### 已验证
- ✅ M0: IOSurface 共享内存日志通道
- ✅ M1: sbx1 预解析函数指针传入 PE (func_offsets_array[0-19])
- ✅ M2: PE fcall 调试 → **JOP chain 挂死，改用 mpd_fcall 绕过**
- ✅ M3: getpid 调用成功 (1016)
- ✅ M4: SpringBoard PID=34 找到 (proc_name 扫描)
- 🔄 M5: 内核读写 — 代码已添加，待设备测试
- 🔄 M6: 注入 SpringBoard — 代码已添加，依赖 M5
- 🔄 M7: file_downloader — 代码已添加，依赖 M6

### 核心架构：IOSurface RPC 通道

```
sbx1 (WebContent)                    PE (MPD)
  │                                    │
  ├─ mpd_fcall(getpid) ─────────────► │ 读 surf+0xF830
  ├─ mpd_fcall(proc_listpids) ──────► │ 读 surf+0xF838
  ├─ mpd_fcall(proc_name) ──────────► │ 读 surf+0xF848 (SpringBoard PID)
  │                                    │
  │  ◄── IOSurface (0xF000-0xFFFF) ── │ pw("[PE] log...")
  │      本地 uread8 轮询读            │
  └─ 无法直接调用 fcall               └─ type confusion primitives ✓
```

### 关键限制

- PE 的 JOP chain fcall (`isNaN(faw)`) 在 MPD 中 crash，无法修复
- sbx1 可通过 `mpd_fcall(addr, x0...x7)` 在 MPD 上下文调任意函数
- sbx1 调一次 mpd_fcall 约 2 秒，可接受
- PE 可通过 IOSurface 读写与 sbx1 通信

---

## M5 详细计划：内核读写 (ICMPv6 socket)

### 背景

`dist/bundle.js` 已包含 `header.js` 的 ICMPv6 socket 内核读写原语：
- `mpd_kread64 = early_kread64` (bundle.js:1319)
- `mpd_kwrite64 = early_kwrite64`
- `mpd_kread_length = kread_length`
- `mpd_kwrite_length = kwrite_length`

**但 ICMPv6 socket 创建依赖 `fcall()`（JOP chain），在 MPD 中崩了。**

### 方案：sbx1 侧创建 ICMPv6 socket

sbx1 已经能调 `mpd_fcall(dlsym, ...)` 和 `mpd_fcall(getpid, ...)`。同样可以调 `socket()` 在 MPD 中创建 socket。

**步骤**：

1. **gpuDlsym 解析所需函数**：
   - `socket` — 创建 ICMPv6 socket
   - `setsockopt` — 配置 socket filter
   - `getsockopt` — 内核读取
   - `fcntl` — 如果 F_DUPFD 需要的话

2. **mpd_fcall 调用 socket**：
   ```js
   let sock = mpd_fcall(socket_raw, AF_INET6, SOCK_DGRAM, IPPROTO_ICMPV6);
   ```

3. **找到 socket 的 pcb 地址**：
   - 需要先在 sbx1 侧用已有的内核读写获取 `pcb_zone` 信息
   - SBX1 的 GPU 内核读写访问 WebContent 内存
   - MPD 的 socket pcb 在 MPD 进程内，需要从 sbx1 侧查找

4. **或直接用 header.js 的已有方法**：
   - `header.js` 有 `stage2_init()` / `stage2_prim()` 函数
   - 其中 `krw_sockets_leak_forever()` 用 `setsockopt`+`getsockopt` 实现内核读写
   - 如果 sbx1 创建了 socket fd，PE 可以用 header.js 的 `early_kread64`/`early_kwrite64`

5. **将 socket fd 传给 PE**：
   - sbx1 创建 socket → 得到 fd → 写入 IOSurface
   - PE 读取 fd → 用 `getsockopt(ICMP6_FILTER)` 做内核读写

### 备选方案

如果 ICMPv6 socket 在 MPD 中因 sandbox 被拒：
- **备选A**: 使用 `pipe()` 创建一对 fd，通过 pipe buffer 做任意读写（需要知道 pipe 的 kernel object 地址）
- **备选B**: SBX1 已经有内核读写，直接通过 IOSurface RPC 让 sbx1 做内核读，PE 读结果
- **备选C**: 用 `mach_vm_read_overwrite` 从 MPD 进程读写内核（需要 task_for_pid 或其他方式获取 kernel task port）

---

## M6 计划：注入 SpringBoard

M5 完成后有 `kread64`/`kwrite64`，按现有 `sbx1_main.js:7222-7274` 的 kernel proc walk 逻辑：
1. `kread64(kernel_task_ptr)` → kernel_task
2. 遍历 proc_list → 找到 PID=34 的 proc
3. 读 `proc + OFF_TASK` → SpringBoard task_t
4. 用 `RemoteCall` / `mach_vm_write` 注入 shellcode

---

## M7 计划：file_downloader

PE 有内核读写后：
1. 在 SpringBoard 进程分配内存
2. 写入 shellcode / dylib 加载代码
3. 创建远程线程执行
4. 通过 `file_downloader.js` 外传数据

---

## 下一步（无人值守）

### M5 Step 1：诊断 socket 可用性

在 sbx1 侧加代码：
```js
// 1. gpuDlsym socket
let socket_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "socket");
// 2. mpd_fcall 调 socket(AF_INET6=30, SOCK_DGRAM=2, IPPROTO_ICMPV6=58)
let sock_fd = mpd_fcall(socket_raw.noPAC(), 30n, 2n, 58n, 0n, 0n, 0n, 0n, 0n);
LOG(`[MPD] socket() = ${sock_fd}`);
```

如果 `sock_fd >= 0`，socket 创建成功 → 继续配置 ICMP6_FILTER。

如果 `sock_fd < 0`（sandbox 拒绝），则走备选方案。

### M5 Step 2：建立内核读写通道

**已实现** (sbx1_main.js:7125-7259):

1. **Socket 诊断**: mpd_fcall(socket, AF_INET6=30, SOCK_DGRAM=2, IPPROTO_ICMPV6=58)
   - 创建 2 个 ICMPv6 socket (control + rw)
   - 测试 setsockopt/getsockopt 往返

2. **全局 kread64/kwrite64 包装器**: `globalThis.mpd_kread64` / `mpd_kwrite64`
   - 通过 mpd_fcall 调用 MPD 中的 getsockopt/setsockopt
   - `mpd_kread_length` / `mpd_kernel_base` 也注册了

3. **GPU 回退**: 如果 socket 失败，pe_main_minimal.js 会尝试通过 read64/write64 进行 GPU 内核 r/w 测试

**待设备测试**:
- socket() 在 MPD sandbox 下是否允许
- setsockopt(ICMP6_FILTER)/getsockopt(ICMP6_FILTER) 是否工作
- PCB 损坏步骤（需要物理内存扫描找到 pcb 地址）

### M6 实现 (sbx1_main.js:7433-7501)

- SpringBoard 任务端口获取 (task_for_pid via mpd_fcall)
- 远程内存分配 (mach_vm_allocate via mpd_fcall)
- Shellcode 写入 (mach_vm_write via mpd_fcall)
- 内存保护设置 (mach_vm_protect via mpd_fcall)

### M7 实现 (sbx1_main.js:7470-7495)

- 远程线程创建 (thread_create_running via mpd_fcall)
- IOSurface 状态寄存器 (+0xF878..+0xF888)

### IOSurface RPC 状态寄存器

| Offset | 字段 | 由谁设置 | 描述 |
|--------|------|----------|------|
| +0xF850 | control_sock | sbx1 (M5) | ICMPv6 control socket fd |
| +0xF858 | rw_sock | sbx1 (M5) | ICMPv6 rw socket fd |
| +0xF860 | setsockopt ptr | sbx1 (M5) | setsockopt 函数指针 |
| +0xF868 | getsockopt ptr | sbx1 (M5) | getsockopt 函数指针 |
| +0xF870 | kernel_base | sbx1 (M5) | 内核基址候选 |
| +0xF878 | sb_remote_addr | sbx1 (M6) | SpringBoard 远程分配地址 |
| +0xF880 | sb_task_port | sbx1 (M6) | SpringBoard 任务端口 |
| +0xF888 | sb_thread_port | sbx1 (M7) | SpringBoard 远程线程端口 |

### 关键限制

**PCB 损坏问题**: ICMPv6 socket 内核读写需要在 MPD 进程中找到 socket 的 pcb 地址并损坏。这需要物理内存访问（gpuRead64/gpuWrite64），或通过 mpd_fcall 在 MPD 中设置 pipe+race condition（可能太慢，~2s/fcall）。

**备选方案**: 如果 socket corruption 不可行，sbx1 可通过 gpuRead64/gpuWrite64 直接做内核读写（如 GPU IOMMU 可访问物理内存），通过 IOSurface 代理 PE 的内核读请求。
