import { globalShortcut } from "electron"
import { Schema } from "effect"
import type { Plugin } from "@opencode/plugin/gui"
import { Hotkey } from "./contract"

const Prefs = Schema.Struct({ accelerator: Schema.String })

const NAMED: Record<string, string> = {
  space: "Space",
  esc: "Escape",
  escape: "Escape",
  enter: "Return",
  return: "Return",
  tab: "Tab",
  backspace: "Backspace",
  delete: "Delete",
  del: "Delete",
  insert: "Insert",
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  pagedown: "PageDown",
  comma: ",",
  period: ".",
  slash: "/",
  backslash: "\\\\",
  semicolon: ";",
  quote: "'",
  minus: "-",
  equal: "=",
}

/** `mod+shift+k` in config, `CommandOrControl+Shift+K` for Electron. */
export function toAccelerator(bind: string): string {
  return bind
    .split("+")
    .map((raw) => {
      const part = raw.trim()
      if (!part) return ""
      const key = part.toLowerCase()
      if (key === "mod" || key === "cmdorctrl" || key === "commandorcontrol") return "CommandOrControl"
      if (key === "ctrl" || key === "control") return "Control"
      if (key === "alt" || key === "option" || key === "opt") return "Alt"
      if (key === "shift") return "Shift"
      if (key === "meta" || key === "super" || key === "cmd" || key === "command" || key === "win") return "Super"
      if (NAMED[key]) return NAMED[key]
      if (/^f([1-9]|1\d|2[0-4])$/.test(key)) return key.toUpperCase()
      if (part.length === 1) return part.toUpperCase()
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .filter(Boolean)
    .join("+")
}

function reason(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

export const main: Plugin.MainSetup = (ctx) => {
  const fallback = typeof ctx.options.globalBind === "string" ? ctx.options.globalBind : "ctrl+alt+space"
  const prefs = ctx.storage.store("hotkey", {
    schema: Prefs,
    initial: { accelerator: toAccelerator(fallback) },
  })

  let accelerator = toAccelerator(prefs.value.accelerator || fallback)
  let registered = false
  let error = ""

  const provider = ctx.provide(Hotkey, {
    state: () => ({ accelerator, registered, error }),
    rebind: ({ accelerator: next }) => {
      const value = toAccelerator(next)
      if (!value) {
        error = "Invalid shortcut"
        provider.changed()
        return false
      }
      if (value === accelerator && registered) return true
      const previous = accelerator
      const wasRegistered = registered
      if (register(value)) {
        accelerator = value
        prefs.set({ accelerator: value })
        provider.changed()
        return true
      }
      const failure = error
      accelerator = previous
      if (wasRegistered) register(previous)
      error = failure
      provider.changed()
      return false
    },
  })

  const summon = () => {
    const window = ctx.windows.focused() ?? ctx.windows.list()[0]
    if (!window) return
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
    if (!window.isFocused()) {
      // Windows can refuse the first focus request; a short top-most flip lifts it.
      window.setAlwaysOnTop(true)
      window.focus()
      window.setAlwaysOnTop(false)
    }
    provider.emit("summon", {}, window.id)
  }

  function register(value: string): boolean {
    if (registered) {
      try {
        globalShortcut.unregister(accelerator)
      } catch {
        // Nothing was registered.
      }
      registered = false
    }
    try {
      registered = globalShortcut.register(value, summon)
    } catch (cause) {
      registered = false
      error = reason(cause)
      return false
    }
    error = registered ? "" : `${value} is already in use`
    return registered
  }

  const ok = register(accelerator)
  if (ok) {
    ctx.log.write("info", "quick chat global shortcut registered", { accelerator })
  } else {
    ctx.log.write("warn", "quick chat global shortcut unavailable", { accelerator, error })
  }

  ctx.onCleanup(() => {
    if (!registered) return
    try {
      globalShortcut.unregister(accelerator)
    } catch {
      // The app is shutting down anyway.
    }
    registered = false
  })
}
