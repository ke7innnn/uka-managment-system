path = '/Users/kevinpimenta/.gemini/antigravity-ide/brain/d4f453d8-321d-4a49-b4eb-4a7ce9935785/.system_generated/logs/transcript.jsonl'

print("=== EXTRACTING INDIVIDUAL MATCHES ===")

with open(path, 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f, 1):
        if 'bcc224a3-d7a3-4fae-a270-ee7a3c2fbc58' in line:
            print(f"Line {idx} matches (length: {len(line)})")
            with open(f'/Users/kevinpimenta/Desktop/UKA MANAGEMENT SYSTEM/scripts/long_line_{idx}.json', 'w') as out:
                out.write(line)
            print(f"  Wrote scripts/long_line_{idx}.json")
