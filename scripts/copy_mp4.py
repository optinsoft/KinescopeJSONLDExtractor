import os
import shutil
import argparse
from pathlib import Path

def copy_all_mp4(source_dir, destination_dir):
    print(f"[*] Searching for .mp4 files in subdirectories to copy to: {source_dir}\n")
    
    # Recursively traverse all folders and files
    for root, dirs, files in os.walk(source_dir):
        # Skip the root folder itself to avoid copying files within it
        if root == source_dir:
            continue
            
        for file in files:
            if file.lower().endswith('.mp4'):
                source_path = os.path.join(root, file)
                destination_path = os.path.join(destination_dir, file)
                
                # Check if the file already exists in the target folder
                if os.path.exists(destination_path):
                    print(f"[=] Skipped: File '{file}' already exists in the target folder.")
                    continue
                
                try:
                    print(f"[+] Copying: {file} from {os.path.basename(root)}")
                    shutil.copy2(source_path, destination_path) # copy2 сохраняет дату создания файла
                except Exception as e:
                    print(f"[X] Error copying {file}: {e}")

    print("\n[✓] Done!")

if __name__ == "__main__":
    # Set up argument parsing
    parser = argparse.ArgumentParser(
        description="Copy MP4 files from the kinescope download directory to a target folder."
    )

    # Argument for the destination folder. Default is the current working directory.
    parser.add_argument(
        "dest",
        nargs="?",
        default=os.getcwd(),
        help="Destination directory (default: current working directory)",
    )

    args = parser.parse_args()

    downloads_dir = Path.home() / "Downloads/kinescope"

    copy_all_mp4(downloads_dir, args.dest)
