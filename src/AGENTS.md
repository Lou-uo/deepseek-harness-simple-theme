# dsh-web-bg · 安装与运维手册（面向零历史 DSH 智能体）

> 本文件是一份**可直接执行**的作业手册。你不需要任何历史上下文，只需要能读文件、写文件、执行 PowerShell。
> 目标：在最小代价下把「dsh-web-bg」插件装进一台 Windows 机器上的 DeepSeek Harness，并让它生效。

---

## 0. 你要装的是什么（30 秒读完）

一个 DSH **客户端插件**，给 Web GUI / 官方桌面客户端加三件事：

1. **背景图**：把素材图铺在界面之下，透明度 0–80% 可调
2. **界面透明度**：无级调节操作界面的透明程度（0 = 原生实色，100 = 最透）
3. **实色面板配色与透明度**：设置 → 通用 里一行「实色面板颜色」，浅色/深色各一个十六进制色值（含圆形预览），外加一个 0–50% 的透明度滑杆，统一控制那些保持实色的面板（设置页、输入框、菜单、气泡等）

特征（决定你该怎么装）：

- **纯本地**：无依赖、无安装脚本、不联网、不需要 pnpm / allowBuilds
- **通过 bundle 层激活**：包声明 `dsh.bundle.patch`，只需把包名加进 profile 的 `dsh.profile.bundles`——**不要**改用户图层 `cordis.patch.yml`（客户端保存设置时会重写它，插进去的条目会被抹掉，见 §2.2）
- **刻意避开 Windows 高危扩展名**：两半是 `.mjs` 而不是 `.js`，安装脚本是 `install.ps1.txt` 而不是 `.ps1`——否则别人下载压缩包时，资源管理器会弹"这些文件可能会损害你的计算机"（原因与处理见 §10）
- 由两半组成：**节点半边**（`lib/index.mjs`：注册自检路由、写日志）+ **浏览器半边**（`lib/client.mjs`：画图层、改令牌、渲染设置行）

---

## 1. 最短路径（照抄即可）

前提：目标机器已装 DSH（官方桌面客户端，或 `dsh web` 的 CLI 发行版）。

```powershell
# 安装脚本以 .ps1.txt 附带（避开 Windows 高危扩展名）：先改回 .ps1，再运行
Copy-Item .\install.ps1.txt .\install.ps1

# 官方桌面客户端（profile = desktop）
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -Profile desktop

# 命令行 dsh web（profile = web）
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -Profile web
```

脚本只做两件事：把包复制到 `<profile>\node_modules\dsh-web-bg`，并把 `dsh-web-bg` 加进 `<profile>\package.json` 的 `dsh.profile.bundles`（改前自动备份）。

然后：

1. **重启运行时**——桌面版必须**完全退出**再打开（托盘退出；只关窗口不算）；CLI 则重启 `dsh web` 进程
2. **验证**：右下角输入框上方出现一个小蓝点；`%USERPROFILE%\.dsh\dsh-web-bg-report.log` 里出现 `node-half applied`
3. 点蓝点调背景/界面透明度；到 **设置 → 通用** 找「实色面板颜色」

> `pwsh`（PowerShell 7）不一定存在，`powershell.exe`（5.1）一定能用。脚本提示中文乱码时说明它被按 ANSI 读了——脚本必须存为 **UTF-8 带 BOM**。

---

## 2. 环境事实（照此判断，不要猜）

### 2.1 目录

| 名称 | 值 |
|---|---|
| `DSH_HOME` | 默认 `%USERPROFILE%\.dsh`（环境变量可覆盖；**桌面客户端与 CLI 共用**） |
| profile 目录 | `%DSH_HOME%\profiles\<名字>` |
| 桌面客户端 profile | 固定为 `desktop` |
| `dsh web` profile | `web`（也可自建任意名字） |

### 2.2 profile 目录里的文件

