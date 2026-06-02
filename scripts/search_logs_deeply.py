import glob
import json
import re

print("=== DEEP LOG SEARCH FOR CHIRAG RAUT DOCUMENTS ===")
paths = glob.glob('/Users/kevinpimenta/.gemini/antigravity-ide/brain/*/.system_generated/logs/transcript.jsonl')
print(f"Found {len(paths)} conversation logs to search.")

client_id = "b6cc5f05"
matches = []

for path in paths:
    convo_id = path.split('/')[-4]
    try:
        with open(path, 'r', encoding='utf-8') as f:
            for line_no, line in enumerate(f, 1):
                if client_id in line:
                    matches.append((convo_id, line_no, line))
    except Exception as e:
        print(f"Error reading {path}: {e}")

print(f"\nFound {len(matches)} mentions of client ID '{client_id}'. Let's inspect them:")

for convo_id, line_no, content in matches[:20]:
    print(f"\nConvo ID: {convo_id} | Line: {line_no}")
    # Try to parse as JSON to print nicely
    try:
        obj = json.loads(content)
        # print type and first few chars
        print(f"  Type: {obj.get('type')}, Source: {obj.get('source')}")
        text = str(obj.get('content', '')) or str(obj.get('tool_calls', ''))
        # Search for file names or list of files in the text
        lines = text.split('\n')
        for l in lines:
            if any(ext in l.lower() for ext in ['.pdf', '.docx', '.jpg', '.png', 'recovered']):
                print(f"    {l[:120]}")
    except Exception as e:
        print(f"  Raw: {content[:300]}...")

# Also search for any JSON arrays or structures containing document objects
print("\n--- Searching specifically for documents array pattern ---")
for path in paths:
    convo_id = path.split('/')[-4]
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Look for document schemas/names
            for match in re.finditer(r'("name"\s*:\s*"[^"]+\.(?:pdf|docx|xlsx)"[^}]+client_id)', content, re.IGNORECASE):
                start = max(0, match.start() - 100)
                end = min(len(content), match.end() + 100)
                print(f"Convo: {convo_id} | Found pattern: {content[start:end]}")
    except Exception as e:
        pass
