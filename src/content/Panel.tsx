import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import styles from './Panel.module.css'

interface Attrs {
  ref: React.RefObject<HTMLDivElement | null>
  toggleButtonActive: boolean
  onMouseDownDrag: (event: React.MouseEvent) => void
  onClickToggleButton: () => void
  onClickSettingsButton: () => void
}

export default function Panel(attrs: Attrs) {
  return (
    <div
      ref={attrs.ref}
      className={styles.panel}
    >
      <div
        className={attrs.toggleButtonActive ? styles.toggleButtonActive : styles.toggleButton}
        onClick={attrs.onClickToggleButton}
      >
        <FontAwesomeIcon icon={['fas', 'music']} size='xl'/>
      </div>
      <div
        className={styles.settingsButton}
        onClick={attrs.onClickSettingsButton}
      >
        <FontAwesomeIcon icon={['fas', 'gear']} size='xl'/>
      </div>
      <div
        className={styles.panelDrag}
        onMouseDown={attrs.onMouseDownDrag}
      >
        <FontAwesomeIcon icon={['fas', 'grip-vertical']}/>
      </div>
    </div>
  )
}
