import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useRef, useState } from 'react'
import Pip from './Pip.tsx'
// import Icon from '@/assets/bootstrap/music-note-list.svg?react'
import './App.css'

// declare global {
//   interface DocumentPictureInPicture {
//     requestWindow: (options?: any) => Promise<Window>
//   }

//   var documentPictureInPicture: DocumentPictureInPicture
// }

interface Position {
  x: number
  y: number
}

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

export default function App() {
  const [translate, setTranslate] = useState<Position>({ x: 0, y: 0 })
  const translateOffset = useRef<Position | null>(null)
  const isDragging = useRef(false)

  const [isActive, setIsActive] = useState(false)
  const [pipWindow, setPipWindow] = useState<Window | null>(null)

  // const captureRef = useRef<HTMLDivElement | null>(null)
  // const videoRef = useRef<HTMLVideoElement | null>(null)
  // const [stream, setStream] = useState<MediaStream | null>(null)

  const onMouseDown = (event: any) => {
    translateOffset.current = {
      x: translate.x - event.clientX,
      y: translate.y - event.clientY,
    }
    isDragging.current = false
  }

  const onMouseMove = (event: any) => {
    if (translateOffset.current === null) {
      return
    }
    setTranslate({
      x: event.clientX + translateOffset.current.x,
      y: event.clientY + translateOffset.current.y,
    })
    isDragging.current = true
  }

  const onMouseUp = async () => {
    if (translateOffset.current === null) {
      return
    }
    translateOffset.current = null
    if (isDragging.current) {
      return
    }

    if (!pipWindow) {
      const newPipWindow = await openPipWindow()
      setPipWindow(newPipWindow)
      newPipWindow.addEventListener('pagehide', () => {
        setPipWindow(null)
      })
    } else {
      pipWindow.close()
      setPipWindow(null)
    }
  }

  // useEffect(() => {
  //   (async () => {
  //     if (restrictionTarget.current) {
  //       return
  //     }
  //     const captureTarget = document.querySelector("#lyrics-display > div")
  //     restrictionTarget.current = await RestrictionTarget.fromElement(captureTarget)
  //   })()
  // })

  // useEffect(() => {
  //   if (!track.current || !restrictionTarget.current) {
  //       return
  //     }
  //   track.current.restrictTo(isActive ? restrictionTarget.current : null)
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
  //     const captureTarget = document.querySelector("#lyrics-display #pip-body")
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
  //       type: "GET_STREAM_ID",
  //     })
  //     console.log("streamId:", streamId)
  //     const stream = await navigator.mediaDevices.getUserMedia({
  //       video: {
  //         mandatory: {
  //           chromeMediaSource: "tab",
  //           chromeMediaSourceId: streamId,
  //         },
  //       } as any,
  //     })
  //     track.current = stream.getVideoTracks()[0]
  //     const captureTarget = document.querySelector("#lyrics-display > div")
  //     const restrictionTarget = await RestrictionTarget.fromElement(captureTarget)
  //     console.log("track:", track.current)
  //     track.current.restrictTo(restrictionTarget)
  //     // await track.current.restrictTo(null)
  //   })()
  // })

  return (
    <>
      <button
        id='lyrics-display-toggle-button'
        style={{
          '--translateX': `${translate.x}px`,
          '--translateY': `${translate.y}px`,
        } as React.CSSProperties}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        <FontAwesomeIcon icon={['fas', 'music']}/>
      </button>

      <div id='lyrics-display-controls'>
        <Controls/>
      </div>

      <div id='lyrics-display-pip'>
        <Pip/>
      </div>

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
    </>
  )
}
