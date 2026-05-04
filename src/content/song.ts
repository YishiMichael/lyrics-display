export class Lyrics {
  private meta: Map<string, string>
  private lines: {
    time: number,
    text: string,
  }[]
  private duration: number
  private indicesRotator: number[]

  constructor(lrc: string, duration: number) {
    this.meta = new Map()
    this.lines = []
    for (const text of lrc.split('\n').map(text => text.trim())) {
      const lineExec = /^\[(?:(\d+)\:)?(\d+(?:[\.:]\d+)?)\](.*)$/g.exec(text)
      if (lineExec) {
        this.lines.push({
          time: (lineExec[1] ? parseFloat(lineExec[1]) * 60.0 : 0.0) + parseFloat(lineExec[2].replace(/[\.:]/g, '.')),
          text: lineExec[3].trim(),
        })
      } else {
        const tagExec = /^\[([a-zA-Z]+):(.+)\]$/g.exec(text)
        if (tagExec) {
          this.meta.set(tagExec[1], tagExec[2].trim())
        }
      }
    }
    this.duration = duration
    this.indicesRotator = Array.from({ length: this.lines.length + 2 }).map((_, i: number) => i - 1)
  }

  getTextByIndex(index: number) {
    return this.lines[index]?.text ?? null
  }

  getSpan(time: number) {
    const getTimeByIndex = (index: number) => (
      index < 0 ? null
      : index < this.lines.length ? this.lines[index].time
      : index === this.lines.length ? this.duration
      : null
    )
    const validateIndex = (index: number) => {
      const startTime = getTimeByIndex(index)
      const stopTime = getTimeByIndex(index + 1)
      return (startTime === null || startTime <= time) && (stopTime === null || time < stopTime) ? {
        index,
        startTime: startTime === null ? (this.lines[0].time ?? this.duration) : startTime,
        stopTime: stopTime === null ? this.duration : stopTime,
      } : null
    }

    for (const _ of Array.from({ length: this.indicesRotator.length })) {
      const index = this.indicesRotator[0]
      const span = validateIndex(index)
      if (span) {
        return span
      }
      this.indicesRotator.shift()!
      this.indicesRotator.push(index)
    }
    return {
      index: 0,
      startTime: this.lines[0].time ?? this.duration,
      stopTime: this.duration,
    }
  }
}

export interface SongRecord {
  name: string | null,
  artists: string[] | null,
  publishDate: {
    year: number,
    month: number,
    date: number,
  } | null,
  lyrics: {
    original: Lyrics | null,
    translated: Lyrics | null,
    karaoke: Lyrics | null,
  } | null,
}

export async function searchSong(keyword: string, postEapi: (path: string, body: any) => Promise<any>) {
  const searchResponse = await postEapi('cloudsearch/pc', {
    s: keyword,
    type: 1,
    limit: 10,
  })
  const song = searchResponse?.result?.songs?.reduce(
    (prev: any, current: any) => (prev.pop >= current.pop) ? prev : current
  )

  const id = song?.id
  if (!id) {
    return null
  }
  const lyricsResponse = await postEapi('song/lyric', {
    id,
    lv: -1,
    kv: -1,
    tv: -1,
  })

  const convertTime = (publishTime?: number) => {
    if (!publishTime) {
      return null
    }
    const date = new Date(publishTime)
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      date: date.getDate(),
    }
  }

  const convertLyrics = (lrc?: string) => {
    if (!lrc) {
      return null
    }
    return new Lyrics(lrc, (song.dt ?? 0) / 1000.0)
  }

  return {
    name: song?.name ?? null,
    artists: song?.ar?.map((artist: any) => artist.name) ?? null,
    publishDate: convertTime(song?.publishTime),
    lyrics: lyricsResponse ? {
      original: convertLyrics(lyricsResponse.lrc?.lyric),
      translated: convertLyrics(lyricsResponse.tlyric?.lyric),
      karaoke: convertLyrics(lyricsResponse.klyric?.lyric),
    } : null,
  } as SongRecord
}
