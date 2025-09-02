# Paste Images for Obsidian

An Obsidian plugin that converts and optimizes pasted images with customizable settings.

## Overview

This plugin was inspired by [obsidian-paste-png-to-jpeg](https://github.com/musug/obsidian-paste-png-to-jpeg), but addresses a key limitation: it only converts images when pasting from clipboard, not when drag-and-dropping or synchronizing files. This prevents unwanted conversions during file sync operations with services like Syncthing, Dropbox, or other synchronization mechanisms.

## Features

### Core Functionality
- **Smart Paste Detection**: Only converts images when pasted from clipboard, not when dragged or synced
- **Format Conversion**: Convert pasted images to JPEG or WebP format
- **Batch Processing**: Paste and convert multiple images at once
- **Quality Control**: Adjustable compression settings for optimal file size
- **Image Resizing**: Set maximum dimensions to automatically resize large images

### Customization Options
- **Custom Folder Path**: Set a default folder for saved images with support for subfolders
- **File Prefix**: Add custom prefixes to image filenames, including path separators for subfolder creation
- **Interactive Mode**: Optional user dialog for per-paste settings customization
- **Editor-Only Mode**: Option to restrict conversion to editor context only

## Installation

### Manual Installation
1. Download the latest release from the [releases page](../../releases)
2. Extract the files to your Obsidian plugins folder: `VaultFolder/.obsidian/plugins/paste-images/`
3. Reload Obsidian and enable the plugin in Settings → Community Plugins

### Development Installation
1. Clone this repository into your Obsidian plugins folder
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the plugin
4. Enable the plugin in Obsidian settings

## Configuration

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Image Format** | Output format for converted images (JPEG/WebP) | JPEG |
| **Compression** | Quality setting for compression (0.1-1.0) | 0.95 |
| **Maximum Dimension** | Max width/height in pixels (0 = no resize) | 0 |
| **Image Path** | Default folder for saved images | "" (current folder) |
| **Image Prefix** | Prefix for image filenames | "" |
| **Convert in Editor Only** | Only convert when pasting in editor | true |
| **Ask User** | Show dialog for per-paste customization | false |
| **Save Ask User** | Remember the "Ask User" preference | false |

### Usage Examples

#### Basic Usage
Simply paste an image from your clipboard - it will be automatically converted based on your settings.

#### Custom Folder Structure
Set `Image Path` to `assets/images` and `Image Prefix` to `screenshot-` to save files as:
```
assets/images/screenshot-20231201-123456.jpg
```

#### Interactive Mode
Enable "Ask User" to get a dialog box for each paste operation, allowing you to customize:
- Output format (JPEG/WebP)
- Compression quality
- Maximum dimensions

## Development

### Building
```bash
npm install
npm run build
```

### Development Mode
```bash
npm run dev
```

### File Structure
```
├── main.ts          # Main plugin code
├── manifest.json    # Plugin manifest
├── package.json     # Node.js dependencies
├── tsconfig.json    # TypeScript configuration
├── esbuild.config.mjs # Build configuration
├── styles.css       # Plugin styles
└── data.json        # User settings (created after first use)
```

## Compatibility

- **Minimum Obsidian Version**: 0.15.0
- **Platform Support**: Desktop and mobile
- **File Formats**: Supports clipboard images in common formats (PNG, JPEG, WebP, etc.)

## Troubleshooting

### Images Not Converting
- Check that "Convert in Editor Only" matches your usage context
- Ensure you're pasting (Ctrl+V/Cmd+V) rather than dragging files
- Verify the plugin is enabled in Community Plugins settings

### File Path Issues
- Use forward slashes (/) for cross-platform compatibility
- Relative paths are relative to the current note's folder
- The plugin will create folders if they don't exist

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Author

Created by [klaudyu](https://klaudyu.github.io/)

## Changelog

### v1.1.0
- Enhanced error handling and TypeScript improvements
- Added support for different image save settings per paste
- Improved user interface and settings organization
