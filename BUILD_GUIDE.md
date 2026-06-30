# 编译打包必看（Echo 项目 Android Debug APK）

> ⚠️ **AI 阅读提示**：本节"依赖位置速查表"是项目级关键事实，每次接手本项目先看这里。

---

## 0. 依赖位置速查表（AI 必看）

| 组件 | 路径 | 备注 |
|---|---|---|
| JDK 17 | `H:\Java\jdk17` | **必须**，21 不可用 |
| Android SDK | `H:\Android_ide` | ANDROID_HOME |
| NDK 26.1.10909125 | `X:\APP\echo\.gradle\ndk-extract\android-ndk-r26b` | 从 `X:\APP\android-ndk-r26b-windows.zip` 解压 |
| NDK 原始 zip | `X:\APP\android-ndk-r26b-windows.zip` | 用户已下载 |
| Gradle 8.10.2 zip | `X:\APP\echo\.gradle\gradle-8.10.2-all.zip` | 校验通过 |
| Gradle 解压目录 | `X:\APP\echo\.gradle\gradle-8.10.2\` | |
| Gradle 缓存 | `X:\APP\echo\.gradle\home\` | GRADLE_USER_HOME 指向这里 |
| **项目根目录** | `X:\APP\echo` | |
| **APK 产物** | `X:\APP\echo\android\app\build\outputs\apk\debug\app-debug.apk` | 188 MB |
| **详细说明** | `X:\APP\echo\BUILD_GUIDE.md` | 本文档 |
| **跨会话记忆** | `c:\Users\Administrator\.trae\memory\projects\-x-APP-echo\project_memory.md` | AI 启动时自动加载 |

**环境变量模板**（每次开新终端必须设）：
```powershell
$env:JAVA_HOME = "H:\Java\jdk17"
$env:Path = "H:\Java\jdk17\bin;$env:Path"
$env:GRADLE_USER_HOME = "X:\APP\echo\.gradle\home"
$env:ANDROID_NDK_HOME = "X:\APP\echo\.gradle\ndk-extract\android-ndk-r26b"
```

---

## 1. 环境要求

| 组件 | 版本 | 说明 |
|---|---|---|
| JDK | **17** | ⚠️ 21 不兼容 |
| Node.js | ≥ 18 | Expo SDK 52 要求 |
| Android SDK | API 34/35 | build-tools 35.0.0、platform 35 |
| NDK | **26.1.10909125** | 项目硬编码 |
| Gradle | 8.10.2 | wrapper 版本 |
| CMake | 3.22.1 | Android SDK 自带 |

---

## 2. 一次性下载（避免每次都被卡）

### 2.1 Gradle 8.10.2（217 MB）

```powershell
Invoke-WebRequest "https://mirrors.cloud.tencent.com/gradle/gradle-8.10.2-all.zip" `
  -OutFile "X:\APP\echo\.gradle\gradle-8.10.2-all.zip"
Expand-Archive "X:\APP\echo\.gradle\gradle-8.10.2-all.zip" -DestinationPath "X:\APP\echo\.gradle"
```

校验 SHA256：`2AB88D6DE2C23E6ADAE7363AE6E29CBDD2A709E992929B48B6530FD0C7133BD6`

### 2.2 NDK r26b（631 MB）

```powershell
Invoke-WebRequest "https://googledownloads.cn/android/repository/android-ndk-r26b-windows.zip" `
  -OutFile "X:\APP\android-ndk-r26b-windows.zip"
Expand-Archive "X:\APP\android-ndk-r26b-windows.zip" -DestinationPath "X:\APP\echo\.gradle\ndk-extract"
```

### 2.3 修改 wrapper 指向本地 zip

编辑 `android/gradle/wrapper/gradle-wrapper.properties`：
```properties
distributionUrl=file\:/X\:/APP/echo/.gradle/gradle-8.10.2-all.zip
validateDistributionUrl=false
```

---

## 3. 首次编译流程

```powershell
cd X:\APP\echo
npm install --no-audit --no-fund
npx expo prebuild --platform android --clean
"sdk.dir=H:\Android_ide`nndk.dir=X:\APP\echo\.gradle\ndk-extract\android-ndk-r26b" | Out-File "android\local.properties" -Encoding ascii

