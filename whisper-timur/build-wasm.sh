#!/bin/bash

# Build whisper.wasm using Docker
echo "Building whisper.wasm with Docker..."

echo "remove all js files"
rm -rf ./wasm

# Detect architecture to set the correct Docker platform
ARCH=$(uname -m)
DOCKER_PLATFORM=""

if [ "$ARCH" = "x86_64" ]; then
    DOCKER_PLATFORM="linux/amd64"
elif [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
    DOCKER_PLATFORM="linux/arm64"
else
    echo "Unsupported architecture: $ARCH. Cannot determine Docker platform."
    exit 1
fi

# Build the Docker image
docker build --platform "$DOCKER_PLATFORM" --target export-stage --progress=plain --output type=local,dest=./wasm -t whisper-wasm-builder .

echo "fix worker import path"

for file in ./wasm/*.js; do
  filename=$(basename "$file")
  echo $filename
  node -e "
const fs = require('fs');
const content = fs.readFileSync('$file', 'utf8');
fs.writeFileSync('$file', content.replace(/$filename/g, ''));
"
done

echo "Build complete! WASM files are in ./wasm directory"
