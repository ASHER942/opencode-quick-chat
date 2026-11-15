import { Plugin } from "@opencode/plugin/gui"
import { definition } from "./definition"
import { main } from "./main"
import { setup } from "./setup"

export default Plugin.define({ ...definition, setup, main })
