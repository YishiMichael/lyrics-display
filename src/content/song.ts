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

export async function searchSong(text: string, postEapi: (path: string, body: any) => Promise<any>) {
  const textSegments = (text: string) => Array.from(text.matchAll(/[\p{L}\p{N}]+/gu)).map((g) => g[0])
  // const extract = (text: string) => text
  //     .replaceAll(/\u3010(.*?)\u3011/g, '')
  //     .replaceAll(/\uff08(.*?)\uff09/g, '')
  //     .replaceAll(/\(.*?\)/g, '')
  //     .replaceAll(/\bfeat\..+/g, '')
  //     .replaceAll(/\bvo\..+/g, '')
  //     .trim()

  // const fuzzyInclude = (input: string, searchString: string) => {
  //   return ` ${input.replaceAll(/[^\p{L}\p{N}]+/gu, ' ')} `.includes(` ${searchString.replaceAll(/[^\p{L}\p{N}]+/gu, ' ')} `)
  // }

  // const keyword = ''.slice()
  //   || /\u300a(.*?)\u300b/g.exec(text)?.[1].trim()
  //   || /\u300e(.*?)\u300f/g.exec(text)?.[1].trim()
  //   || /\u300c(.*?)\u300d/g.exec(text)?.[1].trim()
  //   || text
  //     .replaceAll(/\u3010.*?\u3011/g, '')
  //     .replaceAll(/\uff08.*?\uff09/g, '')
  //     .replaceAll(/\(.*?\)/g, '')
  //     .replaceAll(/\bfeat\..+/g, '')
  //     .replaceAll(/\bvo\..+/g, '')
  //     .trim()

  const segments = textSegments(text)
  const keyword = /\u300a(.*?)\u300b/g.exec(text)?.[1].trim() || text
    .replaceAll(/\u3010.*?\u3011/g, '')
    .replaceAll(/\uff08.*?\uff09/g, '')
    .replaceAll(/\(.*?\)/g, '')
    .replaceAll(/\bfeat\..+/g, '')
    .replaceAll(/\bvo\..+/g, '')
    .trim()

  // const keyword = (
  //   /\u300a(.*?)\u300b/g.exec(extract(text))?.[1].trim()
  //   || /\u300e(.*?)\u300f/g.exec(text)?.[1].trim()
  //   || /\u300c(.*?)\u300d/g.exec(text)?.[1].trim()
  //   || extract(text)
  // )
  // const segments = 
  // console.log(segments.join(' '), duration)
  const song = ((await postEapi('cloudsearch/pc', {
    s: textSegments(keyword).join(' '),
    type: 1,
    limit: 10,
  }))?.result?.songs as any[] | undefined)
    ?.map((song) => {
      if (!(song && song.id && song.name && song.ar && song.dt && song.pop)) {
        return undefined
      }
      const id = song.id as number
      const name = song.name as string
      const artists = (song.ar as any[]).map((artist) => artist.name as string | undefined).filter((name) => name !== undefined)
      const duration = song.dt as number / 1000
      const pop = song.pop as number

      const nameMatches = textSegments(name).filter(segment => segments.includes(segment)).length
      const artistsMatches = artists.flatMap(textSegments).filter(segment => segments.includes(segment)).length
      if (!nameMatches || !artistsMatches) {
        return undefined
      }
      return {
        id,
        name,
        artists,
        duration,
        score: [nameMatches, artistsMatches, pop] as const,
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
