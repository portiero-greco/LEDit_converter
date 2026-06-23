import React from 'react'
import { X, CheckCircle, AlertCircle, Film, ArrowRight, Loader } from 'lucide-react'
import { VideoFile, SUPPORTED_FORMATS, AVI_CODECS, MOV_CODECS } from '../types'

interface FileItemProps {
  file: VideoFile
  onRemove: (id: string) => void
  onFormatChange: (id: string, format: string) => void
  onCodecChange: (id: string, codec: string) => void
  isConverting: boolean
}

export default function FileItem({
  file,
  onRemove,
  onFormatChange,
  onCodecChange,
  isConverting
}: FileItemProps): React.ReactElement {
  const isDisabled = file.status === 'converting' || file.status === 'done' || isConverting

  const codecOptions =
    file.outputFormat === 'avi' ? AVI_CODECS :
    file.outputFormat === 'mov' ? MOV_CODECS :
    null

  return (
    <div
      className={`flex flex-col gap-2 p-3 rounded-lg border transition-colors duration-150
        ${file.status === 'done' ? 'border-success/30 bg-success/5' : ''}
        ${file.status === 'error' ? 'border-error/30 bg-error/5' : ''}
        ${file.status === 'converting' ? 'border-accent/40 bg-accent/5' : ''}
        ${file.status === 'waiting' ? 'border-border bg-card' : ''}
      `}
    >
      {/* Top row: icon + name + format controls + remove */}
      <div className="flex items-center gap-3 min-w-0">
        {/* File icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center">
          <Film size={15} className="text-secondary" />
        </div>

        {/* File name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary truncate" title={file.name}>
            {file.name}
          </p>
        </div>

        {/* Format: from badge → to dropdown */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Input format badge */}
          <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-surface border border-border text-secondary tracking-wider">
            {file.inputFormat}
          </span>

          <ArrowRight size={14} className="text-secondary flex-shrink-0" />

          {/* Output format dropdown */}
          <select
            value={file.outputFormat}
            onChange={(e) => onFormatChange(file.id, e.target.value)}
            disabled={isDisabled}
            className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border bg-surface text-primary outline-none focus:border-accent transition-colors
              ${isDisabled ? 'opacity-50 cursor-not-allowed border-border' : 'border-accent/50 hover:border-accent cursor-pointer'}`}
          >
            {SUPPORTED_FORMATS.map((fmt) => (
              <option key={fmt} value={fmt}>
                {fmt.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Codec dropdown — shown for AVI and MOV */}
          {codecOptions && (
            <select
              value={file.codec}
              onChange={(e) => onCodecChange(file.id, e.target.value)}
              disabled={isDisabled}
              className={`text-xs px-2 py-0.5 rounded border bg-surface text-primary outline-none focus:border-accent transition-colors
                ${isDisabled ? 'opacity-50 cursor-not-allowed border-border' : 'border-border hover:border-accent cursor-pointer'}`}
            >
              {codecOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex-shrink-0 w-6 flex items-center justify-center">
          {file.status === 'done' && <CheckCircle size={16} className="text-success" />}
          {file.status === 'error' && <AlertCircle size={16} className="text-error" />}
          {file.status === 'converting' && (
            <Loader size={16} className="text-accent animate-spin" />
          )}
        </div>

        {/* Remove button */}
        <button
          onClick={() => onRemove(file.id)}
          disabled={file.status === 'converting'}
          className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center transition-colors duration-150
            ${file.status === 'converting'
              ? 'text-border cursor-not-allowed'
              : 'text-secondary hover:text-error hover:bg-error/10 cursor-pointer'
            }`}
          title="Remove"
        >
          <X size={13} />
        </button>
      </div>

      {/* Progress bar (only when converting or done) */}
      {(file.status === 'converting' || (file.status === 'done' && file.progress > 0)) && (
        <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden">
          <div
            className={`h-full rounded-full progress-bar ${file.status === 'done' ? 'bg-success' : 'bg-accent'}`}
            style={{ width: `${file.status === 'done' ? 100 : file.progress}%` }}
          />
        </div>
      )}

      {/* Progress text or error */}
      {file.status === 'converting' && (
        <p className="text-xs text-accent font-medium">{file.progress}%</p>
      )}
      {file.status === 'done' && (
        <p className="text-xs text-success font-medium">
          Conversion complete &middot;{' '}
          <span className="text-secondary font-normal">
            {file.inputFormat.toUpperCase()} → {file.outputFormat.toUpperCase()}
            {file.codec !== 'Standard' && ` (${file.codec})`}
          </span>
        </p>
      )}
      {file.status === 'error' && file.errorMessage && (
        <p className="text-xs text-error truncate" title={file.errorMessage}>
          {file.errorMessage}
        </p>
      )}
    </div>
  )
}
