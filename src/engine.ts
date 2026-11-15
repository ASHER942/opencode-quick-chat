import type { ModelInfo, ModelRef } from "@opencode/client/promise"
import type { ServerRef } from "@opencode/plugin/gui"
import type { Conversation, Ctx } from "./state"
import { active, patch, remove, upsert } from "./state"
import { clip, messageOf } from "./util"

export type HandoffAgent = "plan" | "build"

export type ModelChoice = {
  readonly providerID: string
  readonly id: string
  readonly variant?: string
}

const DEFAULT_AGENT = "chat"

function optionString(ctx: Ctx, key: string, fallback: string): string {
  const value = ctx.options[key]
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

export function parseModel(value: string | undefined | null): ModelChoice | undefined {
  if (!value) return undefined
  const [full, variant] = value.split("#")
  const slash = full.indexOf("/")
  if (slash <= 0 || slash === full.length - 1) return undefined
  const providerID = full.slice(0, slash).trim()
  const id = full.slice(slash + 1).trim()
  if (!providerID || !id) return undefined
  return variant ? { providerID, id, variant } : { providerID, id }
}

export function modelKey(model: ModelChoice | ModelRef | undefined): string {
  if (!model) return ""
  return `${model.providerID}/${model.id}${model.variant ? `#${model.variant}` : ""}`
}

export function defaultModelKey(ctx: Ctx): string {
  return optionString(ctx, "model", "")
}

/** The server the current window works against: the routed session's, else the built-in one. */
export function pickServer(ctx: Ctx): ServerRef | undefined {
  const current = ctx.sessions.current()
  if (current) return current.server
  const refs: ServerRef[] = []
  for (const id of ctx.servers.list()) {
    const ref = ctx.servers.get(id)
    if (ref) refs.push(ref)
  }
  return refs.find((ref) => ref.builtin) ?? refs[0]
}

export function pickDirectory(ctx: Ctx, server: ServerRef): string {
  const current = ctx.sessions.current()
  if (current && current.server.id === server.id && current.directory) return current.directory
  const open = ctx.sessions.list().find((entry) => entry.server.id === server.id && entry.location?.directory)
  if (open?.location?.directory) return open.location.directory
  return server.data.location.default().directory
}

async function newSession(
  server: ServerRef,
  directory: string,
  agent: string,
  model: ModelChoice | undefined,
  title: string,
): Promise<{ id: string; request: Promise<unknown> } | undefined> {
  const location = { directory } as never
  try {
    const attempt = server.data.session.create({
      title,
      ...(agent ? { agent } : {}),
      model: model as never,
      location,
    })
    await attempt.request
    return attempt
  } catch {
    return undefined
  }
}

export async function createChat(ctx: Ctx): Promise<Conversation | undefined> {
  const server = pickServer(ctx)
  if (!server) {
    ctx.toast.show({ title: ctx.t("toast.noServer"), variant: "error" })
    return undefined
  }
  const directory = pickDirectory(ctx, server)
  const agent = optionString(ctx, "agent", DEFAULT_AGENT)
  const model = parseModel(defaultModelKey(ctx))

  let created = await newSession(server, directory, agent, model, ctx.t("dialog.title"))
  let usedAgent = agent
  if (!created) {
    created = await newSession(server, directory, "", model, ctx.t("dialog.title"))
    usedAgent = ""
    if (created) ctx.toast.show({ title: ctx.t("toast.agentFallback"), variant: "default" })
  }
  if (!created) {
    ctx.toast.show({ title: ctx.t("toast.sendFailed"), description: ctx.t("toast.noServer"), variant: "error" })
    return undefined
  }

  const now = Date.now()
  const entry: Conversation = {
    sessionID: created.id,
    server: server.id,
    directory,
    title: "",
    created: now,
    updated: now,
    preview: "",
    model: modelKey(model),
    agent: usedAgent,
    pinned: false,
    handoffSessionID: "",
    handoffAgent: "",
  }
  upsert(ctx, entry)
  void server.data.session.message.sync(entry.sessionID).catch(() => {})
  return entry
}

export async function sendMessage(ctx: Ctx, text: string): Promise<void> {
  const value = text.trim()
  if (!value) return
  let entry = active(ctx)
  if (!entry) entry = await createChat(ctx)
  if (!entry) return

  const server = ctx.servers.get(entry.server)
  if (!server) {
    ctx.toast.show({ title: ctx.t("toast.noServer"), variant: "error" })
    return
  }

  const title = entry.title || clip(value, 48)
  const first = !entry.title
  patch(ctx, entry.sessionID, (draft) => {
    draft.updated = Date.now()
    draft.preview = clip(value)
    if (!draft.title) draft.title = title
  })
  if (first) void server.client.session.update({ sessionID: entry.sessionID, title }).catch(() => {})

  try {
    await server.data.session.prompt({ sessionID: entry.sessionID, text: value })
  } catch (error) {
    ctx.toast.show({ title: ctx.t("toast.sendFailed"), description: messageOf(error), variant: "error" })
  }
}

export async function stopChat(ctx: Ctx): Promise<void> {
  const entry = active(ctx)
  if (!entry) return
  const server = ctx.servers.get(entry.server)
  if (!server) return
  try {
    await server.client.session.interrupt({ sessionID: entry.sessionID })
  } catch {
    // The session may already have finished.
  }
}

export function syncChat(ctx: Ctx, entry: Conversation | undefined): void {
  if (!entry) return
  const server = ctx.servers.get(entry.server)
  if (!server) return
  void server.data.session.message.sync(entry.sessionID).catch(() => {})
}

export async function listModels(ctx: Ctx, entry?: Conversation): Promise<ModelInfo[]> {
  const server = pickServer(ctx)
  if (!server) return []
  const directory = entry?.directory ?? pickDirectory(ctx, server)
  try {
    const out = await server.client.model.list({ location: { directory } })
    return out.data.filter((model) => model.enabled && (model.type === undefined || model.type === "chat"))
  } catch {
    return []
  }
}

/** The full model a handed-off session should continue with. */
export async function resolveFullModel(ctx: Ctx, entry: Conversation): Promise<ModelRef | undefined> {
  const current = ctx.sessions.current()
  const composer = current && current.id !== entry.sessionID ? ctx.screen.current()?.composer.model() : undefined
  if (composer) {
    return {
      providerID: composer.providerID as ModelRef["providerID"],
      id: composer.modelID,
      variant: composer.variant,
    }
  }
  const server = ctx.servers.get(entry.server)
  if (server) {
    try {
      const out = await server.client.model.default({ location: { directory: entry.directory } })
      if (out.data) return { providerID: out.data.providerID, id: out.data.id }
    } catch {
      // Fall back to the first enabled chat model.
    }
  }
  const models = await listModels(ctx, entry)
  const first = models[0]
  return first ? { providerID: first.providerID, id: first.id } : undefined
}

export async function renameChat(ctx: Ctx, entry: Conversation, title: string): Promise<void> {
  const value = title.trim()
  if (!value) return
  patch(ctx, entry.sessionID, (draft) => {
    draft.title = value
  })
  const server = ctx.servers.get(entry.server)
  if (!server) return
  try {
    await server.client.session.update({ sessionID: entry.sessionID, title: value })
  } catch {
    // The index keeps the new name; the session title is cosmetic.
  }
}

export async function deleteChat(ctx: Ctx, entry: Conversation): Promise<void> {
  remove(ctx, entry.sessionID)
  const server = ctx.servers.get(entry.server)
  if (!server) return
  try {
    await server.client.session.remove({ sessionID: entry.sessionID })
  } catch {
    // The session may already be gone.
  }
}

export async function togglePin(ctx: Ctx, entry: Conversation): Promise<void> {
  patch(ctx, entry.sessionID, (draft) => {
    draft.pinned = !draft.pinned
  })
}

export function lastReply(ctx: Ctx, entry: Conversation | undefined): string {
  if (!entry) return ""
  const server = ctx.servers.get(entry.server)
  if (!server) return ""
  const messages = server.data.session.message.list(entry.sessionID)
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message.type !== "assistant") continue
    const text = message.content
      .flatMap((part) => (part.type === "text" ? [part.text] : []))
      .join("")
      .trim()
    if (text) return text
  }
  return ""
}

