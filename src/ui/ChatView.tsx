import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js"
import type { SessionMessageAssistant, SessionMessageUser } from "@opencode/client/promise"
import { usePlugin } from "@opencode/plugin/gui"
import type { definition } from "../definition"
import { copyReply, openHandoff, sendMessage, stopChat, syncChat } from "../engine"
import { onFocus, onInbox, takePending } from "./bus"
import { useChat } from "./useChat"

type Visible = SessionMessageUser | SessionMessageAssistant

function textOf(message: Visible): string {
  if (message.type === "user") return message.text
  return message.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("")
}

function AssistantRow(props: { message: SessionMessageAssistant; streaming: boolean }) {
  const ctx = usePlugin<typeof definition>()
  const { conv } = useChat()
  const text = () => textOf(props.message)

  return (
    <div class="qc-row qc-row-assistant">
      <Show
        when={!props.streaming}
        fallback={<div class="qc-plain qc-selectable">{text()}</div>}
      >
        <ctx.ui.Markdown text={text()} class="qc-markdown" />
      </Show>
      <Show when={props.message.error}>
        {(error) => <div class="qc-error">{error().message}</div>}
      </Show>
      <Show when={text() && !props.streaming}>
        <div class="qc-row-actions">
          <button type="button" class="qc-link" onClick={() => void copyReply(ctx, conv())}>
            {ctx.t("action.copy")}
          </button>
        </div>
      </Show>
    </div>
  )
}

export function ChatView(props: { inbox?: boolean }) {
  const ctx = usePlugin<typeof definition>()
  const { conv, data, running } = useChat()

  let synced = ""
  createEffect(() => {
    const entry = conv()
    if (!entry) {
      synced = ""
      return
    }
    if (synced === entry.sessionID) return
    synced = entry.sessionID
    syncChat(ctx, entry)
  })

  const messages = () => {
    const entry = conv()
    const store = data()
    if (!entry || !store) return []
    return store.session.message.list(entry.sessionID)
  }

  const visible = createMemo(() =>
    messages().filter((message): message is Visible => message.type === "user" || message.type === "assistant"),
  )

  const streamingId = () => {
    if (!running()) return ""
    const list = visible()
    for (let index = list.length - 1; index >= 0; index -= 1) {
      const message = list[index]
      if (message.type === "assistant") return message.id
    }
    return ""
  }

  let scroller: HTMLDivElement | undefined
  let stick = true
  const onScroll = () => {
    if (!scroller) return
    stick = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80
  }
  onMount(() => {
    if (scroller) scroller.scrollTop = scroller.scrollHeight
  })
  createEffect(() => {
    const list = visible()
    const last = list[list.length - 1]
    if (last) textOf(last)
    if (stick && scroller) scroller.scrollTop = scroller.scrollHeight
  })

  return (
    <div class="qc-thread-wrap">
      <Show when={conv()?.handoffSessionID}>
        <div class="qc-banner">
          <span>{ctx.t("history.handed")}</span>
          <button type="button" class="qc-link" onClick={() => openHandoff(ctx, conv())}>
            {ctx.t("history.openHandoff")}
          </button>
        </div>
      </Show>

      <div class="qc-thread" ref={(element) => (scroller = element)} onScroll={onScroll}>
        <Show
          when={visible().length > 0}
          fallback={
            <div class="qc-empty">
              <div class="qc-empty-title">{ctx.t("empty.title")}</div>
              <div class="qc-empty-body">{ctx.t("empty.body")}</div>
            </div>
          }
        >
          <For each={visible()}>
            {(message) =>
              message.type === "user" ? (
                <div class="qc-row qc-row-user">
                  <div class="qc-bubble-user qc-selectable">{message.text}</div>
                </div>
              ) : (
                <AssistantRow message={message} streaming={message.id === streamingId()} />
              )
            }
          </For>
        </Show>
      </div>

      <ChatComposer inbox={props.inbox} />
    </div>
  )
}

function ChatComposer(props: { inbox?: boolean }) {
  const ctx = usePlugin<typeof definition>()
  const { running } = useChat()
  const [text, setText] = createSignal("")
  const [composing, setComposing] = createSignal(false)
  let area: HTMLTextAreaElement | undefined

  const send = () => {
    const value = text().trim()
    if (!value || running()) return
    setText("")
    void sendMessage(ctx, value)
  }

  const apply = (item: { text: string; send: boolean }) => {
    setText(item.text)
    if (item.send) queueMicrotask(send)
  }

  if (props.inbox) onCleanup(onInbox(apply))
  onCleanup(onFocus(() => queueMicrotask(() => area?.focus())))

  const grow = () => {
    if (!area) return
    area.style.height = "0px"
    area.style.height = `${Math.min(160, area.scrollHeight)}px`
  }
  createEffect(() => {
    text().length
    grow()
  })
  onMount(() => {
    const item = props.inbox ? takePending() : undefined
    if (item) apply(item)
    grow()
    queueMicrotask(() => area?.focus())
  })

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" || event.shiftKey) return
    if (event.isComposing || composing()) return
    event.preventDefault()
    send()
  }

  return (
    <div class="qc-composer-wrap">
      <div class="qc-composer" onClick={() => area?.focus()}>
        <textarea
          ref={(element) => (area = element)}
          class="qc-input"
          rows={1}
          value={text()}
          placeholder={ctx.t("composer.placeholder")}
          onInput={(event) => setText(event.currentTarget.value)}
          onKeyDown={onKeyDown}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          aria-label={ctx.t("composer.placeholder")}
        />
        <Show
          when={running()}
          fallback={
            <ctx.ui.Button
              variant="contrast"
              size="small"
              onClick={send}
              disabled={!text().trim()}
            >
              {ctx.t("composer.send")}
            </ctx.ui.Button>
          }
        >
          <ctx.ui.Button variant="neutral" size="small" icon="stop" onClick={() => void stopChat(ctx)}>
            {ctx.t("composer.stop")}
          </ctx.ui.Button>
        </Show>
      </div>
      <div class="qc-hint">{ctx.t("composer.hint")}</div>
    </div>
  )
}
