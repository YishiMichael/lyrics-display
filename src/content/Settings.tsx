import styles from './Settings.module.css'

interface Attrs {
  settingsVisible: boolean
}

export default function Settings(attrs: Attrs) {
  return (
    <div className={attrs.settingsVisible ? styles.settings : styles.settingsHidden}>
      <h1>Lyrics Display</h1>
    </div>
  )
}