export async function copyReply(ctx: Ctx, entry: Conversation | undefined): Promise<void> {
  const text = lastReply(ctx, entry)
  if (!text) {
    ctx.toast.show({ title: ctx.t("toast.noMessages") })
    return
  }
  await ctx.system.copy(text)
  ctx.toast.show({ title: ctx.t("toast.copied"), variant: "success" })
}

/** Copy the last answer into the routed session's composer, for review before sending. */
export function sendToCurrentSession(ctx: Ctx, entry: Conversation | undefined): void {
  const screen = ctx.screen.current()
  if (!screen) {
    ctx.toast.show({ title: ctx.t("toast.noSession"), variant: "error" })
    return
  }
  const text = lastReply(ctx, entry)
  if (!text) {
    ctx.toast.show({ title: ctx.t("toast.noMessages") })
    return
  }
  screen.composer.setText(text)
  screen.composer.focus()
}

export function openHandoff(ctx: Ctx, entry: Conversation | undefined): void {
  if (!entry || !entry.handoffSessionID) return
  const server = ctx.servers.get(entry.server)
  if (!server) {
    ctx.toast.show({ title: ctx.t("toast.noServer"), variant: "error" })
    return
  }
  ctx.tabs.open({ server: server.id, id: entry.handoffSessionID }, { focus: true })
}

export async function handoffChat(
  ctx: Ctx,
  entry: Conversation,
  agent: HandoffAgent,
  model: ModelRef | undefined,
): Promise<boolean> {
  const server = ctx.servers.get(entry.server)
  if (!server) {
    ctx.toast.show({ title: ctx.t("toast.noServer"), variant: "error" })
    return false
  }
  try {
    const fork = await server.client.session.fork({ sessionID: entry.sessionID })
    await server.client.session.switchAgent({ sessionID: fork.id, agent })
    if (model) await server.client.session.switchModel({ sessionID: fork.id, model })
    const suffix = agent === "plan" ? ctx.t("handoff.plan") : ctx.t("handoff.build")
    const title = clip(`${entry.title || ctx.t("dialog.new")} · ${suffix}`, 80)
    await server.client.session.update({ sessionID: fork.id, title })
    patch(ctx, entry.sessionID, (draft) => {
      draft.handoffSessionID = fork.id
      draft.handoffAgent = agent
    })
    ctx.tabs.open({ server: server.id, id: fork.id }, { focus: true })
    await server.client.session.prompt({
      sessionID: fork.id,
      text: ctx.t(agent === "plan" ? "handoff.prompt.plan" : "handoff.prompt.build"),
    })
    return true
  } catch (error) {
    ctx.toast.show({ title: ctx.t("handoff.failed"), description: messageOf(error), variant: "error" })
    return false
  }
}
