#!/bin/bash 

cd ./subspace-sdk && npm run build && npm install # subspace-sdk directory
cd ../wauth/sdk && npm run build && npm install # wauth/sdk directory
cd ../strategy && npm run build && npm install # wauth/strategy directory
cd ../demo && bun install # wauth/demo directory
cd ../backend && bun install # wauth/backend directory
cd .. && bun install # wauth root directory
cd .. && bun install # main root directory