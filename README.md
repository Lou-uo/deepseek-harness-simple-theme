<div align="center">

<h1>DeepSeek Harness 壁纸与界面透明度插件</h1>

<p><strong>给 DeepSeek Harness（DSH）的 Web GUI / 官方桌面客户端铺一张壁纸，并把界面调成你喜欢的通透程度。</strong></p>

<p>不改一行 DSH 源码、不用 <code>pnpm build</code>、不联网、不装依赖。<br>把一个文件夹塞进 profile 的 <code>node_modules</code>，重启客户端，界面就变了。</p>

<p><a href="https://github.com/Lou-uo/deepseek-harness-simple-theme/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/Lou-uo/deepseek-harness-simple-theme?style=flat&amp;label=stars"></a> <a href="https://github.com/Lou-uo/deepseek-harness-simple-theme/network/members"><img alt="GitHub forks" src="https://img.shields.io/github/forks/Lou-uo/deepseek-harness-simple-theme?style=flat&amp;label=forks"></a> <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-informational?style=flat"></a> <a href="https://github.com/deepseek-ai/deepseek-harness"><img alt="DSH" src="https://img.shields.io/badge/DSH-0.1.0--rc.5-4C6EF5?style=flat"></a> <a href="https://github.com/deepseek-ai/deepseek-harness"><img alt="Platform" src="https://img.shields.io/badge/platform-Windows-0078D4?style=flat"></a></p>

</div>

<!-- TODO: 若做了英文版，补一个 [English](./README.en.md) 链接 -->

---

## 目录

