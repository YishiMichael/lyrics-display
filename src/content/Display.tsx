import React from 'react'
import Konva from 'konva'
import * as ReactKonva from 'react-konva'
import { TinyColor } from '@ctrl/tinycolor'
import Lyrics from './lyrics.ts'
import { tryInstantiatePlatform } from './platform.ts'

function useMonitoring<T>(callback: () => T) {
  const value = React.useRef(callback())

  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      value.current = callback()
    })
    observer.observe(document, { subtree: true, childList: true })
    return () => {
      observer.disconnect()
    }
  }, [])

  return value.current
}

function useAnimationFrame<T>(closure: () => () => T, deps?: React.DependencyList) {
  const frame = React.useRef<number | undefined>(undefined)
  const [value, setValue] = React.useState(closure())

  React.useEffect(() => {
    const callback = closure()

    const tick = () => {
      setValue(callback)
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current) {
        cancelAnimationFrame(frame.current)
      }
    }
  }, deps)

  return value
}

// https://github.com/streamich/react-use/blob/master/src/useAsyncFn.ts
function useAsyncHistory<T>(
  callback: () => Promise<T | undefined>,
  fallback: T,
  deps?: React.DependencyList,
) {
  const lastCallId = React.useRef(0)
  const isMounted = React.useRef(false)
  const valuesHistory = React.useRef<T[]>([])
  const [generation, setGeneration] = React.useState(0)

  const updateValue = (value: T = fallback) => {
    if (!Object.is(value, valuesHistory.current.at(0) ?? fallback)) {
      setGeneration(valuesHistory.current.unshift(value))
    }
  }

  React.useEffect(() => {
    isMounted.current = true

    return () => {
      isMounted.current = false
    }
  }, [])

  React.useEffect(() => {
    const callId = ++lastCallId.current

    callback().then(
      (value) => {
        if (isMounted.current && callId === lastCallId.current) {
          updateValue(value)
        }
        return value
      },
      (error) => {
        if (isMounted.current && callId === lastCallId.current) {
          updateValue()
        }
        return error
      },
    )
  }, deps)

  return React.useCallback((offset: number = 0) => {
    return valuesHistory.current.at(offset) ?? fallback
  }, [generation])
}

function useFrequencyWave(media?: HTMLMediaElement) {
  const frequencyWave = React.useRef<FrequencyWave | undefined>(undefined)

  React.useEffect(() => {
    if (!media) {
      return
    }
    frequencyWave.current = FrequencyWave.attach(media)
    return () => {
      if (frequencyWave.current) {
        frequencyWave.current.destructor()
        frequencyWave.current = undefined
      }
    }
  }, [media])

  return frequencyWave.current
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
  private byteFrequencyData: Uint8Array<ArrayBuffer>

  constructor(analyser: AnalyserNode, source: MediaElementAudioSourceNode) {
    source.connect(analyser)
    this.analyser = analyser
    this.source = source
    this.byteFrequencyData = new Uint8Array(analyser.frequencyBinCount)
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
    this.analyser.getByteFrequencyData(this.byteFrequencyData)
    return this.byteFrequencyData
  }

  destructor() {
    this.source.disconnect()
  }
}

function ScrollingText(props: {
  text?: string
  x: number
  y: number
  width: number
  bufferWidth: number
  align?: string
  verticalAlign?: string
  fontSize: number
  fontFamily: string
  foreground: TinyColor
  scrollingOffset: number
}) {
  if (!props.text) {
    return
  }

  const konvaTemplate = new Konva.Text({
    fontFamily: props.fontFamily,
    fontSize: props.fontSize,
    wrap: 'none',
  })
  const measuredWidth = konvaTemplate.measureSize(props.text).width
  const bufferMeasuredWidth = measuredWidth + props.bufferWidth

  return measuredWidth <= props.width ? (
    <>
      <ReactKonva.Text
        text={props.text}
        x={props.x}
        y={props.y}
        width={props.width}
        align={props.align}
        verticalAlign={props.verticalAlign}
        fontSize={props.fontSize}
        fontFamily={props.fontFamily}
        fill={props.foreground.toHex8String()}
        wrap='none'
      />
    </>
  ) : (
    <>
      <ReactKonva.Text
        text={props.text}
        x={props.x - props.scrollingOffset % bufferMeasuredWidth}
        y={props.y}
        verticalAlign={props.verticalAlign}
        fontSize={props.fontSize}
        fontFamily={props.fontFamily}
        fillLinearGradientStartPoint={{ x: props.scrollingOffset % bufferMeasuredWidth, y: 0 }}
        fillLinearGradientEndPoint={{ x: props.scrollingOffset % bufferMeasuredWidth + props.width, y: 0 }}
        fillLinearGradientColorStops={[
          0.0, props.foreground.clone().setAlpha(0.0).toHex8String(),
          0.1, props.foreground.toHex8String(),
          0.9, props.foreground.toHex8String(),
          1.0, props.foreground.clone().setAlpha(0.0).toHex8String(),
        ]}
        wrap='none'
      />
      <ReactKonva.Text
        text={props.text}
        x={props.x - (props.scrollingOffset % bufferMeasuredWidth - bufferMeasuredWidth)}
        y={props.y}
        verticalAlign={props.verticalAlign}
        fontSize={props.fontSize}
        fontFamily={props.fontFamily}
        fillLinearGradientStartPoint={{ x: props.scrollingOffset % bufferMeasuredWidth - bufferMeasuredWidth, y: 0 }}
        fillLinearGradientEndPoint={{ x: props.scrollingOffset % bufferMeasuredWidth - bufferMeasuredWidth + props.width, y: 0 }}
        fillLinearGradientColorStops={[
          0.0, props.foreground.clone().setAlpha(0.0).toHex8String(),
          0.1, props.foreground.toHex8String(),
          0.9, props.foreground.toHex8String(),
          1.0, props.foreground.clone().setAlpha(0.0).toHex8String(),
        ]}
        wrap='none'
      />
    </>
  )
}

