import json

path = '/Users/kevinpimenta/.gemini/antigravity-ide/brain/d4f453d8-321d-4a49-b4eb-4a7ce9935785/.system_generated/logs/transcript.jsonl'
found_json = None

with open(path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if 'bcc224a3-d7a3-4fae-a270-ee7a3c2fbc58' in line or 'AFFIDAVIT.pdf' in line:
            print(f"Match found at line {i}:")
            try:
                obj = json.loads(line)
                print(f"  Step Index: {obj.get('step_index')}")
                print(f"  Type: {obj.get('type')}")
                # Print the content or tool output
                tool_calls = obj.get('tool_calls', [])
                if tool_calls:
                    print("  Tool Calls exist.")
                output = obj.get('output', '')
                if output:
                    print("  Output exists.")
                    if isinstance(output, str):
                        print(f"  Length: {len(output)}")
                        if '[' in output:
                            found_json = output
                # Check inside content
                content = obj.get('content', '')
                if content and isinstance(content, str) and '[' in content:
                    found_json = content
            except Exception as e:
                print(f"  Error: {e}")

if found_json:
    print("\n--- FOUND JSON DATA ---")
    print(found_json[:2000])
    # Write to a file for analysis
    with open('/Users/kevinpimenta/Desktop/UKA MANAGEMENT SYSTEM/scripts/found_docs.json', 'w') as out:
        out.write(found_json)
    print("\nSaved to scripts/found_docs.json")
else:
    # Let's search the whole file for any JSON array of documents
    print("\n--- Scanning entire file for documents JSON array ---")
    with open(path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f, 1):
            if 'client_id' in line and 'name' in line and ('712.pdf' in line or 'TILR.pdf' in line or 'AFFIDAVIT.pdf' in line):
                print(f"Potential document array on line {i}: {line[:300]}...")
