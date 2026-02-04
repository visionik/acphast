#!/bin/bash

# Quick start script for Acphast HTTP demo

set -e

echo "🚀 Starting Acphast HTTP Demo"
echo ""

# Check if API key is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "⚠️  ANTHROPIC_API_KEY not set"
  echo "   Set it with: export ANTHROPIC_API_KEY=sk-ant-..."
  echo ""
  echo "   Starting anyway (will work for testing but not real API calls)"
  echo ""
fi

# Build if needed
if [ ! -d "packages/cli/dist" ]; then
  echo "📦 Building project..."
  pnpm -r build
  echo ""
fi

echo "🌐 Starting HTTP server on http://localhost:6809"
echo ""
echo "📝 Open web/chat.html in your browser to chat!"
echo "   or run: open web/chat.html"
echo ""
echo "Press Ctrl+C to stop"
echo ""

TRANSPORT=http pnpm --filter @acphast/cli start
