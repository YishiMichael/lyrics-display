import { QueryClient } from '@tanstack/react-query'
import leven, { closestMatch } from 'leven'
import { Md5 } from 'ts-md5'
import * as CryptoTS from 'crypto-ts'
import { Vibrant } from 'node-vibrant/browser'
import { TinyColor, isReadable, mostReadable, readability } from '@ctrl/tinycolor'
import { Platform } from '../platform.ts'
import Lyrics from '../lyrics.ts'

export default class BilibiliPlatform implements Platform {
  private bvid?: string
  private page?: number

  constructor(params: {
    bvid?: string
    page?: number
  }) {
    this.bvid = params.bvid
    this.page = params.page
  }

  static videoQueryClient = new QueryClient()

  static async fetchVideoData(bvid: string) {
    if (!bvid) {
      return
    }
    const { data } = await BilibiliPlatform.videoQueryClient.fetchQuery({
      queryKey: [bvid],
      queryFn: async () => await fetch(`https://api.bilibili.com/x/web-interface/view/detail?bvid=${bvid}`, {
        method: 'GET',
        credentials: 'include',
      }).then((response) => response.json()),
    })
    return data
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
    keywords: string[]
    staffs: string[]
    titles: string[]
    tags: string[]
    targetDuration?: number
  }) {
    const avg = (...arr: number[]) => arr.length ? arr.reduce((a, b) => a + b) / arr.length : 0.0

    const segmentRegex =
      /\p{N}+|[\p{sc=Hani}\p{sc=Hira}\p{sc=Kana}\p{sc=Hang}]+|\p{sc=Latn}+|(?<![\p{sc=Hani}\p{sc=Hira}\p{sc=Kana}\p{sc=Hang}\p{sc=Latn}])\p{L}+/gu
    const splitSegments = (text: string) =>
      Array.from(text.normalize('NFKC').toLowerCase().matchAll(segmentRegex)).map((g) => g[0])

    const similarityScoring = (...candidates: string[]) => {
      const candidateSegments = candidates.flatMap(splitSegments)
      return (...avoids: string[]) => {
        const avoidSegments = new Set(avoids.flatMap(splitSegments))
        return (text: string) => {
          const { weightedScore, totalLength } = splitSegments(text)
            .filter((segment) => !avoidSegments.has(segment))
            .map((segment) => {
              const maxDistance = Math.ceil(0.5 * segment.length)
              const closest = closestMatch(segment, candidateSegments, { maxDistance })
              return {
                length: segment.length,
                score: closest ? Math.max(1.0 - leven(segment, closest, { maxDistance }) / maxDistance, 0.0) : 0.0,
              }
            })
            .reduce((accum, { length, score }) => {
              return {
                weightedScore: accum.weightedScore + length * score,
                totalLength: accum.totalLength + length,
              }
            }, {
              weightedScore: 0.0,
              totalLength: 0,
            })
          return totalLength ? weightedScore / totalLength : 0.0
        }
      }
    }

    const durationDiffScore = (duration: number, targetDuration: number) =>
      Math.min(Math.pow(0.5, Math.abs(targetDuration - duration) / 15.0 - 1.0), 1.0)

    const songs = (await Promise.all(
      opts.keywords.flatMap((keyword) => BilibiliPlatform.postEapi('cloudsearch/pc', {
        s: splitSegments(keyword).join(' '),
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
          return
        }
        const artists = ar.map((artist) => {
          const name = artist?.name as string | undefined
          const alia = artist?.alia as string[] | undefined
          const alias = artist?.alias as string[] | undefined
          const tns = artist?.tns as string[] | undefined
          if (!id || !name) {
            return
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
      .toSorted((a, b) => a.id - b.id)
      .filter((item, index, songs) => index === 0 || item.id !== songs[index - 1].id)
      .map((song) => {
        const songScoring = similarityScoring(...opts.staffs, ...opts.titles, ...opts.tags)
        const artistScore = ((scoring) => avg(...song.artists.map((artist) => Math.max(
          ...[artist.name, ...artist.alias].map(scoring),
        ))))(songScoring())
        const nameScore = ((scoring) => Math.max(
          ...[song.name, ...song.alias].map(scoring),
        ))(songScoring(...song.artists.flatMap((artist) => [artist.name, ...artist.alias])))

        const mediaScoring = similarityScoring(...song.artists.flatMap((artist) => [artist.name, ...artist.alias]), ...[song.name, ...song.alias])
        const staffScore = ((scoring) => avg(...opts.staffs.map(scoring)))(mediaScoring())
        const titleScore = ((scoring) => avg(...opts.titles.map(scoring)))(mediaScoring(...opts.staffs))
        const tagScore = ((scoring) => avg(...opts.tags.map(scoring)))(mediaScoring(...opts.staffs, ...opts.titles))

        const durationScore = opts.targetDuration ? durationDiffScore(song.duration, opts.targetDuration) : 1.0
        const permillage = Math.round((
            250.0 * artistScore
          + 250.0 * nameScore
          + 200.0 * staffScore
          + 200.0 * titleScore
          + 100.0 * tagScore
        ) * durationScore)

        return {
          id: song.id,
          name: song.name,
          artists: song.artists.map((artist) => artist.name),
          duration: song.duration,
          pop: song.pop,
          artistScore,
          nameScore,
          staffScore,
          titleScore,
          tagScore,
          durationScore,
          permillage,
        }
      })
      .toSorted((a, b) =>
        b.permillage - a.permillage ||
        b.pop - a.pop
      )

    console.table(songs.map((song) => {
      return {
        name: song.name,
        artists: song.artists.join(' | '),
        duration: song.duration,
        artistScore: song.artistScore,
        nameScore: song.nameScore,
        staffScore: song.staffScore,
        titleScore: song.titleScore,
        tagScore: song.tagScore,
        durationScore: song.durationScore,
        permillage: song.permillage,
        pop: song.pop,
      }
    }))

    const song = songs.at(0)
    return song && song.permillage >= 200 ? song : undefined
  }

  static async fetchLyrics(song: {
    id: number
    duration: number
  }) {
    const convertLyrics = (lrc?: string, duration?: number) => {
      if (!lrc) {
        return
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
      tv: -1,
      kv: -1,
    })
    return {
      original: convertLyrics(lyricsResponse?.lrc?.lyric, song.duration),
      translated: convertLyrics(lyricsResponse?.tlyric?.lyric, song.duration),
      karaoke: convertLyrics(lyricsResponse?.klyric?.lyric, song.duration),
    }
  }

  async song() {
    if (!this.bvid) {
      return
    }
    const videoData = await BilibiliPlatform.fetchVideoData(this.bvid)
    const title = videoData.View?.title as string | undefined ?? ''
    const staffs = (videoData.View?.staff as any[] | undefined)
      ?.map((staff) => staff?.name as string | undefined ?? '')
      ?? [videoData.View?.owner?.name as string | undefined ?? '']
    const tags = (videoData.Tags as any[] | undefined)
      ?.map((tag) => {
        const type = tag?.tag_type as string | undefined
        const name = tag?.tag_name as string | undefined
        if (!type || !name) {
          return
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
    const titles = [title, ...bgmTags]
    const song = await BilibiliPlatform.searchSong({
      keywords: titles
        .flatMap((title) => [
          title,
          ...Array.from(title.matchAll(/\u300a(.*?)\u300b/g)).map((g) => g[1]),
          ...Array.from(title.matchAll(/\u300e(.*?)\u300f/g)).map((g) => g[1]),
          ...Array.from(title.matchAll(/\u300c(.*?)\u300d/g)).map((g) => g[1]),
        ])
        .map((text) => text
          .replaceAll(/\u3010.*?\u3011/g, '')
          .replaceAll(/\uff08.*?\uff09/g, '')
          .replaceAll(/\(.*?\)/g, '')
          .replaceAll(/\[.*?\]/g, '')
          .replaceAll(/\bfeat\..+/g, '')
          .replaceAll(/\bvo\..+/g, '')
          .trim()
        )
        .filter((text) => !!text),
      staffs,
      titles,
      tags: channelTags,
      targetDuration: duration,
    })
    if (!song) {
      return
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
    if (!this.bvid) {
      return
    }
    const videoData = await BilibiliPlatform.fetchVideoData(this.bvid)
    const pic = videoData.View?.pic as string | undefined
    if (!pic) {
      return
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
    const background = colors.at(0)
    if (!background) {
      return
    }
    const foreground = colors.slice(1).toSorted(
      (a, b) =>
        (isReadable(background, b, { size: 'large' }) ? 1 : 0) - (isReadable(background, a, { size: 'large' }) ? 1 : 0) ||
        readability(background, b) - readability(background, a),
    ).at(0) ?? mostReadable(background, [], { includeFallbackColors: true })
    if (!foreground) {
      return
    }
    return { background, foreground }
  }

  getMedia(document: Document) {
    return document.getElementById('bilibili-player')?.getElementsByTagName('video').item(0) ?? undefined
  }

  static tryInstantiate(url: URL): Platform | undefined {
    if (url.host !== 'www.bilibili.com') {
      return
    }
    return new BilibiliPlatform({
      bvid: (
        url.pathname.startsWith('/video/') ? url.pathname.split('/')[2] :
        url.pathname.startsWith('/list/') ? (url.searchParams.get('bvid') ?? undefined) :
        undefined
      ),
      page: (
        url.pathname.startsWith('/video/') ? parseInt(url.searchParams.get('p') ?? '1') :
        url.pathname.startsWith('/list/') ? parseInt(url.searchParams.get('p') ?? '1') :
        undefined
      ),
    })
  }
}