| 文件 | 作用 | 本插件是否改它 |
|---|---|---|
| `package.json` | `dsh.profile.bundles` = bundle 层顺序（**本插件的激活点**） | **是（加一个条目）** |
| `cordis.yml` | 空入口列表（注释说明"改 patch 层，别改这里"） | 否 |
| `cordis.patch.yml` | **用户补丁层**：顶层 YAML 数组。⚠️ 客户端保存自己的设置时会**整体重写**它，放进去的第三方条目会被抹掉 | 否（只在卸载时清理历史遗留） |
| `node_modules\` | 插件包解析锚点——客户端用 `createRequire(profileDir)` 解析插件包 | 是（放包） |

### 2.3 插件如何进入运行中的客户端（读懂这段就不会踩坑）

1. 启动时**一次性**组装配置树：`bundles` 各层 → 用户补丁层 → 命令行 `--patch`
2. bundle 层里的每个名字：包声明 `dsh.bundle.patch` 时，它自己的 patch 文件会被当作一层叠上去（本插件就用这个插入 `web-bg` 条目）
3. 树里每个 entry（`name` 是包名）被 loader 加载：包的 `main` 即**节点半边**（cordis 插件：导出 `apply(ctx)`）
4. 包若声明 `dsh.client = { platform: "web" }` 且有 `exports["./client"]`，其客户端 bundle 会被扫描、注入 `__DSH_BOOT__`，并在浏览器侧作为 cordis 客户端插件执行
5. **配置只在启动时组装**：改完配置**必须重启运行时**
6. 服务访问规则：**没有 `inject` 就读服务会抛错**（`cannot get property "x" without inject`）。要拿可选服务请用 `ctx.inject(["x"], cb)`；**不要**把它写进静态 `inject` 列表——服务不来时 fiber 会永久 pending，插件整体失效

> **为什么不用用户图层？** 实测过：客户端在保存自己的设置（外观、语言等）时会把 `cordis.patch.yml` 整体重写，第三方 `insert` 会被删掉（注释有时会留下）。所以本插件改走 bundle 层——那是客户端自己管理插件的地方。

### 2.4 桌面版的特殊限制

```powershell
dsh --profile desktop --dump-config
# error: profile "desktop" is managed exclusively by the Electron application
```

- CLI **拒绝**操作字面名 `desktop` 的 profile；桌面版只能**手工放包 + 把包名加进 `dsh.profile.bundles`**（`install.ps1` 做的就是这件事）
- 想验证 desktop 的组装结果：把 profile 目录**复制成别的名字**再 dump（见 §4）

### 2.5 打包发行版里的工具位置

| 用途 | 路径 |
|---|---|
| `dsh` CLI（PATH 里没有时） | `<安装目录>\resources\runtime\cli\bin\dsh.cmd` |
| 客户端自身代码 | `<安装目录>\resources\app.asar`（Electron asar 归档，普通 PowerShell 读不进去） |
| 读 asar 内部文件的办法 | `$env:ELECTRON_RUN_AS_NODE=1` 后用主程序 exe 跑一段 Node 脚本（它带 asar 补丁） |
| 内置运行时 | `<安装目录>\resources\runtime\{node,pnpm,cli}` |

---

## 3. 安装

### 3.1 一键（推荐）

见 §1。脚本做的事，逐条如下——**幂等**，重复执行不会重复加条目：

1. 校验 profile 目录存在
2. 把 `package.json`、`cordis.patch.yml`、`art.jpg`、`lib\index.mjs`、`lib\client.mjs` 复制到 `<profile>\node_modules\dsh-web-bg\`
3. 在 `<profile>\package.json` 的 `dsh.profile.bundles` 数组开头插入 `"dsh-web-bg",`（**先备份**为 `package.json.dsh-web-bg.bak`）
4. 清掉历史遗留：旧版本写在用户图层 `cordis.patch.yml` 里的 insert 块（如果有）
5. 打印重启与验证步骤

### 3.2 手动（脚本不可用时的等价步骤）

1. 建目录 `<profile>\node_modules\dsh-web-bg\lib\`，复制 `package.json`、`cordis.patch.yml`、`art.jpg`、`lib\index.mjs`、`lib\client.mjs`
2. 编辑 `<profile>\package.json`，把 `"dsh-web-bg"` 加进 `dsh.profile.bundles`：

   ```json
   "bundles": [
     "dsh-web-bg",
     "@deepseek-ai/dsh-base",
     "@deepseek-ai/dsh-web-app"
   ]
   ```

3. 重启运行时

### 3.3 不要做的事

- ❌ **不要**把 insert 写进用户图层 `cordis.patch.yml`——客户端保存设置时会重写该文件并抹掉它（§2.2）
- ❌ 不要同时用两种方式激活（bundle 层 + 用户层各插一个 `id: web-bg` 会让 loader 抛 duplicate entry id）
- ❌ 不要用 `dsh plugin --profile desktop add ...`（会被拒绝，见 §2.4）
- ✅ 不需要 `add` 到 `dependencies`，也不需要 `allowBuilds`：本包无依赖、无安装脚本
- ✅ CLI profile 也可以用官方方式装：`dsh plugin --profile web add file:<解压后的包目录>`（它会看到 `dsh.bundle` 并自动加进 bundles）

---

## 4. 验证（三档，从便宜到贵）

### 档 1 · 文件层

```powershell
Test-Path "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\dsh-web-bg\lib\client.mjs"   # True
Select-String -Path "$env:USERPROFILE\.dsh\profiles\desktop\package.json" -Pattern dsh-web-bg
```

### 档 2 · 配置层（证明 loader 会加载它）

```powershell
# CLI profile（如 web）
& "<安装目录>\resources\runtime\cli\bin\dsh.cmd" --profile web --dump-config | Select-String web-bg

