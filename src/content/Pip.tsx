import React from 'react'
import Konva from 'konva'
import { Layer, Stage } from 'react-konva'

interface Attrs {
  pipVisible: boolean
  setPipVisible: React.Dispatch<React.SetStateAction<boolean>>
  children: React.JSX.Element
}

export default function Pip(attrs: Attrs) {
  const layer = React.useRef<Konva.Layer | null>(null)
  const pipVideo = React.useRef<HTMLVideoElement | null>(null)
  const [size, setSize] = React.useState({ width: 400, height: 300 }) // TODO: Storage

  const open = () => {
    if (!pipVideo.current) {
      return
    }
    pipVideo.current.requestPictureInPicture().then((pipWindow) => {
      setSize({
        width: pipWindow.width,
        height: pipWindow.height,
      })
      pipWindow.addEventListener('resize', () => {
        setSize({
          width: pipWindow.width,
          height: pipWindow.height,
        })
      })
    })
  }

  const close = () => {
    if (!pipVideo.current) {
      return
    }
    if (document.pictureInPictureElement && document.pictureInPictureElement === pipVideo.current) {
      document.exitPictureInPicture()
    }
  }

  React.useEffect(() => {
    if (!layer.current || !pipVideo.current) {
      return
    }
    const stream = layer.current.getNativeCanvasElement().captureStream()
    pipVideo.current.srcObject = stream
    return () => {
      stream.getTracks().forEach((track) => {
        track.stop()
      })
    }
  }, [])

  React.useEffect(() => {
    const handleClose = () => {
      close()
      attrs.setPipVisible(false)
    }

    document.addEventListener('leavepictureinpicture', handleClose)
    return () => {
      document.removeEventListener('leavepictureinpicture', handleClose)
    }
  }, [])

  React.useEffect(() => {
    if (attrs.pipVisible) {
      open()
    } else {
      close()
    }
  }, [attrs.pipVisible])

  return (
    <>
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer ref={layer}>
          {attrs.children}
        </Layer>
      </Stage>
      <video
        ref={pipVideo}
        onLoadedMetadata={(event) => {
          event.currentTarget.play()
        }}
      />
    </>
  )
}
