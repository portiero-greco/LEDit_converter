import React, { useState, useCallback, useEffect, useRef } from 'react'
import TitleBar from './components/TitleBar'
import DropZone from './components/DropZone'
import FileQueue from './components/FileQueue'
import SettingsBar from './components/SettingsBar'
import { VideoFile, SUPPORTED_FORMATS } from './types'

// Polyfill path utilities for browser context using string manipulation
function getBasename(filePath: string): string {
  return filePath.split(/[\\/]/).pop() ?? filePath
}

function getExtname(filePath: string): string {
  const base = getBasename(filePath)
  const dotIndex = base.lastIndexOf('.')
  return dotIndex > 0 ? base.slice(dotIndex + 1).toLowerCase() : ''
}

function getDirname(filePath: string): string {
  const parts = filePath.split('/')
  parts.pop()
  return parts.join('/') || '/'
}

function getNameWithoutExt(filename: string): string {
  const dotIndex = filename.lastIndexOf('.')
  return dotIndex > 0 ? filename.slice(0, dotIndex) : filename
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function App(): React.ReactElement {
  const [files, setFiles] = useState<VideoFile[]>([])
  const [outputFolder, setOutputFolder] = useState<string>('')
  const [isConverting, setIsConverting] = useState(false)
  const conversionQueueRef = useRef<string[]>([])

  useEffect(() => {
    window.api.getDefaultOutputFolder().then(setOutputFolder)
  }, [])

  // Register IPC listeners once
  useEffect(() => {
    const removeProgress = window.api.onProgress(({ id, percent }) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, progress: percent, status: 'converting' } : f))
      )
    })

    const removeDone = window.api.onDone(({ id }) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, progress: 100, status: 'done' } : f))
      )
    })

    const removeError = window.api.onError(({ id, error }) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: 'error', errorMessage: error } : f
        )
      )
    })

    return () => {
      removeProgress()
      removeDone()
      removeError()
    }
  }, [])

  const handleFilesAdded = useCallback((paths: string[]) => {
    const newFiles: VideoFile[] = paths
      .filter((p) => {
        const ext = getExtname(p)
        return (SUPPORTED_FORMATS as readonly string[]).includes(ext)
      })
      .map((p): VideoFile => {
        const ext = getExtname(p)
        return {
          id: generateId(),
          name: getBasename(p),
          path: p,
          inputFormat: ext || 'unknown',
          outputFormat: 'mp4',
          status: 'waiting',
          progress: 0
        }
      })

    setFiles((prev) => {
      // Avoid duplicates by path
      const existingPaths = new Set(prev.map((f) => f.path))
      return [...prev, ...newFiles.filter((f) => !existingPaths.has(f.path))]
    })
  }, [])

  const handleRemove = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handleFormatChange = useCallback((id: string, format: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, outputFormat: format } : f))
    )
  }, [])

  const handleClearAll = useCallback(() => {
    setFiles([])
  }, [])

  const handleSelectFolder = useCallback(async () => {
    const folder = await window.api.selectFolder()
    if (folder) setOutputFolder(folder)
  }, [])

  const handleOpenFolder = useCallback(() => {
    window.api.openPath(outputFolder)
  }, [outputFolder])

  const handleConvertAll = useCallback(async () => {
    if (isConverting) return

    // Collect waiting files in order
    const waitingFiles = files.filter((f) => f.status === 'waiting')
    if (waitingFiles.length === 0) return

    setIsConverting(true)
    conversionQueueRef.current = waitingFiles.map((f) => f.id)

    for (const file of waitingFiles) {
      const nameWithoutExt = getNameWithoutExt(file.name)
      const outputFileName = `${nameWithoutExt}.${file.outputFormat}`

      // Mark as converting
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, status: 'converting', progress: 0 } : f))
      )

      try {
        await window.api.convert({
          id: file.id,
          inputPath: file.path,
          outputFolder,
          outputFileName
        })
      } catch {
        // Error is already handled via the IPC listener
      }
    }

    setIsConverting(false)
  }, [files, isConverting, outputFolder])

  const convertedCount = files.filter((f) => f.status === 'done').length
  const hasDoneFiles = convertedCount > 0

  return (
    <div className="flex flex-col h-screen bg-app overflow-hidden">
      {/* Custom titlebar */}
      <TitleBar />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-h-0 p-5 gap-4">
        {/* Drop zone */}
        <DropZone onFilesAdded={handleFilesAdded} />

        {/* File queue */}
        {files.length > 0 && (
          <FileQueue
            files={files}
            isConverting={isConverting}
            onRemove={handleRemove}
            onFormatChange={handleFormatChange}
            onClearAll={handleClearAll}
          />
        )}

        {/* Empty state message */}
        {files.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-secondary">
              Add video files above to get started
            </p>
          </div>
        )}
      </div>

      {/* Bottom settings bar */}
      <SettingsBar
        outputFolder={outputFolder}
        totalFiles={files.length}
        convertedCount={convertedCount}
        isConverting={isConverting}
        hasFiles={files.length > 0}
        hasDoneFiles={hasDoneFiles}
        onSelectFolder={handleSelectFolder}
        onConvertAll={handleConvertAll}
        onOpenFolder={handleOpenFolder}
      />
    </div>
  )
}
