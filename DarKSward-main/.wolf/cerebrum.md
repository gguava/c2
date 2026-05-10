# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: 2026-05-09

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

## Decision Log

<!-- Significant technical decisions with rationale. Why X was chosen over Y. -->

### 2026-05-10: Core bottleneck — GPU reads KC but not live kernel data

**Problem:** GPU `uread64` reads kernel cache (KC) addresses (0x1_XXXX_XXXX), but can't read kernel VA (0xFFFFFFF...). `gpuDlsym` only resolves function symbols, not data symbols like `allproc`/`kernel_task`. Without live kernel data access, can't traverse proc list or find pcb addresses.

**Original exploit's approach:** Uses `mach_make_memory_entry_64` to map physical kernel memory into userspace, then uses IOSurface OOB (`physical_oob_read_mo` / `physical_oob_write_mo`) to scan physical memory for pcb structures via process name string search. Once pcb found, corrupts ICMP6_FILTER pointer for kernel r/w.

**Our limitation:** sbx1 (WebContent) doesn't have direct access to these primitives. Must go through MPD via `mpd_fcall`.

### Backup options (not yet explored):

1. **Brute-force scan kernel cache for allproc** — scan pages adjacent to the known data page (from proc_name ADRP) for linked-list patterns. The allproc head might be on nearby pages in the kernel cache.

2. **Find real kernel functions (not Mach trap stubs) via gpuDlsym** — many resolved symbols are Mach trap stubs (MOV X16 + SVC). Try alternative symbol names like `_proc_find_internal`, `kernproc`, or XNU internal functions that directly reference allproc.

3. **GPU-based pcb corruption** — since GPU can read KC pages, if the ICMPv6 socket's pcb address can be found at a KC address, use `uwrite64` directly to corrupt it instead of physical OOB.