function LyricsLines(props: {
  lyrics?: Lyrics
  currentTime: number
  x: number
  y: number
  width: number
  height: number
  focusOffset: number
  lineHeight: number
  jumpTime?: number
  fontSize: number
  fontFamily: string
  foreground: TinyColor
  strokeWidth?: number
}) {
  function integersInOpenInterval(a: number, b: number) {
    const start = Math.floor(a) + 1
    const end = Math.ceil(b) - 1
    return Array.from({ length: end - start + 1 }).map((_, index) => index + start)
  }

  if (!props.lyrics) {
    return
  }

  const konvaTemplate = new Konva.Text({
    fontFamily: props.fontFamily,
    fontSize: props.fontSize,
    wrap: 'none',
  })
  const span = props.lyrics.getSpan(props.currentTime)
  const readProportion = (props.currentTime - span.startTime) / (span.stopTime - span.startTime) || 0.0
  const jumpProportion = props.jumpTime
    ? Math.max(1.0 - (props.currentTime - span.startTime) / Math.min(props.jumpTime, span.stopTime - span.startTime), 0.0) || 0.0
    : 0.0
  const focusOffset = props.focusOffset + jumpProportion * props.lineHeight

  return integersInOpenInterval(
    (-0.5 * props.fontSize - focusOffset) / props.lineHeight,
    (props.height + 0.5 * props.fontSize - focusOffset) / props.lineHeight,
  ).map((indexOffset) => {
    const text = props.lyrics?.getTextByIndex(span.index + indexOffset)
    const measuredWidth = text ? konvaTemplate.measureSize(text).width : 0.0
    const offset = focusOffset + indexOffset * props.lineHeight
    return (
      <ReactKonva.Text
        key={indexOffset}
        text={text}
        x={props.x + 0.5 * props.width + 0.5 * Math.max(0.0, measuredWidth - props.width) * Math.min(Math.max((
          (1.0 - 2.0 * (indexOffset ? 0.0 : readProportion)) * (props.width / measuredWidth + 1.0)
        ), -1.0), 1.0)}
        y={props.y + offset}
        offsetX={0.5 * measuredWidth}
        offsetY={0.5 * props.fontSize}
        fontFamily={props.fontFamily}
        fontSize={props.fontSize}
        wrap='none'
        {...indexOffset ? {
          fillLinearGradientStartPoint: { x: 0, y: -(offset - 0.5 * props.fontSize) },
          fillLinearGradientEndPoint: { x: 0, y: -(offset - 0.5 * props.fontSize) + props.height },
          fillLinearGradientColorStops: [
            0.0, props.foreground.clone().setAlpha(0.0).toHex8String(),
            0.2, props.foreground.clone().setAlpha(0.5).toHex8String(),
            0.8, props.foreground.clone().setAlpha(0.5).toHex8String(),
            1.0, props.foreground.clone().setAlpha(0.0).toHex8String(),
          ],
        } : {
          fillLinearGradientStartPoint: { x: 0, y: 0.0 },
          fillLinearGradientEndPoint: { x: 0, y: props.fontSize },
          fillLinearGradientColorStops: [
            0.0, props.foreground.tint(50).toHex8String(),
            1.0, props.foreground.toHex8String(),
          ],
          stroke: props.foreground.shade(50).toHex8String(),
          strokeWidth: props.strokeWidth,
          fillAfterStrokeEnabled: true,
        }}
      />
    )
  })
}

function AudioSpectrumBars(props: {
  values?: Uint8Array<ArrayBuffer>
  x: number
  y: number
  width: number
  height: number
  proportion: number
  foreground: TinyColor
}) {
  if (!props.values || !props.values.length) {
    return
  }
  const length = props.values.length
  return Array.from(props.values).map((value) => value / 255.0).map((value, index) => (
    <ReactKonva.Rect
      key={index}
      width={props.width / length * props.proportion}
      height={value * props.height}
      x={props.x + (index + 0.5 * (1.0 - props.proportion)) * props.width / length}
      y={props.y + (1.0 - value) * props.height}
      fill={props.foreground.clone().setAlpha(0.2).toHex8String()}
    />
  ))
}

