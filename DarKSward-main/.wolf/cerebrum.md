# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: 2026-05-13

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
- **mpd_fcall degrades after ANY timeout — not just after nowait** — `mpd_fcall_timeout` corrupts the fcall JOP chain when it times out. After ANY `mpd_fcall_timeout` call returns `MPD_FCALL_TIMED_OUT`, subsequent bare `mpd_fcall` calls hang. Fix: skip 0B-alt (the only source of timeout-induced corruption). DO NOT globally wrap `mpd_fcall` with timeout — that breaks all callers that don't check for `MPD_FCALL_TIMED_OUT`. Instead, use targeted `mpd_fcall_timeout` only where specifically needed (base funcs, post-nowait code).

## Do-Not-Repeat

<!-- Mistakes made and corrected. Each entry prevents the same mistake recurring. -->
<!-- Format: [YYYY-MM-DD] Description of what went wrong and what to do instead. -->

[2026-05-11] Do NOT use `xpac()` (clears bits 48-55) for kernel VA pointers — it strips the 0xFFFFFFF prefix. Use `xpac_full()` instead which restores kernel prefix via `0xFFFFFFF000000000n | (raw & 0xFFFFFFFFFn)`. For KC user-space addresses (gpuDlsym results), use `noPAC()` (ptr & 0x7FFFFFFFFFn) which correctly preserves bits 38:0.
[2026-05-11] Do NOT try to GPU-read 0xFFFFFFF... addresses via uread64 — GPU IOMMU cannot map high-half kernel VAs. Only KC-mapped pages (0x1_XXX range) are readable via GPU.
[2026-05-11] gpuDlsym returns PAC-signed KC user-space addresses (0x1_XXX), NOT kernel VAs. The KC slide and kernel slide are the same KASLR value, but the address spaces are different.
[2026-05-12] **gpuDlsym AMFI symbols return 0x0** — `cs_enforcement_disable`, `amfi_get_out_of_my_way`, `amfi_flags` all return 0x0 because they are static/hidden symbols not in the dyld export trie. The GPU can only access KC data pages (0x1_XXXX_XXXX), so even if we find the kernel VA (0xFFFFFFF...), it's inaccessible. Fix: need to verify if MPD has entitlement first (Phase A), then try processor_set_tasks (Phase B) as alternative path to task ports.
[2026-05-12] **Phase A/B/COW added to A2** — Own task_for_pid test + processor_set_tasks attempt + cross-process COW verify added to A2 section (line 7703+). These run before GPU patching attempts, giving diagnostic clarity on which blocker is the real issue.
[2026-05-12] **GPU uwrite64 may trigger COW** — KC pages are shared across processes. GPU write to a KC page may only affect WebContent's copy (COW), NOT the live kernel. This explains why patching 100 candidates had zero effect. Need empirical test: write via GPU, read via mpd_fcall (different process) to confirm.
[2026-05-12] **PCB disconnect fails in MPD — errno=EPERM(1)** — All 3 disconnect methods (AF_UNSPEC, shutdown, disconnectx) return -1 with errno=1 (EPERM). Not a parameter bug — MPD sandbox explicitly blocks socket disconnect. sa_len=16→28 fix didn't help. Fix: close()+spray race (close()不受沙盒限制).
[2026-05-12] **Variable scope: socket_sym/getsockopt_raw are block-scoped** — Declared inside `if (m5_socket_ok)` IIFE, not accessible in A2. Always re-resolve via gpuDlsym in A2 scope, or read socket fds from IOSurface.
[2026-05-12] **Mach-O segname comparison value** — `"__DATA\0"` as u64 LE = `0x0000415441445F5Fn`, NOT `0x415441445F5F0000n`. Use `uread64(kc_base + lc_offset + 0x8n)` and compare to `0x0000415441445F5Fn`.
[2026-05-13] **mpd_fcall_timeout corrupts fcall state on timeout** — When `mpd_fcall_timeout` times out, it leaves the JOP/fcall mechanism in a degraded state. ANY subsequent bare `mpd_fcall` will hang indefinitely. This is NOT limited to `mpd_evaluateScript_nowait` — even pre-nowait timeouts (like 0B-alt mach_task_self/mach_host_self) cause this. Fix: `mpd_fcall()` now wraps `mpd_fcall_timeout` internally, so all calls are auto-protected.
[2026-05-13] **Large code block replacements MUST verify brace balance** — When using Edit to replace code blocks that contain if/else/try/catch, always run `node --check` after. Missing closing braces cause the entire sbx1_main.js to fail parsing, which looks like the exploit is "stuck at early steps." Also: never use `await` in non-async IIFE; never use bare `return` in Phase blocks that should continue to subsequent phases.

