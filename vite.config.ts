import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1]
const base = process.env.GITHUB_ACTIONS === "true" && repoName ? `/${repoName}/` : "/"

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
