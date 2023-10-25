#!/bin/bash

directory="releases"  # Path to the "releases" directory

echo "## Release Artifacts"
echo "| File Name | SHA-256 Hash |"
echo "| :--- | :---: |"

for subdirectory in "$directory"/*; do
    if [ -d "$subdirectory" ]; then
        for file in "$subdirectory"/*; do
            if [ -f "$file" ]; then
                filename=$(basename "$file")
                sha256=$(sha256sum "$file" | awk '{print $1}')
                echo "| $filename | $sha256 |"
            fi
        done
    fi
done