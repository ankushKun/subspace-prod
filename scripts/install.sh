#!/bin/bash 

git submodule update --init --recursive

rm -rf node_modules

cd ./subspace-sdk && rm -rf dist && npm run build # subspace-sdk directory
cd ../wauth/sdk && rm -rf dist && npm run build # wauth/sdk directory
cd ../strategy && rm -rf dist && npm run build # wauth/strategy directory
cd ../demo && bun install # wauth/demo directory
cd ../backend && bun install # wauth/backend directory
cd .. && bun install # wauth root directory
cd .. && rm -rf node_modules && bun install # main root directory