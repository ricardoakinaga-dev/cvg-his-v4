#!/bin/bash
# Pre-build cleanup: ensure dist directory is writable
# Removes root-owned files that block vite build

if [ -d "dist" ]; then
  # Try to remove root-owned files first
  find dist -user root -exec chmod 644 {} \; 2>/dev/null || true
  # Then remove the directory
  rm -rf dist 2>/dev/null || true
fi

# Ensure dist doesn't exist
if [ -d "dist" ]; then
  echo "WARNING: Could not fully clean dist/. Build may fail." >&2
else
  echo "dist/ cleaned successfully."
fi
