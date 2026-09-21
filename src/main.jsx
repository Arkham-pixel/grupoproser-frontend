import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './i18n'
import './index.css'

if (import.meta.env.PROD) {
  let recargandoPorSw = false
  const recargarPorSw = () => {
    if (recargandoPorSw) return
    recargandoPorSw = true
    window.location.reload()
  }

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true)
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const chequear = () => {
        registration.update().catch(() => {})
      }
      // Safari en Mac revisa el SW ~cada 24 h si no se fuerza.
      setInterval(chequear, 60 * 1000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') chequear()
      })
      window.addEventListener('focus', chequear)
    },
  })

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', recargarPorSw)
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
