import React from 'react'
import Konva from 'konva'
import * as ReactKonva from 'react-konva'
import { QueryClient } from '@tanstack/react-query'
import { Palette, Swatch, rgbDiff } from '@vibrant/color'
import { Vibrant } from 'node-vibrant/browser'
import { Lyrics, searchSong, SongRecord } from './song.ts'

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
    cursorBottom -= size.height + props.lineSpacing * props.fontSize
  }
}

function* AudioSpectrumBars(props: {
  values: Uint8Array
  width: number
  height: number
  proportion: number
  foreground: string
}) {
  for (let index = 0; index < props.values.length; ++index) {
    const value = props.values[index] / 255.0
    yield (
      <ReactKonva.Rect
        key={index}
        width={props.width / props.values.length * props.proportion}
        height={value * props.height}
        x={(index + 0.5 * (1.0 - props.proportion)) * props.width / props.values.length}
        y={(1.0 - value) * props.height}
        fill={`${props.foreground}33`}
      />
    )
  }
  // return props.values.map((value, index, array) => {
  //   return 
  // })
}

interface Props {
  setAppVisible: React.Dispatch<React.SetStateAction<boolean>>
  setCanvas: React.Dispatch<React.SetStateAction<HTMLCanvasElement | null>>
}

const audioCtx = new AudioContext()
const analyser = audioCtx.createAnalyser()
analyser.fftSize = 1 << 6
analyser.connect(audioCtx.destination)
const sourceMap: WeakMap<HTMLMediaElement, MediaElementAudioSourceNode> = new WeakMap()

const videoQueryClient = new QueryClient()
async function fetchVideoData(bvid: string | null) {
  if (!bvid) {
    return null
  }
  const { data } = await videoQueryClient.fetchQuery({
    queryKey: [bvid],
    queryFn: async () => await fetch(`https://api.bilibili.com/x/web-interface/view/detail?bvid=${bvid}`, {
      method: 'GET',
      credentials: 'include',
    }).then((response) => response.json()),
  })
  return data ?? null
}

export default function Display(props: Props) {
  const layer = React.useRef<Konva.Layer | null>(null)

  React.useEffect(() => {
    props.setCanvas(layer.current?.getNativeCanvasElement() ?? null)
  }, [])

  const { bvid, page } = useMonitoring(() => {
    const url = new URL(window.location.href)
    return {
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
    }
  })

  const getSwatches = (palette?: Palette) => {
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

  const [swatches, setSwatches] = React.useState(getSwatches)
  React.useEffect(() => {
    fetchVideoData(bvid)
      .then(async (videoData) => {
        if (!videoData) {
          return undefined
        }
        const pic = videoData.View?.pic as string | undefined ?? null
        if (!pic) {
          return undefined
        }
        return await Vibrant.from(pic).getPalette()
      })
      .then(getSwatches)
      .then(setSwatches)
  }, [bvid])

  const [song, setSong] = React.useState<SongRecord | null>(null)
  React.useEffect(() => {
    fetchVideoData(bvid)
      .then(async (videoData) => {
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
          ?.find((pageInfo) => pageInfo?.page as number | undefined === page)
          ?.duration as number | undefined
          ?? null
        const searchSongOptions = {
          titles: [title, ...bgmTags],
          staffs,
          tags: channelTags,
          targetDuration: duration,
        }
        return await searchSong(searchSongOptions)
      })
      .then(setSong)
  }, [bvid, page])

  const media = useMonitoring(() => document.getElementById('bilibili-player')?.getElementsByTagName('video').item(0) ?? null)

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

  const source = React.useRef<MediaElementAudioSourceNode | null>(null)
  const byteFrequencyData = React.useRef(new Uint8Array(analyser.frequencyBinCount))
  // const arr = React.useRef([])
  React.useEffect(() => {
    if (!media) {
      return
    }
    source.current = sourceMap.get(media) ?? null
    if (!source.current) {
      source.current = audioCtx.createMediaElementSource(media)
      sourceMap.set(media, source.current)
    }
    // const source = sourceMap.get(media)!
    // console.log("includes?:", arr.current.includes(media))
    // if (!arr.current.includes(media)) {
    //   arr.current.push(media)
    // }
    source.current.connect(analyser)
    // byteFrequencyData.current = dataArray

    const interval = setInterval(() => {
      analyser.getByteFrequencyData(byteFrequencyData.current)
    }, 10)
    // props.setAppVisible(true)
    return () => {
      // setCurrentTime(0.0)
      // byteFrequencyData.current = null
      if (source.current) {
        source.current.disconnect()
        source.current = null
      }
      // analyser.disconnect()
      // audioCtx.close()
      clearInterval(interval)
      // props.setAppVisible(false)
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
          fill={swatches.foreground}
          stroke={`color-mix(${swatches.foreground} 50%, black)`}
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
            values={byteFrequencyData.current}
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
