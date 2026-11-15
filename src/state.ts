import type { SetupContext } from "@opencode/plugin/gui"
import type { Mutable } from "@opencode/plugin/gui"
import type { Conversation, definition } from "./definition"

export type Ctx = SetupContext<typeof definition>
export type { Conversation }

const MAX_CHATS = 100

export function chats(ctx: Ctx) {
  return ctx.stores.chats
}

export function list(ctx: Ctx): Conversation[] {
  const all = ctx.stores.chats.value.conversations
  return [...all].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated - a.updated)
}

export function get(ctx: Ctx, sessionID: string): Conversation | undefined {
  return ctx.stores.chats.value.conversations.find((c) => c.sessionID === sessionID)
}

export function active(ctx: Ctx): Conversation | undefined {
  const id = ctx.stores.chats.value.active
  if (!id) return undefined
  return get(ctx, id)
}

export function setActive(ctx: Ctx, sessionID: string): void {
  ctx.stores.chats.update((draft) => {
    draft.active = sessionID
  })
}

export function upsert(ctx: Ctx, entry: Conversation): void {
  ctx.stores.chats.update((draft) => {
    const index = draft.conversations.findIndex((c) => c.sessionID === entry.sessionID)
    if (index >= 0) draft.conversations[index] = entry
    else draft.conversations.push(entry)
    if (draft.conversations.length > MAX_CHATS) {
      const kept = [...draft.conversations]
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated - a.updated)
        .slice(0, MAX_CHATS)
      draft.conversations = kept
    }
    draft.active = entry.sessionID
  })
}

export function patch(ctx: Ctx, sessionID: string, mutate: (draft: Mutable<Conversation>) => void): void {
  ctx.stores.chats.update((draft) => {
    const entry = draft.conversations.find((c) => c.sessionID === sessionID)
    if (entry) mutate(entry)
  })
}

export function remove(ctx: Ctx, sessionID: string): void {
  ctx.stores.chats.update((draft) => {
    draft.conversations = draft.conversations.filter((c) => c.sessionID !== sessionID)
    if (draft.active === sessionID) draft.active = ""
  })
}

export function clear(ctx: Ctx): void {
  ctx.stores.chats.update((draft) => {
    draft.conversations = []
    draft.active = ""
  })
}

export function titleOf(ctx: Ctx, entry: Conversation | undefined): string {
  if (!entry) return ctx.t("dialog.new")
  return entry.title || entry.preview || ctx.t("dialog.new")
}
