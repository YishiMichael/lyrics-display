import styles from './Settings.module.css'

interface Props {
  settingsVisible: boolean
}

export default function Settings(props: Props) {
  return (
    <div className={props.settingsVisible ? styles.settings : styles.settingsHidden}>
      <h1>Lyrics Display</h1>
    </div>
  )
}
