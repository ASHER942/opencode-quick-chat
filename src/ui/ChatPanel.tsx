import { Show, createSignal } from "solid-js"
import { usePlugin } from "@opencode/plugin/gui"
import type { definition } from "../definition"
import { setActive, titleOf } from "../state"
import { ChatView } from "./ChatView"
import { HandoffView } from "./Handoff"
import { HistoryView } from "./History"
import { focusChat } from "./bus"
import { useChat } from "./useChat"

type View = "chat" | "history" | "handoff"

export function ChatPanel() {
  const ctx = usePlugin<typeof definition>()
  const { conv } = useChat()
  const [view, setView] = createSignal<View>("chat")

  const startNew = () => {
    setActive(ctx, "")
    setView("chat")
    focusChat()
  }

  const title = () => {
    if (view() === "chat") return titleOf(ctx, conv())
    if (view() === "history") return ctx.t("history.title")
    return ctx.t("handoff.title")
  }

  return (
    <div class="qc-panel">
      <div class="qc-topbar">
        <Show when={view() !== "chat"}>
          <ctx.ui.IconButton
            icon="arrow-left"
            label={ctx.t("action.back")}
            onClick={() => setView("chat")}
          />
        </Show>
        <span class="qc-panel-title" title={title()}>
          {title()}
        </span>
        <span class="qc-spacer" />
        <Show when={view() === "chat"}>
          <ctx.ui.Tooltip value={ctx.t("dialog.history")}>
            <ctx.ui.IconButton
              icon="comment"
              label={ctx.t("dialog.history")}
              onClick={() => setView("history")}
            />
          </ctx.ui.Tooltip>
          <ctx.ui.Tooltip value={ctx.t("dialog.new")}>
            <ctx.ui.IconButton icon="plus" label={ctx.t("dialog.new")} onClick={startNew} />
          </ctx.ui.Tooltip>
          <ctx.ui.Tooltip value={ctx.t("dialog.handoff")}>
            <ctx.ui.IconButton
              icon="fork"
              label={ctx.t("dialog.handoff")}
              disabled={!conv()}
              onClick={() => setView("handoff")}
            />
          </ctx.ui.Tooltip>
        </Show>
      </div>

      <Show when={view() === "chat"}>
        <ChatView />
      </Show>
      <Show when={view() === "history"}>
        <HistoryView onPick={() => setView("chat")} />
      </Show>
      <Show when={view() === "handoff"}>
        <Show when={conv()} fallback={<div class="qc-empty">{ctx.t("empty.title")}</div>}>
          {(entry) => (
            <HandoffView
              entry={entry()}
              onBack={() => setView("chat")}
              onDone={() => setView("chat")}
            />
          )}
        </Show>
      </Show>
    </div>
  )
}
