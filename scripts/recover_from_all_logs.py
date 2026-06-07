import glob
import json
import re
import os

print("=== DEEP LOG SEARCH FOR COMPLETED PHASES/TASKS ===")
paths = glob.glob('/Users/kevinpimenta/.gemini/antigravity-ide/brain/*/.system_generated/logs/transcript.jsonl')
print(f"Found {len(paths)} conversation logs to search.")

best_phases = {} # client_id -> phase list
client_names = {} # client_id -> client name

for path in paths:
    convo_id = path.split('/')[-4]
    try:
        with open(path, 'r', encoding='utf-8') as f:
            for line_no, line in enumerate(f, 1):
                # We search for lines that contain phase details
                if 'phases' in line and 'tasks' in line:
                    # Let's extract any JSON objects or arrays
                    # A typical client might look like {"id": "...", "name": "...", "phases": [...]}
                    # Let's search for patterns like {"id":"...", "name":"...", "phases":[...]} or similar
                    # Instead of complex regex, let's see if we can search for the client name or "phases" key and pull the whole line
                    # Wait, the transcript log lines are JSON objects. Let's parse the line as JSON.
                    try:
                        step = json.loads(line)
                        content = step.get('content', '')
                        tool_calls = step.get('tool_calls', [])
                        
                        # Search content
                        if isinstance(content, str) and 'phases' in content:
                            # Search for phase JSON
                            # Let's find any occurrences of json-like structures
                            for m in re.finditer(r'(\{[^{}]*"id"[^{}]*"phases"\s*:\s*\[.*?\][^{}]*\})', content):
                                try:
                                    obj = json.loads(m.group(1))
                                    cid = obj.get('id')
                                    phases = obj.get('phases')
                                    name = obj.get('name')
                                    if cid and phases:
                                        if name:
                                            client_names[cid] = name
                                        # Let's check if this has any completed tasks
                                        has_completed = False
                                        for p in phases:
                                            tasks = p.get('tasks', [])
                                            if isinstance(tasks, str):
                                                try: tasks = json.loads(tasks)
                                                except: pass
                                            if isinstance(tasks, list):
                                                if any(t.get('completed') for t in tasks):
                                                    has_completed = True
                                        if has_completed:
                                            # If we already have a version, check if this one has more completed tasks
                                            best_phases[cid] = phases
                                except:
                                    pass
                                    
                        # Also search tool_calls arguments or responses
                        if isinstance(tool_calls, list):
                            for tc in tool_calls:
                                args = tc.get('function', {}).get('arguments', {})
                                if isinstance(args, dict):
                                    # Convert to string and search
                                    args_str = json.dumps(args)
                                    if 'phases' in args_str:
                                        # inspect if it's there
                                        pass
                                # Check tool output (if present in the transcript JSON structure)
                                # Depending on the schema, output might be in step
                    except Exception as e:
                        pass
    except Exception as e:
        print(f"Error reading {path}: {e}")

print(f"Scanned all logs. Found completed phases for {len(best_phases)} clients.")
for cid, phases in best_phases.items():
    name = client_names.get(cid, "Unknown")
    print(f"Client: {name} (ID: {cid})")
    completed_count = 0
    for p in phases:
        tasks = p.get('tasks', [])
        if isinstance(tasks, str):
            try: tasks = json.loads(tasks)
            except: pass
        if isinstance(tasks, list):
            completed_count += sum(1 for t in tasks if t.get('completed'))
    print(f"  Completed tasks count: {completed_count}")

# Save the best phases found
if len(best_phases) > 0:
    with open('/Users/kevinpimenta/Desktop/UKA MANAGEMENT SYSTEM/scripts/recovered_phases_from_logs.json', 'w') as out:
        json.dump({"clients": best_phases, "names": client_names}, out, indent=2)
    print("Saved to scripts/recovered_phases_from_logs.json")
