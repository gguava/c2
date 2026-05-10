# DarKSward 开发路线图

> 更新：2026-05-11
> 状态：**Phase 1 改进版已实现** — xpac_full 内核地址恢复 + noPAC KC地址交叉验证

---

## Phase 1 改进 (2026-05-11)

### 已修复的问题

1. **`xpac` 函数**: 原版清除 bits 48-55 后丢失内核 VA 前缀 (0xFFFFFFF...)，导致所有地址比较失败。新增 `xpac_full()` 正确恢复内核 VA。
2. **PAC 指针扫描**: 原版 `(v >> 60n) === 0xFn` 过滤太严格，改为 `>= 0x8n` 涵盖所有内核 PAC 指针。
3. **Method 1 (gpuDlsym)**: 改用 `noPAC()` (已验证可用) 获取 KC 地址，通过一致性约束计算 KC slide。
4. **Method 2 (data page PAC)**: 使用 `xpac_full()` 获取完整内核 VA，通过多指针一致性约束计算 kernel slide。
5. **交叉验证**: KC slide 和 kernel slide 应为同一 KASLR 值，取交集或最接近值。
6. **移除 Method 4**: 原版尝试 GPU 读 0xFFFFFFF... 地址（已知不可能）。

### 待验证

- 新算法在实际设备上能否正确计算 slide
- 需要观察 `[M5]` 日志输出确认每一步的结果

---

## 当前能力总结

| 能力 | 状态 | 说明 |
|------|------|------|
| GPU 内核读 (`uread64`) | ✅ 稳定 | 可读 KC 数据页 (0x1_XXXX_XXXX)，不可读 KC 代码页（hang） |
| GPU 内核写 (`uwrite64`) | ✅ 已验证 | 对 KC 数据页可写（bit flip 验证通过） |
| GPU 内核读 (0xFFFFFFF...) | ❌ 不可用 | GPU IOMMU 无法映射高半内核 VA |
| mpd_fcall | ✅ 稳定 | ~2s/次，可在 MPD 上下文调任意函数 |
| ICMPv6 socket 创建 | ✅ 成功 | MPD 可创建 SOCK_DGRAM ICMPv6 socket |
| setsockopt/getsockopt | ✅ 成功 | ICMP6_FILTER roundtrip 正常 |
| PCB disconnect | ❌ 全失败 | connect(AF_UNSPEC)/shutdown/disconnectx 均返回 -1 |
| mach_make_memory_entry_64 | ❌ handle=0 | 返回 16 但 handle 为空，无物理内存映射权 |
| task_for_pid | ❌ 返回 0x0 | MPD 没有 entitlement，host port 也不行 |
| SpringBoard PID | ✅ 已知 | PID=34，proc_name 确认 |

## 核心瓶颈

**GPU uread64/uwrite64 可以读写 KC 数据页（低半 0x1_XXXX_XXXX），但不能读高半内核 VA (0xFFFFFFF...)。**
**ICMPv6 PCB disconnect 全部失败，socket-based kernel r/w 无法建立。**

这意味着：我们有内核读写能力，但只能访问 KC 映射的数据页。需要利用 KC 数据页上的信息来找到并 patch 关键内核结构。

---

## 开发路线（优先级排序）

### Phase 1：利用 GPU krw 获取真实内核基址和 allproc

**目标**：从 KC 数据页找到 kernel slide，计算出真实内核 VA，找到 allproc

**策略 A — 利用 gpuDlsym 返回的函数指针推算 slide（推荐）**

gpuDlsym 返回 PAC 签名的函数指针（如 `task_for_pid = 0x8A21BD01D7CF9CC4`）。
- xpac 去掉 PAC → 得到函数在 KC 中的 VA
- 已知 `task_for_pid` 在未 slide KC 中的偏移 → 算出 slide
- slide 同样适用于数据段 → 可算出 `allproc`、`kernel_task` 等的真实 VA

这是最直接的方法，因为 gpuDlsym 已经成功解析了多个函数。

**策略 B — 利用 KC 数据页上的 PAC 指针推算 slide**

数据页 `page+0xcf8/e38/e88` 有 `0xFFFFFFFE0XXXXXXXX` 形式的指针（PAC 签名的 KC 代码地址）：
- 去掉 PAC 后得到 KC 代码段地址
- 与未 slide 的 KC 基址比较 → 得出 slide

**策略 C — 扫描 KC 数据页附近的页找 allproc**

allproc 是 LIST_HEAD，包含指向第一个 proc 的指针。
- 从已知 data_page 向前后扫描 ±32 页
- 寻找 allproc 特征（lh_first 指向有效 proc）
- 风险：大范围扫描容易 hang

### Phase 2：内核数据结构遍历

**目标**：找到 SpringBoard 的 task/proc 结构

1. 从 allproc 遍历 proc 链表（用 uread64 读低半映射）
2. 对每个 proc 读 `p_pid` 找 PID=34
3. 读取 SpringBoard 的 `proc → task` 指针
4. 读取 task 的 IPC space 等关键结构
5. 准备注入所需的所有内核地址

