#!/bin/bash

# Build script for Subspace webapp and all submodules
# This script builds all components in the correct dependency order

set -e  # Exit on any error

echo "🚀 Starting build process for Subspace webapp and submodules..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[BUILD]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to build a component
build_component() {
    local name=$1
    local path=$2
    local build_cmd=$3
    
    print_status "Building $name..."
    
    if [ ! -d "$path" ]; then
        print_error "Directory $path does not exist"
        exit 1
    fi
    
    cd "$path"
    
    # Install dependencies if needed
    if [ -f "package.json" ] || [ -f "package-lock.json" ]; then
        if [ -f "bun.lock" ]; then
            print_status "Installing dependencies for $name using bun..."
            bun install
        else
            print_status "Installing dependencies for $name using npm..."
            npm install
        fi
    fi
    
    # Run build command
    print_status "Running build command for $name: $build_cmd"
    eval "$build_cmd"
    
    print_success "$name built successfully!"
    cd - > /dev/null
}

# Get the script directory to ensure we're working from the right location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

print_status "Building from project root: $PROJECT_ROOT"

# 1. Build subspace-sdk first (webapp depends on it)
build_component "Subspace SDK" "subspace-sdk" "npm run build"

# 2. Build wauth/sdk (wauth/strategy depends on it)
build_component "WAuth SDK" "wauth/sdk" "npm run build"

# 3. Build wauth/strategy (depends on wauth/sdk)
build_component "WAuth Strategy" "wauth/strategy" "npm run build"

# 4. Build wauth/demo (optional but included for completeness)
build_component "WAuth Demo" "wauth/demo" "bun run build"

# 5. Finally build the main webapp
print_status "Building main webapp..."
cd "$PROJECT_ROOT"

# Install dependencies for webapp
print_status "Installing dependencies for webapp..."
if [ -f "bun.lock" ]; then
    bun install
else
    npm install
fi

# Build the webapp
print_status "Building webapp..."
npm run build

print_success "Webapp built successfully!"

print_success "🎉 All components built successfully!"
print_status "Build artifacts are ready in their respective dist/ directories"
print_status "Main webapp build is in ./dist/"
