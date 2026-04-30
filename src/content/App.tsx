import React from 'react'
import { createRoot } from 'react-dom/client'
import Panel from './Panel.tsx'
import Pip from './Pip.tsx'
import Settings from './Settings.tsx'
import styles from './App.module.css'
import pipStyles from './Pip.module.css'

declare global {
  interface DocumentPictureInPicture {
    requestWindow: (options?: any) => Promise<Window>
  }

  var documentPictureInPicture: DocumentPictureInPicture
}

async function openPipWindow() {
  const win = await documentPictureInPicture.requestWindow({
    width: 600,  // TODO: storage
    height: 300,
  })
  win.document.head.append(
    ...Array.from(
      document.querySelectorAll(`style[type='text/css'][data-vite-dev-id]`)
    ).map((child) => child.cloneNode(true))
  )
  createRoot(win.document.body).render(
    <React.StrictMode>
      <Pip/>
    </React.StrictMode>,
  )
  return win
}

interface AbsolutePosition {
  xBuff: number
  yBuff: number
  xReverse: boolean
  yReverse: boolean
}

function useWindowSize() {
  const [size, setSize] = React.useState({
    width: Math.trunc(document.documentElement.clientWidth),
    height: Math.trunc(document.documentElement.clientHeight),
  })

  React.useEffect(() => {
    const handleResize = () => {
      requestAnimationFrame(() => setSize({
        width: Math.trunc(document.documentElement.clientWidth),
        height: Math.trunc(document.documentElement.clientHeight),
      }))
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return size
}

function useElementSize<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null)
  const [size, setSize] = React.useState({ width: 0, height: 0 })

  React.useLayoutEffect(() => {
    if (!ref.current) {
      return
    }

    const rect = ref.current.getBoundingClientRect()
    setSize({
      width: Math.trunc(rect.width),
      height: Math.trunc(rect.height),
    })
  }, [])

  return { size, ref }
}

function useDraggableElement<T extends HTMLElement>(initialAbsPos: AbsolutePosition) {
  const windowSize = useWindowSize()
  const { size: elementSize, ref } = useElementSize<T>()

  const [absPos, setAbsPos] = React.useState<AbsolutePosition>(initialAbsPos)

  const updateAbsPos = (
    absPos: AbsolutePosition,
    windowSize: { width: number, height: number },
    elementSize: { width: number, height: number },
  ) => {
    const width = Math.max(windowSize.width - elementSize.width, 0)
    const height = Math.max(windowSize.height - elementSize.height, 0)
    const xBuff = Math.min(Math.max(absPos.xBuff, 0), width)
    const yBuff = Math.min(Math.max(absPos.yBuff, 0), height)
    const xRevert = 2 * xBuff > width
    const yRevert = 2 * yBuff > height
    setAbsPos({
      xBuff: xRevert ? width - xBuff : xBuff,
      yBuff: yRevert ? height - yBuff : yBuff,
      xReverse: absPos.xReverse !== xRevert,
      yReverse: absPos.yReverse !== yRevert,
    })
  }

  React.useEffect(() => {
    updateAbsPos(absPos, windowSize, elementSize)
  }, [windowSize, elementSize])

  const dragInitial = React.useRef<{ absPos: AbsolutePosition, clientX: number, clientY: number } | null>(null)

  const onMouseDown = (event: any) => {
    dragInitial.current = {
      absPos,
      clientX: event.clientX,
      clientY: event.clientY,
    }
  }

  const onMouseMove = (event: any) => {
    if (dragInitial.current === null) {
      return
    }
    const clientDiff = {
      x: event.clientX - dragInitial.current.clientX,
      y: event.clientY - dragInitial.current.clientY,
    }
    const absPos = dragInitial.current.absPos
    updateAbsPos({
      xBuff: absPos.xReverse ? absPos.xBuff - clientDiff.x : absPos.xBuff + clientDiff.x,
      yBuff: absPos.yReverse ? absPos.yBuff - clientDiff.y : absPos.yBuff + clientDiff.y,
      xReverse: absPos.xReverse,
      yReverse: absPos.yReverse,
    }, windowSize, elementSize)
  }

  const onMouseUp = () => {
    dragInitial.current = null
  }

  React.useEffect(() => {
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [windowSize, elementSize])

  return { absPos, ref, onMouseDown }
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

export default function App() {
  const [pipWindow, setPipWindow] = React.useState<Window | null>(null)
  const [settingsVisible, setSettingsVisible] = React.useState(false)

  const {
    absPos,
    ref: panelRef,
    onMouseDown: onMouseDownDrag,
  } = useDraggableElement<HTMLDivElement>({
    xBuff: 100,
    yBuff: 100,
    xReverse: false,
    yReverse: false,
  })  // TODO: storage

  const onClickToggleButton = () => {
    if (pipWindow) {
      if (!pipWindow.closed) {
        pipWindow.close()
      }
      setPipWindow(null)
    } else {
      openPipWindow().then((pipWindow) => {
        pipWindow.addEventListener('unload', () => setPipWindow(null))
        setPipWindow(pipWindow)
      })
    }
  }

  const onClickSettingsButton = () => {
    setSettingsVisible((settingsVisible) => !settingsVisible)
  }

  // const channel = React.useRef(new BroadcastChannel('ld-channel'))
  const video = React.useRef<HTMLVideoElement | null>(null)
  const mediaMonitor = React.useRef<MediaMonitor | null>(null)

  const [currentTime, setCurrentTime] = React.useState(0.0)
  const pipVideoRef = React.useRef<HTMLVideoElement | null>(null)

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
      if (video.current && mediaMonitor.current) {
        setCurrentTime(video.current.currentTime)
        // channel.current.postMessage({
        //   type: 'update-instant',
        //   currentTime: video.current.currentTime,
        //   frequencyData: mediaMonitor.current.getByteFrequencyData(),
        // })
      }
    }, 1000 / 30)
    return () => {
      clearInterval(interval)
    }
  }, [])

  React.useEffect(() => {
    chrome.runtime.sendMessage('get/streamId', ({ streamId }) => {

      // navigator.mediaDevices.getUserMedia({
      //   video: {
      //     mandatory: {
      //       chromeMediaSource: 'tab',
      //       chromeMediaSourceId: streamId,
      //     },
      //   } as any,
      // })

      navigator.mediaDevices.getDisplayMedia({
        preferCurrentTab: true
      })

      .then(async (stream) => {
        console.log('stream:', stream)
        const track = stream.getVideoTracks()[0]
        const captureTarget = document.getElementsByClassName(pipStyles.pip)[0]
        const restrictionTarget = await RestrictionTarget.fromElement(captureTarget)
        console.log('track:', track)
        track.restrictTo(restrictionTarget)

        pipVideoRef.current!.srcObject = stream
        await pipVideoRef.current!.play()
      })
    })
  }, [])

  return (
    <div className={styles.app}>
      <div
        className={absPos.xReverse
          ? (absPos.yReverse ? styles.contentSE : styles.contentNE)
          : (absPos.yReverse ? styles.contentSW : styles.contentNW)
        }
        style={{
          '--xBuff': `${absPos.xBuff}px`,
          '--yBuff': `${absPos.yBuff}px`,
        } as React.CSSProperties}
      >
        <Panel
          ref={panelRef}
          toggleButtonActive={pipWindow !== null}
          onMouseDownDrag={onMouseDownDrag}
          onClickToggleButton={onClickToggleButton}
          onClickSettingsButton={onClickSettingsButton}
        />
        <Settings
          settingsVisible={settingsVisible}
        />
        <Pip/>
      </div>
      <video ref={pipVideoRef} style={{
        position: 'absolute',
        top: '200px',
        left: '200px',
        width: '400px',
        height: '300px',
        zIndex: '9999',
        background: 'grey',
      }}/>
    </div>
  )
}
