# dsh-web-bg

给 **DeepSeek Harness Web GUI / 官方桌面客户端** 用的背景与界面外观插件：背景图、界面透明度、实色面板配色与透明度。

> 装给智能体看的手册在 [`AGENTS.md`](AGENTS.md)（面向零历史 DSH 智能体，含最短路径、验证三档、故障排查表）。

## 功能

| 功能 | 位置 | 说明 |
|---|---|---|
| 背景图 + 浓度 | 右下角控制面板 | 内置素材铺在界面之下，透明度 0–80% 可调（预设 8/15/25/40/60/80） |
| 更换图片 | 右下角控制面板 | 选本地图片，页内缩放到 ≤2560px 宽后存本地（**不上传**）；可一键恢复默认图 |
| 柔和模式 | 右下角控制面板 | 背景加 6px 模糊，文字更清爽 |
| 界面透明度 | 右下角控制面板 | **无级** 0–100%：0 = 原生实色界面，100 = 最透（各面板有可读性下限，层次不丢） |
| 实色面板配色 | 设置 → 通用（外观下方、字号上方） | 「实色面板颜色」：**浅色 / 深色各一个**十六进制输入，各带圆形预览色；系统模式按实际生效方案取值。浅色模式的实色面板会比设定值**偏白**、深色模式**偏黑**（默认各 10%，可在源码里调） |
| 实色面板透明度 | 同一行内 | **0–50%** 滑杆（最透时 alpha = 0.5），作用于输入框/菜单/气泡/代码块等实色面板。**设置界面固定不透明**；不设颜色也能用：未设颜色的模式按客户端自带色做 `color-mix` 半透明 |

设计取舍：背景透出来的是**画布、侧栏、卡片层 1、浮层**；设置页与各类工具面板（插件管理、目录选择器、轨迹、文档预览）刻意保持实色，避免功能性界面被背景干扰——它们的颜色交给上面那条十六进制设置项统一调整。

## 安装

```powershell
# 安装脚本以 .ps1.txt 附带（避开 Windows 高危扩展名）：先改回 .ps1
Copy-Item .\install.ps1.txt .\install.ps1

# 官方桌面客户端
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -Profile desktop

# 命令行 dsh web
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -Profile web
```

安装做的事：把包复制到 `<profile>\node_modules\dsh-web-bg`，并把 `dsh-web-bg` 加进 `<profile>\package.json` 的 `dsh.profile.bundles`（**bundle 层**，也就是客户端自己管理插件的位置；改前自动备份）。

> 为什么不用用户补丁层 `cordis.patch.yml`？实测：客户端保存自己的设置（外观、语言等）时会整体重写该文件，写在里面的 `insert` 会被抹掉。

安装后**重启运行时**（桌面版需完全退出），然后：

- 右下角输入框上方出现蓝色圆点 → 点开是控制面板
- **设置 → 通用** 出现「实色面板颜色」
- 自检日志：`%USERPROFILE%\.dsh\dsh-web-bg-report.log`

卸载：

```powershell
Copy-Item .\install.ps1.txt .\install.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -Profile desktop -Uninstall
```

## 包结构

```
dsh-web-bg/
├─ AGENTS.md                 面向智能体的安装/运维手册（先读这个）
├─ README.md                 本文件
├─ install.ps1.txt           一键安装 / 卸载（幂等、自动备份；改名为 .ps1 后运行）
├─ cordis.patch.yml          bundle 层的 insert 声明（客户端读它插入 web-bg 条目）
├─ package.json              插件清单：dsh.bundle.patch + main + exports["./client"]
├─ art.jpg                   内置素材（已按 DSH 深色基调调色）
├─ assets/source.jpg         原始素材（重建用）
├─ lib/
│  ├─ index.mjs              节点半边：自检路由 + 日志（/dsh-web-bg/report、/dsh-web-bg/art.jpg）
│  ├─ client.mjs             浏览器半边（构建产物，素材以 data URI 内嵌）
│  └─ client.template.mjs    浏览器半边源码（__ART__ 占位符）
└─ tools/
   ├─ make_bg.py             素材调色：assets/source.jpg → art.jpg
   ├─ build_plugin.py         client.template.mjs + art.jpg → lib/client.mjs
   ├─ test-installer.ps1.txt 在一份临时 profile 上跑安装往返自测（改名后在包目录内运行）
   └─ preview/op*.jpg        透明度预混预览图（可选素材）
```

### 为什么包里没有 `.js` / `.ps1`

Windows 的资源管理器在打开压缩包时，会按**高危扩展名清单**（含 `.js`、`.ps1`、`.exe`、`.bat` 等）提示"这些文件可能会损害你的计算机"。为了让人下载时**不看到这个提示**：

- 两个半边命名为 `.mjs`（不在清单里；加载路径由 `package.json` 决定，扩展名对客户端无影响）
- 安装脚本以 `install.ps1.txt` 提供（使用前改名回 `.ps1`，内容完全一致）

若你的解压工具仍提示，或压缩包被标记为"来自 Internet"，可以先 `Unblock-File .\dsh-web-bg-*.zip`，或用 `Get-FileHash .\dsh-web-bg-*.zip -Algorithm SHA256` 核对后再继续。

## 重建

```powershell
python tools\make_bg.py        # 需要 numpy + Pillow
python tools\build_plugin.py   # lib\client.template.mjs → lib\client.mjs
node --check lib\client.mjs
```

两个脚本都用**相对本包的路径**，换机器可直接跑；构建可复现（同样的素材产出同样的 bundle）。

## 前置与限制

- 目标机器需已装 DSH（官方桌面客户端或 `dsh web` CLI 发行版），Windows 下验证
- 本包**无依赖、无安装脚本、不联网**：不需要 pnpm / allowBuilds
- 激活点是 profile 的 `dsh.profile.bundles`（bundle 层）；**改配置必须重启运行时**
- 桌面客户端的 profile（`desktop`）由应用专管，`dsh` CLI 拒绝操作它，因此走手工放包 + 改 bundles（`install.ps1` 已封装）
- 客户端在自己管理插件（应用内安装/卸载）时会重排 `dsh.profile.bundles`，可能顺带移除手加条目——重跑 `install.ps1` 即可
- 透明轴与配色依赖客户端内部令牌名（`--dsw-alias-*` / `--dsw-specific-*`）；客户端大版本升级后若令牌变动需要重新扫描（方法见 `AGENTS.md` §9）

## 素材

`assets/source.jpg` 由使用者提供，版权归原权利人；本仓库只做本地加载与渲染，**再分发前请自行确认授权**。
