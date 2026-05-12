# Phase 1 对比：`5e4ecc5` vs `a05078e`

| # | 节点 | 原版 `5e4ecc5` | 当前 `a05078e` |
|---|------|-------------------|-------------------|
| 1 | `index.html` → `frame.html` → `rce_loader.js` | 相同 | 相同 |
| 2 | Worker: `main()` → `_aarw_main()` | ~2ms / ~9ms | ~2ms / ~6ms |
| 3 | `stage1_prim` / `stage2_prim` | ~68ms / ~74ms | ~81ms / ~88ms |
| 4 | 加载 `sbx0_main_18.4.js` | 相同 | 相同（ref 参数不同：`phase1-v2`） |
| 5 | `eval(sbx1_main.js)` | 相同 | 相同 |
| 6 | VERSION / Build 日志 | `FixedXpac-v1` | `Phase1-ImprovedSlide-v2` |
| 7 | `sample_buffer` 初始化 | ~1.3s | ~1.5s |
| 8 | **`SLIDE` (dyld shared cache)** | **0xa89c000** | **0xa89c000** 相同 |
| 9 | **Phase 1 计算** | **❌ 不存在**（卡在 scaler/MPD 初始化前） | **新增** — IIFE 立即执行，90ms 完成 |
| 10 | `xpac` 函数 | `ptr.noPAC()` | **不变** |
| 11 | `xpac_full` 函数 | 无 | **新增** — KPPL PAC → 完整内核 VA |
| 12 | 内核符号解析 | 分散在 M5/MPD 各阶段 | **提前集中** — 7 个符号一次性解析 |
| 13 | PAC 指针扫描 | 在 M5 数据页扫描中（从未到达） | **提前** — 数据页 12 个 PAC 指针立即扫描 |
| 14 | **`kernel_base` 结果** | **从未产生** | **`0xFFFFFFF195414000`** |
| 15 | Scaler / IOSurface 初始化 | 卡在此处 | **不变** — 正常完成 |
| 16 | EXP bypass (466次尝试) | 卡在此前 | **不变** — 51ms 完成 |
| 17 | MPD `spawn_pe()` | 从未到达 | **不变** — ~13.4s |
| 18 | MPD func_offsets 设置 | 从未到达 | **不变** |
| 19 | SpringBoard PID 扫描 | 从未到达 | **不变** — PID=34 |
| 20 | **Phase 1 (EARLY) 检查** | 无 | **新增** — 检测已有结果，跳过重复计算 |
| 21 | M5: `mach_make_memory_entry` | 相同逻辑（未到达） | **不变** — handle=0 失败 |
| 22 | M5: GPU kernel write 测试 | 相同逻辑（未到达） | **不变** |
| 23 | M5: 数据页读取 | 相同逻辑（未到达） | **不变** |
| 24 | **Phase 1 (retry)** | 原版 4 种方法（从未到达） | **修改** — 检测已有结果，跳过 |
| 25 | Phase 2: allproc 扫描 | 相同逻辑（未到达） | **不变** |
| 26 | M5: ICMPv6 socket 创建 | 相同逻辑（未到达） | **不变** — control=3, rw=4 |
| 27 | M5: PCB disconnect | 相同逻辑（未到达） | **不变** — 全部返回 -1 |
| 28 | M5: GPU krw 注册 | 相同逻辑（未到达） | **不变** |
| 29 | `[PE] DONE` | 从未到达 | 到达 |
| 30 | MPD exfil (跳过) | 从未到达 | **不变** |
| 31 | KTASK: SpringBoard task | 从未到达 | **不变** — task_for_pid 返回 53 但 port=0 |
| 32 | M6: AMFI patch 跳过 | 从未到达 | **不变** |
| 33 | bmalloc metadata 恢复 | 从未到达 | **不变** |
| 34 | **`ALL DONE!` / `_exit()`** | **❌ 从未到达** | **✅ ~14.6s 完成** |

## 总结

当前版本比原版多了 **3 个新节点**（9、11、20），修改了 **1 个节点**（24），其余 30 个节点完全相同。

核心价值：从「SLIDE 后卡死」变成「90ms 出 kernel_base + 14.6s 跑完全程」。
