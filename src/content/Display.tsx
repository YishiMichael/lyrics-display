import React from 'react'
import Konva from 'konva'
import * as ReactKonva from 'react-konva'
import * as ColorThief from 'colorthief'
import { Lyrics, SongRecord, searchSong } from './song.ts'

async function getPalette(imageUrl: string) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = imageUrl
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
  })
  return await ColorThief.getPalette(img, { colorCount: 6 })
}

interface LyricsLinesProps {
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
}

function* LyricsLines(props: LyricsLinesProps) {
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
      // fill={props.foreground}
      fillLinearGradientStartPoint={{ x: 0, y: 0 }}
      fillLinearGradientEndPoint={{ x: 0, y: size.height }}
      fillLinearGradientColorStops={[
        0.0, `color-mix(${props.foreground} 25%, white)`,
        1.0, props.foreground,
      ]}
      stroke={`color-mix(${props.foreground}, black)`}
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
          0.0, 'transparent',
          0.2, `color-mix(${props.foreground} 25%, transparent)`,
          0.8, `color-mix(${props.foreground} 25%, transparent)`,
          1.0, 'transparent',
        ]}
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
          0.0, 'transparent',
          0.2, `color-mix(${props.foreground} 25%, transparent)`,
          0.8, `color-mix(${props.foreground} 25%, transparent)`,
          1.0, 'transparent',
        ]}
        fontFamily={konvaTemplate.fontFamily()}
        fontSize={konvaTemplate.fontSize()}
        wrap={konvaTemplate.wrap()}
      />
    )
    cursorBottom -= size.height + props.lineGap
  }
}

interface Props {
  bvid: string | null
  setAppVisible: React.Dispatch<React.SetStateAction<boolean>>
  setCanvas: React.Dispatch<React.SetStateAction<HTMLCanvasElement | null>>
}

export default function Display(props: Props) {
  const layer = React.useRef<Konva.Layer | null>(null)

  React.useEffect(() => {
    props.setCanvas(layer.current?.getNativeCanvasElement() ?? null)
  }, [])

  const getSwatches = (palette: ColorThief.Color[] | null) => {
    const darkFindIndex = palette?.findIndex((color) => color.isDark) ?? -1
    const darkIndex = darkFindIndex !== -1 ? darkFindIndex : (palette?.length ?? 0)
    const darkColor = palette?.[darkIndex]?.hex() ?? '#333333'
    const lightFindIndex = palette?.findIndex((color) => color.isLight) ?? -1
    const lightIndex = lightFindIndex !== -1 ? lightFindIndex : (palette?.length ?? 0)
    const lightColor = palette?.[lightIndex]?.hex() ?? '#ffffff'
    return darkIndex <= lightIndex ? {
      background: darkColor,
      foreground: lightColor,
    } : {
      background: lightColor,
      foreground: darkColor,
    }
  }

  const [swatches, setSwatches] = React.useState(getSwatches(null))
  const song = React.useRef<SongRecord | null>(null)
  React.useEffect(() => {
    if (!props.bvid) {
      return
    }
    fetch(`https://api.bilibili.com/x/web-interface/view/detail?bvid=${props.bvid}`, {
      method: 'GET',
      credentials: 'include',
    }).then((response) => response.json()).then((json) => Promise.all([
      (async () => {
        const pic = json?.data?.View?.pic ?? null
        try {
          setSwatches(getSwatches(pic ? await getPalette(pic) : null))
        } catch {
          setSwatches(getSwatches(null))
        }
      })(),
      (async () => {
        const tagName = json?.data?.Tags?.find((tag: any) => tag.tag_type === 'bgm')?.tag_name ?? ''
        const keyword = /^发现《(.+?)(?:\s*\(.+\))?》$/g.exec(tagName)?.[1].trim() ?? tagName
        try {
          song.current = keyword ? await searchSong(
            keyword,
            (path: string, body: any) => chrome.runtime.sendMessage({ path, body }),
          ) : null
        } catch {
          song.current = null
        }
      })()
    ]))
  }, [props.bvid])

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

  return (
    <ReactKonva.Stage
      width={600}
      height={200}
      style={{
        display: 'none',
      }}
    >
      <ReactKonva.Layer ref={layer}>
        <ReactKonva.Rect
          width={600}
          height={200}
          fill={swatches.background}
        />
        <ReactKonva.Group
          x={50}
          y={50}
        >
          <LyricsLines
            lyrics={song.current?.lyrics?.original ?? null}
            currentTime={currentTime}
            width={500}
            height={150}
            lineGap={20}
            focusOffset={60}
            jumpTime={0.1}
            fontSize={40}
            fontFamily={'Source Han Serif JP VF, Source Han Serif SC VF'}
            foreground={swatches.foreground}
          />
        </ReactKonva.Group>
        <ReactKonva.Text
          text={song.current?.name ?? ''}
          width={560}
          x={20}
          y={20}
          fontSize={20}
          fill={swatches.foreground}
          align='left'
          verticalAlign='top'
          fontFamily={'Source Han Serif JP VF, Source Han Serif SC VF'}
        />
        <ReactKonva.Text
          text={song.current?.artists?.join('・') ?? ''}
          width={560}
          x={20}
          y={20}
          fontSize={15}
          fill={swatches.foreground}
          align='right'
          verticalAlign='top'
          fontFamily={'Source Han Serif JP VF, Source Han Serif SC VF'}
        />
      </ReactKonva.Layer>
    </ReactKonva.Stage>
  )
}
