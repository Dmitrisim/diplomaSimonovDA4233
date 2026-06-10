import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import artfulLogoUrl from './assets/artful-logo.svg'
import './index.css'
import App from './App.tsx'

const favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']")

if (favicon) {
  favicon.href = artfulLogoUrl
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
