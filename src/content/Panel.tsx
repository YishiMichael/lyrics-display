import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import styles from './Panel.module.css'

interface Attrs {
  ref: React.RefObject<HTMLDivElement | null>
  toggleButtonActive: boolean
  onMouseDown: (event: React.MouseEvent) => void
  onMouseUpToggleButton: () => void
  onMouseUpSettingsButton: () => void
}

export default function Panel(attrs: Attrs) {
  return (
    <div
      ref={attrs.ref}
      className={styles.panel}
      onMouseDown={attrs.onMouseDown}
    >
      <div
        className={attrs.toggleButtonActive ? styles.toggleButtonActive : styles.toggleButton}
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
