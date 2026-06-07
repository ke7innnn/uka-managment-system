import json
import os
import re

log_path = '/Users/kevinpimenta/.gemini/antigravity-ide/brain/d4f453d8-321d-4a49-b4eb-4a7ce9935785/.system_generated/logs/transcript.jsonl'

# We want to find the last known state of phases with 'completed': true before today.
# Or any state where tasks have 'completed': true.

best_phases = {} # client_id -> phase list

with open(log_path, 'r') as f:
    for line in f:
        try:
            step = json.loads(line)
            content = step.get('content', '')
            
            # The most likely place we have full client state is when I did a console.log or ran a check script
            if '"phases":' in content and '"tasks":' in content:
                # Let's extract JSON arrays or objects that might be a client
                matches = re.findall(r'(\{"id":"[a-f0-9\-]+".*?"phases":\[.*?\]\})', content)
                for m in matches:
                    try:
                        client = json.loads(m)
                        cid = client.get('id')
                        phases = client.get('phases')
                        if cid and phases:
                            # check if this version has any completed tasks
                            has_completed = False
                            for p in phases:
                                tasks = p.get('tasks', [])
                                if isinstance(tasks, str):
                                    try: tasks = json.loads(tasks)
                                    except: pass
                                if any(t.get('completed') for t in tasks):
                                    has_completed = True
                            
                            if has_completed:
                                best_phases[cid] = phases
                    except Exception as e:
                        pass
        except Exception as e:
            pass

print(f"Found backups for {len(best_phases)} clients.")
if len(best_phases) > 0:
    with open('/Users/kevinpimenta/Desktop/UKA MANAGEMENT SYSTEM/scripts/best_phases_backup.json', 'w') as out:
        json.dump(best_phases, out)
    print("Saved to best_phases_backup.json")
