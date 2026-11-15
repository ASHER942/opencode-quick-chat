type Inbox = { readonly text: string; readonly send: boolean }

let pending: Inbox | undefined
const inboxListeners = new Set<(item: Inbox) => void>()

/** Hand a line of text to the overlay's composer, optionally sending it right away. */
export function pushInbox(text: string, send: boolean): void {
  pending = { text, send }
  if (inboxListeners.size > 0) {
    const item = pending
    pending = undefined
    for (const listener of [...inboxListeners]) listener(item)
  }
  focusChat()
}

export function takePending(): Inbox | undefined {
  const item = pending
  pending = undefined
  return item
}

export function onInbox(listener: (item: Inbox) => void): () => void {
  inboxListeners.add(listener)
  return () => inboxListeners.delete(listener)
}

const focusListeners = new Set<() => void>()

/** Ask the mounted quick chat surface to focus its composer. */
export function focusChat(): void {
  for (const listener of [...focusListeners]) listener()
}

export function onFocus(listener: () => void): () => void {
  focusListeners.add(listener)
  return () => focusListeners.delete(listener)
}

let opened = false
export function chatDialogOpen(): boolean {
  return opened
}
export function setChatDialogOpen(value: boolean): void {
  opened = value
}
