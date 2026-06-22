import React from 'react'
import { FolderOpen, ExternalLink, Zap } from 'lucide-react'

interface SettingsBarProps {
  outputFolder: string
  totalFiles: number
  convertedCount: number
  isConverting: boolean
  hasFiles: boolean
  hasDoneFiles: boolean
  onSelectFolder: () => void
  onConvertAll: () => void
  onOpenFolder: () => void
}

export default function SettingsBar({
  outputFolder,
  totalFiles,
  convertedCount,
  isConverting,
  hasFiles,
  hasDoneFiles,
  onSelectFolder,
  onConvertAll,
  onOpenFolder
}: SettingsBarProps): React.ReactElement {
  // Shorten the folder path for display (macOS /Users/name → ~, Windows C:\Users\name → ~)
  const displayPath = outputFolder
    .replace(/^\/Users\/[^/]+/, '~')
    .replace(/^[A-Z]:\\Users\\[^\\]+/i, '~')

  return (
    <div className="flex-shrink-0 border-t border-border bg-surface">
      <div className="flex items-center justify-between px-5 py-3 gap-4">
        {/* Left: Output folder */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-secondary mb-0.5">Output Folder</span>
            <div className="flex items-center gap-2">
              <span
                className="text-sm text-primary truncate max-w-xs font-mono"
                title={outputFolder}
              >
                {displayPath}
              </span>
              <button
                onClick={onSelectFolder}
                className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors duration-150 flex-shrink-0 px-2 py-0.5 rounded border border-accent/30 hover:border-accent/60"
              >
                <FolderOpen size={11} />
                Change
              </button>
            </div>
          </div>
        </div>

        {/* Center: Stats + open folder */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {hasFiles && (
            <div className="flex items-center gap-1.5 text-xs text-secondary">
              <span className="text-primary font-semibold">{convertedCount}</span>
              <span>/</span>
              <span className="text-primary font-semibold">{totalFiles}</span>
              <span>converted</span>
            </div>
          )}
          {hasDoneFiles && (
            <button
              onClick={onOpenFolder}
              className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors duration-150"
            >
              <ExternalLink size={12} />
              Open Folder
            </button>
          )}
        </div>

        {/* Right: Convert All button */}
        <button
          onClick={onConvertAll}
          disabled={!hasFiles || isConverting}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex-shrink-0
            ${
              !hasFiles || isConverting
                ? 'bg-card border border-border text-secondary cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-accent to-accent-hover text-white hover:shadow-lg hover:shadow-accent/30 hover:scale-105 active:scale-100 cursor-pointer'
            }`}
        >
          <Zap size={15} className={isConverting ? 'animate-pulse' : ''} />
          {isConverting ? 'Converting…' : 'Convert All'}
        </button>
      </div>
    </div>
  )
}