$env:JAVA_HOME = "H:\Java\jdk17"
$env:Path = "H:\Java\jdk17\bin;$env:Path"
$env:GRADLE_USER_HOME = "X:\APP\echo\.gradle\home"
$env:ANDROID_NDK_HOME = "X:\APP\echo\.gradle\ndk-extract\android-ndk-r26b"
cd android
.\gradlew.bat assembleDebug --no-daemon --console=plain
```

构建产物：`android/app/build/outputs/apk/debug/app-debug.apk`（约 188 MB）

---

## 4. 增量编译

```powershell
cd X:\APP\echo\android
.\gradlew.bat assembleDebug
```

---

## 5. 已应用到本项目的关键修改（prebuild 后需重新应用）

### 5.1 `android/gradle/wrapper/gradle-wrapper.properties`
```properties
distributionUrl=file\:/X\:/APP/echo/.gradle/gradle-8.10.2-all.zip
validateDistributionUrl=false
```

### 5.2 `android/local.properties`（手动创建，prebuild 不会自动生成）
```properties
sdk.dir=H:\\Android_ide
ndk.dir=X:\\APP\\echo\\.gradle\\ndk-extract\\android-ndk-r26b
```

### 5.3 `android/app/build.gradle`（react 块）
```groovy
react {
    // ... 其他配置 ...
    debuggableVariants = []   // 让 debug variant 也打包 JS bundle
}
```

### 5.4 `MainApplication.kt`
```kotlin
override fun getUseDeveloperSupport(): Boolean = false   // 不连 Metro
```

---

## 6. 踩坑教训（必看）

### 6.1 ❌ 不要用 JDK 21
**症状**：Kotlin daemon 报 `Could not connect to Kotlin compile daemon`，Gradle 启动后长时间无输出。
**修法**：切换到 JDK 17。

### 6.2 ❌ 不要让 wrapper 自己去下 Gradle
**症状**：`Reason: zip END header not found`，校验和失败。
**修法**：用腾讯云镜像手动下载并修改 wrapper 指向本地。

### 6.3 ❌ 不要用 Google 官方源下 NDK
**症状**：下载速度 < 0.4 MB/s。
**修法**：用 `googledownloads.cn` 镜像，速度可达 5-10 MB/s。

### 6.4 ❌ 不要把 Gradle/NDK 缓存放 C 盘
**修法**：用 `$env:GRADLE_USER_HOME` 把缓存放其他盘。

### 6.5 ❌ 不要移动 NDK 到 Android SDK 的 ndk 目录
**症状**：大量 `PermissionDenied: UnauthorizedAccessException`。
**原因**：NDK r26b 内含几十万个文件，PowerShell `Move-Item` 会被 sandbox 拦掉。
**修法**：直接用 `local.properties` 的 `ndk.dir` 指定任意路径。

### 6.6 ❌ 不要在 sandbox 下跑 ninja/clang
**症状**：`ninja: fatal: GetOverlappedResult: 操作成功完成`。
**修法**：必须用 `dangerouslyDisableSandbox: true`，或直接在 IDE/系统终端手动跑。

### 6.7 ❌ 默认 debug APK 不能离线运行
**症状**：
```
unable to load script. make sure you either running metro ...
```
**修法**：见 §5.3 和 §5.4。

### 6.8 ❌ node_modules 残缺但 expo 命令缺失
**症状**：`npx expo` 报 `'expo' 不是内部或外部命令`。
**修法**：`rm -rf node_modules && npm install`。

---

## 7. 故障排查清单

| 症状 | 检查项 |
|---|---|
| Gradle 下载慢/失败 | 是否改了 wrapper 用本地 zip？是否删了 C 盘的损坏缓存？ |
| NDK 找不到 | `local.properties` 的 ndk.dir 是否正确？`X:\APP\echo\.gradle\ndk-extract\android-ndk-r26b\source.properties` 是否存在？ |
| 编译到 CMake 阶段失败 | 是否用了 sandbox？需要禁用 sandbox |
| APK 安装后白屏 | bundle 是否嵌入？`getUseDeveloperSupport()` 是否为 false？`debuggableVariants` 是否为 `[]`？ |
| expo 命令找不到 | `node_modules\.bin\expo.cmd` 是否存在？不存在就重装 |
| Kotlin daemon 报错 | 是否用了 JDK 17？JAVA_HOME 是否正确？ |
| 第一次构建 20+ 分钟 | 正常；第二次构建 1-2 分钟 |