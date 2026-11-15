import { Schema } from "effect"
import { Plugin, Store } from "@opencode/plugin/gui"
import { i18n } from "./i18n"

/** One quick chat, indexed by the real OpenCode session that holds its messages. */
export const ConversationSchema = Schema.Struct({
  /** The session that holds the transcript. */
  sessionID: Schema.String,
  /** The server id the session lives on. */
  server: Schema.String,
  /** The workspace directory the session runs in. */
  directory: Schema.String,
  /** Empty until the first message names the chat. */
  title: Schema.String,
  created: Schema.Number,
  updated: Schema.Number,
  /** The last thing the user asked, for the history list. */
  preview: Schema.String,
  /** `provider/model`, as the session's model. */
  model: Schema.String,
  agent: Schema.String,
  pinned: Schema.Boolean,
  /** Set once the chat was handed off to a normal session. */
  handoffSessionID: Schema.String,
  handoffAgent: Schema.String,
})

export type Conversation = (typeof ConversationSchema)["Type"]

export const ChatsSchema = Schema.Struct({
  conversations: Schema.Array(ConversationSchema),
  /** The session id of the open chat, empty for none. */
  active: Schema.String,
  /** The last model picked for a new chat, `provider/model`. */
  lastModel: Schema.String,
  lastAgent: Schema.String,
})

export const definition = Plugin.define({
  i18n,
  stores: {
    chats: Store.global(ChatsSchema, {
      conversations: [],
      active: "",
      lastModel: "",
      lastAgent: "",
    }),
  },
})
