import React, { useState, useEffect } from 'react'
import { Minus, X } from 'lucide-react'

function LeditLogoMark(): React.ReactElement {
  const blue = '#2d4a8f'
  const sq = 10
  const gap = 4
  const cols = [0, sq + gap, (sq + gap) * 2]
  const rows = [0, sq + gap]

  return (
    <svg
      width={cols[2] + sq}
      height={rows[1] + sq}
      viewBox={`0 0 ${cols[2] + sq} ${rows[1] + sq}`}
      fill="none"
    >
      {cols.map((x) =>
        rows.map((y) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={sq} height={sq} rx="1.5" fill={blue} />
        ))
      )}
    </svg>
  )
}

function MaximizeIcon(): React.ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="0.6" y="0.6" width="10.8" height="10.8" rx="1" />
    </svg>
  )
}

function RestoreIcon(): React.ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="3" y="0.6" width="8.4" height="8.4" rx="1" />
      <path d="M0.6 3.6V10a1 1 0 001 1H8.4" strokeLinecap="round" />
    </svg>
  )
}

export default function TitleBar(): React.ReactElement {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.api.isMaximized().then(setIsMaximized)
    const remove = window.api.onMaximizeChange(setIsMaximized)
    return remove
  }, [])

  return (
    <div
      className="flex items-center justify-between h-11 px-4 bg-surface border-b border-border flex-shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* LEDit Logo */}
      <div className="flex items-center gap-3">
        <LeditLogoMark />
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-primary tracking-wide">LEDit</span>
          <span className="text-xs text-secondary font-normal">Video Converter</span>
        </div>
      </div>

      {/* Window Controls */}
      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => window.api.windowMinimize()}
          className="w-8 h-8 rounded-md flex items-center justify-center text-secondary hover:text-primary hover:bg-border transition-colors duration-150"
          title="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => window.api.windowMaximize()}
          className="w-8 h-8 rounded-md flex items-center justify-center text-secondary hover:text-primary hover:bg-border transition-colors duration-150"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
        </button>
        <button
          onClick={() => window.api.windowClose()}
          className="w-8 h-8 rounded-md flex items-center justify-center text-secondary hover:text-white hover:bg-error transition-colors duration-150"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
