---
name: Figma Integration
description: Figma MCP server configured via remote HTTP endpoint with OAuth authentication
type: reference
originSessionId: 9180e0b6-82b9-4b84-8797-eeda073d782e
---
Figma MCP uses the official remote server at `https://mcp.figma.com/mcp` (configured in `.mcp.json`).
Authentication is via OAuth (browser-based flow) — no personal access token needed.
The old `@anthropic-ai/figma-mcp` npm package does not exist; never use it.
After adding the server, authenticate via `/mcp` → select figma → Authenticate.
Figma plan note: Starter plan = 6 tool calls/month limit; Dev/Full seats on paid plans have per-minute rate limits.
