import React from 'react'
import Konva from 'konva'
import * as ReactKonva from 'react-konva'
import * as ColorThief from 'colorthief'
import { Lyrics, SongRecord, searchSong } from './song.ts'

async function getPalette(imageUrl: string, colorCount?: number) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = imageUrl
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
  })
  return await ColorThief.getPalette(img, { colorCount })
}

function* LyricsLines(props: {
  lyrics: Lyrics | null
  currentTime: number

  width: number
  height: number
  lineGap: number
  focusOffset: number
  jumpTime: number

  fontSize: number
  fontFamily: string
  foreground: string
  background: string
}) {
  if (!props.lyrics) {
    return
  }

  const konvaTemplate = new Konva.Text({
    fontFamily: props.fontFamily,
    fontSize: props.fontSize,
    wrap: 'none',
  })
  const span = props.lyrics.getSpan(props.currentTime)
  const readProportion = span.stopTime === span.startTime ? 0.0 :
    (props.currentTime - span.startTime) / (span.stopTime - span.startTime)
  const jumpProportion = span.stopTime === span.startTime ? 0.0 :
    Math.max(1.0 - (props.currentTime - span.startTime) / Math.min(props.jumpTime, span.stopTime - span.startTime), 0.0)

  const text = props.lyrics.getTextByIndex(span.index) ?? ''
  const size = konvaTemplate.measureSize(text)
  const cursorMiddle = props.focusOffset + jumpProportion * (size.height + props.lineGap)
  yield (
    <ReactKonva.Text
      key={0}
      text={text}
      x={props.width >= size.width ? 0.5 * (props.width - size.width) : (props.width - size.width) * (
        readProportion < 0.5 * props.width / (props.width + size.width) ? 0.0
        : readProportion > 1.0 - 0.5 * props.width / (props.width + size.width) ? 1.0
        : (readProportion * (props.width + size.width) - 0.5 * props.width) / size.width
      )}
      y={cursorMiddle - 0.5 * size.height}
      fillLinearGradientStartPoint={{ x: 0, y: 0 }}
      fillLinearGradientEndPoint={{ x: 0, y: size.height }}
      fillLinearGradientColorStops={[
        0.0, `color-mix(${props.foreground} 25%, white)`,
        1.0, props.foreground,
      ]}
      stroke={`color-mix(${props.foreground} 50%, black)`}
      strokeWidth={3}
      fillAfterStrokeEnabled
      fontFamily={konvaTemplate.fontFamily()}
      fontSize={konvaTemplate.fontSize()}
      wrap={konvaTemplate.wrap()}
    />
  )

  let cursorTop = cursorMiddle + 0.5 * size.height + props.lineGap
  for (let indexOffset = 1;; ++indexOffset) {
    if (cursorTop >= props.height) {
      break
    }
    const text = props.lyrics.getTextByIndex(span.index + indexOffset) ?? ''
    const size = konvaTemplate.measureSize(text)
    yield (
      <ReactKonva.Text
        key={indexOffset}
        text={text}
        x={0.5 * Math.max(props.width - size.width, 0.0)}
        y={cursorTop}
        fillLinearGradientStartPoint={{ x: 0, y: -cursorTop }}
        fillLinearGradientEndPoint={{ x: 0, y: -cursorTop + props.height }}
        fillLinearGradientColorStops={[
          0.0, `${props.background}`,
          0.1, `color-mix(${props.foreground} 50%, ${props.background}) 50%`,
          0.9, `color-mix(${props.foreground} 50%, ${props.background}) 50%`,
          1.0, `${props.background}`,
        ]}
        strokeLinearGradientStartPoint={{ x: 0, y: -cursorTop }}
        strokeLinearGradientEndPoint={{ x: 0, y: -cursorTop + props.height }}
        strokeLinearGradientColorStops={[
          0.0, `${props.background}00`,
          0.1, `color-mix(color-mix(${props.foreground} 50%, ${props.background}) 50%, black)`,
          0.9, `color-mix(color-mix(${props.foreground} 50%, ${props.background}) 50%, black)`,
          1.0, `${props.background}00`,
        ]}
        strokeWidth={2}
        fillAfterStrokeEnabled
        fontFamily={konvaTemplate.fontFamily()}
        fontSize={konvaTemplate.fontSize()}
        wrap={konvaTemplate.wrap()}
      />
    )
    cursorTop += size.height + props.lineGap
  }

  let cursorBottom = cursorMiddle - 0.5 * size.height - props.lineGap
  for (let indexOffset = -1;; --indexOffset) {
    if (cursorBottom <= 0.0) {
      break
    }
    const text = props.lyrics.getTextByIndex(span.index + indexOffset) ?? ''
    const size = konvaTemplate.measureSize(text)
    yield (
      <ReactKonva.Text
        key={indexOffset}
        text={text}
        x={0.5 * Math.max(props.width - size.width, 0.0)}
        y={cursorBottom - size.height}
        fillLinearGradientStartPoint={{ x: 0, y: -cursorBottom + size.height }}
        fillLinearGradientEndPoint={{ x: 0, y: -cursorBottom + size.height + props.height }}
        fillLinearGradientColorStops={[
          0.0, `${props.background}`,
          0.1, `color-mix(${props.foreground} 50%, ${props.background}) 50%`,
          0.9, `color-mix(${props.foreground} 50%, ${props.background}) 50%`,
          1.0, `${props.background}`,
        ]}
        strokeLinearGradientStartPoint={{ x: 0, y: -cursorBottom + size.height }}
        strokeLinearGradientEndPoint={{ x: 0, y: -cursorBottom + size.height + props.height }}
        strokeLinearGradientColorStops={[
          0.0, `${props.background}00`,
          0.1, `color-mix(color-mix(${props.foreground} 50%, ${props.background}) 50%, black)`,
          0.9, `color-mix(color-mix(${props.foreground} 50%, ${props.background}) 50%, black)`,
          1.0, `${props.background}00`,
        ]}
        strokeWidth={2}
        fillAfterStrokeEnabled
        fontFamily={konvaTemplate.fontFamily()}
        fontSize={konvaTemplate.fontSize()}
        wrap={konvaTemplate.wrap()}
      />
    )
    cursorBottom -= size.height + props.lineGap
  }
}

