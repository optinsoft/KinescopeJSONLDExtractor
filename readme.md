# 🎬 Kinescope JSON-LD Extractor PRO

A browser extension (Chrome Extension) built on the Manifest V3 platform, designed for automatic interception, cleaning, and saving of metadata, as well as direct links to audio and video streams from embedded Kinescope players.

## ✨ Key Features

* Bypassing iframe Isolation: Guaranteed injection into the internal structure of the Kinescope player, even if it is loaded from a third-party domain or protected by security policies.
* Metadata Collection (JSON-LD): Automatically extracts the VideoObject markup object from the player code, which contains the official video title, duration, and a link to the base .m3u8 manifest.
* Fetch and XHR Request Interception: Intercepts the player's network requests at the moment of video playback initialization or quality adjustment, extracting direct links to .mp4 files.
* Automatic Stream Separation: Independently detects the link type and sorts them into video streams (e.g., /1080p.mp4) and audio streams (e.g., /audio_0.mp4).
* Smart URL Cleaning: Automatically strips all dynamic authorization parameters, signatures, and tokens (everything following the ? character) from links, keeping them in an entirely clean and static format.
* Single Page Application (SPA) Support: When switching to a different lecture or video within the same page, the extension automatically resets past counters, removes old interface elements, and begins data collection for the new video from scratch.

## 💾 How File Saving Works

The extension renders a convenient floating button on the main webpage:
💾 Save (m3u8 V: V1, m3u8 A: A1, mp4 V: V2, mp4 A: A2), where V1 is the number of captured video M3U8 playlists, A1 is the audio M3U8 playlists, V2 is the video stream links, and A2 is the audio stream links.
Upon clicking the button, the extension automatically generates and downloads the files into your standard Downloads folder under the kinescope subdirectory:

```
📂 Downloads
 └── 📂 kinescope
      └── 📂 [Your_Video_Title]
           ├── 📄 json-ld.json  <- Full video metadata in JSON format
           └── 📄 log.txt       <- Title, manifest link, duration, and lists of all M3U8 and MP4 links
```

The directory name is automatically sanitized of characters prohibited by the Windows operating system (\ / : * ? " < > |).

## 🛠 Project Architecture

The project relies on a hybrid data exchange model to circumvent Chromium's isolated execution environments and strict Content Security Policy (CSP) rules:

   1. manifest.json — Declares extension permissions (downloads, scripting) and forces cross-frame execution using match_origin_as_fallback.
   2. background.js — Registers a network spy inside the MAIN world context of the page and acts as a message broker between browser tabs.
   3. interceptor.js — Operates in the main player context, monkeypatches window.fetch and XMLHttpRequest methods, filters links by type, and passes them to the isolated world via a hidden DOM bridge (document.documentElement).
   4. content.js — Scrapes data within the frame using an independent polling timer, propagates them to the main page, handles the floating button interface lifecycle, and compiles text reports for download.

## 🚀 Installation Instructions

   1. Download or copy all 4 files from the project's src directory (manifest.json, background.js, interceptor.js, content.js) into a single local folder on your computer (e.g., C:\Projects\kinescope-extractor).
   2. Open your web browser (Google Chrome, Yandex Browser, Microsoft Edge, or any other Chromium-based browser).
   3. Navigate to chrome://extensions/.
   4. Enable the "Developer mode" toggle switch in the top-right corner.
   5. Click the "Load unpacked" button in the top-left corner.
   6. Select your created local folder containing the source files.
   7. Open the page containing the video player and force-refresh it (Ctrl + F5).

## 🐍 Automation via Python (Post-processing)

Once the extension logs the metadata and saves the files into the Downloads/kinescope/[Video_Title] directory, two Python scripts are used for automated batch processing.

## 1. Streaming Download via FFmpeg (download_all.py)

This script sequentially processes all subdirectories within the downloads folder and automatically compiles final videos using the command-line utility FFmpeg.

**How it works:**
   1. The script targets the User/Downloads/kinescope directory and iterates through all nested lecture subdirectories.
   2. It checks each folder for a log.txt file. If a finalized .mp4 file is already present in the folder, the script skips the subdirectory to prevent redundant work.
   3. By searching for the exact text markers "--- Video m3u8 ---" and "--- Audio m3u8 ---" inside log.txt, the script extracts direct URLs to the streaming plalyists.
   4. It constructs and fires a subprocess command calling the system-wide FFmpeg bin with the appropriate protocol whitelist flag (-protocol_whitelist file,http,https...).
   5. FFmpeg streams down individual video/audio chunks on the fly, muxes them together natively without re-encoding (using -c copy), and outputs a cohesive, full-quality video file right into the lecture's folder using the folder's original name ([Folder_Name].mp4).

## 2. Completed Video Collector (copy_mp4.py)

This script handles the final stage of file organization. It automates extracting completed video files from deep folder trees and aggregates them into a single root directory.

**How it works:**
   1. The script recursively crawls (os.walk) the subdirectory structure under Downloads/kinescope.
   2. It targets all files with the .mp4 extension (skipping the root folder itself to avoid infinite copying loops).
   3. It explicitly verifies whether a file with an identical filename already exists in the target destination folder to prevent crushing previously collected lectures.
   4. It calls shutil.copy2(), which duplicates the completed .mp4 file to your destination directory while preserving the original file filesystem metadata (including the exact date and time of file creation and modification).
   5. It accepts a target path argument. If executed without parameters (python copy_mp4.py), all video files are extracted and dumped straight into the current working directory from which the script was executed.

## 🛠 Dependencies and Pre-requisites

For the download_all.py script to run successfully, FFmpeg must be installed on your machine. The script triggers it via the CLI to assemble segmented audio and video streams from .m3u8 playlists into standard .mp4 files.

### Installing FFmpeg

**On Windows:**

   1. Download an active build (giggle/essentials) from the official [ffmpeg.org](https://ffmpeg.org/download.html) portal or install it directly using the Windows Package Manager (Winget) by running the following in your terminal:
   ```
   winget install Gyan.FFmpeg
   ```
   2. If downloaded manually: extract the archive to a structured folder (e.g., C:\ffmpeg) and append the path pointing to the nested bin folder (e.g., C:\ffmpeg\bin) to your system's PATH environment variable.
   3. Verify the installation environment by spawning a fresh command line instance (cmd) and launching:
   ```
   ffmpeg -version
   ```
   You should see technical specifications output regarding your local FFmpeg binary.

**On macOS / Linux:**

Install the software utility through your standard OS package managers:

   1. macOS (Homebrew):
   ```
   brew install ffmpeg
   ```
   2. Ubuntu / Debian:
   ```
   sudo apt update && sudo apt install ffmpeg
   ```
   
## Python Dependencies

No external, heavy third-party wheel libraries are needed. All imported modules (os, shutil, subprocess, argparse, pathlib) are built-in modules included in the Python Standard Library. A basic python environment matching version 3.7 or above is sufficient.

## 💻 Complete Automation Workflow

   1. Open the target course webpage. The browser extension intercepts active streaming assets. Click 💾 Save. The browser dumps the structure Downloads/kinescope/[Lecture_Title]/log.txt.
   2. Once logging is completed, execute python download_all.py. This instructs FFmpeg to crawl logs, scrape media segments, and build integrated .mp4 files locally inside their respective folders.
   3. Execute python copy_mp4.py C:\Target\Archive (or leave arguments empty). It pulls out all finished video files from deep directories, respects their original file creation dates, and packs them neatly into one flat folder for consumption.
