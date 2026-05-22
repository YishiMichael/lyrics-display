import styles from './Settings.module.css'

export default function Settings(props: {
  settingsVisible: boolean
}) {
  return (
    <div className={props.settingsVisible ? styles.settings : styles.settingsHidden}>
      <h1>Lyrics Display</h1>
    </div>
  )
}
