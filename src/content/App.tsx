import React from 'react'
import Display from './Display.tsx'
import Panel from './Panel.tsx'
import PipVideo from './PipVideo.tsx'
import Settings from './Settings.tsx'
import styles from './App.module.css'

interface AbsolutePosition {
  xBuff: number
  yBuff: number
  xReverse: boolean
  yReverse: boolean
}

function useWindowSize() {
  const getSize = () => {
    return {
      width: Math.trunc(document.documentElement.clientWidth),
      height: Math.trunc(document.documentElement.clientHeight),
    }
  }
  const [size, setSize] = React.useState(getSize)

  React.useEffect(() => {
    const handleResize = () => {
      requestAnimationFrame(() => setSize(getSize()))
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

  return { size, ref }
}

function useDraggableElement<T extends HTMLElement>(initialAbsPos: AbsolutePosition) {
  const windowSize = useWindowSize()
  const { size: elementSize, ref } = useElementSize<T>()

  const [absPos, setAbsPos] = React.useState<AbsolutePosition>(initialAbsPos)

  const updateAbsPos = (
    absPos: AbsolutePosition,
    windowSize: { width: number, height: number },
    elementSize: { width: number, height: number },
  ) => {
    const width = Math.max(windowSize.width - elementSize.width, 0)
    const height = Math.max(windowSize.height - elementSize.height, 0)
    const xBuff = Math.min(Math.max(absPos.xBuff, 0), width)
    const yBuff = Math.min(Math.max(absPos.yBuff, 0), height)
    const xRevert = 2 * xBuff > width
    const yRevert = 2 * yBuff > height
    setAbsPos({
      xBuff: xRevert ? width - xBuff : xBuff,
      yBuff: yRevert ? height - yBuff : yBuff,
      xReverse: absPos.xReverse !== xRevert,
      yReverse: absPos.yReverse !== yRevert,
    })
  }

  React.useEffect(() => {
    updateAbsPos(absPos, windowSize, elementSize)
  }, [windowSize, elementSize])

  const dragInitial = React.useRef<{ absPos: AbsolutePosition, clientX: number, clientY: number } | null>(null)

  const onMouseDownDrag = (event: React.MouseEvent) => {
    dragInitial.current = {
      absPos,
      clientX: event.clientX,
      clientY: event.clientY,
    }
  }

  const onMouseMove = (event: MouseEvent) => {
    if (dragInitial.current === null) {
      return
    }
    const clientDiff = {
      x: event.clientX - dragInitial.current.clientX,
      y: event.clientY - dragInitial.current.clientY,
    }
    const absPos = dragInitial.current.absPos
    updateAbsPos({
      xBuff: absPos.xReverse ? absPos.xBuff - clientDiff.x : absPos.xBuff + clientDiff.x,
      yBuff: absPos.yReverse ? absPos.yBuff - clientDiff.y : absPos.yBuff + clientDiff.y,
      xReverse: absPos.xReverse,
      yReverse: absPos.yReverse,
    }, windowSize, elementSize)
  }

  const onMouseUp = () => {
    dragInitial.current = null
  }

  React.useEffect(() => {
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [windowSize, elementSize])

  return { absPos, ref, onMouseDownDrag }
}

function useUrl() {
  const [url, setUrl] = React.useState(() => window.location.href)

  React.useEffect(() => {
    let last = window.location.href

    const observer = new MutationObserver(() => {
      const current = window.location.href
      if (current !== last) {
        last = current
        setUrl(current)
      }
    })
    observer.observe(document, { subtree: true, childList: true })
    return () => {
      observer.disconnect()
    }
  }, [])

  return url
}

export default function App() {
  const url = useUrl()
  const [bvid, setBvid] = React.useState<string | null>(null)
  React.useEffect(() => {
    const urlObject = new URL(url)
    if (urlObject.pathname.startsWith('/video/')) {
      setBvid(urlObject.pathname.split('/')[2] ?? null)
      return
    }
    if (urlObject.pathname.startsWith('/list/')) {
      setBvid(urlObject.searchParams.get('bvid'))
      return
    }
    setBvid(null)
  }, [url])

  const [pipVisible, setPipVisible] = React.useState(false)
  const [settingsVisible, setSettingsVisible] = React.useState(false)
  const [canvas, setCanvas] = React.useState<HTMLCanvasElement | null>(null)

  const draggablePanel = useDraggableElement<HTMLDivElement>({
    xBuff: 100,
    yBuff: 100,
    xReverse: false,
    yReverse: false,
  })  // TODO: storage

  return (
    <div className={bvid ? styles.app : styles.appHidden}>
      <div
        className={draggablePanel.absPos.xReverse
          ? (draggablePanel.absPos.yReverse ? styles.contentSE : styles.contentNE)
          : (draggablePanel.absPos.yReverse ? styles.contentSW : styles.contentNW)
        }
        style={{
          '--xBuff': `${draggablePanel.absPos.xBuff}px`,
          '--yBuff': `${draggablePanel.absPos.yBuff}px`,
        } as React.CSSProperties}
      >
        <Panel
          ref={draggablePanel.ref}
          pipVisible={pipVisible}
          onMouseDownDrag={draggablePanel.onMouseDownDrag}
          onClickPipButton={() => {
            setPipVisible((pipVisible) => !pipVisible)
          }}
          onClickSettingsButton={() => {
            setSettingsVisible((settingsVisible) => !settingsVisible)
          }}
        />
        <Settings
          settingsVisible={settingsVisible}
        />
        <Display
          setCanvas={setCanvas}
          bvid={bvid ?? ''}
        />
        <PipVideo
          canvas={canvas}
          pipVisible={pipVisible}
          setPipVisible={setPipVisible}
        />
      </div>
    </div>
  )
}
