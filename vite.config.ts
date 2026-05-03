import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

const repositoryParts = process.env.GITHUB_REPOSITORY?.split("/")
const repoName = repositoryParts?.length === 2 ? repositoryParts[1] : undefined
const base = process.env.GITHUB_ACTIONS === "true" && repoName ? `/${repoName}/` : "/"

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
})
