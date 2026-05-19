import React from 'react'
import Konva from 'konva'
import * as ReactKonva from 'react-konva'
import { TinyColor } from '@ctrl/tinycolor'
import Lyrics from './lyrics.ts'
import { SongRecord, SwatchesRecord, tryInstantiatePlatform } from './platform.ts'

function useMonitoring<T>(callback: () => T) {
  const data = React.useRef(callback())
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      data.current = callback()
    })
    observer.observe(document, { subtree: true, childList: true })
    return () => {
      observer.disconnect()
    }
  }, [])
  return data.current
}

function* LyricsLines(props: {
  lyrics: Lyrics | null
  currentTime: number

  width: number
  height: number
  lineSpacing: number
  focusOffset: number
  jumpTime: number

  fontSize: number
  fontFamily: string
  foreground: TinyColor
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
  const cursorMiddle = props.focusOffset * props.height + jumpProportion * (size.height + props.lineSpacing * props.fontSize)
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
        0.0, props.foreground.lighten(75).toHex8String(),
        1.0, props.foreground.toHex8String(),
      ]}
      stroke={props.foreground.darken(50).toHex8String()}
      strokeWidth={2}
      fillAfterStrokeEnabled
      fontFamily={konvaTemplate.fontFamily()}
      fontSize={konvaTemplate.fontSize()}
      wrap={konvaTemplate.wrap()}
    />
  )

  let cursorTop = cursorMiddle + 0.5 * size.height + props.lineSpacing * props.fontSize
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
          0.0, props.foreground.clone().setAlpha(0.0).toHex8String(),
          0.2, props.foreground.clone().setAlpha(0.75).toHex8String(),
          0.8, props.foreground.clone().setAlpha(0.75).toHex8String(),
          1.0, props.foreground.clone().setAlpha(0.0).toHex8String(),
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
    cursorTop += size.height + props.lineSpacing * props.fontSize
  }

  let cursorBottom = cursorMiddle - 0.5 * size.height - props.lineSpacing * props.fontSize
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
          0.0, props.foreground.clone().setAlpha(0.0).toHex8String(),
          0.2, props.foreground.clone().setAlpha(0.75).toHex8String(),
          0.8, props.foreground.clone().setAlpha(0.75).toHex8String(),
          1.0, props.foreground.clone().setAlpha(0.0).toHex8String(),
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
    cursorBottom -= size.height + props.lineSpacing * props.fontSize
  }
}

function* AudioSpectrumBars(props: {
  values: Uint8Array<ArrayBuffer> | null
  width: number
  height: number
  proportion: number
  foreground: TinyColor
}) {
  if (!props.values) {
    return
  }
  for (let index = 0; index < props.values.length; ++index) {
    const value = props.values[index] / 255.0
    yield (
      <ReactKonva.Rect
        key={index}
        width={props.width / props.values.length * props.proportion}
        height={value * props.height}
        x={(index + 0.5 * (1.0 - props.proportion)) * props.width / props.values.length}
        y={(1.0 - value) * props.height}
        fill={props.foreground.clone().setAlpha(0.2).toHex8String()}
      />
    )
  }
}

class FrequencyWave {
  static audioCtx = new AudioContext()
  static analyser = ((audioCtx: AudioContext) => {
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 1 << 6
    analyser.connect(audioCtx.destination)
    return analyser
  })(FrequencyWave.audioCtx)
  static sourceMap: WeakMap<HTMLMediaElement, MediaElementAudioSourceNode> = new WeakMap()

  private analyser: AnalyserNode
  private source: MediaElementAudioSourceNode
  private byteFrequencyDataPingpong: [Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>]
  private pingpongFlag: boolean

  constructor(analyser: AnalyserNode, source: MediaElementAudioSourceNode) {
    source.connect(analyser)
    this.analyser = analyser
    this.source = source
    this.byteFrequencyDataPingpong = [
      new Uint8Array(analyser.frequencyBinCount),
      new Uint8Array(analyser.frequencyBinCount),
    ]
    this.pingpongFlag = false
  }

