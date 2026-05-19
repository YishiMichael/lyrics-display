import leven, { closestMatch } from 'leven'

interface LyricsParams {
  duration?: number
  lines?: { time: number, text: string }[]
  meta?: Map<string, string>
}

export class Lyrics {
  private duration: number
  private lines: { time: number, text: string }[]
  private meta: Map<string, string>
  private indicesRotator: number[]

  constructor(params?: LyricsParams) {
    this.duration = params?.duration ?? 0.0
    this.lines = params?.lines ?? []
    this.meta = params?.meta ?? new Map()
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
        startTime: startTime === null ? (this.lines[0]?.time ?? this.duration) : startTime,
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
      startTime: this.lines[0]?.time ?? this.duration,
      stopTime: this.duration,
    }
  }

  getMeta(key: string) {
    return this.meta.get(key)
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

interface SearchSongOptions {
  titles: string[]
  staffs: string[]
  tags: string[]
  targetDuration: number | null
}

// Reference: https://github.com/metowolf/MetingJS

import { Md5 } from 'ts-md5'
import * as CryptoTS from 'crypto-ts'
import { QueryClient } from '@tanstack/react-query'

function encryptParams(url: string, text: string) {
  const message = `nobody${url}use${text}md5forencrypt`
  const digest = Md5.hashStr(message)
  const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`
  return CryptoTS.AES.encrypt(
    CryptoTS.enc.Utf8.parse(data),
    CryptoTS.enc.Utf8.parse('e82ckenh8dichen8'),
    {
      mode: CryptoTS.mode.ECB,
      padding: CryptoTS.pad.PKCS7,
    },
  ).ciphertext!.toString(CryptoTS.enc.Hex)
}

const eapiQueryClient = new QueryClient()
function postEapi(path: string, body: any) {
  return eapiQueryClient.fetchQuery({
    queryKey: [path, body],
    queryFn: () => chrome.runtime.sendMessage({
      __method__: 'fetch-json',
      input: `https://music.163.com/eapi/${path}`,
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          params: encryptParams(`/api/${path}`, JSON.stringify(body)),
        }).toString(),
      },
    })
  })
}

