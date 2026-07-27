// Present only when the app is running inside the Lodge Terminal (Electron)
// shell instead of a normal browser tab — see preload.js in the
// Lodge-Management-System-Terminal project. A browser tab never has this,
// so every call site must guard with `window.electronAPI?.` first.
export interface ElectronPrinterAPI {
  isTerminal: true
  print: (ip: string, port: number, dataBase64: string) => Promise<{ success: true }>
}

declare global {
  interface Window {
    electronAPI?: ElectronPrinterAPI
  }
}
