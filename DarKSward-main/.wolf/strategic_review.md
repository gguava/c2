# DarKSward 战略路线审视

## 原版 vs 当前：关键差异分析

### 原版 DarKSward 完整流程

```
Stage 1: WebContent RCE (rce_worker.js)
├── JSC type confusion → addrof/fakeobj
├── 禁用 GC
├── dlopen 框架加载 (CFBundle corruption)
├── dyld interpose 劫持 → PAC signing oracle
└── JOP Thread 创建 → 任意函数调用 (fcall)

Stage 2: Kernel Exploit (DriverNewThread.js)
├── ICMPv6 socket 创建 (SOCK_RAW/SOCK_DGRAM)
├── setsockopt/getsockopt 利用 → PCB corruption
├── 32-byte chunk kernel R/W 原语
├── KASLR defeat (kernel_task 遍历)
├── Self-task discovery (task list 遍历)
└── Mach port/IPC space manipulation

Stage 3: Post-Exploitation (pe_main.js)
├── Sandbox Escape (kernel ext corruption 或 launchd token)
├── MIG Filter Bypass (_duplicate_lock 操作 + 栈返回值覆盖)
├── Cross-Process Injection (EXC_GUARD + Trojan PC/LR + RemoteCall)
└── Data Exfiltration (JS payloads: file_downloader, keychain, WiFi, iCloud)
```

---

## 原版 vs 当前对比表

| 步骤 | 原版 | 当前 | 状态 |
|------|------|------|------|
| sbx0/sbx1 | WebContent RCE + JOP + fcall | 相同 | 完成 |
| kernel R/W | socket PCB corruption | **失败 (COW/Disconnect)** | 阻塞 |
| sandbox escape | Kernel ext corruption OR launchd token | 等待 kernel R/W | 未完成 |
| MIG bypass | 内核锁操作 | 等待 | 未完成 |
| cross-process | EXC_GUARD + RemoteCall | 等待 | 未完成 |
| data exfil | JS payloads | 等待 | 未完成 |

---

## 我们的路线是否走偏？

### 结论：**没有走偏，但卡在关键瓶颈**

我们目前的策略是正确的，但遇到了原版没有的技术障碍：

#### 1. **MPD fcall 限制**（原版没有）
- 原版：WebContent 直接调用 `mach_make_memory_entry_64` 等物理内存操作
- 我们：必须通过 `mpd_fcall` 在 MPD 进程执行，延迟 ~2s，且有 sandbox 限制

#### 2. **PCB Disconnect 失败**（关键阻塞）
- 原版：`connect(AF_UNSPEC)` 成功断开 socket，完成 PCB corruption
- 我们：MPD sandbox 下 `connect(AF_UNSPEC) = -1`，`shutdown = -1`，`disconnectx = -1`

#### 3. **GPU COW 问题**（新发现）
- GPU uwrite64 可能触发 Copy-on-Write
- WebContent 的写入只影响自己的 KC 映射副本，不写入 live kernel

---

## 原版的关键成功因素

原版在 Stage 2 能够成功的核心：

1. **直接物理内存访问**：
   - `mach_make_memory_entry_64` → map physical memory
   - `physical_oob_read_mo` / `physical_oob_write_mo` → 扫描物理内存

2. **PCB 定位策略**：
   - 扫描物理内存找进程名字符串 "WebContent"
   - 从字符串位置推算 pcb 结构地址
   - 不需要内核符号表（allproc 等）

3. **PCB Corruption 成功率**：
   - 可靠的 socket disconnect 支持
   - ICMP6_FILTER 指针替换为 kernel buffer 地址
   - getsockopt 读 / setsockopt 写实现 kernel r/w

---

## 重新梳理：当前可行路线

### 路线 A：修复 PCB Corruption（M5 阶段）

目标：恢复 socket PCB corruption 能力

**尝试顺序：**
1. ✅ SOCK_RAW 替代 SOCK_DGRAM
2. ✅ close() + socket spray 方法
3. ⚠️ socket buffer exhaustion race
4. ⚠️ 寻找 MPD 中可用的其他 socket 操作

**成功标准：**
- `setsockopt(rw_sock, ...)` 实际写入内核地址
- `getsockopt(rw_sock, ...)` 从内核地址读取

### 路线 B：绕过 PCB，直接获取 Kernel R/W（A1-A4）

目标：不依赖 PCB corruption，直接读写内核

**方案：**
- A1: MPD mach_vm_read/write 测试 → 确认能否读高半 VA
- A2: AMFI bypass → 获取 task_for_pid 权限
- A3: 扫描 SpringBoard proc 结构
- A4: 从 SpringBoard 获取 kernel task port

**当前状态：**
- A1: mpd_fcall 超时问题已修复（使用 mpd_fcall_timeout）
- A2: GPU 写可能 COW，需要 MPD 侧验证

### 路线 C：物理内存扫描（原版方法，需适配）

目标：复刻原版的物理内存扫描策略

**障碍：**
- `mach_make_memory_entry_64` 需要在 MPD 执行
- MPD fcall 延迟 ~2s，扫描太慢
- 需要大量尝试，IO 成本过高

**可能的优化：**
- 缩小扫描范围（已知 kernel slide）
- 一次映射大块物理内存，多次随机采样

---

## 建议的优先级调整

### 第一优先级：确认 COW 问题（阻塞所有路线）

```javascript
// 测试方案
1. GPU uwrite64 写一个测试值到 KC 地址
2. mpd_fcall → read64 同地址
3. 对比值是否一致

结果：
- 一致 → 无 COW，AMFI bypass 可行
- 不一致 → 确认 COW，必须换策略
```

### 第二优先级：并行尝试路线 A 和 B

| 路线 | 成功概率 | 工作量 | 阻塞点 |
|------|---------|--------|--------|
| A: 修复 PCB | 中 | 中 | MPD sandbox 限制 |
| B: A1-A4 直接 k/rw | 中 | 高 | AMFI bypass 需验证 |

### 第三优先级：PE 阶段准备

即使 kernel r/w 解决，原版 PE 阶段也依赖：
- `MigFilterBypassThread.js` → `_duplicate_lock` 操作
- `RemoteCall.js` → EXC_GUARD 异常注入

这些都需要根据当前 iOS 版本（18.4+）重新验证符号和偏移。

---

## 决策记录

### 2026-05-12: 路线审视结论

**问题：** 对比原版后，发现我们的策略是否走偏？

**结论：**
1. **策略方向正确**：原版的三阶段架构（sbx → kernel → pe）是合理的
2. **技术环境不同**：原版直接物理内存操作，我们受限于 MPD RPC
3. **关键阻塞在 PCB**：原版的核心突破点是 PCB corruption，我们在此处卡住

**下一步行动：**
1. 执行 COW 验证测试（确认 GPU 写是否有效）
2. 并行推进路线 A（PCB 修复）和路线 B（A1-A4）
3. 若 PCB 无法修复，全力转向 A1-A4 方案

---

## 附录：原版关键代码参考

- 原版 DarKSward 代码：`/home/guava/darkward-reference/`
- `header.js`: `early_kread64` / `early_kwrite64` 原语
- `DriverNewThread.js`: PCB corruption 逻辑
- `MigFilterBypassThread.js`: MIG bypass 实现
- `RemoteCall.js`: 跨进程注入
