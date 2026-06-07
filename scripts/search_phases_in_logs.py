import glob
import json
import re

print("=== SEARCH PHASES IN LOGS ===")
paths = glob.glob('/Users/kevinpimenta/.gemini/antigravity-ide/brain/*/.system_generated/logs/transcript.jsonl')
print(f"Found {len(paths)} conversation logs to search.")

# We want to search for any log entry containing phase data.
# The fields in a phase are: client_id, tasks, completed, status, time_bound, started_at
# The tasks field is a JSON string of tasks, e.g. '[{"id":..., "completed":true}]' or similar.

count = 0
for path in paths:
    convo_id = path.split('/')[-4]
    try:
        with open(path, 'r', encoding='utf-8') as f:
            for line_no, line in enumerate(f, 1):
                # Search for keywords that would exist in a database query result for phases
                # e.g., '"tasks":' and '"client_id":'
                if '"tasks":' in line and '"client_id":' in line:
                    count += 1
                    print(f"\n--- MATCH {count} | Convo: {convo_id} | Line: {line_no} ---")
                    # Try to parse the step to understand the context
                    try:
                        step = json.loads(line)
                        print(f"Type: {step.get('type')}, Source: {step.get('source')}")
                        content = step.get('content', '')
                        tool_calls = step.get('tool_calls', [])
                        
                        # Let's inspect content or tool calls to find JSON array/object of phases
                        # Look for substring like "[{"id": " or similar
                        # Let's write the matching content to a text file or print a part of it
                        print("Content preview:")
                        if content:
                            print(content[:500] + "...")
                        if tool_calls:
                            print(f"Tool calls count: {len(tool_calls)}")
                            for idx, tc in enumerate(tool_calls):
                                name = tc.get('function', {}).get('name')
                                args = tc.get('function', {}).get('arguments', {})
                                print(f"  Tool {idx}: {name}")
                                # Print first 200 chars of args
                                args_str = json.dumps(args)
                                print(f"  Args: {args_str[:300]}...")
                    except Exception as e:
                        print(f"Failed to parse JSON: {e}")
                        print(line[:500] + "...")
    except Exception as e:
        print(f"Error reading {path}: {e}")

print(f"\nFinished searching. Found {count} matching lines.")
