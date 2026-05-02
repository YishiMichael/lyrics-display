import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import styles from './Panel.module.css'

interface Props {
  ref: React.RefObject<HTMLDivElement | null>
  pipVisible: boolean
  onMouseDownDrag: (event: React.MouseEvent) => void
  onClickPipButton: () => void
  onClickSettingsButton: () => void
}

export default function Panel(props: Props) {
  return (
    <div
      ref={props.ref}
      className={styles.panel}
    >
      <div
        className={props.pipVisible ? styles.pipButtonActive : styles.pipButton}
        onClick={props.onClickPipButton}
      >
        <FontAwesomeIcon icon={['fas', 'music']} size='xl'/>
      </div>
      <div
        className={styles.settingsButton}
        onClick={props.onClickSettingsButton}
      >
        <FontAwesomeIcon icon={['fas', 'gear']} size='xl'/>
      </div>
      <div
        className={styles.panelDrag}
        onMouseDown={props.onMouseDownDrag}
      >
        <FontAwesomeIcon icon={['fas', 'grip-vertical']}/>
      </div>
    </div>
  )
}