function fontFamilyByLang(lang: string = 'zh') {
  switch (lang) {
  case 'zh':
    return 'Source Han Serif SC VF, serif'
  case 'jp':
    return 'Source Han Serif JP VF, Source Han Serif SC VF, serif'
  case 'en':
    return 'Georgia, Source Han Serif SC VF, serif'
  }
  return 'Source Han Serif SC VF, serif'
}

export default function Display(props: {
  setAppVisible: React.Dispatch<React.SetStateAction<boolean>>
  setCanvas: React.Dispatch<React.SetStateAction<HTMLCanvasElement | null>>
}) {
  const layer = React.useCallback((node: Konva.Layer | null) => {
    props.setCanvas(node?.getNativeCanvasElement() ?? null)
  }, [props.setCanvas])

  const url = useMonitoring(() => window.location.href)

  const platform = React.useMemo(() => tryInstantiatePlatform(new URL(url)), [url])

  const getSwatches = useAsyncHistory(async () => {
    return await platform?.swatches()
  }, {
    background: new TinyColor('#333333'),
    foreground: new TinyColor('#eeeeee'),
  }, [platform])

  const swatches = useAnimationFrame(() => {
    const start = performance.now()
    const current = getSwatches()
    const previous = getSwatches(1)
    return () => {
      const elapsed = (performance.now() - start) / 1000.0
      return elapsed > 2.0 ? current : {
        background: previous.background.mix(current.background, elapsed / 2.0 * 100.0),
        foreground: previous.foreground.mix(current.foreground, elapsed / 2.0 * 100.0),
      }
    }
  }, [getSwatches])

  const song = useAsyncHistory(async () => {
    return await platform?.song()
  }, {
    name: '',
    artists: [],
    lyrics: {},
  }, [platform])()

  const songElapsed = useAnimationFrame(() => {
    const start = performance.now()
    return () => (performance.now() - start) / 1000.0
  }, [song])

  const fontFamily = useAsyncHistory(async () => {
    const lyrics = song.lyrics.original?.getLyricsJoined()
    const languageDetectionResult = lyrics ? await chrome.i18n.detectLanguage(lyrics) : undefined
    const lang = languageDetectionResult?.languages.at(0)?.language
    return fontFamilyByLang(lang)
  }, fontFamilyByLang(), [song])()

  const media = useMonitoring(() => platform?.getMedia(document))

  React.useEffect(() => {
    props.setAppVisible(!!media)
  }, [media])

  const currentTime = useAnimationFrame(() => {
    return () => media?.currentTime ?? 0.0
  }, [media])

  const frequencyWave = useFrequencyWave(media)

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
        <AudioSpectrumBars
          values={frequencyWave?.getByteFrequencyData()}
          x={0}
          y={50}
          width={600}
          height={100}
          proportion={0.4}
          foreground={swatches.foreground}
        />
        <ScrollingText
          text={song.name}
          x={20}
          y={20}
          width={260}
          bufferWidth={40}
          fontSize={20}
          fontFamily={fontFamily}
          foreground={swatches.foreground}
          align='left'
          verticalAlign='top'
          scrollingOffset={20.0 * songElapsed}
        />
        <ScrollingText
          text={song.artists.join(' | ')}
          x={320}
          y={20}
          width={260}
          bufferWidth={40}
          fontSize={15}
          fontFamily={fontFamily}
          foreground={swatches.foreground}
          align='right'
          verticalAlign='top'
          scrollingOffset={20.0 * songElapsed}
        />
        {song.lyrics.translated ? (
          <>
            <LyricsLines
              lyrics={song.lyrics.original}
              currentTime={currentTime}
              x={50}
              y={50}
              width={500}
              height={50}
              focusOffset={25}
              lineHeight={50}
              fontSize={30}
              fontFamily={fontFamily}
              foreground={swatches.foreground}
              strokeWidth={1}
            />
            <LyricsLines
              lyrics={song.lyrics.translated}
              currentTime={currentTime}
              x={50}
              y={100}
              width={500}
              height={50}
              focusOffset={20}
              lineHeight={40}
              fontSize={20}
              fontFamily={fontFamilyByLang()}
              foreground={swatches.foreground}
              strokeWidth={1}
            />
          </>
        ) : (
          <>
            <LyricsLines
              lyrics={song.lyrics.original}
              currentTime={currentTime}
              x={50}
              y={50}
              width={500}
              height={100}
              focusOffset={25}
              lineHeight={50}
              jumpTime={0.2}
              fontSize={30}
              fontFamily={fontFamily}
              foreground={swatches.foreground}
              strokeWidth={1}
            />
          </>
        )}
      </ReactKonva.Layer>
    </ReactKonva.Stage>
  )
}
