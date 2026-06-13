#!/bin/zsh
# Double-click this file in Finder to start the Mohtasham Carpets website.
export PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH"
cd "$(dirname "$0")"
echo "Starting Mohtasham Carpets website..."
echo "Open http://localhost:3000 in your browser. Press Ctrl+C to stop."
node server.js
