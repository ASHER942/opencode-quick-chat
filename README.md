# opencode-quick-chat

Quick chat overlay and side panel for **OpenCode Desktop**.

A floating chat you can summon from anywhere, a side panel for longer conversations, and a one-click handoff to a full model when an idea is worth building.

> Status: experimental. The OpenCode Desktop GUI plugin API (`@opencode/plugin/gui`) is still evolving; this plugin is built against `@opencode/plugin` 2.2.x.

## 特点

- **随时呼出**：应用内 `Ctrl+Shift+K`，系统级 `Ctrl+Alt+Space`（可改）
- **快**：专用 `chat` agent，短提示词、无工具、单步、便宜快的模型
- **不碰项目**：快聊默认不带项目上下文，也不会读写文件
- **浮层 + 侧栏**：随手一问用浮层，长聊用侧栏；两边共享同一个对话
- **可沉淀**：聊天就是真实 OpenCode 会话，可搜索、重命名、置顶、删除
- **接力**：把整段对话 fork 到正式会话，换成完整模型 + 工具，`plan` 先完善、`build` 直接开工

## 安装

目前只支持本地目录安装，还没有发布到 npm。

```sh
git clone <this-repo> opencode-quick-chat
cd opencode-quick-chat
npm install
npm run build
```

把目录放到 OpenCode 配置目录下的 `local/opencode-quick-chat`，或者放到任意位置、在配置里写绝对路径（`package` 是相对配置文件解析的）。

在 `opencode.jsonc` 里注册插件和聊天 agent：

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

`package` 指向你克隆下来的目录。`package` 里的相对路径是相对配置文件解析的，插件目录不必放在 `local/` 下。模型换成你常用的快模型即可。

## 使用

| 入口 | 动作 |
| --- | --- |
| `Ctrl+Shift+K` | 应用内打开 / 收起浮层 |
| `Ctrl+Alt+Space` | 任何程序里把 OpenCode 拉到前台并打开浮层 |
| `/chat 想问的话` | 在 composer 里直接发送到快聊 |
| 命令面板 | 搜索「快聊 / Quick chat」 |
| 侧栏 `+` 菜单 | 打开常驻的「快聊」tab |

浮层里：`Enter` 发送，`Shift+Enter` 换行，`Esc` 关闭（不打断回答），`Ctrl+N` 新对话。

聊出结果后点 **「接力」**：

- **先完善想法（Plan）**：完整模型 + 只读工具，收敛目标、指出风险
- **直接开工（Build）**：完整模型 + 编辑/命令工具，直接开始改

接力会 fork 整段对话，原快聊保留。

## 构建

```sh
npm run typecheck
npm run build      # dist/gui-experimental.cjs
npm run watch      # 开发时持续构建，应用会自动重载
```

`./gui-experimental` 必须是单个 CJS 文件，由 `@opencode/plugin/gui/vite` 的 `gui()` 预设产出。

## 已知限制

- GUI 插件 API 还是 experimental，Desktop 升级后可能需要适配
- 快聊会话会出现在当前项目的会话列表里
- 删除快聊会删除真实会话；「清空记录」只清索引
- 搜索只覆盖标题和最后一条用户消息，不搜全文
- 全局快捷键被占用时会提示，可在 Settings → Quick chat 改
- 应用完全没有窗口时，全局热键不会响应

更完整的架构、验证记录、调试方法和 roadmap 见 [HANDOFF.md](./HANDOFF.md)。

## License

[MIT](./LICENSE)
