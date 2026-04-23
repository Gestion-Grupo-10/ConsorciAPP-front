import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { seedDemoData } from "./lib/seedDemo";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (typeof window !== "undefined" && window.location.search.includes("seed=1")) {
  seedDemoData().then(() => {
    console.log("✅ Seed listo");
    // recarga sin query para que dashboard vuelva a pedir datos
    window.location.href = "/";
  });
}
