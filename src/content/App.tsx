import React from 'react'
import Display from './Display.tsx'
import Panel from './Panel.tsx'
import Pip from './Pip.tsx'
import Settings from './Settings.tsx'
import styles from './App.module.css'

// declare global {
//   interface DocumentPictureInPicture {
//     requestWindow: (options?: any) => Promise<Window>
//   }

//   var documentPictureInPicture: DocumentPictureInPicture
// }

// async function openPipWindow() {
//   const win = await documentPictureInPicture.requestWindow({
//     width: 600,  // TODO: storage
//     height: 300,
//   })
//   win.document.head.append(
//     ...Array.from(
//       document.querySelectorAll(`style[type='text/css'][data-vite-dev-id]`)
//     ).map((child) => child.cloneNode(true))
//   )
//   createRoot(win.document.body).render(
//     <React.StrictMode>
//       <Pip/>
//     </React.StrictMode>,
//   )
//   return win
// }

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

  const onMouseDownDrag = (event: React.MouseEvent) => {
    dragInitial.current = {
      absPos,
      clientX: event.clientX,
      clientY: event.clientY,
    }
  }

  const onMouseMove = (event: MouseEvent) => {
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

  return { absPos, ref, onMouseDownDrag }
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
  const [pipVisible, setPipVisible] = React.useState(false)
  const [settingsVisible, setSettingsVisible] = React.useState(false)

  // const pipVideoRef = React.useRef<HTMLVideoElement | null>(null)
  // const pipWindowRef = React.useRef<PictureInPictureWindow | null>(null)

  const draggablePanel = useDraggableElement<HTMLDivElement>({
    xBuff: 100,
    yBuff: 100,
    xReverse: false,
    yReverse: false,
  })  // TODO: storage

  // const onClickToggleButton = () => {
  //   if (pipWindowRef.current) {
  //     // if (!pipWindowRef.current.closed) {
  //     //   pipWindowRef.current.close()
  //     // }
  //     pipWindowRef.current = null
  //   } else {
  //     if (pipVideoRef.current) {
  //       pipVideoRef.current.requestPictureInPicture().then(((pipWindow) => {
  //         pipWindow.addEventListener('unload', () => {
  //           pipWindowRef.current = null
  //         })
  //         pipWindowRef.current = pipWindow
  //       }))
  //     }
  //   }
  // }

  // React.useEffect(() => {
  //   if (pipVisible) {
  //     pipVideoRef.current
  //   }
  // }, [pipVisible])

  // const channel = React.useRef(new BroadcastChannel('ld-channel'))
  const video = React.useRef<HTMLVideoElement | null>(null)
  const mediaMonitor = React.useRef<MediaMonitor | null>(null)

  const [currentTime, setCurrentTime] = React.useState(0.0)
  // const layerRef = React.useRef<Konva.Layer | null>(null)

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

  // const stream = React.useRef<MediaStream | null>(null)
  // React.useEffect(() => {
  //   if (pipVideoRef.current && layerRef.current && !stream.current) {
  //     const canvas = layerRef.current.getNativeCanvasElement()
  //     stream.current = canvas.captureStream()
  //     pipVideoRef.current.srcObject = stream.current
  //     pipVideoRef.current.play()
  //   }
  // }, [])

  return (
    <div className={styles.app}>
      <div
        className={draggablePanel.absPos.xReverse
          ? (draggablePanel.absPos.yReverse ? styles.contentSE : styles.contentNE)
          : (draggablePanel.absPos.yReverse ? styles.contentSW : styles.contentNW)
        }
        style={{
          '--xBuff': `${draggablePanel.absPos.xBuff}px`,
          '--yBuff': `${draggablePanel.absPos.yBuff}px`,
        } as React.CSSProperties}
      >
        <Panel
          ref={draggablePanel.ref}
          pipVisible={pipVisible}
          onMouseDownDrag={draggablePanel.onMouseDownDrag}
          onClickPipButton={() => {
            setPipVisible((pipVisible) => !pipVisible)
          }}
          onClickSettingsButton={() => {
            setSettingsVisible((settingsVisible) => !settingsVisible)
          }}
        />
        <Settings
          settingsVisible={settingsVisible}
        />
      </div>
      <Pip
        pipVisible={pipVisible}
        setPipVisible={setPipVisible}
      >
        <Display
          currentTime={currentTime}
        />
      </Pip>
    </div>
  )
}