- [它长什么样](#它长什么样)
- [三件事](#三件事)
- [安装](#安装)
- [验证](#验证)
- [卸载](#卸载)
- [工作原理](#工作原理)
- [仓库结构](#仓库结构)
- [从源码重建](#从源码重建)
- [Windows 安全提示](#windows-安全提示)
- [常见问题](#常见问题)
- [限制与素材](#限制与素材)

---

## 它长什么样

下面全是 DSH 官方桌面客户端的真机截图，**没有一处界面功能被改动**——侧栏、会话列表、输入框、设置面板都是原生控件，只是壁纸铺在了它们下面、界面的表面令牌被调透明了。

### 深色 / 浅色

<div align="center">
  <table>
    <tr>
      <th align="center" width="50%">深色模式</th>
      <th align="center" width="50%">浅色模式</th>
    </tr>
    <tr>
      <td align="center"><img src="figures/整体展示-深色模式.png" alt="深色模式：冷蓝壁纸透过半透明界面" width="100%"></td>
      <td align="center"><img src="figures/整体展示-浅色模式.png" alt="浅色模式：淡紫壁纸透过半透明白色界面" width="100%"></td>
    </tr>
  </table>
</div>

同一张素材在两种方案下的表现：深色模式里壁纸压到冷蓝调，浅色模式里整体泛白，两边都保留了界面与背景之间的层次。右下角那个小蓝点就是插件的控制面板入口。

### 控制面板与自定义面板

<img src="figures/新增的自定义面板.png" alt="设置里新增的「实色面板颜色」行与右下角展开的控制面板">

这一张里能看到插件加出来的两处界面：

**① 设置 → 通用 里的「实色面板颜色」行**（上图左侧橙框）。它紧贴在「外观」下方、「字号大小」上方，是插件注册进去的：

| 控件 | 范围 | 说明 |
|---|---|---|
| 浅色模式 / 深色模式 | `#RRGGBB` / `#RGB` / 不带 `#` | 各一个色值；左侧圆点是**实际生效色**（已含偏色与透明度） |
| 恢复默认 | — | 清空两个颜色并把透明度归零，回到客户端原生状态 |
| 透明度 | 0–50% | 作用于输入框、菜单、消息气泡、代码块等实色面板 |

一个色值会改掉一整族面板：先按模式施加偏色（浅色朝白混 10%、深色朝黑混 10%），再叠加每个面板自己的明暗偏移（下拉菜单 +4%、代码块 −6%、层 3/4 +6%/+10% ……），所以它们之间的层次不会塌。**设置界面固定不透明**——功能性界面不该被背景干扰，这一点在截图里能直接看到：即使界面透明度拉满，整个设置对话框依然是实色的。

**② 右下角展开的控制面板**（上图右侧橙框），四个控件自上而下：

| 控件 | 范围 / 默认 | 说明 |
|---|---|---|
| 背景浓度 | 0–80%，默认 22% | 壁纸图层浓度；预设 8 / 15 / 25 / 40 / 60 / 80 |
| 界面透明度 | 0–100%，默认 60% | 0 = 客户端原生实色，100 = 最透；预设 0 / 30 / 60 / 85 |
| 柔和模式（背景模糊） | 开关，默认开 | 给壁纸加 6px 模糊 |
| 更换图片… / 恢复默认图 | — | 本地选图，页内缩放到 ≤2560px 宽转 JPEG 存 localStorage，**不上传** |

面板底部那行「当前：内置素材（深海女仆工坊）」告诉你现在用的是内置素材还是你自己换的图。

### 柔和模式：开 / 关

<div align="center">
  <table>
    <tr>
      <th align="center" width="50%">☑ 柔和模式（背景模糊）</th>
      <th align="center" width="50%">☐ 非柔化模式</th>
    </tr>
    <tr>
      <td align="center"><img src="figures/柔化模式展示.png" alt="柔和模式开启：壁纸被 6px 模糊，文字更清爽" width="100%"></td>
      <td align="center"><img src="figures/非柔化模式展示.png" alt="柔和模式关闭：壁纸清晰锐利" width="100%"></td>
    </tr>
  </table>
</div>

这两张是同一套参数（背景浓度 80%、界面透明度 100%）下只切换柔和模式的对照：勾选时壁纸被 6px 模糊压下去，长会话里读字更省力；取消勾选壁纸恢复锐利，细节最完整。模糊只作用在壁纸图层上，**界面文字不会被一起糊掉**。

### 换自己的图

<img src="figures/自由更换背景图片.png" alt="点「更换图片…」弹出本地文件选择框，选完后壁纸立刻换成用户自己的图片">

控制面板里的「更换图片…」会调起系统文件选择框，选中任意本地图片后界面立刻换图——上图选的是 `2.webp`，换成的是一张和内置素材完全无关的图。

这件事**全在本机完成**：图片在页面里解码、等比缩放到 ≤2560px 宽、转成 JPEG 存进 localStorage，全程不经过任何网络请求，也不写进 DSH 的目录。换图之后面板底部那行会从「当前：内置素材（深海女仆工坊）」变成「当前：2.webp」；点「恢复默认图」就退回内置素材。

<!--
【可选 · 补充截图】
src/tools/preview/ 下已有 op08.jpg / op15.jpg / op25.jpg / op40.jpg / op60.jpg 五张按浓度预混的壁纸预览图，
但它们只含壁纸图层本身、不含界面。若想补「背景浓度 8% → 80%」的界面级对比，
需要另外截一组只改背景浓度、其余参数一致的界面截图。
-->

---

## 三件事

| 功能 | 在哪调 | 说明 |
|---|---|---|
| **背景壁纸** | 右下角控制面板 | 内置一张已按 DSH 深色基调调过色的插画，铺在界面之下；浓度 0–80% 无级可调，预设 8/15/25/40/60/80 |
| **界面透明度** | 右下角控制面板 | 无级 0–100%：0 = 客户端原生实色，100 = 最透。每个面板有自己的可读性下限，层次不会塌 |
| **实色面板配色** | 设置 → 通用 | 「实色面板颜色」一行：浅色 / 深色各一个十六进制色值，带圆形预览；再配一条 0–50% 透明度滑杆 |
| **柔和模式** | 右下角控制面板 | 给背景加 6px 模糊，文字更清爽（默认开） |
| **换自己的图** | 右下角控制面板 | 选本地图片，页内缩放到 ≤2560px 宽转 JPEG 存 localStorage，**不上传**；可一键恢复默认图 |

**设计取舍**：背景透出来的是**画布、侧栏、卡片层 1、浮层**。设置页与各类工具面板（插件管理、目录选择器、轨迹、文档预览）刻意保持实色——功能性界面不该被背景干扰，它们的颜色交给上面那条十六进制设置项统一调整。

---

## 安装

前置：目标机器上已经装好并用过 DSH（官方桌面客户端，或 `dsh web` 的 CLI 发行版）。本插件**只验证过 Windows**。

### 1. 拿到插件包

```powershell
# 方式 A：克隆仓库（推荐，git 不会给文件打「来自 Internet」标记）
git clone https://github.com/Lou-uo/deepseek-harness-simple-theme.git
cd deepseek-harness-simple-theme\src

# 方式 B：下载本仓库的 zip 并解压，然后进入解压出来的 src 目录
```

> 插件包就是本仓库的 `src/` 目录，里面的文件就是最终形态，不需要编译。

### 2. 改名并运行安装脚本

安装脚本以 `install.ps1.txt` 附带（原因见 [Windows 安全提示](#windows-安全提示)），先改回 `.ps1`：

```powershell
# 官方桌面客户端（profile = desktop）
Copy-Item .\install.ps1.txt .\install.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -Profile desktop

# 命令行 dsh web（profile = web）
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -Profile web
```

加 `-DryRun` 可以先看它打算改什么而不落盘。

> 脚本用 `$PSScriptRoot` 定位插件包，所以 `package.json` / `art.jpg` / `lib\` 必须和 `install.ps1` 待在同一目录。直接双击或在任意 cwd 下用 `-File` 运行都可以；如果你把整个脚本粘贴进 PowerShell 窗口，就先 `cd` 到 `src\` 里再执行。

### 3. 重启运行时

配置树在启动时组装一次，改完**必须重启**：

- 桌面客户端：**从托盘完全退出**再打开（只关窗口不算）
- CLI：重启 `dsh web` 进程

### 4. 确认装上了

- 右下角输入框上方出现一个小蓝点 → 点开就是控制面板
- **设置 → 通用** 里出现「实色面板颜色」

### 不想用脚本？手动装等价

1. 建目录 `%DSH_HOME%\profiles\<profile>\node_modules\dsh-web-bg\lib\`
2. 把 `package.json`、`cordis.patch.yml`、`art.jpg` 复制过去，再把 `lib\index.mjs`、`lib\client.mjs` 复制到 `lib\`
3. 编辑 `%DSH_HOME%\profiles\<profile>\package.json`，把包名加进 `dsh.profile.bundles`：

   ```json
   "bundles": [
     "dsh-web-bg",
     "@deepseek-ai/dsh-base",
     "@deepseek-ai/dsh-web-app"
   ]
   ```

4. 重启运行时

> CLI profile 也可以走官方命令：`dsh plugin --profile web add file:<解压后的 src 目录>`。桌面 profile 不行——它的 profile 由 Electron 应用专管，`dsh` CLI 拒绝操作字面名 `desktop`。

### 安装脚本到底做了什么

只有两件事，**幂等**，重复跑不会重复加条目：

1. 把包复制到 `<profile>\node_modules\dsh-web-bg`
2. 把 `"dsh-web-bg"` 插进 `<profile>\package.json` 的 `dsh.profile.bundles` 开头（改前自动备份成 `package.json.dsh-web-bg.bak`）

顺手清理旧版本遗留在用户补丁层里的 insert 块。

---

## 验证

自检日志：`%USERPROFILE%\.dsh\dsh-web-bg-report.log`。一次成功启动应出现：

```
node-half applied           ← 节点半边已加载
route registered            ← 自检路由注册成功
client stage=diag&...       ← 浏览器半边跑起来了，附带现场快照
client stage=diag-late&...  ← 6 秒后的复采（等主题服务就位）
```

想确认 loader 确实会加载它，可以 dump 组装结果：

```powershell
# CLI profile
dsh --profile web --dump-config | Select-String web-bg

# desktop：CLI 拒绝字面名，复制一份再 dump
Copy-Item ~/.dsh/profiles/desktop ~/.dsh/profiles/desktopcheck -Recurse -Force
dsh --profile desktopcheck --dump-config | Select-String web-bg
Remove-Item ~/.dsh/profiles/desktopcheck -Recurse -Force
```

期望看到：

```yaml
# == dsh-web-bg
- id: web-bg
  name: dsh-web-bg
```

包内还自带一个往返自测脚本（在一份临时 profile 上跑「原始态 → 安装 → 组装验证 → 重复安装 → 卸载 → 还原」）：

```powershell
Copy-Item .\tools\test-installer.ps1.txt .\tools\test-installer.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\test-installer.ps1
```

---

## 卸载

```powershell
Copy-Item .\install.ps1.txt .\install.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -Profile desktop -Uninstall
```

然后重启运行时。浏览器侧若想清干净，在客户端控制台执行：

```js
localStorage.removeItem("dsh.webBg.v4");
localStorage.removeItem("dsh.webBg.diag");
```

---

## 工作原理

### 一个插件，两半

DSH 的插件分两个执行环境，这个包各有一个半边：

| 半边 | 文件 | 干什么 |
|---|---|---|
| 节点侧 | `lib/index.mjs` | 注册两个同源路由（`/dsh-web-bg/report` 收客户端自报写日志，`/dsh-web-bg/art.jpg` 作为素材的退路），往自检日志里记标记 |
| 浏览器侧 | `lib/client.mjs` | 画背景图层、接管界面的表面令牌、渲染右下角控制面板和设置行 |

内置壁纸以 **data URI 内嵌**在浏览器半边里——所以启用它不需要任何文件、服务器或网络。

### 为什么改的是 `dsh.profile.bundles` 而不是 `cordis.patch.yml`

profile 目录里有两个 patch 层：

- **`cordis.patch.yml`（用户补丁层）**：客户端保存自己的设置（外观、语言…）时会**整体重写**它，写在里面的第三方 insert 会被抹掉
- **`dsh.profile.bundles`（bundle 层）**：客户端自己管理插件的地方，手加的条目它不会主动删

所以本插件走 bundle 层：包声明 `dsh.bundle.patch`，自己的 `cordis.patch.yml` 被当作一层叠上去。这是从实测里学到的，不是任选。

### 界面透明度是驱动令牌，不是覆盖样式

客户端的界面颜色来自一组 CSS 自定义属性（`--dsw-alias-*` / `--dsw-specific-*`）。插件只驱动其中四个承载"大面积表面"的令牌：

| 令牌 | 用在哪 | 深色可读下限 | 浅色可读下限 |
|---|---|---|---|
| `--dsw-alias-bg-base` | 主画布 / frame / 中列 | 0.18 | 0.30 |
| `--dsw-alias-bg-layer-1` | 卡片层 1 | 0.30 | 0.46 |
| `--dsw-alias-bg-overlay` | 浮层（提问对话框等） | 0.62 | 0.72 |
| `--dsw-specific-sidebar-fill` | 侧栏 | 0.26 | 0.40 |

任一透明度 `t` 下的实际 alpha 是 `1 − t × (1 − 下限)`，所以 `t = 0` 精确复现原生外观，`t = 1` 精确落到下限。下限的存在就是为了保证文字始终读得清。

`--dsw-alias-bg-layer-2`（设置页与工具面板的面）**被显式豁免**，插件会在每次断言时把可能残留的值从 body 上摘掉。

### 实色面板：一个色值改一整族

设置里选的颜色不会一比一贴上去，而是先按模式施加偏色（浅色朝白混 10%、深色朝黑混 10%），再叠加每个面板自己的明暗偏移，于是**一个十六进制值就能改掉一整族面板，同时保住它们之间的层次**：

| 面板 | 相对基准的偏移 |
|---|---|
| 设置界面 / 设置卡片 / 输入框 / 消息气泡 | 0 |
| 下拉菜单 | +4% |
| 内置平台底色 | −4% |
| 代码块 | −6% |
| 层 3 / 层 4 | +6% / +10% |
| 新会话 / 激活项 | +8% |
| 悬浮按钮 / 浮起按钮 | +10% |
| tooltip / toast | +8% / +6% |

设置界面（layer-2）只吃颜色、不吃透明度，保证功能性界面永远压得住背景图。

### 为什么必须用行内 `!important`

客户端有两处会压过普通样式表：

1. 启动脚本把 body 背景写死（`<head><style>body{background-color:#151517}</style>`，浅色方案下是 `#fff`）
2. 主题 presenter 会把令牌以**行内样式**写到 body 上

而且按 CSS 绘制顺序，`body` 的背景画在**负 z-index 子元素之后**——放在 `z-index:-1` 的图片层会被 body 背景整块盖住。所以插件必须：把 body 背景清成 `transparent`、底色交给 `html`；用**行内 `!important`**（样式表 `!important` 压不过行内，行内 `!important` 压过一切）；再用 `MutationObserver` + 兜底轮询在客户端重写后补回（比较值后才写入，不会自旋）。

### 设置存在哪

| 名称 | 位置 | 用途 |
|---|---|---|
| `dsh.webBg.v4` | localStorage | 插件状态：`{opacity, uiTransparency, soft, custom, name, solidColors:{light,dark}, solidAlpha}` |
| `dsh.webBg.diag` | localStorage | JSON 诊断快照（DOM 现场） |
| `/dsh-web-bg/report` | 同源路由（节点侧注册） | 客户端自报 → 写日志 |
| `%DSH_HOME%\dsh-web-bg-report.log` | 文件 | 节点标记 + 客户端自报 |

旧键（`v3` / `v2`）会自动迁移，不用手动处理。

---

## 仓库结构

```
.
├─ README.md                 本文件
├─ figures/                  README 用的真机截图
│  ├─ 整体展示-深色模式.png
│  ├─ 整体展示-浅色模式.png
│  ├─ 新增的自定义面板.png
│  ├─ 柔化模式展示.png
│  ├─ 非柔化模式展示.png
│  └─ 自由更换背景图片.png
└─ src/                      ← 插件包本体，也就是安装时要用的东西
   ├─ AGENTS.md              面向 DSH 智能体的安装/运维手册（零上下文可执行版，先读这个）
   ├─ README.md              插件包内的使用说明
   ├─ install.ps1.txt        一键安装 / 卸载（幂等、自动备份；改名 .ps1 后运行）
   ├─ cordis.patch.yml       bundle 层的 insert 声明
   ├─ plugin-insert.yml      用户层的 insert 声明（仅供手工安装与查阅）
   ├─ package.json           插件清单：dsh.bundle.patch + main + exports["./client"]
   ├─ art.jpg                内置壁纸（已按 DSH 深色基调调色）
   ├─ assets/
   │  └─ source.jpg          原始插画（重建 art.jpg 用）
   ├─ lib/
   │  ├─ index.mjs           节点半边：自检路由 + 日志
   │  ├─ client.mjs          浏览器半边（构建产物，壁纸以 data URI 内嵌）
   │  └─ client.template.mjs 浏览器半边源码（__ART__ 占位符）
   └─ tools/
      ├─ make_bg.py          壁纸调色：assets/source.jpg → art.jpg
      ├─ build_plugin.py     client.template.mjs + art.jpg → lib/client.mjs
      ├─ test-installer.ps1.txt  安装往返自测（改名后在包目录内运行）
      └─ preview/op*.jpg     壁纸透明度预混预览图
```

### 为什么包里没有 `.js` / `.ps1`

见下一节。

---

## 从源码重建

改完 `lib/client.template.mjs` 或换了壁纸之后：

```powershell
# 1) 壁纸调色（assets/source.jpg → art.jpg，需要 Pillow + numpy）
python tools\make_bg.py

# 2) 打包浏览器半边（把 art.jpg 以 data URI 内嵌）
python tools\build_plugin.py

# 3) 语法自检
node --check lib\client.mjs
node --check lib\index.mjs
```

两个脚本都用相对本包的路径（`pathlib.Path(__file__).resolve().parent.parent`），换机器可直接跑；构建可复现——同样的素材产出同样的 bundle，可以用哈希核对。

---

## Windows 安全提示

打开压缩包时 Windows 可能提示 **"这些文件可能会损害你的计算机。是否仍要打开这些文件？"**。

**这不是病毒检测**（Defender 没有告警），而是附件管理器按"文件类型 + 来源区域（Internet）"做的组合判断。高危扩展名清单里**包含 `.js` 和 `.ps1`**，所以本包刻意避开了它们：

| 本包的做法 | 原因 |
|---|---|
| 两个半边叫 `lib\index.mjs` / `lib\client.mjs` | `.mjs` 不在清单里，`.js` 在。文件路径由 `package.json` 的 `main` / `exports` 决定，客户端按路径取文件，扩展名对加载无影响 |
| 安装脚本与测试脚本叫 `install.ps1.txt` / `tools\test-installer.ps1.txt` | `.ps1` 在清单里。使用前改回 `.ps1` 即可，内容完全一致 |
| 其余 `.md` / `.json` / `.yml` / `.jpg` / `.py` | 本身不在清单里 |

还是看到提示的话，通常是下面两种情况（与包的内容无关）：

1. 拿到的是**旧版压缩包**——先核对 SHA256，或 `Unblock-File` 后再打开
2. 压缩包被标记为"来自 Internet"（浏览器下载、聊天工具转发都会加 `Zone.Identifier`）且含高危类型

```powershell
Get-FileHash .\deepseek-harness-simple-theme-*.zip -Algorithm SHA256   # 核对
Unblock-File .\deepseek-harness-simple-theme-*.zip                     # 解除拦截
```

`git clone` 不会写 `Zone.Identifier`，比"下载 zip"少一层提示，所以优先用克隆。

---

## 常见问题

| 症状 | 原因 | 怎么办 |
|---|---|---|
| 改了东西没反应 | 配置树和客户端 bundle 都**只在启动时**取 | 重启；桌面版记得从托盘完全退出 |
| 插件完全没生效，日志连 `node-half applied` 都没有 | `dsh-web-bg` 不在 `dsh.profile.bundles` 里，或包没放对目录 | 重跑 `install.ps1`（幂等） |
| 界面全透明了，连设置页也是 | `--dsw-alias-bg-layer-2` 出现在了透明轴里 | 它必须在豁免名单里；重装一次即可清掉残留 |
| 在客户端里装/卸载过别的插件后，背景没了 | 客户端自己管理插件时会重排 `dsh.profile.bundles`，可能顺带移除手加条目 | 重跑 `install.ps1` |
| 蓝点能点，但看不到背景 | body 背景没被清成 `transparent` | 查日志里的 `bodyBg` 与 `bodyInline`，重装 |
| 脚本中文乱码（出现「瀹炶壊」之类） | `.ps1` 被按 ANSI 读了 | 存成 **UTF-8 带 BOM** |

更完整的排查表（含每条的判据与逐项处置）见 [`src/AGENTS.md`](./src/AGENTS.md) §5。

---

## 限制与素材

- **必须重启**：配置树在启动时组装一次，桌面版还得从托盘完全退出
- **依赖客户端内部令牌名**（`--dsw-alias-*`、`--dsw-specific-*`）。客户端大版本升级后若令牌改名或新增面板，需要重新扫描客户端 bundle 里的 `background:var(...)` 用法，更新令牌清单
- **只验证过 Windows**（官方桌面客户端 + `dsh web`）；其他平台的 profile 逻辑同理可用，但未实测
- **无依赖、无构建步骤、不联网**：不需要 `pnpm`，不需要 `allowBuilds`，不安装时跑任何包脚本
- 素材版权：`assets/source.jpg` 由使用者提供，版权归原权利人。本仓库只做本地加载与渲染，**再分发前请自行确认授权**

---

## 许可

代码以 MIT License 发布。

<!-- TODO: 仓库根目录目前没有 LICENSE 文件，发布前补上；package.json 里已声明 "license": "MIT" -->

本项目与 DeepSeek 官方无隶属关系。
