# 交接文档 — opencode-quick-chat

> 版本：`0.1.0` · 日期：2026-11-16 · 状态：可日常使用，UI 还需要一轮人眼回归
>
> 运行环境：OpenCode Desktop `2.2.5`（GUI plugin SDK `@opencode/plugin` `2.2.2`，experimental）
> 开发环境：Windows 11 · Node 26 · Vite 7 · SolidJS 1.9 · TypeScript 5.7

## 0. 一句话

给 OpenCode Desktop 加一个「快聊」：一个随时呼出的浮层 + 一个常驻侧栏面板，用无工具的快模型聊天；聊出东西后可以一键「接力」到一个完整模型、带工具的正式会话里继续。

## 1. 它解决什么问题

OpenCode 的正式会话为了写代码，会带上大段系统提示、工具表、项目上下文。只是随口问一句时，这些都很贵、很慢，而且会把会话列表搞乱。

这个插件把「聊天」和「干活」拆开：

- 聊天走一个专用的 `chat` agent：短系统提示、禁用全部工具、`steps: 1`、便宜快的模型
- 对话本身仍然是真实的 OpenCode 会话（可搜索、可重命名、可继续），只是渲染在一个更轻的界面里
- 需要落地时，把整段对话 fork 到 `plan` / `build`，换成完整模型和工具

## 2. 已实现的功能

**入口**

- 应用内命令 `Ctrl+Shift+K`（`mod+shift+k`，可在 Settings → Shortcuts 改）
- 系统级热键（默认 `Ctrl+Alt+Space`，可在 Settings → Quick chat 改）
- 命令面板搜索「快聊 / Quick chat / chat」
- composer 里 `/chat <内容>` + Enter：打开浮层并直接发送
- 侧栏 `+` 菜单里的「快聊」tab

**聊天**

- 流式输出；关闭浮层不打断，重新打开继续显示
- Enter 发送、Shift+Enter 换行、Esc 关闭、中文输入法组合期间不误发
- 发送中显示停止按钮（`session.interrupt`）
- 模型切换（命令面板式可搜索列表），记住上次选择
- 助手回答完成后用 Markdown + 代码高亮渲染；流式过程中用纯文本，避免每帧重排

**历史**

- 索引存标题、预览、时间、模型、置顶、接力状态
- 搜索（标题 + 预览）、重命名、置顶、删除
- 删除会同时删除真实会话；「清空记录」只清索引

**接力（handoff）**

- 对当前对话执行 `session.fork`
- `switchAgent` 到 `plan`（先完善想法）或 `build`（直接开工）
- `switchModel` 到完整模型（默认取当前正式会话的模型，取不到则用服务端默认）
- 自动发送一条开场白，打开新会话 tab
- 索引里记录 `handoffSessionID`，历史行和浮层横幅都能跳回去

**系统级热键**

- Electron 主进程 `globalShortcut` 注册
- 通过 `Ipc` 把 `summon` 事件发给「最后有焦点的窗口」，并 `restore/show/focus`
- 注册失败（被别的软件占用）会在窗口里弹提示，并可直接跳到设置页改键
- 键位持久化在主进程存储里，插件重载后自动恢复

## 3. 代码结构

```
opencode-quick-chat/
├─ package.json          # 只导出 ./gui-experimental → dist/gui-experimental.cjs
├─ vite.config.ts        # @opencode/plugin/gui/vite 的 gui() 预设
├─ tsconfig.json
├─ README.md
├─ HANDOFF.md
├─ LICENSE
└─ src/
   ├─ gui.tsx            # 入口：Plugin.define({ ...definition, setup, main })
   ├─ definition.ts      # 声明：i18n + 窗口存储（conversations 索引）
   ├─ contract.ts        # Ipc：state / rebind / summon
   ├─ main.ts            # Electron 主进程：globalShortcut 注册与换键
   ├─ setup.tsx          # 窗口侧：Command / Panel / MenuItem / SettingsPage / 订阅
   ├─ engine.ts          # 建会话、发消息、停止、模型、接力、复制
   ├─ state.ts           # 索引读写（ctx.stores.chats）
   ├─ util.ts            # clip / timeAgo / messageOf
   ├─ i18n.ts            # en / zh / zh-CN
   └─ ui/
      ├─ ChatView.tsx    # 消息列表 + 输入框（浮层和侧栏共用）
      ├─ ChatDialog.tsx  # 浮层外壳 + 视图切换
      ├─ ChatPanel.tsx   # 侧栏外壳
      ├─ History.tsx     # 历史列表
      ├─ Handoff.tsx     # 接力表单
      ├─ Settings.tsx    # 设置页
      ├─ useChat.ts      # 从 store + server.data 派生当前对话
      ├─ bus.ts          # 跨 surface 的 focus / inbox 事件（纯 JS，无 Solid）
      └─ styles.ts       # CSS 字符串，通过 ctx.add(Style, css) 注入
```

