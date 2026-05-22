import { TinyColor } from '@ctrl/tinycolor'
import Lyrics from './lyrics.ts'
import BilibiliPlatform from './platforms/bilibili.ts'

interface SongRecord {
  name: string,
  artists: string[],
  lyrics: {
    original?: Lyrics,
    translated?: Lyrics,
    karaoke?: Lyrics,
  },
}

interface SwatchesRecord {
  background: TinyColor,
  foreground: TinyColor,
}

export interface Platform {
  song(): Promise<SongRecord | undefined>
  swatches(): Promise<SwatchesRecord | undefined>
  getMedia(document: Document): HTMLMediaElement | undefined
}

export function tryInstantiatePlatform(url: URL) {
  return (
    BilibiliPlatform.tryInstantiate(url) ??
    undefined
  )
}
