import React from 'react'
import Konva from 'konva'
import { Layer, Stage, Text } from 'react-konva'

function useDocumentData<T>(callback: (document: Document) => Promise<T>) {
  const ref = React.useRef<T | null>(null)

  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      callback(document).then((data) => {
        observer.disconnect()
        ref.current = data
      })
    })

    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      ref.current = null
    }
  }, [])

  return ref.current
}

class Lyrics {
  meta: Map<string, string>
  lines: {
    time: number,
    text: string,
  }[]

  constructor(lrc: string) {
    this.meta = new Map()
    this.lines = []
    for (const text of lrc.split('\n').map(text => text.trim())) {
      const lineExec = /^\[(?:(\d+)\:)?(\d+(?:\.(\d+))?)\](.*)$/g.exec(text)
      if (lineExec) {
        this.lines.push({
          time: (lineExec[1] ? parseFloat(lineExec[1]) * 60 : 0) + parseFloat(lineExec[2]),
          text: lineExec[3].trim(),
        })
      } else {
        const tagExec = /^\[([a-zA-Z]+):(.+)\]$/g.exec(text)
        if (tagExec) {
          this.meta.set(tagExec[1], tagExec[2].trim())
        }
      }
    }
  }
}

interface SongInfo {
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
  },
}

async function searchSong(keyword: string) {
  const searchResponse = await chrome.runtime.sendMessage({
    path: 'cloudsearch/pc',
    body: {
      s: keyword,
      type: 1,
      limit: 1,
    },
  })
  const song = searchResponse?.result?.songs?.[0]
  const id = song?.id
  if (!id) {
    return
  }
  const lyricsResponse = await chrome.runtime.sendMessage({
    path: 'song/lyric',
    body: {
      id,
      lv: -1,
      kv: -1,
      tv: -1,
    },
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
    return new Lyrics(lrc)
  }
  return {
    name: song?.name ?? null,
    artists: song?.ar?.map((artist: any) => artist.name) ?? null,
    publishDate: convertTime(song?.publishTime),
    lyrics: {
      original: convertLyrics(lyricsResponse?.lrc?.lyric),
      translated: convertLyrics(lyricsResponse?.tlyric?.lyric),
      karaoke: convertLyrics(lyricsResponse?.klyric?.lyric),
    },
  } as SongInfo
}

interface Props {
  setCanvas: React.Dispatch<React.SetStateAction<HTMLCanvasElement | null>>
}

export default function Display(props: Props) {
  const layer = React.useRef<Konva.Layer | null>(null)

  React.useEffect(() => {
    props.setCanvas(layer.current?.getNativeCanvasElement() ?? null)
  }, [])

  const media = useDocumentData(async (document) => {
    return document.getElementById('bilibili-player')?.getElementsByTagName('video').item(0) ?? undefined
  })

  const [currentTime, setCurrentTime] = React.useState(0.0)
  React.useEffect(() => {
    if (!media) {
      return
    }
    const interval = setInterval(() => {
      setCurrentTime(media.currentTime)
    }, 100)
    return () => {
      clearInterval(interval)
    }
  }, [media])

  const [byteFrequencyData, setByteFrequencyData] = React.useState(new Uint8Array())
  React.useEffect(() => {
    if (!media) {
      return
    }
    const audioCtx = new AudioContext()
    const source = audioCtx.createMediaElementSource(media)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 1 << 6
    source.connect(analyser)
    analyser.connect(audioCtx.destination)
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    const interval = setInterval(() => {
      analyser.getByteFrequencyData(dataArray)
      setByteFrequencyData(dataArray)
    }, 100)
    return () => {
      source.disconnect()
      analyser.disconnect()
      audioCtx.close()
      clearInterval(interval)
    }
  }, [media])

  const songInfo = useDocumentData(async (document) => {
    const text = document.querySelector('div.tag-link.bgm-link')?.getAttribute('title') ?? ''
    const keyword = /^发现《(.+?)(?:\s*\(.+\))?》$/g.exec(text)?.[1].trim()
    return keyword ? await searchSong(keyword) : undefined
  })

  return (
    <Stage width={400} height={200}>
      <Layer ref={layer}>
        <Text
          text={`${songInfo?.name}`}
          x={50}
          y={50}
          fontSize={20}
          stroke='green'
          fill='yellow'
          strokeWidth={3}
          fillAfterStrokeEnabled
        />
        <Text
          text={`${byteFrequencyData.length}: ${byteFrequencyData}`}
          x={50}
          y={100}
          fontSize={20}
          stroke='green'
          fill='yellow'
          strokeWidth={3}
          fillAfterStrokeEnabled
        />
        <Text
          text={`${currentTime}`}
          x={50}
          y={150}
          fontSize={20}
          stroke='green'
          fill='yellow'
          strokeWidth={3}
          fillAfterStrokeEnabled
        />
      </Layer>
    </Stage>
  )
}
