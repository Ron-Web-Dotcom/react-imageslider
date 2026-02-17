import React from "react"
import ReactDOM from "react-dom/client"
import { BlinkProvider, BlinkAuthProvider } from "@blinkdotnew/react"
import App from "./App"
import "./index.css"

function getProjectId(): string {
  const envId = import.meta.env.VITE_BLINK_PROJECT_ID
  if (envId) return envId
  const hostname = window.location.hostname
  const match = hostname.match(/^([^.]+)\.sites\.blink\.new$/)
  return match ? match[1] : 'image-slider-app-plfrmbrt'
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BlinkProvider projectId={getProjectId()} publishableKey={import.meta.env.VITE_BLINK_PUBLISHABLE_KEY}>
      <BlinkAuthProvider>
        <App />
      </BlinkAuthProvider>
    </BlinkProvider>
  </React.StrictMode>
)
