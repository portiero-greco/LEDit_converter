import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import ffprobeInstaller from '@ffprobe-installer/ffprobe'

// Set binary paths
if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic)
ffmpeg.setFfprobePath(ffprobeInstaller.path)

function createWindow(): void {
  const win = new BrowserWindow({
    width: 920,
    height: 680,
    minWidth: 720,
    minHeight: 520,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#080b14',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  win.on('maximize', () => {
    win.webContents.send('window:maximizeChange', true)
  })

  win.on('unmaximize', () => {
    win.webContents.send('window:maximizeChange', false)
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// App info
ipcMain.handle('app:getDefaultOutputFolder', () => {
  return join(app.getPath('desktop'), 'Converted')
})

ipcMain.handle('app:getPlatform', () => process.platform)

ipcMain.handle('window:isMaximized', () => {
  return BrowserWindow.getFocusedWindow()?.isMaximized() ?? false
})

// Window controls
ipcMain.on('window:minimize', () => {
  BrowserWindow.getFocusedWindow()?.minimize()
})

ipcMain.on('window:maximize', () => {
  const win = BrowserWindow.getFocusedWindow()
  if (!win) return
  if (win.isMaximized()) {
    win.unmaximize()
  } else {
    win.maximize()
  }
})

ipcMain.on('window:close', () => {
  BrowserWindow.getFocusedWindow()?.close()
})

// File dialog
ipcMain.handle('dialog:openFiles', async () => {
  const win = BrowserWindow.getFocusedWindow()
  if (!win) return []
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Video Files',
        extensions: [
          'mp4', 'mov', 'avi', 'wmv', 'mkv', 'flv', 'webm', 'm4v',
          'mpg', 'mpeg', '3gp', 'ts', 'mts', 'm2ts', 'vob', 'ogv',
          'f4v', 'mxf', 'asf', 'rmvb', 'divx'
        ]
      }
    ]
  })
  return result.canceled ? [] : result.filePaths
})

// Folder dialog
ipcMain.handle('dialog:selectFolder', async () => {
  const win = BrowserWindow.getFocusedWindow()
  if (!win) return null
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

// Shell open path
ipcMain.handle('shell:openPath', async (_event, folderPath: string) => {
  await shell.openPath(folderPath)
})

// Resolve non-conflicting output path
function resolveOutputPath(outputPath: string): string {
  if (!existsSync(outputPath)) return outputPath
  const lastDot = outputPath.lastIndexOf('.')
  const base = lastDot !== -1 ? outputPath.slice(0, lastDot) : outputPath
  const ext = lastDot !== -1 ? outputPath.slice(lastDot) : ''
  let counter = 1
  let candidate = `${base}_${counter}${ext}`
  while (existsSync(candidate)) {
    counter++
    candidate = `${base}_${counter}${ext}`
  }
  return candidate
}

// FFmpeg conversion
ipcMain.handle(
  'ffmpeg:convert',
  (
    event,
    payload: { id: string; inputPath: string; outputFolder: string; outputFileName: string; codec: string }
  ): Promise<void> => {
    const { id, inputPath, outputFolder, outputFileName, codec } = payload
    mkdirSync(outputFolder, { recursive: true })
    const outputPath = resolveOutputPath(join(outputFolder, outputFileName))

    let cmd = ffmpeg(inputPath)

    if (codec === 'Uncompressed') {
      cmd = cmd.videoCodec('rawvideo').audioCodec('pcm_s16le')
    } else if (codec === 'HAP') {
      cmd = cmd.videoCodec('hap').outputOptions('-pix_fmt', 'rgba')
    } else if (codec === 'HAP Q') {
      cmd = cmd.videoCodec('hap').outputOptions('-format', 'hap_q', '-pix_fmt', 'rgba')
    }

    return new Promise((resolve, reject) => {
      cmd
        .output(outputPath)
        .on('progress', (progress) => {
          const percent = Math.min(Math.round(progress.percent ?? 0), 99)
          event.sender.send('ffmpeg:progress', { id, percent })
        })
        .on('end', () => {
          event.sender.send('ffmpeg:done', { id })
          resolve()
        })
        .on('error', (err) => {
          event.sender.send('ffmpeg:error', { id, error: err.message })
          reject(err)
        })
        .run()
    })
  }
)
