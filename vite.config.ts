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

// const vitePWA = VitePWA({
//   registerType: "autoUpdate",
//   includeAssets: ['/favicon.ico', '/alien-rounded.svg', '/alien.svg', '/alien-small.svg', '/icon.png', 'notification.wav', '/x_banner.png'],
//   devOptions: {
//     enabled: process.env.NODE_ENV === "development"
//   },
//   workbox: {
//     maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB
//     runtimeCaching: [{ urlPattern: "arweave.net", handler: "CacheFirst" }]
//   },
//   manifest: {
//     name: 'Subspace Chat',
//     short_name: 'Subspace',
//     description: 'Subspace is an intergalactic communication app built on the Permaweb. It allows you to chat in online communities without the fear of censorship.',
//     theme_color: '#17181c',
//     background_color: '#17181c',
//     display: "standalone",
//     orientation: "any",
//     scope: "./",
//     start_url: "/#/app",
//     categories: ["social", "communication"],
//     shortcuts: [
//       {
//         name: "Settings",
//         short_name: "Settings",
//         description: "Subspace settings",
//         url: "/#/app/settings"
//       }
//     ],
//     icons: [
//       {
//         src: './alien-small.svg',
//         sizes: '512x512',
//         type: 'image/svg+xml',
//       },
//       {
//         src: './alien-small.svg',
//         sizes: '192x192',
//         type: 'image/svg+xml',
//       },
//       {
//         src: './alien-small.svg',
//         sizes: '512x512',
//         type: 'image/svg+xml',
//         purpose: 'maskable',
//       }, {
//         src: './alien-small.svg',
//         sizes: '192x192',
//         type: 'image/svg+xml',
//         purpose: 'maskable',
//       }, {
//         src: './alien-small.svg',
//         sizes: '800x800',
//         type: 'image/svg+xml',
//       }
//     ],
//   }
// })

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
  },
})