**注意**：uread64 只能读 KC 映射页（0x1_XXX），而 proc 结构是动态分配的内核堆内存，**不一定**在 KC 映射范围内。可能需要：
- 先确认 proc 结构是否在 KC 可读范围内
- 或通过 mpd_fcall + mach_vm_read 读取高半 VA

### Phase 3：AMFI / 代码签名绕过

**目标**：patch 内核使 task_for_pid 或代码签名检查失效

**方案 3A — Patch cs_enforcement_disable（推荐）**
- 找到 `cs_enforcement_disable` 的内核地址（在 KC 数据段）
- 用 uwrite64 写入非零值 → 禁用代码签名检查
- 之后 task_for_pid 应该能成功

**方案 3B — 直接 proc patch**
- 找到 SpringBoard 的 proc 结构
- 修改 `p_csflags` 清除 CS_HARD/CS_KILL 标志
- 不需要 task_for_pid，直接用内核读写操作

**方案 3C — 修改 kernel_task 的 IPC table**
- 找到 kernel_task 的 itk_space
- 伪造一个发送 SpringBoard task port 的 IPC entry
- 用 mpd_fcall 通过伪造的 port 调 mach_vm_*

### Phase 4：SpringBoard 注入

**目标**：在 SpringBoard 进程中执行任意代码

**方案 4A — 通过 task port 注入（需 Phase 3）**
1. Phase 3 成功后获得 SB task port
2. mpd_fcall(mach_vm_allocate) 分配内存
3. mpd_fcall(mach_vm_write) 写入 shellcode
4. mpd_fcall(thread_create_running) 创建远程线程

**方案 4B — 内核级直接注入（不依赖 task port）**
1. 从 proc 找到 SB task 指针
2. 通过内核读写操作 task 的 vm_map
3. 修改 SB 进程的代码页或写入新页
4. 劫持已有线程或通过内核 API 创建线程

**方案 4C — dylib 注入**
1. 在 SB 进程分配内存
2. 写入 dylib 加载器 shellcode
3. shellcode 调用 dlopen 加载目标 dylib
4. dylib 可在用户态做任何事（文件访问、网络等）

### Phase 5：数据提取 (mpd_exfiltrate)

**目标**：从设备提取 keychain/wifi密码等数据

已有代码框架（`mpd_exfiltrate` 函数），需要：
1. Phase 3/4 完成后，mpd_fcall 有足够权限
2. 或直接在 sbx1 侧通过内核读读取文件系统缓存
3. 通过 HTTP 发送到开发机 (192.168.10.188:8001)

---

## 即时下一步（Phase 1 实现）

### Step 1：用 gpuDlsym 函数指针推算 kernel slide

```js
// gpuDlsym 返回的函数指针是 PAC 签名的
// 例如: task_for_pid = 0x8A21BD01D7CF9CC4
// xpac 去签名后得到裸函数地址

// 方法1: 利用已解析的多个函数交叉验证
// task_for_pid, mach_host_self, socket, connect 等
// 它们之间的相对偏移在 KC 中是固定的
// 与未 slide 的偏移比较 → 得出 slide

// 方法2: 利用 data_page 上的 0xFFFFFFFE0XXX 指针
// 这些是 PAC 签名的 KC 代码地址
// xpac 后得到 KC VA → 与未 slide 基址比较 → slide
```

### Step 2：验证 kernel_base

```js
// 读 kernel_base 处验证
let magic = uread64(kernel_base);
LOG(`kernel_base probe: ${magic.hex()}`);
```

### Step 3：找 allproc 并遍历 proc list

```js
let allproc_addr = kernel_base + ALLPROC_OFFSET;
let first_proc = uread64(allproc_addr);
// 遍历 proc list 找 PID=34
```

---

## 已知风险

1. **GPU uread64 在某些地址 hang** — 代码页必 hang，某些数据地址也可能 hang。需 try/catch + 超时保护
2. **PAC 去签名** — 需正确使用 xpac_gadget，否则指针错误
3. **kernel slide 每次启动不同** — 但运行期间稳定
4. **offset 依赖 iOS 版本** — 需确认目标设备 iOS 版本对应的 XNU offset
5. **proc 结构可能在堆上不在 KC 映射范围** — uread64 可能读不到动态分配的内核结构
6. **mpd_fcall ~2s/次** — 大量内核读操作会慢，需批量优化

---

## 里程碑

| 阶段 | 目标 | 预计复杂度 | 依赖 |
|------|------|-----------|------|
| Phase 1 | kernel slide + allproc | 中 | GPU krw + xpac |
| Phase 2 | SB proc/task 定位 | 中 | Phase 1（可能需 mpd_fcall 补充读高半 VA） |
| Phase 3 | AMFI bypass | 中 | Phase 1+2 |
| Phase 4 | SB 注入 | 高 | Phase 2+3 |
| Phase 5 | 数据提取 | 低 | Phase 4 |
