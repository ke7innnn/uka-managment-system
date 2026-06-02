import glob
import json
import re

paths = glob.glob('/Users/kevinpimenta/.gemini/antigravity-ide/brain/*/.system_generated/logs/transcript.jsonl')
print(f"Searching {len(paths)} transcripts for original document records...")

for path in paths:
    convo_id = path.split('/')[-4]
    try:
        with open(path, 'r', encoding='utf-8') as f:
            for line_no, line in enumerate(f, 1):
                # Search for document structures that have name, url, client_id, folder
                if 'b6cc5f05' in line and '"url"' in line and '"name"' in line:
                    # Let's print out if it contains document details
                    if 'RECOVERED' not in line:
                        print(f"\n🌟 FOUND PRE-ACCIDENT DOCS in Convo {convo_id} at line {line_no}!")
                        # Let's extract the JSON block or the text containing the list
                        # Find all occurrences of document patterns
                        # Let's write this matching line to a local text file so we can view it
                        with open(f'/Users/kevinpimenta/Desktop/UKA MANAGEMENT SYSTEM/scripts/found_convo_{convo_id}_line_{line_no}.txt', 'w') as out:
                            out.write(line)
                        print(f"Saved line to scripts/found_convo_{convo_id}_line_{line_no}.txt")
    except Exception as e:
        print(f"Error reading {path}: {e}")
