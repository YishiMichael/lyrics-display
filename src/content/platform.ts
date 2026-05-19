import { TinyColor } from '@ctrl/tinycolor'
import Lyrics from './lyrics.ts'
import BilibiliPlatform from './platforms/bilibili.ts'

export interface SongRecord {
  name: string,
  artists: string[],
  lyrics: {
    original: Lyrics | null,
    translated: Lyrics | null,
    karaoke: Lyrics | null,
  },
}

export interface SwatchesRecord {
  background: TinyColor,
  foreground: TinyColor,
}

export interface Platform {
  song(): Promise<SongRecord | null>
  swatches(): Promise<SwatchesRecord | null>
  getMedia(document: Document): HTMLMediaElement | null
}

export function tryInstantiatePlatform(url: URL) {
  return (
    BilibiliPlatform.tryInstantiate(url) ??
    null
  )
}
