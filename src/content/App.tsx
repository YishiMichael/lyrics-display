import React from 'react'
import Panel from './Panel.tsx'
import Pip from './Pip.tsx'
// import Icon from '@/assets/bootstrap/music-note-list.svg?react'
import './App.css'

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
  //     const captureTarget = document.querySelector("#lyrics-display > div")
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
    <div id='lyrics-display'>
      <Panel/>
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