## 4. 关键设计

### 4.1 为什么是 GUI 插件

OpenCode Desktop 的 GUI 插件（`exports["./gui-experimental"]`）能拿到：

- `ctx.client`：复用登录、额度、模型目录，不需要另配 API key
- `ctx.dialogs` / `ctx.ui`：原生对话框、按钮、输入框、Markdown
- `ctx.sessions` / `ctx.servers` / `ctx.tabs` / `ctx.layout`：会话、标签页、侧栏
- `ctx.main` + `Ipc`：主进程的 `globalShortcut`

比在外面套一个桌面壳或自己起 HTTP 服务省事得多。

### 4.2 消息从哪里来

**不要自己订阅 SSE。** 直接用 Desktop 已经在用的响应式数据层：

```ts
const server = ctx.servers.get(entry.server)
server.data.session.message.list(sessionID)   // 响应式消息数组
server.data.session.message.sync(sessionID)   // 首次加载
server.data.session.status(sessionID)         // "idle" | "running"
server.data.session.prompt({ sessionID, text })
```

流式、乐观更新、断线重连都由数据层负责。`ChatView` 只读这些数据。

### 4.3 索引和会话分离

`ctx.stores.chats` 里只存：

```ts
{ sessionID, server, directory, title, created, updated,
  preview, model, agent, pinned, handoffSessionID, handoffAgent }
```

正文永远在真实会话里。这样：

- 存储很小，不会因为长对话膨胀
- 会话可以在 OpenCode 里正常打开、改名、继续
- 插件被卸载后，聊天记录本身还在

上限：100 段对话；`preview` 只留用户最后一条消息的 200 字；搜索只搜标题和预览，不搜全文。

### 4.4 chat agent

在 `opencode.jsonc` 里定义（见第 5 节）：

- `hidden: true`、`mode: "primary"`、`steps: 1`
- `system` 是一段很短的聊天人设，替换掉 provider 的基础提示
- `permissions: [{ action: "*", resource: "*", effect: "deny" }]`

最后一条规则生效，所以工具全部被拒绝。实测一次回复 **0 次工具调用**。

创建会话时用 `data.session.create({ agent: "chat", model, location, title })`；如果创建失败（例如 agent 被删了），会退回不指定 agent 再建一次，并弹提示。

### 4.5 全局热键

`src/main.ts`：

- 用 `ctx.storage.store("hotkey", …)` 持久化 accelerator
- `toAccelerator()` 把 `mod+shift+k` 转成 Electron 的 `CommandOrControl+Shift+K`
- `ctx.provide(Hotkey, { state, rebind })`，返回 `provider`
- `register()` 先 unregister 旧的，再注册新的；失败时回滚旧键
- `summon()`：取最后有焦点的窗口，`restore/show/focus`，必要时用 `setAlwaysOnTop` 闪一下把窗口顶到前台，然后 `provider.emit("summon", {}, window.id)`

窗口侧在 `setup` 里：

```ts
const ipc = ctx.main(Hotkey)
ipc.on("summon", () => openChatDialog(ctx))
```

这行订阅也会触发主进程按需启动。

### 4.6 接力为什么用 fork

「新建会话 + 把摘要塞进第一条消息」会丢掉分轮结构、看不到原文。这里直接：

```ts
const fork = await client.session.fork({ sessionID })
await client.session.switchAgent({ sessionID: fork.id, agent: "plan" | "build" })
await client.session.switchModel({ sessionID: fork.id, model })
await client.session.update({ sessionID: fork.id, title })
ctx.tabs.open({ server: server.id, id: fork.id }, { focus: true })
await client.session.prompt({ sessionID: fork.id, text: opening })
```

接力是**快照**：之后再在快聊里聊，不会同步到那个正式会话；再点一次接力会基于最新内容 fork 一个新的。原快聊保留。

### 4.7 浮层和侧栏共享状态

两个 surface 都从 `ctx.stores.chats` 派生「当前对话」，所以：

- 在浮层里发，侧栏同步显示
- 在侧栏里改名，浮层标题跟着变

跨 surface 的一次性事件（聚焦、`/chat` 预填）走 `src/ui/bus.ts` 的纯 JS 监听器集合，**不在模块顶层创建 Solid signal**——因为整份 bundle 也会在主进程求值，那里 Solid 是占位符。

### 4.8 渲染策略

- 流式中的最后一条助手消息：`white-space: pre-wrap` 的纯文本
- 完成后：`ctx.ui.Markdown`（代码高亮、表格、链接）
- 自动滚到底，但用户手动往上滚时不再抢滚动位置（`stick` 判断）
- 历史/接力视图是对话框内部的三态切换，不叠第二层 dialog

