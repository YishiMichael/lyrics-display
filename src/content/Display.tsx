import React from 'react'
import Konva from 'konva'
import * as ReactKonva from 'react-konva'
import { Palette, Swatch, rgbDiff } from '@vibrant/color'
import { Vibrant } from 'node-vibrant/browser'
import { Lyrics, SongRecord, searchSong } from './song.ts'

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
      strokeWidth={2}
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
          0.0, `${props.foreground}00`,
          0.2, `${props.foreground}AA`,
          0.8, `${props.foreground}AA`,
          1.0, `${props.foreground}00`,
        ]}
        // strokeLinearGradientStartPoint={{ x: 0, y: -cursorTop }}
        // strokeLinearGradientEndPoint={{ x: 0, y: -cursorTop + props.height }}
        // strokeLinearGradientColorStops={[
        //   0.0, `${props.background}00`,
        //   0.1, `color-mix(color-mix(${props.foreground} 50%, ${props.background}) 50%, black)`,
        //   0.9, `color-mix(color-mix(${props.foreground} 50%, ${props.background}) 50%, black)`,
        //   1.0, `${props.background}00`,
        // ]}
        // strokeWidth={2}
        // fillAfterStrokeEnabled
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
          0.0, `${props.foreground}00`,
          0.2, `${props.foreground}AA`,
          0.8, `${props.foreground}AA`,
          1.0, `${props.foreground}00`,
        ]}
        // strokeLinearGradientStartPoint={{ x: 0, y: -cursorBottom + size.height }}
        // strokeLinearGradientEndPoint={{ x: 0, y: -cursorBottom + size.height + props.height }}
        // strokeLinearGradientColorStops={[
        //   0.0, `${props.background}00`,
        //   0.1, `color-mix(color-mix(${props.foreground} 50%, ${props.background}) 50%, black)`,
        //   0.9, `color-mix(color-mix(${props.foreground} 50%, ${props.background}) 50%, black)`,
        //   1.0, `${props.background}00`,
        // ]}
        // strokeWidth={2}
        // fillAfterStrokeEnabled
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

  const getSwatches = (palette?: Palette) => {
    // const toLab = converter('lab')
    // const diff = differenceCiede2000()
    // const areClose = (c1: Swatch, c2: Swatch) => rgbDiff(c1.rgb, c2.rgb) < 10

    const colors = [
      palette?.Vibrant,
      palette?.Muted,
      palette?.DarkVibrant,
      palette?.DarkMuted,
      palette?.LightVibrant,
      palette?.LightMuted,
    ]
      .filter((color) => !!color)
      .toSorted((prev, next) => prev.population - next.population)
    const background = colors.at(-1) ?? new Swatch([51, 51, 51], 0)
    const foreground = colors.findLast((foreground) => rgbDiff(background.rgb, foreground.rgb) >= 25.0)
      ?? new Swatch(background.hsl[2] > 0.5 ? [51, 51, 51] : [255, 255, 255], 0)
    return {
      background: background.hex,
      foreground: foreground.hex,
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
        const pic = (json?.data?.View?.pic ?? '') as string
        try {
          setSwatches(getSwatches(pic ? (await Vibrant.from(pic).getPalette() ?? undefined) : undefined))
        } catch {
          setSwatches(getSwatches())
        }
      })(),
      (async () => {
        const title = (json?.data?.View?.title ?? '') as string
        const tag = (json?.data?.Tags?.find((tag: any) => tag.tag_type === 'bgm')?.tag_name ?? '') as string
        // const text = tag ?? title
        // const text = json?.data?.View?.title ?? null
        // console.log(json?.data)
        // const duration = json?.data?.View?.pages?.find((page) => page?.page === p)?.duration ?? null
        try {
          setSong(title ? await searchSong([title, tag], title, postEapi) : null)
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
      height={150}
      style={{
        display: 'none',
      }}
    >
      <ReactKonva.Layer ref={layer}>
        <ReactKonva.Rect
          width={600}
          height={150}
          fill={swatches.background}
        />
        <ReactKonva.Text
          text={song?.name ?? ''}
          width={560}
          x={20}
          y={20}
          fontSize={20}
          fill={swatches.foreground}
          stroke={`color-mix(${swatches.foreground} 50%, black)`}
          strokeWidth={1}
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
          stroke={`color-mix(${swatches.foreground} 50%, black)`}
          strokeWidth={1}
          fillAfterStrokeEnabled
          align='right'
          verticalAlign='top'
          fontFamily={fontFamily}
        />
        <ReactKonva.Group
          x={50}
          y={50}
        >
          <LyricsLines
            lyrics={song?.lyrics?.original ?? null}
            currentTime={currentTime}
            width={500}
            height={100}
            lineGap={20}
            focusOffset={30}
            jumpTime={0.2}
            fontSize={30}
            fontFamily={fontFamily}
            foreground={swatches.foreground}
          />
        </ReactKonva.Group>
      </ReactKonva.Layer>
    </ReactKonva.Stage>
  )
}