  static attach(media: HTMLMediaElement) {
    return new FrequencyWave(
      FrequencyWave.analyser,
      FrequencyWave.sourceMap.get(media) ?? (
        (media) => {
          const source = FrequencyWave.audioCtx.createMediaElementSource(media)
          FrequencyWave.sourceMap.set(media, source)
          return source
        }
      )(media),
    )
  }

  getByteFrequencyData() {
    const byteFrequencyData = this.byteFrequencyDataPingpong[this.pingpongFlag ? 1 : 0]
    this.pingpongFlag = !this.pingpongFlag
    this.analyser.getByteFrequencyData(byteFrequencyData)
    return byteFrequencyData
  }

  destructor() {
    this.source.disconnect()
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

  const url = useMonitoring(() => window.location.href)
  const platform = React.useMemo(() => tryInstantiatePlatform(new URL(url)), [url])

  const defaultSwatches = () => {
    return {
      background: new TinyColor('#333333'),
      foreground: new TinyColor('#ffffff'),
    }
  }
  const [swatches, setSwatches] = React.useState<SwatchesRecord>(defaultSwatches)
  React.useEffect(() => {
    if (!platform) {
      setSwatches(swatches)
      return
    }
    platform.swatches().then((swatches) => setSwatches(swatches ?? defaultSwatches()))
  }, [platform])

  const [song, setSong] = React.useState<SongRecord | null>(null)
  React.useEffect(() => {
    if (!platform) {
      setSong(null)
      return
    }
    platform.song().then(setSong)
  }, [platform])

  const media = useMonitoring(() => platform?.getMedia(document) ?? null)
  React.useEffect(() => {
    props.setAppVisible(!!media)
    return () => {
      props.setAppVisible(false)
    }
  }, [media])

  const [currentTime, setCurrentTime] = React.useState(0.0)
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (media && !media.paused) {
        setCurrentTime(media?.currentTime ?? 0.0)
      }
    }, 1000 / 60)
    return () => {
      clearInterval(interval)
    }
  }, [])

  const frequencyWave = React.useRef<FrequencyWave | null>(null)
  React.useEffect(() => {
    if (!media) {
      return
    }
    frequencyWave.current = FrequencyWave.attach(media)
    return () => {
      if (frequencyWave.current) {
        frequencyWave.current.destructor()
        frequencyWave.current = null
      }
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
    >
      <ReactKonva.Layer ref={layer}>
        <ReactKonva.Rect
          width={600}
          height={150}
          fill={swatches.background.toHex8String()}
        />
        <ReactKonva.Text
          text={song?.name ?? ''}
          width={560}
          x={20}
          y={20}
          fontSize={20}
          fill={swatches.foreground.toHex8String()}
          stroke={swatches.foreground.darken(50).toHex8String()}
          strokeWidth={0}
          fillAfterStrokeEnabled
          align='left'
          verticalAlign='top'
          fontFamily={fontFamily}
          wrap='none'
        />
        <ReactKonva.Text
          text={song?.artists?.join(' | ') ?? ''}
          width={560}
          x={20}
          y={20}
          fontSize={15}
          fill={swatches.foreground.toHex8String()}
          stroke={swatches.foreground.darken(50).toHex8String()}
          strokeWidth={0}
          fillAfterStrokeEnabled
          align='right'
          verticalAlign='top'
          fontFamily={fontFamily}
          wrap='none'
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
            lineSpacing={0.6}
            focusOffset={0.3}
            jumpTime={0.2}
            fontSize={30}
            fontFamily={fontFamily}
            foreground={swatches.foreground}
          />
        </ReactKonva.Group>
        <ReactKonva.Group
          x={0}
          y={50}
        >
          <AudioSpectrumBars
            values={frequencyWave.current?.getByteFrequencyData() ?? null}
            width={600}
            height={100}
            proportion={0.4}
            foreground={swatches.foreground}
          />
        </ReactKonva.Group>
      </ReactKonva.Layer>
    </ReactKonva.Stage>
  )
}