## 5. 配置

`opencode.jsonc`（全局或项目级都行）：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "./local/opencode-quick-chat",
      "options": {
        "agent": "chat",
        "model": "opencode-go/deepseek-v4.1-flash",
        "globalBind": "ctrl+alt+space"
      }
    }
  ],
  "agents": {
    "chat": {
      "description": "Quick chat: fast, no tools, no project context",
      "mode": "primary",
      "hidden": true,
      "steps": 1,
      "model": "opencode-go/deepseek-v4.1-flash",
      "system": "You are the user's quick chat partner inside OpenCode. Reply in the user's language, briefly and directly. You have no tools and no project context: never claim to have read files or run commands. Prefer short paragraphs and use Markdown only when it helps. When an idea is worth building, help sharpen it into goals and next steps.",
      "permissions": [
        { "action": "*", "resource": "*", "effect": "deny" }
      ]
    }
  }
}
```

插件 options：

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `agent` | `chat` | 快聊使用的 agent；不存在时退回默认 agent |
| `model` | 空 | `provider/model#variant`；空则用 agent / 服务端默认 |
| `globalBind` | `ctrl+alt+space` | 只作为**首次**默认值；之后以设置页保存的值为准 |

`globalBind` 支持 `mod`（= Ctrl / Cmd）、`ctrl`、`alt`、`shift`、`meta`，以及 `space`、`enter`、`tab`、`f1`–`f24` 等命名键。

## 6. 构建、安装、重载

```sh
npm install
npm run typecheck
npm run build        # 产出 dist/gui-experimental.cjs
npm run watch        # 开发时持续构建
```

- 应用加载的是 `package.json` 里 `exports["./gui-experimental"]` 指向的 **单个 CJS 文件**
- `@opencode/plugin/gui/vite` 的 `gui()` 预设会编译 Solid JSX、内联动态 import、把 `solid-js` / `effect` / `electron` 等共享模块保持 external
- 本地目录插件由配置里的 `./local/opencode-quick-chat` 解析
- 配置和 `dist` 变化会自动热重载；如果没反应，`opencode service restart`

## 7. 验证记录

### 7.1 已验证

- 服务端插件列表：`features.gui: true`，`state.status: "active"`
- 主进程日志：`quick chat global shortcut registered { accelerator: ... }`
- 设置页改键：`Control+Alt+Space` → `Control+Shift+K` → `Control+Shift+L`，每次都在主进程重新注册成功
- 真实 API 冒烟（测试会话已删除）：
  - `chat` agent + `deepseek-v4.1-flash` 建会话、回复正常
  - 该回复 **0 次工具调用**（权限生效）
  - `fork → switchAgent(plan) → switchModel(deepseek-v4-pro)` 成功，fork 的 agent/model 正确

### 7.2 还没人眼回归的点

- 浮层在 640×480 对话框里的实际排版（`.qc-dialog` 固定 300px 高）
- 侧栏面板在窄宽度 / 窄屏（`Panel.mobile`）下的布局
- 中文输入法组合期间按 Enter 是否 100% 不误发
- 复制按钮、历史重命名/删除、置顶排序的手感
- 长回答流式时的滚动跟随和 Markdown 切换抖动
- 多窗口同时打开时的状态同步

### 7.3 怎么复现验证

1. 起会话，按应用内快捷键，发一句「你好」
2. 确认流式输出、停止按钮、关掉再打开还能看到
3. 输入 `/chat 测试`，确认浮层打开并自动发送
4. 聊两轮 → 接力 → 选 `plan`，确认新 tab 带着全部历史、agent/model 正确
5. 历史里改名、置顶、搜索、删除
6. 在别的程序里按全局键，确认窗口被拉到前台并打开浮层
7. Settings → Quick chat 改键，确认状态从「未注册」变「已注册」

## 8. 已知问题 / 风险

