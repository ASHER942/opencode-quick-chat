import { createEffect, on } from "solid-js"
import type { Plugin } from "@opencode/plugin/gui"
import { Command, MenuItem, Panel, SettingsPage, Style } from "@opencode/plugin/gui"
import type { PanelTab } from "@opencode/plugin/gui"
import { Hotkey } from "./contract"
import type { definition } from "./definition"
import { focusChat } from "./ui/bus"
import { openChatDialog } from "./ui/ChatDialog"
import { ChatPanel } from "./ui/ChatPanel"
import { QuickChatSettings } from "./ui/Settings"
import { css } from "./ui/styles"

export const setup: Plugin.Setup<typeof definition> = (ctx) => {
  ctx.add(Style, css)

  if (ctx.app.platform === "desktop") {
    const ipc = ctx.main(Hotkey)

    ipc.on("summon", () => {
      openChatDialog(ctx)
      focusChat()
    })

    let warned = false
    createEffect(
      on(
        () => ipc.state(),
        (state) => {
          if (!state || state.registered || warned) return
          warned = true
          ctx.toast.show({
            title: ctx.t("hotkey.failed"),
            description: state.error
              ? `${ctx.t("hotkey.failed.body")} (${state.error})`
              : ctx.t("hotkey.failed.body"),
            variant: "error",
            persistent: true,
            actions: [{ label: ctx.t("settings.open"), run: () => ctx.layout.settings("quick-chat") }],
          })
        },
      ),
    )
  }

  ctx.add(
    Command,
    (): Command => ({
      id: "open",
      title: ctx.t("command.open"),
      description: ctx.t("command.open.description"),
      keywords: "chat quick ask 聊天 快聊 问 问一下",
      group: ctx.t("command.group"),
      section: "general",
      bind: "mod+shift+k",
      slash: { name: "chat", arguments: true },
      featured: true,
      suggested: true,
      run: (input) => openChatDialog(ctx, input),
    }),
  )

  const tab: PanelTab = {
    id: "chat",
    get title() {
      return ctx.t("panel.title")
    },
    closable: "hover",
  }

  ctx.add(Panel, {
    id: "chat",
    region: "side",
    mobile: {
      get title() {
        return ctx.t("panel.title")
      },
      order: 45,
      kind: "menu",
      icon: "speech-bubble",
      cached: true,
    },
    list: (input) => (input.open.includes("chat") ? [tab] : []),
    render: () => <ChatPanel />,
    enter: () => focusChat(),
  })

  ctx.add(MenuItem, (): MenuItem => {
    const session = ctx.sessions.current()
    return {
      menu: "session.panel",
      id: "open",
      title: ctx.t("panel.title"),
      icon: "speech-bubble",
      keybind: `${ctx.id}.open`,
      opened: !!session && ctx.layout.state(`${ctx.id}:chat`, session) !== "closed",
      run: () => {
        const current = ctx.sessions.current()
        if (!current) {
          ctx.toast.show({ title: ctx.t("toast.noSession") })
          return
        }
        ctx.layout.open(`${ctx.id}:chat`, current)
      },
    }
  })

  ctx.add(SettingsPage, {
    id: "quick-chat",
    icon: "speech-bubble",
    get title() {
      return ctx.t("settings.title")
    },
    get entries() {
      return [
        {
          id: "hotkey",
          title: ctx.t("settings.hotkey"),
          description: ctx.t("settings.hotkey.description"),
          keywords: "shortcut keybind global hotkey 快捷键",
        },
        { id: "history", title: ctx.t("settings.history") },
      ]
    },
    render: () => <QuickChatSettings />,
  })
}