export async function searchSong(opts: SearchSongOptions) {
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b) / arr.length : 0.0

  const segmentRegex =
    /\p{N}+|[\p{sc=Hani}\p{sc=Hira}\p{sc=Kana}\p{sc=Hang}]+|\p{sc=Latn}+|(?<![\p{sc=Hani}\p{sc=Hira}\p{sc=Kana}\p{sc=Hang}\p{sc=Latn}])\p{L}+/gu
  const splitSegments = (text: string) =>
    Array.from(text.normalize('NFKC').toLowerCase().matchAll(segmentRegex)).map((g) => g[0])

  const similarityScore = (text: string, candidates: string[]) => {
    const segments = splitSegments(text)
    const candidateSegments = candidates.flatMap(splitSegments)
    return avg(segments.map((segment) => {
      const maxDistance = Math.ceil(0.5 * segment.length)
      const closest = closestMatch(segment, candidateSegments, { maxDistance })
      if (!closest) {
        return 0.0
      }
      const distance = leven(segment, closest, { maxDistance })
      return Math.max(1.0 - distance / maxDistance, 0.0)
    }))
  }

  const durationDiffScore = (duration: number, targetDuration: number) =>
    Math.min(Math.pow(0.5, Math.abs(targetDuration - duration) / 15.0 - 1.0), 1.0)

  const extractTitle = (text: string) => text
    .replaceAll(/\u3010.*?\u3011/g, '')
    .replaceAll(/\uff08.*?\uff09/g, '')
    .replaceAll(/\(.*?\)/g, '')
    .replaceAll(/\[.*?\]/g, '')
    .replaceAll(/\bfeat\..+/g, '')
    .replaceAll(/\bvo\..+/g, '')
    .trim()

  const keywords = opts.titles
    .flatMap((title) => [
      title,
      ...Array.from(title.matchAll(/\u300a(.*?)\u300b/g)).map((g) => g[1]),
      ...Array.from(title.matchAll(/\u300e(.*?)\u300f/g)).map((g) => g[1]),
      ...Array.from(title.matchAll(/\u300c(.*?)\u300d/g)).map((g) => g[1]),
    ])
    .filter((text) => !!text)
    .map(extractTitle)
    .filter((text) => !!text)
    .map((text) => splitSegments(text).join(' '))

  const songs = (await Promise.all(
    Array.from(new Set(keywords)).flatMap((keyword) => postEapi('cloudsearch/pc', {
      s: keyword,
      type: 1,
      limit: 50,
    })))
  )
    .map((searchResponse): any[] | undefined => searchResponse?.result?.songs)
    .flatMap((songs) => songs ?? [])
    .map((song) => {
      const id = song?.id as number | undefined
      const name = song?.name as string | undefined
      const ar = song?.ar as any[] | undefined
      const dt = song?.dt as number | undefined
      const pop = song?.pop as number | undefined
      const alia = song?.alia as string[] | undefined
      const tns = song?.tns as string[] | undefined
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
        pop: (pop ?? 0.0),
      }
    })
    .filter((song) => !!song)
    .map((song) => {
      const nameScore = Math.max(
        ...[song.name, extractTitle(song.name), ...song.alias]
          .map((name) => similarityScore(name, [...opts.titles, ...opts.staffs, ...opts.tags])),
      )
      const artistScore = avg(song.artists.map((artist) => Math.max(
        ...[artist.name, ...artist.alias]
          .map((name) => similarityScore(name, [...opts.titles, ...opts.staffs, ...opts.tags])),
      )))
      const titleScore = Math.max(...opts.titles.map((title) => similarityScore(
        title,
        [song.name, ...song.alias, ...song.artists.flatMap((artist) => [artist.name, ...artist.alias])],
      )))
      const staffScore = avg(opts.staffs.map((staff) => similarityScore(
        staff,
        [song.name, ...song.alias, ...song.artists.flatMap((artist) => [artist.name, ...artist.alias])],
      )))
      const tagScore = avg(opts.tags.map((tag) => similarityScore(
        tag,
        [song.name, ...song.alias, ...song.artists.flatMap((artist) => [artist.name, ...artist.alias])],
      )))
      const durationScore = opts.targetDuration ? durationDiffScore(song.duration, opts.targetDuration) : 1.0
      const percentage = Math.round((
          30.0 * nameScore
        + 20.0 * artistScore
        + 20.0 * titleScore
        + 20.0 * staffScore
        + 10.0 * tagScore
      ) * durationScore)
      return {
        song: {
          id: song.id,
          name: song.name,
          artists: song.artists.map((artist) => artist.name),
          duration: song.duration,
        },
        scores: {
          nameScore,
          artistScore,
          titleScore,
          staffScore,
          tagScore,
          durationScore,
          percentage,
          pop: song.pop,
        },
      }
    })
    .filter((song) => song.scores.percentage >= 25)
    .toSorted((a, b) => b.scores.percentage - a.scores.percentage || b.scores.pop - a.scores.pop)

  console.table(songs.map((song) => {
    return {
      song: song.song,
      name: song.song.name,
      artists: song.song.artists.join(' | '),
      duration: song.song.duration,
      nameScore: song.scores.nameScore,
      artistScore: song.scores.artistScore,
      titleScore: song.scores.titleScore,
      staffScore: song.scores.staffScore,
      tagScore: song.scores.tagScore,
      durationScore: song.scores.durationScore,
      percentage: song.scores.percentage,
      pop: song.scores.pop,
    }
  }))

  const song = songs[0]?.song
  console.log("Selected:", song)
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
    const lines = []
    const meta = new Map()
    for (const text of lrc.split('\n').map(text => text.trim())) {
      const lineExec = /^\[(?:(\d+)\:)?(\d+(?:[\.:]\d+)?)\](.*)$/g.exec(text)
      if (lineExec) {
        lines.push({
          time: (lineExec[1] ? parseFloat(lineExec[1]) * 60.0 : 0.0) + parseFloat(lineExec[2].replace(/[\.:]/g, '.')),
          text: lineExec[3].trim(),
        })
      } else {
        const tagExec = /^\[([a-zA-Z]+):(.+)\]$/g.exec(text)
        if (tagExec) {
          meta.set(tagExec[1], tagExec[2].trim())
        }
      }
    }
    return new Lyrics({ duration, lines, meta })
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
