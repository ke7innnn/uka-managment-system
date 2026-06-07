import glob
import json
import re

print("=== SEARCHING LOGS FOR CLIENT NAMES ===")
paths = glob.glob('/Users/kevinpimenta/.gemini/antigravity-ide/brain/*/.system_generated/logs/transcript.jsonl')
print(f"Found {len(paths)} conversation logs to search.")

keywords = ['Shreeram', 'Deep CHS', 'Deep Chs']
count = 0

for path in paths:
    convo_id = path.split('/')[-4]
    try:
        with open(path, 'r', encoding='utf-8') as f:
            for line_no, line in enumerate(f, 1):
                found = [kw for kw in keywords if kw.lower() in line.lower()]
                if found:
                    count += 1
                    print(f"\n--- MATCH {count} | Convo: {convo_id} | Line: {line_no} | Matched: {found} ---")
                    try:
                        step = json.loads(line)
                        print(f"Type: {step.get('type')}, Source: {step.get('source')}")
                        content = step.get('content', '')
                        tool_calls = step.get('tool_calls', [])
                        if content:
                            # print the lines from content containing the keywords
                            lines = content.split('\n')
                            for l in lines:
                                if any(kw.lower() in l.lower() for kw in keywords):
                                    print(f"  Content: {l[:150]}")
                        if tool_calls:
                            print(f"  Tool calls: {len(tool_calls)}")
                            for tc in tool_calls:
                                print(f"    Name: {tc.get('function', {}).get('name')}")
                                args_str = json.dumps(tc.get('function', {}).get('arguments', {}))
                                print(f"    Args (snippet): {args_str[:200]}")
                    except Exception as e:
                        print(f"  Raw line snippet: {line[:300]}")
    except Exception as e:
        print(f"Error reading {path}: {e}")

print(f"\nFinished searching client names. Found {count} matching lines.")
