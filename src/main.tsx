import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { seedDemoData } from "@/lib/seedDemo";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.DEV && window.location.search.includes("seed=1")) {
  seedDemoData().then(() => {
    console.log("✅ Seed listo");
    window.location.href = "/";
  });
}
