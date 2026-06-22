import React, { useCallback, useRef, useState } from 'react'
import { Upload, FolderOpen } from 'lucide-react'
import { SUPPORTED_FORMATS } from '../types'

interface DropZoneProps {
  onFilesAdded: (paths: string[]) => void
}

export default function DropZone({ onFilesAdded }: DropZoneProps): React.ReactElement {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const paths: string[] = []
      for (const file of Array.from(e.dataTransfer.files)) {
        // Access the path via webkitRelativePath or the internal path
        const filePath = (file as File & { path?: string }).path
        if (filePath) {
          paths.push(filePath)
        }
      }
      if (paths.length > 0) {
        onFilesAdded(paths)
      }
    },
    [onFilesAdded]
  )

  const handleClick = useCallback(async () => {
    const filePaths = await window.api.openFiles()
    if (filePaths.length > 0) {
      onFilesAdded(filePaths)
    }
  }, [onFilesAdded])

  const supportedList = SUPPORTED_FORMATS.slice(0, 10).join(', ') + '…'

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 select-none
        ${
          isDragOver
            ? 'border-accent bg-accent/10 drop-zone-active'
            : 'border-border bg-surface hover:border-accent/50 hover:bg-surface'
        }`}
      style={{ minHeight: '180px' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {/* Upload Icon */}
      <div
        className={`mb-3 w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-200
          ${isDragOver ? 'bg-accent text-white' : 'bg-card text-secondary'}`}
      >
        {isDragOver ? <FolderOpen size={26} /> : <Upload size={26} />}
      </div>

      {/* Text */}
      <p className={`text-base font-semibold mb-1 transition-colors duration-200 ${isDragOver ? 'text-accent' : 'text-primary'}`}>
        {isDragOver ? 'Release to add files' : 'Drop videos here or click to browse'}
      </p>
      <p className="text-xs text-secondary text-center px-8">
        Supports: {supportedList}
      </p>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept="video/*"
      />
    </div>
  )
}
