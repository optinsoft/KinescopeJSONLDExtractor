import os
import subprocess
from pathlib import Path

def process_directory(root_dir):
    # Iterate through all items in the root directory
    for entry in os.scandir(root_dir):
        if entry.is_dir():
            dir_path = entry.path
            dir_name = entry.name
            log_path = os.path.join(dir_path, "log.txt")
            
            # Name of the output file
            output_file = os.path.join(dir_path, f"{dir_name}.mp4")
            
            # NEW CHECK: If the file already exists, skip the subdirectory
            if os.path.exists(output_file):
                print(f"[=] Skipped: File '{dir_name}.mp4' already exists.")
                continue

            # Check if log.txt exists in this folder
            if not os.path.exists(log_path):
                print(f"[-] Skipped: {dir_name} (log.txt not found)")
                continue
                
            print(f"[+] Processing folder: {dir_name}")
            
            video_url = None
            audio_url = None
            
            # Read the log file
            with open(log_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                
            # Look for links under the required headings
            for i, line in enumerate(lines):
                if "--- Video m3u8 ---" in line:
                    # Take the next non-empty line
                    for next_line in lines[i+1:]:
                        if next_line.strip().startswith("https://"):
                            video_url = next_line.strip()
                            break
                elif "--- Audio m3u8 ---" in line:
                    for next_line in lines[i+1:]:
                        if next_line.strip().startswith("https://"):
                            audio_url = next_line.strip()
                            break

            if not video_url or not audio_url:
                print(f"[!] Error: Could not find links in {log_path}")
                continue
            
            # Assemble the FFmpeg command
            cmd = [
                "ffmpeg",
                "-allowed_extensions", "ALL",
                "-protocol_whitelist", "file,http,https,tls,tcp,crypto,data",
                "-i", video_url,
                "-protocol_whitelist", "file,http,https,tls,tcp,crypto,data",
                "-i", audio_url,
                "-c", "copy",
                output_file
            ]
            
            try:
                print(f"[*] Starting download for {dir_name}...")
                # Execute the command
                subprocess.run(cmd, check=True)
                print(f"[✓] Successfully saved: {output_file}\n")
            except subprocess.CalledProcessError as e:
                print(f"[X] FFmpeg failed with an error in folder {dir_name}: {e}\n")

if __name__ == "__main__":
    # Get the path to the user's home directory, then to the 'kinescope' folder inside the Downloads folder
    downloads_dir = Path.home() / "Downloads/kinescope"
    process_directory(str(downloads_dir))