import { QueryClient } from '@tanstack/react-query'
import leven, { closestMatch } from 'leven'
import { Md5 } from 'ts-md5'
import * as CryptoTS from 'crypto-ts'
import { Vibrant } from 'node-vibrant/browser'
import { TinyColor } from '@ctrl/tinycolor'
import { Platform } from '../platform.ts'
import Lyrics from '../lyrics.ts'

// const colorDiff = differenceCiede2000()

export default class BilibiliPlatform implements Platform {
  private bvid: string | null
  private page: number | null

  constructor(params: {
    bvid: string | null
    page: number | null
  }) {
    this.bvid = params.bvid
    this.page = params.page
  }

  static videoQueryClient = new QueryClient()

  static async fetchVideoData(bvid: string | null) {
    if (!bvid) {
      return null
    }
    const { data } = await BilibiliPlatform.videoQueryClient.fetchQuery({
      queryKey: [bvid],
      queryFn: async () => await fetch(`https://api.bilibili.com/x/web-interface/view/detail?bvid=${bvid}`, {
        method: 'GET',
        credentials: 'include',
      }).then((response) => response.json()),
    })
    return data ?? null
  }

  static eapiQueryClient = new QueryClient()

  // Reference: https://github.com/metowolf/MetingJS
  static postEapi(path: string, body: any) {
    const encryptParams = (url: string, text: string) => {
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

    return BilibiliPlatform.eapiQueryClient.fetchQuery({
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

  static async searchSong(opts: {
    titles: string[]
    staffs: string[]
    tags: string[]
    targetDuration: number | null
  }) {
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
      Array.from(new Set(keywords)).flatMap((keyword) => BilibiliPlatform.postEapi('cloudsearch/pc', {
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
          id: song.id,
          name: song.name,
          artists: song.artists.map((artist) => artist.name),
          duration: song.duration,
          pop: song.pop,
          nameScore,
          artistScore,
          titleScore,
          staffScore,
          tagScore,
          durationScore,
          percentage,
        }
      })
      .toSorted((a, b) => b.percentage - a.percentage || b.pop - a.pop)

    console.table(songs.map((song) => {
      return {
        name: song.name,
        artists: song.artists.join(' | '),
        duration: song.duration,
        nameScore: song.nameScore,
        artistScore: song.artistScore,
        titleScore: song.titleScore,
        staffScore: song.staffScore,
        tagScore: song.tagScore,
        durationScore: song.durationScore,
        percentage: song.percentage,
        pop: song.pop,
      }
    }))

    const song = songs[0]
    return song && song.percentage >= 25 ? song : null
  }

  static async fetchLyrics(song: {
    id: number
    duration: number
  }) {
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

    const lyricsResponse = await BilibiliPlatform.postEapi('song/lyric', {
      id: song.id,
      lv: -1,
      kv: -1,
      tv: -1,
    })
    return {
      original: convertLyrics(lyricsResponse?.lrc?.lyric, song.duration),
      translated: convertLyrics(lyricsResponse?.tlyric?.lyric, song.duration),
      karaoke: convertLyrics(lyricsResponse?.klyric?.lyric, song.duration),
    }
  }

  async song() {
    const videoData = await BilibiliPlatform.fetchVideoData(this.bvid)
    if (!videoData) {
      return null
    }
    const title = videoData.View?.title as string | undefined ?? ''
    const staffs = (videoData.View?.staff as any[] | undefined)
      ?.map((staff) => staff?.name as string | undefined ?? '')
      ?? [videoData.View?.owner?.name as string | undefined ?? '']
    const tags = (videoData.Tags as any[] | undefined)
      ?.map((tag) => {
        const type = tag?.tag_type as string | undefined
        const name = tag?.tag_name as string | undefined
        if (!type || !name) {
          return undefined
        }
        return { type, name }
      })
      ?.filter((tag) => !!tag)
      ?? []
    const bgmTags = tags.filter((tag) => tag.type === 'bgm').map((tag) => /\u300a(.*?)\u300b/g.exec(tag.name)?.[1].trim() ?? tag.name)
    const channelTags = tags.filter((tag) => tag.type === 'old_channel').map((tag) => tag.name)
    const duration = (videoData.View?.pages as any[] | undefined)
      ?.find((pageInfo) => pageInfo?.page as number | undefined === this.page)
      ?.duration as number | undefined
      ?? null
    const song = await BilibiliPlatform.searchSong({
      titles: [title, ...bgmTags],
      staffs,
      tags: channelTags,
      targetDuration: duration,
    })
    if (!song) {
      return null
    }
    return {
      name: song.name,
      artists: song.artists,
      lyrics: await BilibiliPlatform.fetchLyrics({
        id: song.id,
        duration: song.duration,
      })
    }
  }

  async swatches() {
    const videoData = await BilibiliPlatform.fetchVideoData(this.bvid)
    if (!videoData) {
      return null
    }
    const pic = videoData.View?.pic as string | undefined ?? null
    if (!pic) {
      return null
    }
    const palette = await Vibrant.from(pic).getPalette()
    const colors = [
      palette.Vibrant,
      palette.Muted,
      palette.DarkVibrant,
      palette.DarkMuted,
      palette.LightVibrant,
      palette.LightMuted,
    ]
      .filter((color) => !!color)
      .toSorted((prev, next) => next.population - prev.population)
      .map((color) => new TinyColor(color.hex))
    const background = colors[0] ?? new TinyColor('#333333')
    const foreground = colors[1] ?? (background.isLight() ? new TinyColor('#333333') : new TinyColor('#ffffff'))
    return { background, foreground }
  }

  getMedia(document: Document) {
    return document.getElementById('bilibili-player')?.getElementsByTagName('video').item(0) ?? null
  }

  static tryInstantiate(url: URL): Platform | null {
    if (url.host !== 'www.bilibili.com') {
      return null
    }
    return new BilibiliPlatform({
      bvid: (
        url.pathname.startsWith('/video/') ? url.pathname.split('/')[2] ?? null :
        url.pathname.startsWith('/list/') ? url.searchParams.get('bvid') :
        null
      ),
      page: (
        url.pathname.startsWith('/video/') ? parseInt(url.searchParams.get('p') ?? '1') :
        url.pathname.startsWith('/list/') ? parseInt(url.searchParams.get('p') ?? '1') :
        null
      ),
    })
  }
}
