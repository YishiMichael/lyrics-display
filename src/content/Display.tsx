import React from 'react'
import Konva from 'konva'
import { Layer, Stage, Text } from 'react-konva'

interface Attrs {
  setCanvas: React.Dispatch<React.SetStateAction<HTMLCanvasElement | null>>
}

class MediaMonitor {
  audioCtx: AudioContext
  source: MediaElementAudioSourceNode
  analyser: AnalyserNode
  dataArray: Uint8Array<ArrayBuffer>

  constructor(element: HTMLMediaElement, fftSize: number) {
    this.audioCtx = new AudioContext()
    this.source = this.audioCtx.createMediaElementSource(element)
    this.analyser = this.audioCtx.createAnalyser()
    this.analyser.fftSize = fftSize
    this.source.connect(this.analyser)
    this.analyser.connect(this.audioCtx.destination)
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount)
  }

  getByteFrequencyData() {
    this.analyser.getByteFrequencyData(this.dataArray)
    return this.dataArray
  }
}

export default function Display(attrs: Attrs) {
  const layer = React.useRef<Konva.Layer | null>(null)

  React.useEffect(() => {
    attrs.setCanvas(layer.current?.getNativeCanvasElement() ?? null)
  }, [])

  const video = React.useRef<HTMLVideoElement | null>(null)
  const mediaMonitor = React.useRef<MediaMonitor | null>(null)

  const [currentTime, setCurrentTime] = React.useState(0.0)

  React.useEffect(() => {
    if (!video.current) {
      const player = document.getElementById('bilibili-player')
      if (player) {
        video.current = player.getElementsByTagName('video').item(0)
      }
    }
    if (!video.current) {
      return
    }
    if (!mediaMonitor.current) {
      mediaMonitor.current = new MediaMonitor(video.current, 64)
    }

    const interval = setInterval(() => {
      if (video.current) {
        setCurrentTime(video.current.currentTime)
      }
    }, 1000 / 30)
    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <Stage width={400} height={200}>
      <Layer ref={layer}>
        <Text
          text={`${currentTime}`}
          x={50}
          y={150}
          fontSize={40}
          stroke='green'
          fill='yellow'
          strokeWidth={3}
          fillAfterStrokeEnabled
        />
      </Layer>
    </Stage>
  )
}
