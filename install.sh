#!/bin/bash 

cd ./submodules/subspace-sdk && npm install # submodules/subspace-sdk directory
cd ../wauth/sdk && npm install # submodules/wauth/sdk directory
cd ../strategy && npm install # submodules/strategy directory
cd ../backend && bun install # submodules/backend directory
cd .. && bun install # submodules/wauth directory
cd ../.. && bun install # root directory