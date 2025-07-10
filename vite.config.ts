import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from "fs"
import { execSync } from "child_process"
import { nodePolyfills } from 'vite-plugin-node-polyfills'



const commitHash = execSync("git rev-parse --short HEAD").toString().trim()
const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf-8"));


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "./",
  define: {
    __VERSION__: JSON.stringify(packageJson.version),
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    }
  }
})
