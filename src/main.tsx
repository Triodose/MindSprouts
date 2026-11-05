import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from './context/I18nContext'

async function start() {
  if (import.meta.env.DEV && new URLSearchParams(location.search).get('preview') === 'focus') {
    const { installFocusPreview } = await import('./dev/focusPreview');
    installFocusPreview();
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode><I18nProvider><App /></I18nProvider></StrictMode>,
  )
}
void start();
