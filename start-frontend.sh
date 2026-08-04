#!/bin/bash

# Smart Trader - Frontend Startup Script
# This script starts the Next.js development server

echo "🚀 Starting Smart Trader Frontend..."
echo ""

cd "$(dirname "$0")/frontend"

if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "✨ Starting Next.js dev server on http://localhost:3000"
echo "📱 Open http://localhost:3000 in your browser"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Use bash wrapper for compatibility with zsh shells
bash -c "node_modules/.bin/next dev"
