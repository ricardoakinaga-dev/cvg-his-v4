#!/bin/bash
# Pre-build cleanup using sudo (ubuntu is in sudo group)
# Removes root-owned files that block vite build

if [ -d "dist" ]; then
  # Use sudo to remove all files including root-owned
  sudo rm -rf dist
fi

# Also clean dev-dist if it exists
if [ -d "dev-dist" ]; then
  sudo rm -rf dev-dist
fi

echo "Cleaned dist/ successfully."
