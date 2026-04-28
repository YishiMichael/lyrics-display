import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import styles from './Panel.module.css'

interface Attrs {
  ref: React.RefObject<HTMLDivElement | null>
  translate: { x: number, y: number }
  onMouseDown: (event: React.MouseEvent) => void
  onMouseUpToggleButton: () => void
  onMouseUpSettingsButton: () => void
  // isSettingsVisible: boolean
  // setIsSettingsVisible: React.Dispatch<React.SetStateAction<boolean>>
}

export default function Panel(attrs: Attrs) {
  return (
    <div
      ref={attrs.ref}
      className={styles.panel}
      onMouseDown={attrs.onMouseDown}
      style={{
        '--translateX': `${attrs.translate.x}px`,
        '--translateY': `${attrs.translate.y}px`,
      } as React.CSSProperties}
    >
      <div
        className={styles.toggleButton}
        onMouseUp={attrs.onMouseUpToggleButton}
      >
        <FontAwesomeIcon icon={['fas', 'music']} size='xl'/>
      </div>
      <div
        className={styles.settingsButton}
        onMouseUp={attrs.onMouseUpSettingsButton}
      >
        <FontAwesomeIcon icon={['fas', 'gear']} size='xl'/>
      </div>
      <div
        className={styles.panelDrag}
      >
        <FontAwesomeIcon icon={['fas', 'grip-vertical']}/>
      </div>
    </div>
  )
}
