import { For, Show, createMemo, createSignal } from "solid-js"
import { usePlugin } from "@opencode/plugin/gui"
import type { UiMenuEntry } from "@opencode/plugin/gui"
import type { definition } from "../definition"
import { deleteChat, openHandoff, renameChat, togglePin } from "../engine"
import { list, setActive, titleOf } from "../state"
import type { Conversation } from "../state"
import { timeAgo } from "../util"

export function HistoryView(props: { onPick: () => void }) {
  const ctx = usePlugin<typeof definition>()
  const [query, setQuery] = createSignal("")

  const items = createMemo(() => {
    const needle = query().trim().toLowerCase()
    const all = list(ctx)
    if (!needle) return all
    return all.filter((entry) => {
      const haystack = `${titleOf(ctx, entry)}\n${entry.preview}\n${entry.title}`.toLowerCase()
      return haystack.includes(needle)
    })
  })

  const rename = async (entry: Conversation) => {
    const next = await ctx.dialogs.prompt({
      title: ctx.t("history.renameTitle"),
      value: titleOf(ctx, entry),
      submit: ctx.t("history.renameSubmit"),
    })
    if (next) await renameChat(ctx, entry, next)
  }

  const destroy = async (entry: Conversation) => {
    const ok = await ctx.dialogs.confirm({
      title: ctx.t("history.deleteTitle"),
      description: ctx.t("history.deleteBody"),
      confirm: ctx.t("history.delete"),
      danger: true,
    })
    if (!ok) return
    await deleteChat(ctx, entry)
    ctx.toast.show({ title: ctx.t("toast.deleted") })
  }

  const menu = (entry: Conversation): UiMenuEntry[] => [
    {
      label: entry.pinned ? ctx.t("history.unpin") : ctx.t("history.pin"),
      icon: "arrow-up",
      onSelect: () => void togglePin(ctx, entry),
    },
    {
      label: ctx.t("history.rename"),
      icon: "pencil-line",
      onSelect: () => void rename(entry),
    },
    {
      label: ctx.t("history.delete"),
      icon: "trash",
      onSelect: () => void destroy(entry),
    },
  ]

  return (
    <div class="qc-view qc-history">
      <ctx.ui.TextInput
        label={ctx.t("history.search")}
        placeholder={ctx.t("history.search")}
        value={query()}
        onInput={setQuery}
        autofocus
      />

      <Show
        when={items().length > 0}
        fallback={
          <div class="qc-empty">
            <div class="qc-empty-title">{ctx.t("history.empty")}</div>
            <Show when={query().trim()}>
              <div class="qc-empty-body">{ctx.t("history.noResults")}</div>
            </Show>
          </div>
        }
      >
        <div class="qc-list">
          <For each={items()}>
            {(entry) => (
              <div
                classList={{
                  "qc-item": true,
                  "qc-item-active": ctx.stores.chats.value.active === entry.sessionID,
                }}
              >
                <button
                  type="button"
                  class="qc-item-main"
                  onClick={() => {
                    setActive(ctx, entry.sessionID)
                    props.onPick()
                  }}
                >
                  <div class="qc-item-title">{titleOf(ctx, entry)}</div>
                  <div class="qc-item-preview">{entry.preview || ctx.t("empty.title")}</div>
                </button>
                <div class="qc-item-side">
                  <Show when={entry.handoffSessionID}>
                    <span class="qc-badge">{ctx.t("history.handed")}</span>
                    <ctx.ui.IconButton
                      icon="arrow-up-right"
                      label={ctx.t("history.openHandoff")}
                      size="small"
                      onClick={() => openHandoff(ctx, entry)}
                    />
                  </Show>
                  <span class="qc-meta">{timeAgo(entry.updated, ctx.locale.locale())}</span>
                  <ctx.ui.Menu label={ctx.t("history.more")} items={menu(entry)} />
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
