import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Settings from './Settings'
import './Panel.css'

interface Position {
  x: number
  y: number
}

// interface PanelAttrs {
//   isSettingsVisible: boolean
//   setIsSettingsVisible: React.Dispatch<React.SetStateAction<boolean>>
// }

export default function Panel() {
  // const onClickToggle
  const [isSettingsVisible, setIsSettingsVisible] = React.useState(false)

  const translateOffset = React.useRef<Position | null>(null)
  const [translate, setTranslate] = React.useState<Position>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = React.useState(false)

  const onMouseDown = (event: any) => {
    setIsDragging(false)
    translateOffset.current = {
      x: translate.x - event.clientX,
      y: translate.y - event.clientY,
    }
  }

  const onMouseMove = (event: any) => {
    if (translateOffset.current === null) {
      return
    }
    setIsDragging(true)
    setTranslate({
      x: event.clientX + translateOffset.current.x,
      y: event.clientY + translateOffset.current.y,
    })
  }

  const onMouseUp = async () => {
    setIsDragging(false)
    translateOffset.current = null
  }

  React.useEffect(() => {
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  })

  const clickSettings = () => {
    if (isDragging) {
      return
    }
    setIsSettingsVisible((visible) => !visible)
  }

  return (
    <div
      className='panel'
      style={{
        '--translateX': `${translate.x}px`,
        '--translateY': `${translate.y}px`,
      } as React.CSSProperties}
    >
      <div
        className={`panel-buttons ${isDragging ? 'dragging' : ''}`}
        onMouseDown={onMouseDown}
      >
        <div
          className='toggle-button'
        >
          <FontAwesomeIcon icon={['fas', 'music']} size='xl'/>
        </div>
        <div
          className='settings-button'
          onMouseUp={clickSettings}
        >
          <FontAwesomeIcon icon={['fas', 'gear']} size='xl'/>
        </div>
        <div
          className='panel-drag'
        >
          <FontAwesomeIcon icon={['fas', 'grip-vertical']}/>
        </div>
      </div>
      {isSettingsVisible && <Settings/>}
    </div>
  )
}
