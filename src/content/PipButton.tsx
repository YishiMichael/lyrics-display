import { useState } from 'react'
import { createRoot } from 'react-dom/client';
import PipApp from './PipApp.tsx'
import './PipButton.css'

declare global {
  interface DocumentPictureInPicture {
    requestWindow: (options?: any) => Promise<Window>;
  }

  var documentPictureInPicture: DocumentPictureInPicture;
}

export default function PipButton() {
  const [isClicking, setIsClicking] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)
  const [clientX, setClientX] = useState(0)
  const [clientY, setClientY] = useState(0)
  // const [transformX, setTransformX] = useState(0)
  // const [transformY, setTransformY] = useState(0)
  const [pipWindow, setPipWindow] = useState<Window | null>(null)

  return (
    <div
      style={{
        "--translateX": `${translateX}px`,
        "--translateY": `${translateY}px`,
      } as React.CSSProperties}
      onMouseDown={(event) => {
        setIsClicking(true)
        setClientX(event.clientX)
        setClientY(event.clientY)
      }}
      onMouseMove={(event) => {
        if (!isClicking) {
          return
        }
        setIsDragging(true)
        setTranslateX(translateX + event.clientX - clientX)
        setTranslateY(translateY + event.clientY - clientY)
        setClientX(event.clientX)
        setClientY(event.clientY)
      }}
      onMouseUp={async () => {
        setIsClicking(false)
        if (isDragging) {
          setIsDragging(false)
          return
        }
        if (pipWindow) {
          pipWindow.close()
          setPipWindow(null)
          return
        }
        setPipWindow(await documentPictureInPicture.requestWindow({
          width: 600,  // TODO: storage
          height: 300,
        }))
        pipWindow!.document.addEventListener('pagehide', () => {
          setPipWindow(null)
        })
        createRoot(pipWindow!.document.body).render(PipApp())
      }}
    >词</div>
  )
}
