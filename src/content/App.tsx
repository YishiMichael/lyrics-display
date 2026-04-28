import React, { useEffect } from 'react'
import Panel from './Panel.tsx'
import Pip from './Pip.tsx'
import Settings from './Settings.tsx'
// import Icon from '@/assets/bootstrap/music-note-list.svg?react'
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
//   createRoot(win.document.body).render(
//     <StrictMode>
//       <Pip/>
//     </StrictMode>,
//   )
//   return win
// }

function useWindowSize() {
  const viewport = window.visualViewport!
  const [size, setSize] = React.useState({
    width: viewport.width,
    height: viewport.height,
  })

  React.useEffect(() => {
    const handleResize = () => {
      requestAnimationFrame(() => setSize({
        width: viewport.width,
        height: viewport.height,
      }))
    }

    viewport.addEventListener('resize', handleResize)
    return () => {
      viewport.removeEventListener('resize', handleResize)
    }
  })

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
      width: rect.width,
      height: rect.height,
    })
  }, [])

  return [size, ref] as const
}

export default function App() {

  // const [isActive, setIsActive] = useState(false)
  // const [pipWindow, setPipWindow] = useState<Window | null>(null)

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


  // const ononMouseUpToggle
  const windowSize = useWindowSize()
  const [panelSize, panelRef] = useElementSize<HTMLDivElement>()

  const [panelPosAbs, setPanelPosAbs] = React.useState({ x: 0, y: 0 })
  const [panelPosRel, setPanelPosRel] = React.useState({ x: 0.04, y: 0.1 })

  const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max)

  const setPanelPosByAbs = (
    posAbs: { x: number, y: number },
    windowSize: { width: number, height: number },
    panelSize: { width: number, height: number },
  ) => {
    posAbs.x = clamp(posAbs.x, 0, windowSize.width - panelSize.width)
    posAbs.y = clamp(posAbs.y, 0, windowSize.height - panelSize.height)
    setPanelPosAbs(posAbs)
    setPanelPosRel({
      x: posAbs.x / (windowSize.width - panelSize.width),
      y: posAbs.y / (windowSize.height - panelSize.height),
    })
  }

  const setPanelPosByRel = (
    posRel: { x: number, y: number },
    windowSize: { width: number, height: number },
    panelSize: { width: number, height: number },
  ) => {
    setPanelPosByAbs({
      x: Math.trunc(posRel.x * (windowSize.width - panelSize.width)),
      y: Math.trunc(posRel.y * (windowSize.height - panelSize.height)),
    }, windowSize, panelSize)
  }

  useEffect(() => {
    setPanelPosByRel(panelPosRel, windowSize, panelSize)
  }, [windowSize, panelSize])

  const isDragging = React.useRef(false)
  const dragOffset = React.useRef<{ x: number, y: number } | null>(null)
  // const [translate, setTranslate] = React.useState({ x: 0, y: 0 })

  const onMouseDown = (event: any) => {
    isDragging.current = false
    dragOffset.current = {
      x: panelPosAbs.x - event.clientX,
      y: panelPosAbs.y - event.clientY,
    }
  }

  const onMouseMove = (event: any) => {
    if (dragOffset.current === null) {
      return
    }
    isDragging.current = true
    setPanelPosByAbs({
      x: event.clientX + dragOffset.current.x,
      y: event.clientY + dragOffset.current.y,
    }, windowSize, panelSize)
  }

  const onMouseUp = () => {
    isDragging.current = false
    dragOffset.current = null
  }

  React.useEffect(() => {
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  })

  const onMouseUpToggleButton = () => {
    if (isDragging.current) {
      return
    }

  }

  const onMouseUpSettingsButton = () => {
    if (isDragging.current) {
      return
    }
    setIsSettingsVisible((visible) => !visible)
  }

  const [isSettingsVisible, setIsSettingsVisible] = React.useState(false)

  return (
    <div className={styles.root}>
      <Panel
        ref={panelRef}
        translate={panelPosAbs}
        onMouseDown={onMouseDown}
        onMouseUpToggleButton={onMouseUpToggleButton}
        onMouseUpSettingsButton={onMouseUpSettingsButton}
      />
      <Settings
        isSettingsVisible={isSettingsVisible}
      />
      <Pip/>

      {/*<video
        style={{
          position: 'absolute',
          top: '200px',
          left: '200px',
          width: '800px',
          height: '600px',
          zIndex: '999',
          backgroundColor: 'lightcyan'
        }}
      ></video>*/}
    </div>
  )
}
