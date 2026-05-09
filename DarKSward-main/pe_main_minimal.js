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

// Read proc_listpids
let plist_buf = uread64(surf + 0xF838n);
let plist_count = uread64(surf + 0xF840n);
pw("[PE] C: cnt=" + plist_count);

if (plist_buf == 0n || plist_count == 0n) {
  pw("[PE] D: no plist");
} else {
  // Find SpringBoard PID - it's the one we want to inject
  // SpringBoard typically has a low PID and is always running
  // We need to ask sbx1 to call proc_name for each PID
  // For now, just output the count and our own PID
  let num = plist_count / 4n;
  pw("[PE] D: " + num + " procs");

  // Store PID list for sbx1 to read back
  // Write count and our_pid at known IOSurface offsets for sbx1
  uwrite64(surf + 0xF848n, plist_buf);
  uwrite64(surf + 0xF850n, plist_count);
  uwrite64(surf + 0xF858n, our_pid);
  uwrite64(surf + 0xF860n, 1n); // flag: PE is ready
}

pw("[PE] DONE");
