import leven, { closestMatch } from 'leven'

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
        const text = lineExec[3].trim()
        if (text) {
          this.lines.push({
            time: (lineExec[1] ? parseFloat(lineExec[1]) * 60.0 : 0.0) + parseFloat(lineExec[2].replace(/[\.:]/g, '.')),
            text,
          })
        }
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
      index < 0 ? null :
      index < this.lines.length ? this.lines[index].time :
      index === this.lines.length ? this.duration :
      null
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

// TODO: remove
// function dedupBy<T, K>(input: T[], keyFn: (item: T) => K): T[] {
//   const seen = new Set<K>()
//   return input.filter((item) => {
//     const key = keyFn(item)
//     if (seen.has(key)) {
//       return false
//     }
//     seen.add(key)
//     return true
//   })
// }

// function dedup<T>(input: T[]): T[] {
//   return dedupBy(input, (data) => data)
// }

interface SearchSongOptions {
  texts: string[]
  candidates: string[]
  title: string | null
  targetDuration: number | null
  postEapi: (path: string, body: any) => Promise<any>
}

export async function searchSong(opts: SearchSongOptions) {
  const splitSegments = (text: string) => Array.from(text.normalize('NFKC').toLowerCase().matchAll(/[\p{L}|\p{N}]+/gu)).map((g) => g[0])

  const similarityScore = (text: string, candidates: string[]) => {
    const segments = splitSegments(text)
    const candidateSegments = candidates.flatMap(splitSegments)
    return segments.map((segment) => {
      const maxDistance = Math.ceil(0.5 * segment.length)
      const closest = closestMatch(segment, candidateSegments, { maxDistance })
      if (!closest) {
        return 0.0
      }
      const distance = leven(segment, closest, { maxDistance })
      return Math.max(1.0 - distance / maxDistance, 0.0)
    }).reduce((a, b) => a + b, 0.0) / segments.length
  }

  const durationDiffScore = (duration: number, targetDuration: number) => {
    if (duration < targetDuration) {
      return Math.min(Math.pow(0.5, (targetDuration - duration) / 10.0 - 1.0), 1.0)
    } else {
      return Math.min(Math.pow(0.5, (duration - targetDuration) / 5.0 - 1.0), 1.0)
    }
  }

  const extractTitle = (text: string) => text
    .replaceAll(/\u3010.*?\u3011/g, '')
    .replaceAll(/\uff08.*?\uff09/g, '')
    .replaceAll(/\(.*?\)/g, '')
    .replaceAll(/\bfeat\..+/g, '')
    .replaceAll(/\bvo\..+/g, '')
    .trim()

  const keywords = opts.texts.map(extractTitle).map((text) =>
    /\u300a(.*?)\u300b/g.exec(text)?.[1].trim() ||
    /\u300e(.*?)\u300f/g.exec(text)?.[1].trim() ||
    /\u300c(.*?)\u300d/g.exec(text)?.[1].trim() ||
    text
  ).map((text) => splitSegments(text).join(' '))

  const songs = (await Promise.all(
    keywords.flatMap((keyword) => opts.postEapi('cloudsearch/pc', {
      s: keyword,
      type: 1,
      limit: 20,
    }))
  ))
    .map((searchResponse): any[] | undefined => searchResponse?.result?.songs)
    .flatMap((songs) => songs ?? [])
    .map((song) => {
      const id = song?.id as number | undefined
      const name = song?.name as string | undefined
      const ar = song?.ar as any[] | undefined
      const dt = song?.dt as number | undefined
      // const pop = song?.pop as number | undefined
      const alia = song?.alia as string[] | undefined
      const tns = song?.tns as string[] | undefined
      // const originCoverType = song?.originCoverType as number | undefined
      if (!id || !name || !ar || !dt) {
        return undefined
      }
      const artists = ar.map((artist) => {
        const name = artist?.name as string | undefined
        const alia = artist?.alia as string[] | undefined
        const alias = artist?.alias as string[] | undefined
        const tns = artist?.tns as string[] | undefined
        if (!id || !name) {
          return undefined
        }
        return {
          name,
          alias: [
            ...alia ?? [],
            ...alias ?? [],
            ...tns ?? [],
          ],
        }
      }).filter((artist) => !!artist)
      return {
        id,
        name,
        alias: [
          ...alia ?? [],
          ...tns ?? [],
        ],
        artists,
        duration: dt / 1000.0,
      }
    })
    .filter((song) => !!song)
    .map((song) => {
      const nameOverCandidateScore = Math.max(
        ...[song.name, extractTitle(song.name), ...song.alias]
          .map((name) => similarityScore(name, opts.candidates)),
      )
      const artistOverCandidateScore = song.artists.length ? song.artists.map((artist) => Math.max(
        ...[artist.name, ...artist.alias]
          .map((name) => similarityScore(name, opts.candidates)),
      )).reduce((a, b) => a + b, 0.0) / song.artists.length : 0.0
      const titleOverSongScore = opts.title ? similarityScore(
        opts.title,
        [song.name, ...song.alias, ...song.artists.flatMap((artist) => [artist.name, ...artist.alias])],
      ) : 1.0
      const durationScore = opts.targetDuration ? durationDiffScore(song.duration, opts.targetDuration) : 1.0
      const finalScore = (
        0.4 * nameOverCandidateScore +
        0.4 * artistOverCandidateScore +
        0.2 * titleOverSongScore
      ) * durationScore
      return {
        song: {
          id: song.id,
          name: song.name,
          artists: song.artists.map((artist) => artist.name),
          duration: song.duration,
        },
        scores: {
          nameOverCandidateScore,
          artistOverCandidateScore,
          titleOverSongScore,
          durationScore,
          finalScore,
        },
      }
    })

  console.table(songs.map((song) => {
    return {
      song: song.song,
      name: song.song.name,
      duration: song.song.duration,
      nameOverCandidateScore: song.scores.nameOverCandidateScore,
      artistOverCandidateScore: song.scores.artistOverCandidateScore,
      titleOverSongScore: song.scores.titleOverSongScore,
      durationScore: song.scores.durationScore,
      finalScore: song.scores.finalScore,
    }
  }))
  const song = songs.reduce((previous, current) => current.scores.finalScore > previous.scores.finalScore ? current : previous).song

  console.log("Selected:", song)
  if (!song) {
    return null
  }
  const lyricsResponse = await opts.postEapi('song/lyric', {
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
