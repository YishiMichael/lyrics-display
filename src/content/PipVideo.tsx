import React from 'react'

interface Props {
  canvas: HTMLCanvasElement | null
  pipVisible: boolean
  setPipVisible: React.Dispatch<React.SetStateAction<boolean>>
}

export default function PipVideo(props: Props) {
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
    const handleClose = async () => {
      await close()
      props.setPipVisible(false)
    }

    document.addEventListener('leavepictureinpicture', handleClose)
    return () => {
      document.removeEventListener('leavepictureinpicture', handleClose)
    }
  }, [])

  React.useEffect(() => {
    if (props.pipVisible) {
      open()
    } else {
      close()
    }
  }, [props.pipVisible])

  React.useEffect(() => {
    if (!props.canvas || !ref.current) {
      return
    }
    const stream = props.canvas.captureStream()
    ref.current.srcObject = stream
    return () => {
      stream.getTracks().forEach((track) => {
        track.stop()
      })
    }
  }, [props.canvas])

  return (
    <video
      ref={ref}
      onLoadedMetadata={(event) => {
        event.currentTarget.play()
      }}
    />
  )
}
