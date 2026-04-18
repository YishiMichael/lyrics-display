import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import PipApp from '../pip/App.tsx'
import './App.css'

declare global {
  interface DocumentPictureInPicture {
    requestWindow: (options?: any) => Promise<Window>
  }

  var documentPictureInPicture: DocumentPictureInPicture
}

export default function App() {
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
    <button
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
        const container = pipWindow!.document.createElement('div')
        container.id = 'lyrics-display-pip'
        document.body.appendChild(container)
        createRoot(container).render(
          <StrictMode>
            <PipApp />
          </StrictMode>,
        )
      }}
    />
  )
}
