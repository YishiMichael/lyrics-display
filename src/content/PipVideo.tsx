import React from 'react'

interface Attrs {
  canvas: HTMLCanvasElement | null
  pipVisible: boolean
  setPipVisible: React.Dispatch<React.SetStateAction<boolean>>
}

export default function PipVideo(attrs: Attrs) {
  const ref = React.useRef<HTMLVideoElement | null>(null)

  const open = async () => {
    if (!ref.current) {
      return
    }
    await ref.current.requestPictureInPicture()
  }

  const close = async () => {
    if (!ref.current) {
      return
    }
    if (document.pictureInPictureElement && document.pictureInPictureElement === ref.current) {
      await document.exitPictureInPicture()
    }
  }

  React.useEffect(() => {
    if (!attrs.canvas || !ref.current) {
      return
    }
    const stream = attrs.canvas.captureStream()
    ref.current.srcObject = stream
    return () => {
      stream.getTracks().forEach((track) => {
        track.stop()
      })
    }
  }, [attrs.canvas])

  React.useEffect(() => {
    const handleClose = async () => {
      await close()
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
    <video
      ref={ref}
      onLoadedMetadata={(event) => {
        event.currentTarget.play()
      }}
    />
  )
}
