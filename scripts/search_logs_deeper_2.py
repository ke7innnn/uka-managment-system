import glob
import json

path = '/Users/kevinpimenta/.gemini/antigravity-ide/brain/d4f453d8-321d-4a49-b4eb-4a7ce9935785/.system_generated/logs/transcript.jsonl'

print("=== DEEPER LOG SEARCH FOR FILES ===")

with open(path, 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f, 1):
        if 'UNDERTAKING.pdf' in line:
            print(f"\nLine {idx} matches:")
            try:
                obj = json.loads(line)
                content = obj.get('content', '')
                if content:
                    print("--- CONTENT ---")
                    # print lines that contain UNDERTAKING.pdf or other file mappings
                    for l in content.split('\n'):
                        if any(x in l for x in ['UNDERTAKING', 'BOND', 'DECLERATION', 'AFF', '712', 'TILR']):
                            print(l)
                
                output = obj.get('output', '')
                if output:
                    print("--- OUTPUT ---")
                    for l in output.split('\n'):
                        if any(x in l for x in ['UNDERTAKING', 'BOND', 'DECLERATION', 'AFF', '712', 'TILR']):
                            print(l)
            except Exception as e:
                print(f"Error parsing line: {e}")
