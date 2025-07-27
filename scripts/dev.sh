#!/bin/bash

# Run all development servers concurrently with named prefixes
concurrently \
  --names "wauth,subspace-sdk,webapp" \
  --prefix-colors "blue,green,yellow" \
  "cd wauth && bun run dev" \
  "cd subspace-sdk && npm run dev" \
  "vite"
