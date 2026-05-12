// PE main - minimal: just test fcall_init
// IOSurface direct-write logging for immediate visibility
globalThis.pw = function() {};
globalThis._surf = 0n;
globalThis._log_offset_ptr = 0n;

// Initialize IOSurface logging before any fcall
try {
  // Read surface_address_remote from func_offsets[19]
  // func_offsets_array is a global defined by pe_stage_1
  let _fob_addr = addrof(func_offsets_array) + 0x10n;
  let _surf = uread64(_fob_addr + 19n * 8n);
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

pw("START: pe_main_minimal.js executing");

try {
  fcall_init();
  pw("fcall_init OK");
  // Now also set print as secondary output (writes to log_buffer + syslog)
  let _old_pw = globalThis.pw;
  globalThis.pw = function(s) {
    _old_pw(s);           // IOSurface (immediate visibility)
    try { print(s); } catch(e) {} // log_buffer + syslog (persistent)
  };
  let pid = fcall(func_resolve("getpid"));
  pw("getpid() = " + pid);
} catch(e) {
  pw("FAILED: " + (e.message || e));
  try {
    // Last attempt: try print directly
    globalThis.pw = print;
    pw("FAILED(print): " + (e.message || e));
  } catch(e2) {
    pw("FAILED(print also failed)");
  }
}

pw("DONE");
