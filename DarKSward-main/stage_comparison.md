# DarKSward 阶段对比表 — 原版 vs 当前版本

> 最后更新: 2026-05-15
> 数据来源: 最近一次实际设备运行日志 (03:00:10-03:00:33), pe-fix 分支 commit `da25664`

| # | 阶段 | 原版 | 当前 (sbx1_main.js) | 最后运行结果 |
|---|------|------|---------------------|------------|
| 0 | **GPU 原语** | gpuRead64/gpuWrite64 (IOSurface RemoteRenderingBackend) | uread64/uwrite64 (相同 GPU 原语) | ⚪ 可用（未验证完整性） |
| 1 | **JS 原语** | addrof/fakeobj/read64/write64 (JSC 类型混淆) | gpuDlsym/gpuRead64（GPU 符号 → KC 地址） | ⚪ 通过 GPU |
| 2 | **GC 禁用** | JSC 空闲列表损坏 → isSafeToCollect | 不需要（不走 JSC alloc） | ✅ 跳过（不适用） |
| 3 | **JIT 启用** | write64 到 jitAllowList | 不需要（GPU 不依赖 JIT） | ✅ 跳过（不适用） |
| 4 | **Bundle 损坏** | TextToSpeech → PerfPowerServices → libGPUCompilerImplLazy | 不需要（直接用 MPD fcall） | ✅ 跳过（不适用） |
| 5 | **CMPhoto 插入** | interpose(MediaAccessibility, ImageIO) | 不需要 | ✅ 跳过（不适用） |
| 6 | **JOP 链 + fcall 线程** | pthread_create JOP 链 → fcall thread | mpd_fcall_internal（IOSurface RPC） | ⚪ 可用但有超时问题 |
| 7 | **Phase 1 IMMEDIATE** | —（不存在，slide 在 PE 侧计算） | 通过 gpuDlsym + PAC 指针计算 | ✅ SUCCESS `kernel_base=0xfffffff1a3ab0000` |
| 8 | **Phase 0A COW 验证** | —（不存在，原版不走 GPU 写路径） | GPU 写 → mpd_read64 回读 | ✅ CONFIRMED COW（写不可见） |
| 9 | **Phase 0B PurpleGfxMem** | —（不存在，原版不走物理内存路径） | dlopen CoreFoundation → IOSurfaceCreate → MME | ✅ BREAKTHROUGH 物理内存已映射 |
| 10 | **Phase 0B-alt** | —（不存在） | mach_vm_read 重测 | ❌ SKIPPED（总会损坏 fcall） |
| 11 | **Phase 0C remap 扫描** | —（不存在） | mach_vm_remap 偏移扫描 | ❌ 超时/未就绪 |
| 12 | **Phase 0D 物理 PCB 扫描** | —（不存在） | mach_vm_remap 物理内存 → PCB 扫描 | ❌ PHYS_SCAN_VIA_REMAP=undefined |
| 13 | **Phase 2 allproc 扫描** | 通过 PE Chain/Driver 扫描 | SKIPPED（高半 VA GPU 不可达） | ⚪ SKIPPED（预期） |
| 14 | **P2 processor_set_tasks** | —（原版不这样绕 AMFI，用 Sandbox+launchd） | 通过 mpd_fcall 调用 → 扫描任务端口 | ❌ FAILED pset_port=0x0（iOS 18 无 entitlement） |
| 15 | **A2 GPU AMFI 绕过** | —（原版用 launchd TaskRop 注入） | GPU uwrite64 到 cs_enforcement_disable / amfi_flags / amfi_get_out_of_my_way | ❌ FAILED gpuDlsym 全返回 0x0（静态符号不可解析） |
| 16 | **A2 task_for_pid(34) 测试** | — | GPU 写入后测试 | ❌ FAILED ret=53 (KERN_FAILURE) |
| 17 | **M5 Opt2 host:task_for_pid** | — | gpuDlsym(task_for_pid) + mach_host_self → 调用 | ❌ FAILED ret=53 |
| 18 | **M5-DIAG mach_vm_read** | 原版 PE 侧使用 | mpd_fcall 测试 3 种读取 | ❌ FAILED 全返回 53 |
| 19 | **M5 ICMPv6 套接字** | 原版 PE 侧创建 | MPD 中创建 control+rw 套接字 | ✅ SUCCESS control=3, rw=4 |
| 20 | **M5 setsockopt/getsockopt** | 原版 PE 侧设置 | MPD 中设置 ICMP6_FILTER | ✅ SUCCESS ret=0（但读取值为 FFs） |
| 21 | **M5 PCB 断开 (3 方法)** | 原版 kernel r/w 后无需断开 | connect(AF_UNSPEC) / shutdown / disconnectx | ❌ FAILED 全 -1 errno=1 (EPERM) |
| 22 | **M5 P1b close+spray 竞争** | —（原版不需要竞争） | close(control) → spray 20-60 socket → getsockopt | ❌ FAILED 4 次尝试全部 FFs |
| 23 | **P3 GPU uwrite64 PCB** | —（原版不走 GPU 写 PCB） | GPU 直接写 PCB 的 ICMP6_FILTER 指针 | ❌ SKIPPED（GPU COW 已确认） |
| 24 | **M5 kread64/kwrite64** | PE 侧 kernel_task port → TaskRop | GPU uread64 fallback（只读） | ⚪ 退化到只读 |
| 25 | **PE dispatch** | Chain.runPE() → pe_main（同步 fcall） | mpd_evaluateScript_nowait（异步 15s 等待） | ❌ FAILED log_off=0（PE 未执行） |
| 26 | **PE 日志读取** | 同步 fcall 返回值 | IOSurface log → mpd_read64 | ❌ FAILED 超时（fcall 降级） |
| 27 | **KTASK 内核任务遍历** | Chain/Driver 扫描 allproc | mpd_fcall(proc_listpids) + PID 扫描 | ⚪ SHORT CIRCUIT（用已知 PID 34） |
| 28 | **M6 SpringBoard 注入** | InjectJS(SpringBoard, loaderCode) (launchd task port) | task_for_pid(34) → vm_allocate + vm_write + thread_create | ❌ FAILED task_for_pid 符号异常 |
| 29 | **M7 远程线程** | thread_create_running | mpd_fcall(thread_create_running) | ❌ 未执行（M6 失败） |
| 30 | **数据提取** | 文件下载器/keychain/WiFi/iCloud → 输出 | 未实现（M6/M7 未通过） | ⬜ 未触及 |

## 关键结论

**原版成功路径：**
JSC 原语 → JIT → Bundle 损坏 → JOP 链 → fcall 线程 → `pe_main` (同步) → `Chain.runPE()` (内核基址) → `TaskRop` (kernel_task port) → `Sandbox` (launchd 注入) → `InjectJS(SpringBoard)` → 多个数据提取 payload

**当前卡点：**
PCB corruption 竞争 `close()+spray` 失败（MPD 沙箱阻塞 socket 断开） → 无法获取内核读/写 → `task_for_pid` 返回 `53` → 无法注入 SpringBoard

**最大希望：**
Phase 0B 已经成功映射物理内存（`PHYS_MEM_MAPPED=true`），但 `PHYS_SCAN_VIA_REMAP=undefined`（0C 阶段未就绪）。如果能修复 0C/0D 的物理内存扫描，就能绕过 socket spray race 直接物理搜索 PCB 结构。
