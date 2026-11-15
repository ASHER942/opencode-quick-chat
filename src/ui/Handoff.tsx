import { Show, createSignal, onMount } from "solid-js"
import type { ModelInfo, ModelRef } from "@opencode/client/promise"
import { usePlugin } from "@opencode/plugin/gui"
import type { definition } from "../definition"
import type { Conversation } from "../state"
import { handoffChat, listModels, resolveFullModel } from "../engine"
import type { HandoffAgent } from "../engine"

export function HandoffView(props: { entry: Conversation; onBack: () => void; onDone: () => void }) {
  const ctx = usePlugin<typeof definition>()
  const [agent, setAgent] = createSignal<HandoffAgent>("plan")
  const [models, setModels] = createSignal<ModelInfo[]>([])
  const [model, setModel] = createSignal<ModelRef | undefined>()
  const [busy, setBusy] = createSignal(false)
  const [loading, setLoading] = createSignal(true)

  onMount(() => {
    void (async () => {
      setModels(await listModels(ctx, props.entry))
      setModel(await resolveFullModel(ctx, props.entry))
      setLoading(false)
    })()
  })

  const label = () => {
    const value = model()
    if (!value) return ctx.t("handoff.noModel")
    const found = models().find((entry) => entry.providerID === value.providerID && entry.id === value.id)
    return found?.name ?? `${value.providerID}/${value.id}`
  }

  const pick = async () => {
    const value = model()
    const chosen = await ctx.dialogs.select<string>({
      title: ctx.t("dialog.model"),
      placeholder: ctx.t("history.search"),
      current: value ? `${value.providerID}/${value.id}` : undefined,
      options: models().map((entry) => ({
        title: entry.name,
        value: `${entry.providerID}/${entry.id}`,
        description: entry.id,
        group: entry.providerID,
      })),
    })
    if (!chosen) return
    const found = models().find((entry) => `${entry.providerID}/${entry.id}` === chosen)
    if (found) setModel({ providerID: found.providerID, id: found.id })
  }

  const run = async () => {
    if (busy()) return
    setBusy(true)
    const ok = await handoffChat(ctx, props.entry, agent(), model())
    setBusy(false)
    if (!ok) return
    ctx.toast.show({ title: ctx.t("handoff.done"), variant: "success" })
    props.onDone()
  }

  return (
    <div class="qc-view qc-handoff">
      <div class="qc-handoff-head">
        <div class="qc-view-title">{ctx.t("handoff.title")}</div>
        <div class="qc-view-body">{ctx.t("handoff.body")}</div>
      </div>

      <div class="qc-options">
        <button
          type="button"
          class="qc-option"
          classList={{ "qc-option-active": agent() === "plan" }}
          onClick={() => setAgent("plan")}
        >
          <span class="qc-option-title">{ctx.t("handoff.plan")}</span>
          <span class="qc-option-body">{ctx.t("handoff.plan.description")}</span>
        </button>
        <button
          type="button"
          class="qc-option"
          classList={{ "qc-option-active": agent() === "build" }}
          onClick={() => setAgent("build")}
        >
          <span class="qc-option-title">{ctx.t("handoff.build")}</span>
          <span class="qc-option-body">{ctx.t("handoff.build.description")}</span>
        </button>
      </div>

      <div class="qc-facts">
        <div class="qc-fact">
          <span class="qc-fact-key">{ctx.t("handoff.model")}</span>
          <Show
            when={!loading()}
            fallback={<span class="qc-meta">{ctx.t("composer.hint")}</span>}
          >
            <button type="button" class="qc-link" onClick={() => void pick()} disabled={models().length === 0}>
              {label()}
            </button>
          </Show>
        </div>
        <div class="qc-fact">
          <span class="qc-fact-key">{ctx.t("handoff.directory")}</span>
          <span class="qc-meta qc-ellipsis" title={props.entry.directory}>
            {props.entry.directory}
          </span>
        </div>
      </div>

      <div class="qc-view-actions">
        <ctx.ui.Button variant="neutral" size="small" onClick={props.onBack} disabled={busy()}>
          {ctx.t("handoff.back")}
        </ctx.ui.Button>
        <ctx.ui.Button variant="contrast" size="small" busy={busy()} onClick={() => void run()}>
          {ctx.t("handoff.confirm")}
        </ctx.ui.Button>
      </div>
    </div>
  )
}
