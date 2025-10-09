import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from "fs"
import { execSync } from "child_process"
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import opengraph from "vite-plugin-open-graph"



const commitHash = execSync("git rev-parse --short HEAD").toString().trim()
const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf-8"));

// SDK version and commit hash
const sdkPackageJson = JSON.parse(fs.readFileSync("./subspace-sdk/package.json", "utf-8"));
const sdkCommitHash = execSync("cd subspace-sdk && git rev-parse --short HEAD").toString().trim()


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills(),
    opengraph({
      basic: {
        title: "Subspace",
        type: "website",
        image: "https://subspace.ar.io/x_banner.png",
        url: "https://subspace.ar.io",
        description: "Subspace is a communication app built on a permanent, censorship resistant and open network. It allows you to chat in online communities without the fear of censorship.",
        siteName: "Subspace",
      },
      twitter: {
        card: "summary_large_image",
        image: "https://subspace.ar.io/x_banner.png",
        imageAlt: "Subspace Communicator",
        title: "Subspace",
        description: "Subspace is a communication app built on a permanent, censorship resistant and open network. It allows you to chat in online communities without the fear of censorship.",
      }
    }),
    // process.env.NODE_ENV === "development" ? null : vitePWA
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@subspace-protocol/sdk/permissions": path.resolve(__dirname, "./subspace-sdk/src/utils/permissions"),
      "@subspace-protocol/sdk/types": path.resolve(__dirname, "./subspace-sdk/src/types/index.ts"),
      "@subspace-protocol/sdk": path.resolve(__dirname, "./subspace-sdk/src/index.ts"),
    },
  },
  base: "./",
  define: {
    __VERSION__: JSON.stringify(packageJson.version),
    __COMMIT_HASH__: JSON.stringify(commitHash),
    __SDK_VERSION__: JSON.stringify(sdkPackageJson.version),
    __SDK_COMMIT_HASH__: JSON.stringify(sdkCommitHash),
  },
})
