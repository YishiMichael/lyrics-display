import React from 'react'
import { createRoot } from 'react-dom/client'
import Panel from './Panel.tsx'
import Pip from './Pip.tsx'
import Settings from './Settings.tsx'
import styles from './App.module.css'

declare global {
  interface DocumentPictureInPicture {
    requestWindow: (options?: any) => Promise<Window>
  }

  var documentPictureInPicture: DocumentPictureInPicture
}

async function openPipWindow(onClose: () => void) {
  const win = await documentPictureInPicture.requestWindow({
    width: 600,  // TODO: storage
    height: 300,
  })
  win.addEventListener('unload', onClose)
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

  const isDragging = React.useRef(false)
  const dragInitial = React.useRef<{ absPos: AbsolutePosition, clientX: number, clientY: number } | null>(null)

  const onMouseDown = (event: any) => {
    isDragging.current = false
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
    isDragging.current = true
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
    isDragging.current = false
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

  const handleDrag = (callback: () => Promise<void>) => {
    return async () => {
      if (isDragging.current) {
        return
      }
      await callback()
    }
  }

  return { absPos, ref, handleDrag, onMouseDown }
}

export default function App() {

  // const [isActive, setIsActive] = useState(false)

  // const captureRef = useRef<HTMLDivElement | null>(null)
  // const videoRef = useRef<HTMLVideoElement | null>(null)
  // const [stream, setStream] = useState<MediaStream | null>(null)


  // useEffect(() => {
  //   (async () => {
  //     if (restrictionTarget.current) {
  //       return
  //     }
  //     const captureTarget = document.querySelector('#lyrics-display > div')
  //     restrictionTarget.current = await RestrictionTarget.fromElement(captureTarget)
  //   })()
  // })

  // useEffect(() => {
  //   if (!track.current || !restrictionTarget.current) {
  //       return
  //     }
  //   track.current.restrictTo(isActive && restrictionTarget.current)
  // }, [isActive])



  // useEffect(() => {
  //   startCapture()
  // })

  // 4. Enter Picture-in-Picture
  // const enterPiP = async () => {
  //   const video = videoRef.current;
  //   if (!video) return;

  //   if (document.pictureInPictureElement) {
  //     await document.exitPictureInPicture();
  //     return;
  //   }

  //   await video.requestPictureInPicture();
  // };

  // useEffect(() => {
  //   return (async () => {
  //     const stream = await navigator.mediaDevices.getDisplayMedia()
  //     const [track] = stream.getVideoTracks()
  //     const captureTarget = document.querySelector('#lyrics-display #pip-body')
  //     const restrictionTarget = await RestrictionTarget.fromElement(captureTarget)
  //     await track.restrictTo(restrictionTarget)

  //     return () => {
  //       (async () => {
  //         await track.restrictTo(null)
  //       })()
  //     }
  //   })()
  // })

  // useEffect(() => {
  //   (async () => {
  //     if (track.current) {
  //       return
  //     }
  //     const { streamId } = await chrome.runtime.sendMessage({
  //       type: 'GET_STREAM_ID',
  //     })
  //     console.log('streamId:', streamId)
  //     const stream = await navigator.mediaDevices.getUserMedia({
  //       video: {
  //         mandatory: {
  //           chromeMediaSource: 'tab',
  //           chromeMediaSourceId: streamId,
  //         },
  //       } as any,
  //     })
  //     track.current = stream.getVideoTracks()[0]
  //     const captureTarget = document.querySelector('#lyrics-display > div')
  //     const restrictionTarget = await RestrictionTarget.fromElement(captureTarget)
  //     console.log('track:', track.current)
  //     track.current.restrictTo(restrictionTarget)
  //     // await track.current.restrictTo(null)
  //   })()
  // })


  const {
    absPos,
    ref: panelRef,
    handleDrag,
    onMouseDown: onMouseDownDrag,
  } = useDraggableElement<HTMLDivElement>({
    xBuff: 100,
    yBuff: 100,
    xReverse: false,
    yReverse: false,
  })  // TODO: storage

  const [pipWindow, setPipWindow] = React.useState<Window | null>(null)
  const [settingsHidden, setSettingsHidden] = React.useState(true)

  const onMouseUpToggleButton = handleDrag(async () => {
    if (pipWindow) {
      if (!pipWindow.closed) {
        pipWindow.close()
      }
      setPipWindow(null)
    } else {
      setPipWindow(await openPipWindow(() => {
        setPipWindow(null)
      }))
    }
  })

  const onMouseUpSettingsButton = handleDrag(async () => {
    setSettingsHidden((settingsHidden) => !settingsHidden)
  })

  return (
    <div className={styles.root}>
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
          onMouseDown={onMouseDownDrag}
          onMouseUpToggleButton={onMouseUpToggleButton}
          onMouseUpSettingsButton={onMouseUpSettingsButton}
        />
        <Settings
          settingsHidden={settingsHidden}
        />
      </div>
    </div>
  )
}
