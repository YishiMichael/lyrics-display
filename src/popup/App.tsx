// import crxLogo from '@/assets/crx.svg'
// import reactLogo from '@/assets/react.svg'
// import viteLogo from '@/assets/vite.svg'
// import HelloWorld from '@/components/HelloWorld'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'
import './App.css'

// import { library } from '@fortawesome/fontawesome-svg-core'
// import { fas } from '@fortawesome/free-solid-svg-icons'
// import { far } from '@fortawesome/free-regular-svg-icons'
// import { fab } from '@fortawesome/free-brands-svg-icons'
// library.add(fas, far, fab)
// import { faPowerOff } from '@fortawesome/free-solid-svg-icons'

export default function App() {
  // useEffect(() => {
  //   chrome.runtime.sendMessage({
  //     type: "get/pip-tab",
  //   })
  // })

  const [isActive, setIsActive] = useState(false)

  const onClick = () => {
    setIsActive(!isActive)
    chrome.runtime.sendMessage({
      type: 'action/power',
      isActive,
    })
  }

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
