import { Schema } from "effect"
import { Ipc } from "@opencode/plugin/gui"

/**
 * The window half talks to the Electron main process through this token: main owns
 * the global shortcut, the windows render the overlay.
 */
export const Hotkey = Ipc.define({
  id: "opencode-quick-chat.hotkey",
  state: Schema.Struct({
    /** The Electron accelerator currently registered, e.g. `Control+Alt+Space`. */
    accelerator: Schema.String,
    registered: Schema.Boolean,
    /** Why registration failed, empty when it worked. */
    error: Schema.String,
  }),
  methods: {
    rebind: {
      input: Schema.Struct({ accelerator: Schema.String }),
      output: Schema.Boolean,
    },
  },
  events: {
    /** Main asks one window to open the overlay. */
    summon: Schema.Struct({}),
  },
})
