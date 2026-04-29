import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'
import { fab } from '@fortawesome/free-brands-svg-icons'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

library.add(fas, far, fab)

const container = document.createElement('div')
container.id = 'crxjs-app'
document.body.appendChild(container)
createRoot(container).render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>,
)
