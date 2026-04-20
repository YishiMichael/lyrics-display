import { StrictMode, useEffect, useRef, useState } from 'react'
// import { createRoot } from 'react-dom/client'
import PipApp from '../pip/App.tsx'
import Icon from '@/assets/bootstrap/music-note-list.svg?react'
import './App.css'
import { createRoot } from 'react-dom/client'
import { StyleSheetManager } from 'styled-components'

declare global {
  interface DocumentPictureInPicture {
    requestWindow: (options?: any) => Promise<Window>
  }

  var documentPictureInPicture: DocumentPictureInPicture
}

interface Position {
  x: number
  y: number
}

async function openPipWindow() {
  const win = await documentPictureInPicture.requestWindow({
    width: 600,  // TODO: storage
    height: 300,
  })
  createRoot(win.document.body).render(
    <StrictMode>
      <StyleSheetManager target={win.document.head}>
        <PipApp />
      </StyleSheetManager>
    </StrictMode>,
  )
  return win
}

export default function App() {
  const [translate, setTranslate] = useState<Position>({ x: 0, y: 0 })
  const translateOffset = useRef<Position | null>(null)
  const isDragging = useRef(false)
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

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  })

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

  return (
    <button
      id='lyrics-display'
      style={{
        '--translateX': `${translate.x}px`,
        '--translateY': `${translate.y}px`,
      } as React.CSSProperties}
      onMouseDown={onMouseDown}
    >
      <Icon />
    </button>
  )
}
