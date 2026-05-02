import React from 'react'
import Konva from 'konva'
import { Layer, Stage, Text } from 'react-konva'

// function useHref() {
//   const href = React.useRef<string>(window.location.href)
//   React.useEffect(() => {
//     const observer = new MutationObserver(() => {
//       href.current = window.location.href
//     })
//     observer.observe(document, { subtree: true, childList: true })
//     return () => {
//       observer.disconnect()
//     }
//   }, [])
//   return href.current
// }

// function useByHref<T>(callback: (href: string) => Promise<T>, href: string) {
//   const ref = React.useRef<T | null>(null)
//   React.useEffect(() => {
//     const timeout = setTimeout(() => {
//       callback(href).then((data) => {
//         ref.current = data
//       })
//     }, 300)
//     return () => {
//       clearTimeout(timeout)
//     }
//   }, [href])
//   return ref.current
// }

function useByElement<N extends Node, T>(
  elementCallback: () => N | null,
  dataCallback: (element: N) => T,
  options?: MutationObserverInit,
) {
  const ref = React.useRef<T | null>(null)
  // const lock = React.useRef(false)
  // const [isPending, startTransition] = React.useTransition()

  React.useEffect(() => {
    const element = elementCallback()
    if (!element) {
      return
    }

    ref.current = dataCallback(element)
    const observer = new MutationObserver(() => {
      ref.current = dataCallback(element)
    })
    observer.observe(element, options)
    return () => {
      observer.disconnect()
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
      const lineExec = /^\[(?:(\d+)\:)?(\d+(?:\.\d+)?)\](.*)$/g.exec(text)
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
  } | null,
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
    return null
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
    lyrics: lyricsResponse ? {
      original: convertLyrics(lyricsResponse.lrc?.lyric),
      translated: convertLyrics(lyricsResponse.tlyric?.lyric),
      karaoke: convertLyrics(lyricsResponse.klyric?.lyric),
    } : null,
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

  // const href = useHref()

  // const media = useByHref(async (_) => {
  //   return document.getElementById('bilibili-player')?.getElementsByTagName('video').item(0) ?? null
  // }, href)

  const media = useByElement(
    () => document.getElementById('bilibili-player')?.getElementsByTagName('video').item(0) ?? null,
    (media) => media,
    { attributes: true },
  )

  // React.useEffect(() => {
  //   const node = document.getElementById('bilibili-player')?.getElementsByTagName('video').item(0) ?? null
  //   if (!node) {
  //     return
  //   }
  //   console.log("updated", node)
  //   mediaRef.current = node
  //   const observer = new MutationObserver(() => {
  //     console.log("updated1", node)
  //     mediaRef.current = node
  //   })
  //   observer.observe(node, { attributes: true })
  //   return () => {
  //     observer.disconnect()
  //   }
  // }, [])
  // const media = mediaRef.current

  const keyword = useByElement(
    () => document.getElementsByClassName('tag-panel')[0],
    (element) => /^发现《(.+?)(?:\s*\(.+\))?》$/g.exec(
      element.querySelector('.tag-link.bgm-link')?.getAttribute('title') ?? '',
    )?.[1].trim() ?? '',
    { childList: true, subtree: true },
  )

  const songInfo = React.useRef<SongInfo | null>(null)
  React.useEffect(() => {
    if (!keyword) {
      songInfo.current = null
      return
    }
    const timeout = setTimeout(async () => {
      songInfo.current = await searchSong(keyword)
    })
    return () => {
      clearTimeout(timeout)
    }
  }, [keyword])

  // React.useEffect(() => {
  //   console.log(url)
  // }, [url])

  const [currentTime, setCurrentTime] = React.useState(0.0)
  React.useEffect(() => {
    if (!media) {
      setCurrentTime(0.0)
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
      setByteFrequencyData(new Uint8Array())
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

  return (
    <Stage width={400} height={200}>
      <Layer ref={layer}>
        <Text
          text={`${songInfo.current?.name}`}
          x={50}
          y={50}
          fontSize={20}
          stroke='green'
          fill='yellow'
          strokeWidth={3}
          fillAfterStrokeEnabled
        />
        <Text
          text={`${songInfo.current?.lyrics?.original?.lines[9].text}`}
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
