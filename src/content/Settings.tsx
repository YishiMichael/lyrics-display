import styles from './Settings.module.css'

interface Attrs {
  isSettingsVisible: boolean
}

export default function Settings(attrs: Attrs) {
  return (
    <div className={`${styles.settings} ${attrs.isSettingsVisible ? '' : 'hidden'}`}>

      <h1>Lyrics Display</h1>

    </div>
  )
}
