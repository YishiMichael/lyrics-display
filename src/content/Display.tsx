import React from 'react'
import Konva from 'konva'
import * as ReactKonva from 'react-konva'
import { Lyrics, SongRecord, searchSong } from './song.ts'

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

function useByElement<N extends Node, T>(
  elementCallback: () => N | null,
  dataCallback: (element: N) => T,
  options?: MutationObserverInit,
) {
  const ref = React.useRef<T | null>(null)

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
      stroke={'green'}
      fill={'yellow'}
      fillAfterStrokeEnabled
      strokeWidth={2}
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
        stroke={'none'}
        fill={'#8888'}
        fillAfterStrokeEnabled
        strokeWidth={2}
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
        stroke={'none'}
        fill={'#8888'}
        fillAfterStrokeEnabled
        strokeWidth={2}
        fontFamily={konvaTemplate.fontFamily()}
        fontSize={konvaTemplate.fontSize()}
        wrap={konvaTemplate.wrap()}
      />
    )
    cursorBottom -= size.height + props.lineGap
  }
}

interface Props {
  setCanvas: React.Dispatch<React.SetStateAction<HTMLCanvasElement | null>>
}

export default function Display(props: Props) {
  const layer = React.useRef<Konva.Layer | null>(null)

  React.useEffect(() => {
    props.setCanvas(layer.current?.getNativeCanvasElement() ?? null)
  }, [])

  const media = useByElement(
    () => document.getElementById('bilibili-player')?.getElementsByTagName('video').item(0) ?? null,
    (media) => media,
    { attributes: true },
  )

  const keyword = useByElement(
    () => document.getElementsByClassName('tag-panel')[0],
    (element) => /^发现《(.+?)(?:\s*\(.+\))?》$/g.exec(
      element.querySelector('.tag-link.bgm-link')?.getAttribute('title') ?? '',
    )?.[1].trim() ?? '',
    { childList: true, subtree: true },
  )

  const postEapi = (path: string, body: any) => chrome.runtime.sendMessage({ path, body })

  const song = React.useRef<SongRecord | null>(null)
  React.useEffect(() => {
    if (!keyword) {
      song.current = null
      return
    }
    const timeout = setTimeout(async () => {
      song.current = await searchSong(keyword, postEapi)
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
    })
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
    <ReactKonva.Stage
      width={100}
      height={200}
      style={{
        display: 'none',
      }}
    >
      <ReactKonva.Layer ref={layer}>
        <ReactKonva.Group>
          <LyricsLines
            lyrics={song.current?.lyrics?.original ?? null}
            currentTime={currentTime}
            width={100}
            height={100}
            lineGap={10}
            focusOffset={50}
            jumpTime={0.1}
            fontSize={20}
            fontFamily={'LXGW WenKai'}
          />
        </ReactKonva.Group>
        <ReactKonva.Text
          text={`${song.current?.name}`}
          x={30}
          y={150}
          fontSize={20}
          stroke='green'
          fill='yellow'
          strokeWidth={3}
          fillAfterStrokeEnabled
        />
        {/*<ReactKonva.Text
          text={`${currentTime}`}
          x={50}
          y={120}
          fontSize={20}
          stroke='green'
          fill='yellow'
          strokeWidth={3}
          fontFamily='LXGW WenKai'
          fillAfterStrokeEnabled
        />*/}
      </ReactKonva.Layer>
    </ReactKonva.Stage>
  )
}
