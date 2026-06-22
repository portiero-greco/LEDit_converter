export type ConversionStatus = 'waiting' | 'converting' | 'done' | 'error'

export interface VideoFile {
  id: string
  name: string
  path: string
  inputFormat: string
  outputFormat: string
  status: ConversionStatus
  progress: number
  errorMessage?: string
}

export const SUPPORTED_FORMATS = [
  'mp4', 'mov', 'avi', 'wmv', 'mkv', 'flv', 'webm', 'm4v',
  'mpg', 'mpeg', '3gp', 'ts', 'mts', 'm2ts', 'vob', 'ogv',
  'f4v', 'mxf', 'asf', 'rmvb', 'divx'
] as const

export type VideoFormat = typeof SUPPORTED_FORMATS[number]
