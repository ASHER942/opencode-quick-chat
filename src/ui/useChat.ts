import { usePlugin } from "@opencode/plugin/gui"
import type { definition } from "../definition"
import { active } from "../state"

/** Everything a quick chat surface needs, derived from the shared store and the session data. */
export function useChat() {
  const ctx = usePlugin<typeof definition>()
  const conv = () => active(ctx)
  const server = () => {
    const entry = conv()
    return entry ? ctx.servers.get(entry.server) : undefined
  }
  const data = () => server()?.data
  const running = () => {
    const entry = conv()
    const store = data()
    if (!entry || !store) return false
    return store.session.status(entry.sessionID) === "running"
  }
  return { ctx, conv, server, data, running }
}
