# Monarch Traffic Recorder

A Chrome DevTools extension that records Monarch Money's GraphQL requests and responses for analysis.

## Features

- **DevTools Integration**: Lives entirely within Chrome DevTools
- **GraphQL Focus**: Automatically filters and captures only GraphQL requests
- **Complete Data Capture**: Records URL, method, headers, request body, response status, headers, body, and timing
- **JSON Export**: Download all captured data as a single JSON file
- **Minimal & Fast**: Vanilla JavaScript with no external dependencies

## Installation

1. **Open Chrome** and navigate to `chrome://extensions/`
2. **Enable Developer mode** (toggle in top right)
3. **Click "Load unpacked"** and select this directory
4. **Verify installation** - you should see "Monarch Money Traffic Recorder" in your extensions list

## Usage

1. **Navigate to Monarch Money**: Open https://app.monarchmoney.com
2. **Open DevTools**: Press `F12` or right-click → "Inspect"
3. **Find the "Monarch Traffic" tab** in DevTools (alongside Console, Network, etc.)
4. **Click "Start"** to begin recording
5. **Use Monarch Money normally** - GraphQL requests will be captured automatically
6. **Click "Stop"** when done recording
7. **Click "Download JSON"** to save all captured requests

## File Structure

```
traffic-recorder-extension/
├── manifest.json          # Extension configuration
├── devtools.html          # DevTools page entry point
├── devtools.js            # Panel registration logic
├── panel/
│   ├── panel.html         # Main UI interface
│   └── panel.js           # Core recording functionality
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

## Output Format

The exported JSON file contains an array of request objects:

```json
[
  {
    "url": "https://app.monarchmoney.com/graphql",
    "method": "POST",
    "requestHeaders": [...],
    "requestBody": "{\"query\":\"...\",\"variables\":{...}}",
    "status": 200,
    "responseHeaders": [...],
    "responseBody": "{\"data\":{...}}",
    "time": 1234.56,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
]
```

## Target Domain

This extension is configured to work with:
- `https://app.monarchmoney.com/*`

## Development

This is a Manifest V3 extension built with vanilla JavaScript. No build process required - just load the unpacked extension directly into Chrome.
