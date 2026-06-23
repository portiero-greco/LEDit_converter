import React from 'react'
import { Trash2 } from 'lucide-react'
import { VideoFile } from '../types'
import FileItem from './FileItem'

interface FileQueueProps {
  files: VideoFile[]
  isConverting: boolean
  onRemove: (id: string) => void
  onFormatChange: (id: string, format: string) => void
  onCodecChange: (id: string, codec: string) => void
  onClearAll: () => void
}

export default function FileQueue({
  files,
  isConverting,
  onRemove,
  onFormatChange,
  onCodecChange,
  onClearAll
}: FileQueueProps): React.ReactElement {
  if (files.length === 0) return <></>

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Queue header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h2 className="text-xs font-semibold text-secondary uppercase tracking-widest">
          Queue &mdash; {files.length} {files.length === 1 ? 'file' : 'files'}
        </h2>
        {!isConverting && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1.5 text-xs text-secondary hover:text-error transition-colors duration-150 px-2 py-1 rounded hover:bg-error/10"
          >
            <Trash2 size={12} />
            Clear All
          </button>
        )}
      </div>

      {/* Scrollable file list */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2 pr-1">
        {files.map((file) => (
          <FileItem
            key={file.id}
            file={file}
            onRemove={onRemove}
            onFormatChange={onFormatChange}
            onCodecChange={onCodecChange}
            isConverting={isConverting}
          />
        ))}
      </div>
    </div>
  )
}