- **2026-05-14 — Phase 0A cow_addr undefined bug**: When re-enabling dead code inside `if(false)`, ALWAYS verify all variable references are valid. `cow_addr` was never defined because the entire block was dead. Re-enabling caused silent ReferenceError → COW test always skipped with "test_addr value is 0 or FFs" message.
- **2026-05-14 — mpd_fcall timeout perf regression**: Wrapping ALL fcalls with 3s timeout kills performance (108s vs 5s). The timeout should only be applied to SPECIFIC operations known to hang (PE log reads, Phase 0B IOSurfaceCreate). Normal fcalls (getpid, proc_listpids, socket) return in <1ms. Use `mpd_fcall_timeout`/`mpd_read64_timeout` selectively, not as the default `mpd_fcall`.

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

### 2026-05-13: Phase 0 diagnostic — COW + MME + mach_vm_read

**Key insight**: Original DarKSward uses `mach_make_memory_entry_64` to map physical kernel memory into userspace. This was NEVER tried via mpd_fcall. It's the most critical untested path.

**Phase 0 diagnostic tests added** (sbx1_main.js:7432-7607):
1. **0A COW verification**: GPU write to KC page → mpd_fcall(memcpy) readback from same address. If MPD sees modified value, COW is not in effect.
2. **0B mach_make_memory_entry_64**: Call via mpd_fcall with task_self to get a memory entry port, then mach_vm_map it. If successful, physical memory is accessible.
3. **0B-alt mach_vm_read retest**: Use MPD-resolved task/host ports (not hardcoded 0x203) to test mach_vm_read on KC data pages and kernel_base.

**Decision tree**: COW_SAFE=true → A1 (KC symtab parsing) / A2 (hardcoded offsets). COW_SAFE=false → C1 (PE csops+task_for_pid) / C2 (MigFilterBypass). If 0B MME works → full kernel r/w regardless of COW.

### 2026-05-13: 0B PurpleGfxMem SUCCESS + mpd_read64 hang fix

**0B PurpleGfxMem method WORKS** (confirmed via device log):
- `CFDictionaryCreateMutable` → `IOSurfaceCreate("PurpleGfxMem")` → `IOSurfaceGetBaseAddress` → `mach_make_memory_entry_64(phys_addr)` → `mach_vm_map`
- Result: ret=0, entry=0x7107, phys_addr=0x14301c000, mapped_addr=0x32d2a4000
- 256KB physical memory mapped in MPD process space

**Hang cause**: `mpd_read64(mvm_addr)` calls `mpd_fcall(MEMCPY, ...)` without timeout. MPD page-faults on physically mapped memory → mpd_fcall spins forever waiting for retval. NOT a crash — permanent hang.

**Fix**: Added `mpd_read64_timeout(address)` (sbx1_main.js:6535) that uses `mpd_fcall_timeout` and returns `MPD_FCALL_TIMED_OUT` on timeout. 0B success path now sets `PHYS_MEM_MAPPED=true` before verification, uses timeout-protected read.

**Phase 0C added**: `mach_vm_remap` with different `offset` on the memory_object_port to scan physical pages without pwritev race. If remap works at varying offsets → physical memory scan is viable without dual-thread race.

**Revised assessment**: PCB corruption may NOT be the only path. mach_make_memory_entry_64 could bypass all COW/PCB issues entirely.