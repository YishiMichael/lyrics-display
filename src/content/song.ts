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

  async detectLanguage() {
    return (await chrome.i18n.detectLanguage(this.lines.map((line) => line.text).join('\n'))).languages[0]?.language ?? null
  }
}

export interface SongRecord {
  name: string,
  artists: string[],
  lyrics: {
    original: Lyrics | null,
    translated: Lyrics | null,
    karaoke: Lyrics | null,
  },
}

export async function searchSong(text: string, matcher: string, postEapi: (path: string, body: any) => Promise<any>) {
  const splitSegments = (text: string) => Array.from(text.matchAll(/[\p{L}\p{N}]+/gu)).map((g) => g[0])

  const keyword = splitSegments((
    ''.slice()
    || /\u300a(.*?)\u300b/g.exec(text)?.[1].trim()
    || /\u300e(.*?)\u300f/g.exec(text)?.[1].trim()
    || /\u300c(.*?)\u300d/g.exec(text)?.[1].trim()
    || text
  )
    .replaceAll(/\u3010.*?\u3011/g, '')
    .replaceAll(/\uff08.*?\uff09/g, '')
    .replaceAll(/\(.*?\)/g, '')
    .replaceAll(/\bfeat\..+/g, '')
    .replaceAll(/\bvo\..+/g, '')
    .replaceAll(/\/.+/g, '')
    .trim()
  ).join(' ')
  const matcherSegments = splitSegments(
    matcher
    .replaceAll(/\bfeat\./g, '')
    .replaceAll(/\bvo\./g, '')
  )

  const song = ((await postEapi('cloudsearch/pc', {
    s: keyword,
    type: 1,
    limit: 10,
  }))?.result?.songs as any[] | undefined)
    ?.map((song) => {
      const id = song?.id as number | undefined
      const name = song?.name as string | undefined
      const ar = song?.ar as any[] | undefined
      const dt = song?.dt as number | undefined
      const pop = song?.pop as number | undefined
      const alia = song?.alia as string[] | undefined
      const tns = song?.tns as string[] | undefined
      if (id === undefined || name === undefined || ar === undefined || dt === undefined || pop === undefined) {
        return undefined
      }
      const artists = ar.map((artist) => {
        const name = artist?.name as string | undefined
        const alia = artist?.alia as string[] | undefined
        const alias = artist?.alias as string[] | undefined
        const tns = artist?.tns as string[] | undefined
        if (name === undefined) {
          return undefined
        }
        return { name, alia, alias, tns }
      }).filter((artist) => artist !== undefined)

      const remainingSegments = new Set(matcherSegments)
      const artistsMatches = artists.filter((artist) => [
          artist.name,
          ...artist.alia ?? [],
          ...artist.alias ?? [],
          ...artist.tns ?? []
        ]
          .map((artist) => splitSegments(artist).filter((segment) => remainingSegments.has(segment)))
          .reduce((previous, current) => current.length > previous.length ? current : previous)
          .map((segment) => remainingSegments.delete(segment))
          .length !== 0
      ).length
      const nameMatches = [
        name,
        ...alia ?? [],
        ...tns ?? [],
      ]
        .map((name) => splitSegments(name).filter((segment) => remainingSegments.has(segment)))
        .reduce((previous, current) => current.length > previous.length ? current : previous)
        .map((segment) => remainingSegments.delete(segment))
        .length
      // console.log({
      //   id,
      //   name,
      //   artists: artists.map((artist) => artist.name),
      //   duration: dt / 1000,
      //   score: [nameMatches, artistsMatches, remainingSegments, pop] as const,
      // })
      if (!nameMatches) {
        return undefined
      }
      return {
        id,
        name,
        artists: artists.map((artist) => artist.name),
        duration: dt / 1000,
        score: [nameMatches, artistsMatches, -remainingSegments.size, pop] as const,
      }
    })
    ?.filter((song) => song !== undefined)
    ?.reduce((previous, current) => current.score > previous.score ? current : previous)

  if (!song) {
    return null
  }
  const lyricsResponse = await postEapi('song/lyric', {
    id: song.id,
    lv: -1,
    kv: -1,
    tv: -1,
  })

  const convertLyrics = (lrc: string | undefined, duration: number) => {
    if (!lrc) {
      return null
    }
    return new Lyrics(lrc, duration)
  }

  return {
    name: song.name,
    artists: song.artists,
    lyrics: {
      original: convertLyrics(lyricsResponse?.lrc?.lyric, song.duration),
      translated: convertLyrics(lyricsResponse?.tlyric?.lyric, song.duration),
      karaoke: convertLyrics(lyricsResponse?.klyric?.lyric, song.duration),
    },
  }
}
