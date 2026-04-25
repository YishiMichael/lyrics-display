import './Controls.css'

export default function Controls() {
  return (
    <div className='root'>

      <h1>Lyrics Display</h1>
      <div className='power'>
        <div className={`power-btn ${isActive ? 'active' : ''}`} onClick={onClick}>
          <FontAwesomeIcon icon={['fas', 'power-off']} size='2xl'/>
        </div>
      </div>

      {/*<a href="https://vite.dev" target="_blank" rel="noreferrer">
        <img src={viteLogo} className="logo" alt="Vite logo" />
      </a>
      <a href="https://reactjs.org/" target="_blank" rel="noreferrer">
        <img src={reactLogo} className="logo react" alt="React logo" />
      </a>
      <a href="https://crxjs.dev/vite-plugin" target="_blank" rel="noreferrer">
        <img src={crxLogo} className="logo crx" alt="crx logo" />
      </a>
      <HelloWorld msg="Vite + React + CRXJS" />*/}
    </div>
  )
}
