import React from 'react'
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


  const windowSize = useWindowSize()
  const [panelSize, panelRef] = useElementSize<HTMLDivElement>()

  const [panelAbsPos, setPanelAbsPos] = React.useState<AbsolutePosition>({
    xBuff: 100,
    yBuff: 100,
    xReverse: false,
    yReverse: false,
  })

  const updatePanelAbsPos = (
    panelAbsPos: AbsolutePosition,
    windowSize: { width: number, height: number },
    panelSize: { width: number, height: number },
  ) => {
    const width = Math.max(windowSize.width - panelSize.width, 0)
    const height = Math.max(windowSize.height - panelSize.height, 0)
    const xBuff = Math.min(Math.max(panelAbsPos.xBuff, 0), width)
    const yBuff = Math.min(Math.max(panelAbsPos.yBuff, 0), height)
    const xRevert = 2 * xBuff > width
    const yRevert = 2 * yBuff > height
    setPanelAbsPos({
      xBuff: xRevert ? width - xBuff : xBuff,
      yBuff: yRevert ? height - yBuff : yBuff,
      xReverse: panelAbsPos.xReverse !== xRevert,
      yReverse: panelAbsPos.yReverse !== yRevert,
    })
  }

  React.useEffect(() => {
    updatePanelAbsPos(panelAbsPos, windowSize, panelSize)
  }, [windowSize, panelSize])

  const isDragging = React.useRef(false)
  const dragInitial = React.useRef<{ panelAbsPos: AbsolutePosition, clientX: number, clientY: number } | null>(null)

  const onMouseDown = (event: any) => {
    isDragging.current = false
    dragInitial.current = {
      panelAbsPos,
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
    const panelAbsPos = dragInitial.current.panelAbsPos
    updatePanelAbsPos({
      xBuff: panelAbsPos.xReverse ? panelAbsPos.xBuff - clientDiff.x : panelAbsPos.xBuff + clientDiff.x,
      yBuff: panelAbsPos.yReverse ? panelAbsPos.yBuff - clientDiff.y : panelAbsPos.yBuff + clientDiff.y,
      xReverse: panelAbsPos.xReverse,
      yReverse: panelAbsPos.yReverse,
    }, windowSize, panelSize)
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
  }, [windowSize, panelSize])

  const [toggleButtonActive, setToggleButtonActive] = React.useState(false)
  const [settingsHidden, setSettingsHidden] = React.useState(true)

  const onMouseUpToggleButton = () => {
    if (isDragging.current) {
      return
    }
    setToggleButtonActive((toggleButtonActive) => !toggleButtonActive)
  }

  const onMouseUpSettingsButton = () => {
    if (isDragging.current) {
      return
    }
    setSettingsHidden((settingsHidden) => !settingsHidden)
  }

  return (
    <div className={styles.root}>
      <div
        className={panelAbsPos.xReverse
          ? (panelAbsPos.yReverse ? styles.contentSE : styles.contentNE)
          : (panelAbsPos.yReverse ? styles.contentSW : styles.contentNW)
        }
        style={{
          '--xBuff': `${panelAbsPos.xBuff}px`,
          '--yBuff': `${panelAbsPos.yBuff}px`,
        } as React.CSSProperties}
      >
        <Panel
          ref={panelRef}
          toggleButtonActive={toggleButtonActive}
          onMouseDown={onMouseDown}
          onMouseUpToggleButton={onMouseUpToggleButton}
          onMouseUpSettingsButton={onMouseUpSettingsButton}
        />
        <Settings
          settingsHidden={settingsHidden}
        />
      </div>
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