1. **SDK 是 experimental**：`@opencode/plugin` 的 GUI API 可能随 Desktop 升级变化。当前应用是 2.2.5、类型是 2.2.2 编译通过；升级到 2.3+ 后建议先 `npm run typecheck` + 打开一次 UI 回归。
2. **会话会进项目历史**：快聊是真实会话，这是可搜索、可继续的代价。嫌乱可以后续改成独立 workspace。
3. **全局键冲突**：注册失败会弹提示并允许改键；如果主进程存储里已经有一个失效的键位，options 的默认值不会覆盖它，去设置页改。
4. **浮层高度固定 300px**：小窗口或超大字号下可能需要调整。
5. **流式渲染**：流式中是纯文本，结束后才变 Markdown，长代码块会有一次视觉跳变。
6. **控制台警告**：对话框打开时会看到 Chromium 的 `aria-hidden` / autofocus 警告，来自宿主焦点管理，不影响功能。
7. **发送失败会丢草稿**：`sendMessage` 先清空输入框再请求；失败只弹 toast，不恢复文本（可改进）。
8. **搜索不搜全文**：只搜标题 + 最后一条用户消息的 200 字。
9. **删除无撤销**：删除快聊会删真实会话；接力的 fork 不受影响。
10. **接力失败回滚**：如果 fork 成功但后续步骤失败，fork 可能已经存在；目前只弹 toast，不清理。
11. **隐藏 agent**：`hidden: true` 的 agent 目前能被 `session.create` 接受（已实测）；如果未来服务端收紧，会退回默认 agent。
12. **无测试 / 无 CI / 无截图**。
13. **多窗口**：窗口存储是同步的，`summon` 只发给一个窗口；没做多窗口压力测试。
14. **没有窗口时全局键无效**：应用完全退出后热键自然不响应。

## 9. 调试手册

**日志**

- 服务端：`~/.local/share/opencode/log/opencode.log`（Windows 上通常由安装方式决定；本项目机器上是数据目录下的 `log/opencode.log`）
- Desktop 主进程 / 渲染进程：`%APPDATA%\ai.opencode.desktop\logs\<启动时间>\main.log`、`renderer.log`
- 主进程里插件自己的日志：`ctx.log.write("info" | "warn" | "error", ...)`，会进 Desktop 日志

**常用命令**

```sh
npm run typecheck
npm run build
opencode service status
opencode api get /api/info
```

**核对插件是否被加载**

```sh
opencode api get "/api/plugin?location[directory]=<项目目录>"
```

应能看到 `opencode-quick-chat`，且 `features.gui: true`。

**核对 agent**

```sh
opencode api get "/api/agent?location[directory]=<项目目录>"
```

应能看到 `id: "chat"`，`permissions` 最后一条是 `deny`。

**核对热键**

看 Desktop `main.log` 里的 `quick chat global shortcut registered`；失败会有 `quick chat global shortcut unavailable` 和错误原因。

## 10. Roadmap

- 标题栏 💬 胶囊 + 未读提示
- 历史全文搜索（按需加载 transcript）
- `@文件` / 选中代码引用
- 接力对话框里选择目标目录 / worktree
- 接力后自动归档原快聊
- 设置页做成「按键录制」而不是手输 accelerator
- 浮层尺寸自适应 / 可拖拽高度
- `deleteChat` 失败时恢复索引；发送失败时恢复草稿
- 引擎层单元测试（mock `Data` + `OpenCodeClient`）
- GitHub Actions：typecheck + build
- 发布 npm 包（去掉 `private`，加 `repository`）
- 英文 README / 英文 UI 校对

## 11. 发布到 GitHub

仓库目前**还没有创建**。推荐步骤：

```sh
# 在插件目录
git init -b main
git add .
git commit -m "feat: quick chat overlay and side panel for OpenCode Desktop"

# 先在 GitHub 网页创建一个空仓库（不要勾 README / .gitignore / license）
git remote add origin https://github.com/<owner>/opencode-quick-chat.git
git push -u origin main
```

认证方式（三选一，**不要用账号密码**，GitHub 早已不接受）：

1. 安装 GitHub CLI 后 `gh auth login`，再 `gh repo create opencode-quick-chat --public --source . --push`
2. 直接用 Git Credential Manager 的浏览器登录（Git for Windows 自带，第一次 `git push` 会弹）
3. 细粒度 PAT，只放到系统凭据管理器 / 环境变量里

发布前检查：

- `git status` 里没有 `node_modules/`、`dist/`、`.env`、日志、个人绝对路径
- `README.md` 里没有本机用户名、邮箱、token
- 选择公开 / 私有；公开前确认 license 和截图（目前没有截图）
- 建议仓库描述：`Quick chat overlay and side panel for OpenCode Desktop`
- 建议 topics：`opencode`, `opencode-plugin`, `solidjs`, `vite`, `ai-chat`

## 12. 交接清单

- [ ] `npm install && npm run typecheck && npm run build` 通过
- [ ] 按第 7.3 节走一遍 UI
- [ ] 确认 `chat` agent 和 `globalBind` 配置符合你的习惯
- [ ] 决定仓库名 / 公开或私有 / 作者署名（commit email）
- [ ] 创建 GitHub 仓库并 push
- [ ] 补一张浮层截图到 README（可选）
- [ ] 把本文件里「已验证 / 未验证」更新成实际情况

---

没有账号、token、cookie 或任何凭据写在这个仓库里。发布时也不要提交它们。
