import styles from './Settings.module.css'

interface Attrs {
  settingsHidden: boolean
}

export default function Settings(attrs: Attrs) {
  return (
    <div className={attrs.settingsHidden ? styles.settingsHidden : styles.settings}>
      <h1>Lyrics Display</h1>
    </div>
  )
}
