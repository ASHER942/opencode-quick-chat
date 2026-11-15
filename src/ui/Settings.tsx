import { Show, createEffect, createSignal } from "solid-js"
import { usePlugin } from "@opencode/plugin/gui"
import type { definition } from "../definition"
import { Hotkey } from "../contract"
import { clear, list } from "../state"

export function QuickChatSettings() {
  const ctx = usePlugin<typeof definition>()
  const ipc = ctx.app.platform === "desktop" ? ctx.main(Hotkey) : undefined
  const state = () => ipc?.state()
  const [draft, setDraft] = createSignal("")
  const [busy, setBusy] = createSignal(false)

  createEffect(() => {
    const current = state()
    if (current) setDraft(current.accelerator)
  })

  const apply = async () => {
    if (!ipc || busy()) return
    const value = draft().trim()
    if (!value) {
      ctx.toast.show({ title: ctx.t("settings.hotkey.invalid"), variant: "error" })
      return
    }
    setBusy(true)
    const ok = await ipc.rebind({ accelerator: value }).catch(() => false)
    setBusy(false)
    if (ok) {
      ctx.toast.show({ title: ctx.t("settings.hotkey.ok"), variant: "success" })
      return
    }
    ctx.toast.show({
      title: ctx.t("settings.hotkey.failed"),
      description: state()?.error,
      variant: "error",
    })
  }

  const clearAll = async () => {
    const ok = await ctx.dialogs.confirm({
      title: ctx.t("history.clearTitle"),
      description: ctx.t("history.clearBody"),
      confirm: ctx.t("settings.clear"),
      danger: true,
    })
    if (!ok) return
    clear(ctx)
    ctx.toast.show({ title: ctx.t("toast.cleared") })
  }

  const count = () => list(ctx).length
  const status = () => (state()?.registered ? ctx.t("settings.hotkey.ok") : ctx.t("settings.hotkey.failed"))

  return (
    <div class="qc-settings">
      <div class="qc-settings-head">
        <div class="qc-settings-title">{ctx.t("settings.title")}</div>
        <div class="qc-settings-body">{ctx.t("settings.description")}</div>
      </div>

      <div class="qc-settings-section">
        <div class="qc-settings-label">{ctx.t("settings.hotkey")}</div>
        <div class="qc-settings-hint">{ctx.t("settings.hotkey.description")}</div>
        <div class="qc-settings-row">
          <ctx.ui.TextInput
            label={ctx.t("settings.hotkey")}
            value={draft()}
            onInput={setDraft}
            placeholder="Control+Alt+Space"
            onSubmit={() => void apply()}
            disabled={!ipc}
          />
          <ctx.ui.Button variant="neutral" onClick={() => void apply()} disabled={!ipc} busy={busy()}>
            {ctx.t("settings.hotkey.apply")}
          </ctx.ui.Button>
        </div>
        <div class="qc-settings-inline">
          <ctx.ui.Keybind keys={ctx.keybinds.keybind(`${ctx.id}.open`)} />
          <span class="qc-settings-status" data-ok={state()?.registered ? "true" : "false"}>
            {ipc ? status() : ctx.t("settings.hotkey.failed")}
          </span>
          <Show when={state()?.error}>
            <span class="qc-meta">{state()?.error}</span>
          </Show>
        </div>
      </div>

      <div class="qc-settings-section">
        <div class="qc-settings-label">{ctx.t("settings.history")}</div>
        <div class="qc-settings-row">
          <span class="qc-meta">{ctx.plural("settings.history.count", count())}</span>
          <span class="qc-spacer" />
          <ctx.ui.Button variant="ghost" size="small" icon="trash" onClick={() => void clearAll()} disabled={count() === 0}>
            {ctx.t("settings.clear")}
          </ctx.ui.Button>
        </div>
      </div>

      <div class="qc-settings-hint">{ctx.t("settings.about")}</div>
    </div>
  )
}
