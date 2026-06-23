import { contextBridge, ipcRenderer } from 'electron'

export interface ProgressPayload {
  id: string
  percent: number
}

export interface DonePayload {
  id: string
}

export interface ErrorPayload {
  id: string
  error: string
}

export interface ElectronAPI {
  windowMinimize: () => void
  windowMaximize: () => void
  windowClose: () => void
  isMaximized: () => Promise<boolean>
  openFiles: () => Promise<string[]>
  selectFolder: () => Promise<string | null>
  openPath: (folderPath: string) => Promise<void>
  getDefaultOutputFolder: () => Promise<string>
  getPlatform: () => Promise<string>
  convert: (payload: { id: string; inputPath: string; outputFolder: string; outputFileName: string; codec: string }) => Promise<void>
  onProgress: (callback: (payload: ProgressPayload) => void) => () => void
  onDone: (callback: (payload: DonePayload) => void) => () => void
  onError: (callback: (payload: ErrorPayload) => void) => () => void
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void
}

const api: ElectronAPI = {
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  openFiles: () => ipcRenderer.invoke('dialog:openFiles'),
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  openPath: (folderPath: string) => ipcRenderer.invoke('shell:openPath', folderPath),
  getDefaultOutputFolder: () => ipcRenderer.invoke('app:getDefaultOutputFolder'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  convert: (payload) => ipcRenderer.invoke('ffmpeg:convert', payload),
  onProgress: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: ProgressPayload): void =>
      callback(payload)
    ipcRenderer.on('ffmpeg:progress', handler)
    return () => ipcRenderer.removeListener('ffmpeg:progress', handler)
  },
  onDone: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: DonePayload): void =>
      callback(payload)
    ipcRenderer.on('ffmpeg:done', handler)
    return () => ipcRenderer.removeListener('ffmpeg:done', handler)
  },
  onError: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: ErrorPayload): void =>
      callback(payload)
    ipcRenderer.on('ffmpeg:error', handler)
    return () => ipcRenderer.removeListener('ffmpeg:error', handler)
  },
  onMaximizeChange: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean): void =>
      callback(isMaximized)
    ipcRenderer.on('window:maximizeChange', handler)
    return () => ipcRenderer.removeListener('window:maximizeChange', handler)
  }
}

contextBridge.exposeInMainWorld('api', api)
