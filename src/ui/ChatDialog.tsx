import { Show, createSignal, onCleanup } from "solid-js"
import type { DialogHandle } from "@opencode/plugin/gui"
import { usePlugin } from "@opencode/plugin/gui"
import type { definition } from "../definition"
import { copyReply, defaultModelKey, listModels } from "../engine"
import { patch, setActive, titleOf } from "../state"
import type { Ctx } from "../state"
import { ChatView } from "./ChatView"
import { HandoffView } from "./Handoff"
import { HistoryView } from "./History"
import { chatDialogOpen, focusChat, pushInbox, setChatDialogOpen } from "./bus"
import { useChat } from "./useChat"

type View = "chat" | "history" | "handoff"

export function openChatDialog(ctx: Ctx, input?: string): void {
  const text = input?.trim()
  if (text) pushInbox(text, true)
  if (chatDialogOpen()) {
    focusChat()
    return
  }
  setChatDialogOpen(true)
  ctx.dialogs.open((dialog) => <ChatDialog dialog={dialog} />, { replace: false })
}

function ChatDialog(props: { dialog: DialogHandle }) {
  const ctx = usePlugin<typeof definition>()
  const { conv } = useChat()
  const [view, setView] = createSignal<View>("chat")

  onCleanup(() => setChatDialogOpen(false))

  const startNew = () => {
    setActive(ctx, "")
    setView("chat")
    focusChat()
  }

  const expand = () => {
    const session = ctx.sessions.current()
    if (!session) {
      ctx.toast.show({ title: ctx.t("toast.noSession"), variant: "error" })
      return
    }
    ctx.layout.open(`${ctx.id}:chat`, session)
    props.dialog.close()
  }

  const modelLabel = () => {
    const key = conv()?.model || ctx.stores.chats.value.lastModel || defaultModelKey(ctx)
    if (!key) return ctx.t("dialog.model")
    const id = key.split("#")[0].split("/").pop()
    return id || key
  }

  const pickModel = async () => {
    const entry = conv()
    const models = await listModels(ctx, entry)
    if (models.length === 0) {
      ctx.toast.show({ title: ctx.t("toast.noServer"), variant: "error" })
      return
    }
    const chosen = await ctx.dialogs.select<string>({
      title: ctx.t("dialog.model"),
      placeholder: ctx.t("history.search"),
      options: models.map((model) => ({
        title: model.name,
        value: `${model.providerID}/${model.id}`,
        description: model.id,
        group: model.providerID,
      })),
      current: entry?.model || ctx.stores.chats.value.lastModel || undefined,
    })
    if (!chosen) return
    const model = models.find((item) => `${item.providerID}/${item.id}` === chosen)
    if (!model) return
    ctx.stores.chats.update((draft) => {
      draft.lastModel = chosen
    })
    if (!entry) return
    patch(ctx, entry.sessionID, (draft) => {
      draft.model = chosen
    })
    const server = ctx.servers.get(entry.server)
    if (!server) return
    await server.client.session
      .switchModel({ sessionID: entry.sessionID, model: { id: model.id, providerID: model.providerID } })
      .catch(() => {})
  }

  return (
    <ctx.ui.Dialog
      title={ctx.t("dialog.title")}
      description={view() === "chat" ? titleOf(ctx, conv()) : undefined}
      size="large"
      footer={
        <div class="qc-footer">
          <ctx.ui.Button
            variant="ghost"
            size="small"
            icon="copy"
            onClick={() => void copyReply(ctx, conv())}
          >
            {ctx.t("action.copy")}
          </ctx.ui.Button>
          <span class="qc-spacer" />
          <ctx.ui.Button
            variant="ghost"
            size="small"
            icon="fork"
            disabled={!conv()}
            onClick={() => setView("handoff")}
          >
            {ctx.t("dialog.handoff")}
          </ctx.ui.Button>
          <ctx.ui.Button variant="neutral" size="small" onClick={() => props.dialog.close()}>
            {ctx.t("dialog.close")}
          </ctx.ui.Button>
        </div>
      }
    >
      <div class="qc-dialog">
        <Show when={view() === "chat"}>
          <div class="qc-topbar">
            <button type="button" class="qc-chip" onClick={() => void pickModel()} title={ctx.t("dialog.model")}>
              <ctx.ui.Icon name="models" size="small" />
              <span class="qc-chip-label">{modelLabel()}</span>
            </button>
            <span class="qc-spacer" />
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
            <ctx.ui.Tooltip value={ctx.t("dialog.expand")}>
              <ctx.ui.IconButton
                icon="layout-right"
                label={ctx.t("dialog.expand")}
                onClick={expand}
              />
            </ctx.ui.Tooltip>
          </div>
          <ChatView inbox />
        </Show>

        <Show when={view() === "history"}>
          <div class="qc-topbar">
            <ctx.ui.IconButton
              icon="arrow-left"
              label={ctx.t("action.back")}
              onClick={() => setView("chat")}
            />
            <span class="qc-panel-title">{ctx.t("history.title")}</span>
            <span class="qc-spacer" />
            <ctx.ui.IconButton icon="plus" label={ctx.t("dialog.new")} onClick={startNew} />
          </div>
          <HistoryView onPick={() => setView("chat")} />
        </Show>

        <Show when={view() === "handoff"}>
          <div class="qc-topbar">
            <ctx.ui.IconButton
              icon="arrow-left"
              label={ctx.t("action.back")}
              onClick={() => setView("chat")}
            />
            <span class="qc-panel-title">{ctx.t("handoff.title")}</span>
          </div>
          <Show when={conv()} fallback={<div class="qc-empty">{ctx.t("empty.title")}</div>}>
            {(entry) => (
              <HandoffView
                entry={entry()}
                onBack={() => setView("chat")}
                onDone={() => props.dialog.close()}
              />
            )}
          </Show>
        </Show>
      </div>
    </ctx.ui.Dialog>
  )
}