interface Props {
  setAppVisible: React.Dispatch<React.SetStateAction<boolean>>
  setCanvas: React.Dispatch<React.SetStateAction<HTMLCanvasElement | null>>
}

export default function Display(props: Props) {
  const layer = React.useRef<Konva.Layer | null>(null)

  React.useEffect(() => {
    props.setCanvas(layer.current?.getNativeCanvasElement() ?? null)
  }, [])

  const [url, setUrl] = React.useState(window.location.href)
  React.useEffect(() => {
    let last = window.location.href

    const observer = new MutationObserver(async () => {
      const current = window.location.href
      if (current !== last) {
        last = current
        setUrl(current)
      }
    })
    observer.observe(document, { subtree: true, childList: true })
    return () => {
      observer.disconnect()
    }
  }, [])

  const [bvid, setBvid] = React.useState<string | null>(null)
  React.useEffect(() => {
    const urlObject = new URL(url)
    if (urlObject.pathname.startsWith('/video/')) {
      setBvid(urlObject.pathname.split('/')[2] ?? null)
      return
    }
    if (urlObject.pathname.startsWith('/list/')) {
      setBvid(urlObject.searchParams.get('bvid'))
      return
    }
    setBvid(null)
  }, [url])

  const getSwatches = (palette?: ColorThief.Color[]) => {
    // const darkFindIndex = palette?.findIndex((color) => color.isDark) ?? -1
    // const darkIndex = darkFindIndex !== -1 ? darkFindIndex : (palette?.length ?? 0)
    // const darkColor = palette?.[darkIndex]?.hex() ?? '#333333'
    // const lightFindIndex = palette?.findIndex((color) => color.isLight) ?? -1
    // const lightIndex = lightFindIndex !== -1 ? lightFindIndex : (palette?.length ?? 0)
    // const lightColor = palette?.[lightIndex]?.hex() ?? '#ffffff'
    // return darkIndex <= lightIndex ? {
    //   background: darkColor,
    //   foreground: lightColor,
    // } : {
    //   background: lightColor,
    //   foreground: darkColor,
    // }
    return {
      background: palette?.[0]?.hex() ?? '#333333',
      foreground: palette?.[1]?.hex() ?? '#ffffff',
    }
  }

  const postEapi = (path: string, body: any) => chrome.runtime.sendMessage({ path, body })
  const [swatches, setSwatches] = React.useState(getSwatches)
  const [song, setSong] = React.useState<SongRecord | null>(null)
  React.useEffect(() => {
    // const urlObject = new URL(url)
    // const bvid = urlObject.pathname.startsWith('/video/') ? urlObject.pathname.split('/')[2]
    //   : urlObject.pathname.startsWith('/list/') ? urlObject.searchParams.get('bvid') : null
    // const p = parseInt(urlObject.searchParams.get('p') ?? '1')

    if (!bvid) {
      return
    }
    fetch(`https://api.bilibili.com/x/web-interface/view/detail?bvid=${bvid}`, {
      method: 'GET',
      credentials: 'include',
    }).then((response) => response.json()).then((json) => Promise.all([
      (async () => {
        const pic = json?.data?.View?.pic ?? null
        try {
          setSwatches(getSwatches(pic ? (await getPalette(pic, 2) ?? undefined) : undefined))
        } catch {
          setSwatches(getSwatches())
        }
      })(),
      (async () => {
        const title = json?.data?.View?.title ?? null
        const text = json?.data?.Tags?.find((tag: any) => tag.tag_type === 'bgm')?.tag_name ?? title
        // const text = json?.data?.View?.title ?? null
        // console.log(json?.data)
        // const duration = json?.data?.View?.pages?.find((page) => page?.page === p)?.duration ?? null
        try {
          setSong(text ? await searchSong(text, title, postEapi) : null)
        } catch {
          setSong(null)
        }
      })()
    ]))
  }, [bvid])

  const media = (() => {
    const mediaRef = React.useRef<HTMLVideoElement | null>(null)
    React.useEffect(() => {
      if (mediaRef.current) {
        return
      }
      mediaRef.current = document.getElementById('bilibili-player')?.getElementsByTagName('video').item(0) ?? null
    }, [])
    return mediaRef.current
  })()

  const [currentTime, setCurrentTime] = React.useState(0.0)
  const byteFrequencyData = React.useRef<Uint8Array | null>(null)
  // const arr = React.useRef([])
  React.useEffect(() => {
    if (!media) {
      return
    }
    const audioCtx = new AudioContext()
    const source = audioCtx.createMediaElementSource(media)
    // console.log("includes?:", arr.current.includes(media))
    // if (!arr.current.includes(media)) {
    //   arr.current.push(media)
    // }
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 1 << 6
    source.connect(analyser)
    analyser.connect(audioCtx.destination)
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    byteFrequencyData.current = dataArray
    const currentTimeInterval = setInterval(() => {
      setCurrentTime(media?.currentTime ?? 0.0)
    })
    const byteFrequencyDataInterval = setInterval(() => {
      analyser.getByteFrequencyData(dataArray)
    }, 100)
    props.setAppVisible(true)
    return () => {
      setCurrentTime(0.0)
      byteFrequencyData.current = null
      source.disconnect()
      analyser.disconnect()
      audioCtx.close()
      clearInterval(currentTimeInterval)
      clearInterval(byteFrequencyDataInterval)
      props.setAppVisible(false)
    }
  }, [media])

  const fontFamilyMap = new Map([
    ['zh', 'Source Han Serif SC VF, serif'],
    ['jp', 'Source Han Serif JP VF, Source Han Serif SC VF, serif'],
    ['en', 'Georgia, Source Han Serif SC VF, serif'],
  ])
  const [fontFamily, setFontFamily] = React.useState('Source Han Serif SC VF, serif')
  React.useEffect(() => {
    song?.lyrics?.original?.detectLanguage().then((lang) => {
      const fontFamily = fontFamilyMap.get(lang)
      if (fontFamily) {
        setFontFamily(fontFamily)
      }
    })
  }, [song])

  return (
    <ReactKonva.Stage
      width={600}
      height={400}
      style={{
        display: 'none',
      }}
    >
      <ReactKonva.Layer ref={layer}>
        <ReactKonva.Rect
          width={600}
          height={400}
          fill={swatches.background}
        />
        <ReactKonva.Group
          x={50}
          y={50}
        >
          <LyricsLines
            lyrics={song?.lyrics?.original ?? null}
            currentTime={currentTime}
            width={500}
            height={350}
            lineGap={20}
            focusOffset={90}
            jumpTime={0.2}
            fontSize={40}
            fontFamily={fontFamily}
            foreground={swatches.foreground}
            background={swatches.background}
          />
        </ReactKonva.Group>
        <ReactKonva.Text
          text={song?.name ?? ''}
          width={560}
          x={20}
          y={20}
          fontSize={20}
          fill={swatches.foreground}
          stroke={`color-mix(${swatches.foreground} 50%, #000000)`}
          strokeWidth={2}
          fillAfterStrokeEnabled
          align='left'
          verticalAlign='top'
          fontFamily={fontFamily}
        />
        <ReactKonva.Text
          text={song?.artists?.join(' | ') ?? ''}
          width={560}
          x={20}
          y={20}
          fontSize={15}
          fill={swatches.foreground}
          stroke={`color-mix(${swatches.foreground} 50%, #000000)`}
          strokeWidth={2}
          fillAfterStrokeEnabled
          align='right'
          verticalAlign='top'
          fontFamily={fontFamily}
        />
      </ReactKonva.Layer>
    </ReactKonva.Stage>
  )
}
