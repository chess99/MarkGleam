import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'katex/dist/katex.min.css'
import App from './App'
import { scheduleAnalytics } from './lib/analytics'
import './styles.css'

const root = document.getElementById('root')!
root.replaceChildren()

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

scheduleAnalytics()