# desktop：CLI 拒绝字面名，复制一份再 dump
Copy-Item "$env:USERPROFILE\.dsh\profiles\desktop" "$env:USERPROFILE\.dsh\profiles\desktopcheck" -Recurse -Force
& "<安装目录>\resources\runtime\cli\bin\dsh.cmd" --profile desktopcheck --dump-config | Select-String web-bg
Remove-Item "$env:USERPROFILE\.dsh\profiles\desktopcheck" -Recurse -Force
```

期望输出（bundle 层那一段）：

```yaml
# == dsh-web-bg
- id: web-bg
  name: dsh-web-bg
```

> 本包自带往返自测脚本 `tools\test-installer.ps1.txt`：在一份临时 profile（`%DSH_HOME%\profiles\webtest`）上依次跑「原始态 → 安装 → 组装验证 → 重复安装（幂等）→ 卸载 → 还原」，结束时清理干净。
> 用法：改名为 `.ps1` 后在**包目录内**运行（脚本用 `$PSScriptRoot` 定位包，拷到别处会找不到文件）。它需要一个可用的 `dsh` CLI；没有 CLI 时会跳过组装验证。

### 档 3 · 运行时（唯一能证明"真的跑起来了"的档）

看自检日志 `%DSH_HOME%\dsh-web-bg-report.log`，一次成功启动应出现：

```
node-half imported          ← 节点半边模块被加载
node-half applied           ← cordis 调用了 apply
route registered            ← 自检路由注册成功
client stage=diag&...       ← 浏览器半边跑起来了，附带现场快照
client stage=diag-late&...  ← 6 秒后的复采（等主题服务就位）
```

浏览器侧另有一份 JSON 诊断（localStorage 键 `dsh.webBg.diag`），字段含 `bodyBg`、`computedToken`、`asserted`、`centerChain`（**屏幕中心从最上层元素到 html 的背景色链**，用来点名遮挡元素）。

---

## 5. 故障排查（症状 → 判据 → 处置）

| 症状 | 判据（看哪里） | 处置 |
|---|---|---|
| 蓝点能点，但**看不到背景图** | 日志里 `body=rgb(255,255,255)` 之类不透明值；`bodyInline` 里没有我方声明 | body 没被清空。检查 `render()` 是否**真的调用了** `syncSurfaces()`（历史上就漏过这次调用），再看 `asserted` 是否为 `true` |
| 界面**全都**变透明，包括设置页 | `--dsw-alias-bg-layer-2` 是否出现在透明轴里 | 它必须在 `EXEMPT` 名单里；插件会在断言时主动把该令牌从 body 上移除 |
| 插件**完全不生效**，日志连 `node-half imported` 都没有 | §4 档 2 的组装输出 | 多半是 `dsh-web-bg` 没进 `dsh.profile.bundles`，或包没放对目录。重跑 `install.ps1`（幂等）即可 |
| 报 `cannot get property "xxx" without inject` | 日志（我方自检会记录） | 服务必须用 `ctx.inject([...], cb)` 惰性获取，不能裸读 `ctx.x`，也不要写静态 `inject`（会让 fiber 永久 pending） |
| 改了代码/配置**没反应** | — | 配置与客户端 bundle 都**只在启动时**取；必须重启。桌面版记住：托盘退出才算退出 |
| 改过客户端设置后背景消失 / bundles 里条目没了 | `<profile>\package.json` 的 `dsh.profile.bundles` | 客户端在自己管理插件（安装/卸载）时会重排该数组，可能顺带移除手加条目。重跑 `install.ps1`；用户图层则**不可用**（会被重写，见 §2.2） |
| 打开压缩包时 Windows 提示"这些文件可能会损害你的计算机" | 包内是否有 `.js` / `.ps1` 等 Windows 高危扩展名；zip 是否带"来自 Internet"标记（`Get-Item -Stream Zone.Identifier`） | 本包已刻意避开（`.mjs` + `.ps1.txt`）。若对方拿到的是旧版包：先核对 SHA256，或 `Unblock-File <zip>` 后再打开（详见 §10） |
| 客户端半边没跑（无蓝点、无 `client stage=`） | `dsh.client` 声明 / `exports["./client"]` / 文件是否存在 | client-modules 会读 `<pkg>/package.json`：缺声明或 bundle 缺失都会导致该包不进 `__DSH_BOOT__` |
| 脚本中文乱码 | 输出里出现 `瀹炶壊` 之类 | `.ps1` 存成 **UTF-8 带 BOM**（PowerShell 5.1 否则按 ANSI 读） |

---

## 6. 功能与配置参考

### 6.1 控制面板（右下角蓝点，输入框上方）

| 控件 | 范围 / 默认 | 说明 |
|---|---|---|
| 背景透明度 | 0–80%，默认 22% | 图层浓度；预设 8/15/25/40/60/80 |
| 界面透明度 | 0–100%，默认 60% | 0 = 完全撤出（原生实色），100 = 最透；预设 0/30/60/85 |
| 柔和模式 | 开 / 关（默认开） | 图层加 6px 模糊 |
| 更换图片… / 恢复默认图 | — | 本地选图，页内缩放到 ≤2560px 宽转 JPEG 后存 localStorage（**不上传**） |

### 6.2 设置行

**设置 → 通用** 里的「实色面板颜色」，位置**紧贴「外观」下方、在「字体大小」上方**（插槽 `settings.general.item`；外观行 order 10、字号行 order 11，本行用 **order 10.5**——插槽按 `(a.order ?? 0) - (b.order ?? 0)` 数值排序，小数合法）：

```
通用
  外观            [浅色][暗色][跟随系统]
  实色面板颜色     浅色模式  ● [#f7f8fb]
                  深色模式  ● [#2c2c2e]   [恢复默认]
                  透明度    [====|======] 25%
  字号            14
```

- **浅色 / 深色各一个色值**；客户端偏好为「跟随系统」时，按**实际生效的方案**取对应值（插件在断言时读 `body[data-ds-dark-theme]`，并在该属性翻转时立刻重算）
- **透明度滑杆 0–50%**（上限 50，即最透时 alpha = 0.5），作用于输入框、菜单、消息气泡、代码块等实色面板；与右下角面板的「界面透明度」是两条互不干扰的轴
- **设置界面固定不透明**：`--dsw-alias-bg-layer-2`（设置页与工具面板的面）在 `SOLIDS` 里带 `fixed: true`，只吃颜色、不吃透明度——保证功能性界面永远压得住背景图
- 透明度**不要求先设颜色**：没设颜色时用 `color-mix(in srgb, <该令牌的原始色> X%, transparent)` 对客户端自带色做半透明（原始色按明暗两套取自客户端主题表）
- 十六进制输入：接受 `#RRGGBB` / `#RGB` / 不带 `#`；非法时输入框描边变红
- 左侧**圆形预览色**显示的是**实际生效色**（已含该模式的偏色与透明度），不是原始输入值
- 「恢复默认」清空两个颜色并把透明度归零 → 所有实色面板回到客户端原生状态
- 只填一个颜色模式也可以：另一个模式保持客户端原生配色（但仍跟随透明度）

### 6.3 界面透明轴

受影响令牌（alpha = `1 − t × (1 − floor)`，`t` = 透明度百分比/100）：

| 令牌 | 用在哪 | dark floor | light floor |
|---|---|---|---|
| `--dsw-alias-bg-base` | 主画布 / frame / centerCol | 0.18 | 0.30 |
| `--dsw-alias-bg-layer-1` | 卡片层 1 | 0.30 | 0.46 |
| `--dsw-alias-bg-overlay` | 浮层（提问对话框等） | 0.62 | 0.72 |
| `--dsw-specific-sidebar-fill` | 侧栏 | 0.26 | 0.40 |

**豁免**：`--dsw-alias-bg-layer-2`（设置页、插件管理、目录选择器、轨迹、文档预览、预设页都用它）——永远实色。

### 6.4 实色配色映射（设置行选的颜色 → 各面板）

先按模式施加**偏色**，再叠加各面板的明暗偏移，保住层次：

1. **偏色**（`LIGHT_BIAS` / `DARK_BIAS`，默认各 0.10）：
   - 浅色模式：选定的颜色**朝白混合 10%** → 结果比设定值偏白
   - 深色模式：选定的颜色**朝黑混合 10%** → 结果比设定值偏黑
   - 所以「设置界面」这类基准面板的颜色 = `你的设定值 ± 10%`，正是"浅色更白、深色更黑"的来源
2. **各面板偏移**（在偏色结果上再混）：

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

要改偏色强度，改 `lib/client.template.mjs` 里的 `LIGHT_BIAS` / `DARK_BIAS` 后重新构建（`tools/build_plugin.py`）。

3. **透明度**（`SOLID_ALPHA_MAX`，默认 50）：对上面算出的每个颜色再乘一个 alpha —— 有选色时输出 `rgba(r,g,b,α)`；没选色时输出 `color-mix(in srgb, <原始色> α%, transparent)`。α = `1 − 透明度/100`，所以 0% = 完全不透明、50% = alpha 0.5。带 `fixed: true` 的令牌（设置界面 `--dsw-alias-bg-layer-2`）**跳过这一步**，始终 alpha = 1。

### 6.5 存储键与自检通道

| 名称 | 位置 | 用途 |
|---|---|---|
| `dsh.webBg.v4` | localStorage | 插件状态：`{opacity, uiTransparency, soft, custom, name, solidColors:{light,dark}, solidAlpha}`（`solidAlpha` = 实色面板透明度百分比，0–50）。自动迁移：`v3.solidColor`（单色）→ 赋值给 light 与 dark；`v2.translucent` false→界面透明度 0 / true→60 |
| `dsh.webBg.diag` | localStorage | JSON 诊断（DOM 现场快照） |
| `/dsh-web-bg/report?...` | 同源 HTTP 路由（节点半边注册） | 客户端自报 → 写入日志 |
| `/dsh-web-bg/art.jpg` | 同源路由 | 素材的同源回退（data URI 之外的退路） |
| `%DSH_HOME%\dsh-web-bg-report.log` | 文件 | 节点标记 + 客户端自报 |

### 6.6 为什么必须用内联 `!important` + MutationObserver

DSH 客户端有两处会压过普通样式表：

1. **启动脚本把 body 背景写死**（`<head><style>body{background-color:#151517}</style>`，浅色方案下是 `#fff`）
2. **主题 presenter 会把令牌以行内样式写到 body 上**（`body.style.setProperty(name, value)`）

而且按 CSS 绘制顺序，`body` 的背景绘制在**负 z-index 子元素之后**——所以放在 `z-index:-1` 的图片层会被 body 背景整块盖住。结论：

- 必须把 body 背景清成 `transparent`，底色交给 `html`
- 必须用**行内 `!important`**（样式表 `!important` 压不过行内，行内 `!important` 压过一切）
- 必须用 **MutationObserver + 4 秒兜底轮询**在客户端重写 body 样式后补回（比较值后才写入，不会自旋）

### 6.7 图层参数

`position: fixed; inset: -28px; z-index: -1; pointer-events: none` —— 外扩 28px 让模糊不在视口边缘露出接缝；`background-size: cover; background-position: center 42%`。

---

## 7. 从源码重建

```powershell
# 1) 素材调色（原始图 → art.jpg）需要 Pillow
python tools\make_bg.py          # 读 assets\source.jpg，写 art.jpg（另出若干透明度预混版本）

# 2) 打包客户端 bundle（把 art.jpg 以 data URI 内嵌）
python tools\build_plugin.py     # lib\client.template.mjs + art.jpg → lib\client.mjs

# 3) 语法自检
node --check lib\client.mjs
node --check lib\index.mjs
```

注意事项：

- `lib\client.template.mjs` 里的 `__ART__` 占位符必须被替换；重建后 bundle 里不应再出现 `__ART__`
- 两个脚本都用**相对本包的路径**（`pathlib.Path(__file__).resolve().parent.parent`），换机器可直接跑；构建可复现（同一素材产出同一 bundle，可用哈希核对）
- 客户端 bundle 是**普通脚本**（不是 ESM）：形如 `window.__ModuleLoader__.load({ id, factory: (require) => {...} })`，`factory` 里可以 `require("react")` 等已注册的客户端模块
- 扩展名是 `.mjs` 而非 `.js`：文件路径由 `package.json` 的 `main` / `exports` 决定，客户端只按路径取文件，所以扩展名对加载无影响（见 §10）

---

## 8. 卸载与回滚

```powershell
Copy-Item .\install.ps1.txt .\install.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -Profile desktop -Uninstall
```

手工等价步骤：

1. 从 `<profile>\package.json` 的 `dsh.profile.bundles` 里删掉 `"dsh-web-bg",`
2. 删除 `<profile>\node_modules\dsh-web-bg\`
3. 重启运行时

浏览器侧残留（可选清理，在客户端控制台执行）：

```js
localStorage.removeItem("dsh.webBg.v4");
localStorage.removeItem("dsh.webBg.diag");
// 更早版本的键，如仍在可一并清理：dsh.webBg.v3 / dsh.webBg.v2 / dsh.webBg.v1
```

改动前的备份：`package.json.dsh-web-bg.bak`（bundles 条目）、`cordis.patch.yml.dsh-web-bg.bak`（旧版用户层 insert 的清理）。插件被卸载/停用时，`ctx.effect` 的清理会自动撤掉它在 body 上写的所有声明与 DOM 节点。

---

## 9. 已知限制

- **改配置必须重启**（配置树在启动时组装一次）；桌面版还得从托盘完全退出
- 透明轴与配色**依赖客户端内部令牌名**（`--dsw-alias-*`、`--dsw-specific-*`）。客户端大版本升级后若令牌改名/新增面板，需要重新扫描客户端 bundle 里的 `background:var(...)` 用法，更新 §6.3 / §6.4 的令牌清单
- 只验证过 Windows（官方桌面客户端 + `dsh web`）；其他 profile 名同理可用
- 素材版权归使用者；本包只做本地加载与渲染，请在再分发前确认素材授权

---

## 10. 分发与 Windows 安全提示（避免"这些文件可能会损害你的计算机"）

**提示是什么**：Windows 资源管理器的**附件管理器**在打开压缩包时，会检查里面的文件类型；只要包含它认定的"高危扩展名"，就弹"这些文件可能会损害你的计算机。是否仍要打开这些文件？"。**这不是病毒检测**（Defender 没有告警），而是文件类型 + 来源区域（Internet）的组合判断。

**高危扩展名清单里包含 `.js` 和 `.ps1`**——这正是本包早期版本触发提示的原因。因此：

| 本包的做法 | 原因 |
|---|---|
| 两半命名为 `lib\index.mjs` / `lib\client.mjs` | `.mjs` 不在高危清单；`.js` 在 |
| 安装脚本与测试脚本命名为 `install.ps1.txt` / `tools\test-installer.ps1.txt` | `.ps1` 在高危清单；`.txt` 不在。使用前改名回 `.ps1` 即可（内容完全一致） |
| 其余文件（`.md`/`.json`/`.yml`/`.jpg`/`.py`）本身安全 | — |

**接收方仍可能看到提示的两种情况**（与包的内容无关）：

1. 他拿到的是**旧版压缩包**（含 `.js`/`.ps1`）——让他核对 SHA256 后继续，或先 `Unblock-File`；
2. 压缩包被标记为"来自 Internet"（浏览器下载、聊天工具转发都会加 `Zone.Identifier`），且其中含高危类型。

**给接收方的建议写法**（放在发布说明里）：

```text
校验：Get-FileHash .\dsh-web-bg-<版本>.zip -Algorithm SHA256
如有"来自 Internet"拦截：Unblock-File .\dsh-web-bg-<版本>.zip
本包不含 .exe/.dll/.js/.ps1 等类型；安装脚本以 .ps1.txt 提供，需要时改名后运行即可。
```

**发布方还可以做的**：把包放进 GitHub 仓库（`git clone` 不写 `Zone.Identifier`，比"下载 zip"少一层提示），或直接提供**目录拷贝**方式（不打包）。压缩包只是分发便利，功能上并不需要它。
