// Only the Electron surface the plugin's main entry touches. The app provides the
// real module at runtime; this keeps the build free of an electron devDependency.
declare module "electron" {
  export interface BrowserWindow {
    readonly id: number
    isMinimized(): boolean
    isVisible(): boolean
    isFocused(): boolean
    restore(): void
    show(): void
    focus(): void
    setAlwaysOnTop(flag: boolean, level?: string): void
  }

  export interface NativeImage {}

  export interface WebContentsView {}

  export const globalShortcut: {
    register(accelerator: string, callback: () => void): boolean
    unregister(accelerator: string): void
    isRegistered(accelerator: string): boolean
  }
}
