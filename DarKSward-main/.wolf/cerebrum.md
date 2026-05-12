# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: 2026-05-12

## User Preferences

<!-- How the user likes things done. Code style, tools, patterns, communication. -->

## Key Learnings

- **Project:** DarKSward-main
- **M5 IPC Architecture:** sbx1 (WebContent) uses `mpd_fcall` via IOSurface RPC to call functions in MPD process. Key functions: `mpd_fcall(address, x0..x7)` ~2s latency, `mpd_read64/write64/read8/write8` for MPD memory access via IOSurface bounce buffer at +0x2100.
- **GPU primitives in sbx1:** `uread64 = gpuRead64`, `uwrite64 = gpuWrite64` are GPU-based memory access (virtual addresses, WebContent process). Used for local and IOSurface memory. May or may not access physical memory (depends on GPU IOMMU config).
- **ICMPv6 socket kernel r/w bootstrap problem:** Header.js's `early_kread64` needs two ICMPv6 sockets with corrupted pcb. Corruption requires `physical_oob_read_mo` (pipe race condition using fcall → preadv/pwritev/mach_vm_map). In MPD, fcall is broken. Even if mpd_fcall creates sockets, the corruption step still needs physical memory access.
- **IOSurface RPC protocol:**

  | Offset | Field | Set by |
  |--------|-------|--------|
  | +0xF800 | RPC cmd | sbx1 |
  | +0xF828 | RPC status | sbx1 |
  | +0xF830 | PID | sbx1 (M3) |
  | +0xF838 | plist_buf | sbx1 (M4) |
  | +0xF840 | plist_count | sbx1 (M4) |
  | +0xF848 | SpringBoard PID | sbx1 (M4) |
  | +0xF850 | control_sock fd | sbx1 (M5) |
  | +0xF858 | rw_sock fd | sbx1 (M5) |
  | +0xF860 | setsockopt ptr | sbx1 (M5) |
  | +0xF868 | getsockopt ptr | sbx1 (M5) |
  | +0xF870 | kernel_base candidate | sbx1 (M5) |
  | +0xF878 | SB remote addr | sbx1 (M6) |
  | +0xF880 | SB task port | sbx1 (M6) |
  | +0xF888 | SB thread port | sbx1 (M7) |

## Do-Not-Repeat

<!-- Mistakes made and corrected. Each entry prevents the same mistake recurring. -->
<!-- Format: [YYYY-MM-DD] Description of what went wrong and what to do instead. -->

[2026-05-11] Do NOT use `xpac()` (clears bits 48-55) for kernel VA pointers — it strips the 0xFFFFFFF prefix. Use `xpac_full()` instead which restores kernel prefix via `0xFFFFFFF000000000n | (raw & 0xFFFFFFFFFn)`. For KC user-space addresses (gpuDlsym results), use `noPAC()` (ptr & 0x7FFFFFFFFFn) which correctly preserves bits 38:0.
[2026-05-11] Do NOT try to GPU-read 0xFFFFFFF... addresses via uread64 — GPU IOMMU cannot map high-half kernel VAs. Only KC-mapped pages (0x1_XXX range) are readable via GPU.
[2026-05-11] gpuDlsym returns PAC-signed KC user-space addresses (0x1_XXX), NOT kernel VAs. The KC slide and kernel slide are the same KASLR value, but the address spaces are different.
[2026-05-12] **cs_enforcement_disable is NOT near proc_name** — The brute-force scan around proc_name's data page is wrong. `proc_name` (kernel proc management) and `cs_enforcement_disable` (AMFI module) are in different kernel subsystems, likely far apart in kernel cache. The ±1MB scan found 100 false positives (all zero-initialized int32s), patch them didn't disable AMFI. task_for_pid still fails with KERN_INVALID_ARGUMENT (53) after "patching 100/100 candidates".
[2026-05-12] **GPU uwrite64 may trigger COW** — KC pages are shared across processes. GPU write to a KC page may only affect WebContent's copy (COW), NOT the live kernel. This explains why patching 100 candidates had zero effect. Need empirical test: write via GPU, read via mpd_fcall (different process) to confirm.
[2026-05-12] **PCB disconnect fails in MPD** — `connect(AF_UNSPEC)` = -1, `shutdown()` = -1, `disconnectx()` = -1. SOCK_DGRAM ICMPv6 sockets don't support disconnect in MPD sandbox. Fix: try SOCK_RAW, try close()+spray, or try PCB corruption via socket buffer exhaustion.
[2026-05-12] **Variable scope: socket_sym/getsockopt_raw are block-scoped** — Declared inside `if (m5_socket_ok)` IIFE, not accessible in A2. Always re-resolve via gpuDlsym in A2 scope, or read socket fds from IOSurface.
[2026-05-12] **Mach-O segname comparison value** — `"__DATA\0"` as u64 LE = `0x0000415441445F5Fn`, NOT `0x415441445F5F0000n`. Use `uread64(kc_base + lc_offset + 0x8n)` and compare to `0x0000415441445F5Fn`.

## Decision Log

<!-- Significant technical decisions with rationale. Why X was chosen over Y. -->

### 2026-05-10: Core bottleneck — GPU reads KC but not live kernel data

**Problem:** GPU `uread64` reads kernel cache (KC) addresses (0x1_XXXX_XXXX), but can't read kernel VA (0xFFFFFFF...). `gpuDlsym` only resolves function symbols, not data symbols like `allproc`/`kernel_task`. Without live kernel data access, can't traverse proc list or find pcb addresses.

**Original exploit's approach:** Uses `mach_make_memory_entry_64` to map physical kernel memory into userspace, then uses IOSurface OOB (`physical_oob_read_mo` / `physical_oob_write_mo`) to scan physical memory for pcb structures via process name string search. Once pcb found, corrupts ICMP6_FILTER pointer for kernel r/w.

**Our limitation:** sbx1 (WebContent) doesn't have direct access to these primitives. Must go through MPD via `mpd_fcall`.

### 2026-05-12: AMFI bypass — A2 implementation

**Root cause of failure**: GPU uwrite64 likely triggers COW (copy-on-write) on KC pages. GPU writes only affect WebContent process copy, NOT the live kernel. This explains why patching 100 candidates had zero effect.

**PCB disconnect failure**: `connect(AF_UNSPEC)`, `shutdown()`, `disconnectx()` all return -1 in MPD sandbox. SOCK_DGRAM ICMPv6 doesn't support disconnect. Fix attempts: SOCK_RAW, close()+spray.

**A2 strategy**:
1. COW verification test: GPU write + mpd_fcall readback
2. If COW confirmed: try socket spray race for PCB corruption
3. If COW confirmed and spray fails: scan __DATA via Mach-O parsing (for identification only)
4. PCB corruption via M5 is the ONLY viable kernel write path

**PCB corruption is THE bottleneck** — everything depends on fixing it.
**Fix approach**: SOCK_RAW socket type (full TCP/IP stack), close()+spray method, or buffer exhaustion race.