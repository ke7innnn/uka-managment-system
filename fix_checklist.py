import re

with open("src/lib/store.ts", "r") as f:
    content = f.read()

# 1. Update migration logic
migration_v3_code = """
      // MIGRATION V3
      // Covers splitting of items 6, 14, and 16-21 into more detailed items
      if (!isChecklistMigrated || !originalChecklist.includes("MIGRATED_V3")) {
        const V2_TO_V3_MAP: Record<string, string[]> = {
          "1": ["1"], "2": ["2"], "3": ["3"], "4": ["4"], "5": ["5"],
          "6": ["6", "7"],
          "7": ["8"], "8": ["9"], "9": ["10"], "10": ["11"], "11": ["12"], "12": ["13"], "13": ["14"],
          "14": ["15", "16"],
          "15": ["17"],
          "16": ["18", "19"], 
          "17": ["18", "20"],
          "18": ["18", "21"],
          "19": ["18", "22"],
          "20": ["18", "23"],
          "21": ["18", "24"]
        };
        for(let i=22; i<=71; i++) {
          V2_TO_V3_MAP[i.toString()] = [(i + 3).toString()];
        }

        let newChecklist: string[] = [];
        uniqueMigratedChecklist.forEach(id => {
          if (id === "MIGRATED_V2" || id === "MIGRATED_V3") return;
          const isNA = id.endsWith("-NA");
          const baseId = isNA ? id.replace("-NA", "") : id;

          const mappedIds = V2_TO_V3_MAP[baseId];
          if (mappedIds) {
            mappedIds.forEach(mId => newChecklist.push(isNA ? `${mId}-NA` : mId));
          } else {
            newChecklist.push(id);
          }
        });

        uniqueMigratedChecklist = [...new Set([...newChecklist, "MIGRATED_V2", "MIGRATED_V3"])];
        clientMigrated = true;
      }

      // Filter to keep only valid checklist IDs
      const VALID_IDS = new Set([
        ...PROGRESS_CHECKLIST_ITEMS.map(item => item.id),
        "MIGRATED_V2",
        "MIGRATED_V3"
      ]);
"""

content = re.sub(
    r"      // Filter to keep only valid checklist IDs \(1-71 and 'MIGRATED_V2'\)\n      const VALID_IDS = new Set\(\[\n        \.\.\.PROGRESS_CHECKLIST_ITEMS\.map\(item => item\.id\),\n        \"MIGRATED_V2\"\n      \]\);",
    migration_v3_code.strip('\n'),
    content
)

# 2. Update array
old_items = [
  '{ id: "1",  label: "7/12 EXTRACT / PROPERTY CARD" },',
  '{ id: "2",  label: "ALL 6/12 MUTATIONS AS PER 7/12 & PIKPANI EXTRACT" },',
  '{ id: "3",  label: "PIKPANI (1952 TILL DATE)" },',
  '{ id: "4",  label: "8A EXTRACT" },',
  '{ id: "5",  label: "ADVOCATE TITLE SEARCH REPORT FROM 1952 TILL DATE WITH RECEIPT" },',
  '{ id: "6",  label: "NO CLAIMS ON LAND TITLE & POSSESSION AFTER ISSUING PAPER NOTICE" },',
  '{ id: "7",  label: "SALE PERMISSION IF APPLICABLE" },',
  '{ id: "8",  label: "NA ORDER / LAND CONVERSION WITH RECEIPT" },',
  '{ id: "9",  label: "GAON NAKASHA" },',
  '{ id: "10", label: "GAVTHAN CERTIFICATION (IF APPLICABLE)" },',
  '{ id: "11", label: "PHYSICAL & LEVEL SURVEY WITH 100MT SURROUNDING" },',
  '{ id: "12", label: "GOOGLE LOCATION & SITE PHOTOS" },',
  '{ id: "13", label: "COPY OF LATEST RR RATE" },',
  '{ id: "14", label: "GUTBOOK, TILR MAP WITH RECEIPT / CTS SKETCH WITH RECEIPT" },',
  '{ id: "15", label: "SOCIETY REGISTRATION CERTIFICATE" },',
  '{ id: "16", label: "INDIVIDUAL CONSENTS / MOU OF ALL MEMBERS (INDIVIDUAL / COMBINED) NOTARIZED WITH GHARPATTI" },',
  '{ id: "17", label: "INDIVIDUAL CONSENTS / MOU OF ALL MEMBERS (INDIVIDUAL / COMBINED) NOTARIZED WITH ASSESSMENT" },',
  '{ id: "18", label: "INDIVIDUAL CONSENTS / MOU OF ALL MEMBERS (INDIVIDUAL / COMBINED) NOTARIZED WITH SHARE CERTIFICATE" },',
  '{ id: "19", label: "INDIVIDUAL CONSENTS / MOU OF ALL MEMBERS (INDIVIDUAL / COMBINED) NOTARIZED WITH LIGHT BILL" },',
  '{ id: "20", label: "INDIVIDUAL CONSENTS / MOU OF ALL MEMBERS (INDIVIDUAL / COMBINED) NOTARIZED WITH PAN CARDS" },',
  '{ id: "21", label: "INDIVIDUAL CONSENTS / MOU OF ALL MEMBERS (INDIVIDUAL / COMBINED) NOTARIZED WITH AADHAR CARDS" },'
]

new_items = [
  '{ id: "1",  label: "7/12 EXTRACT / PROPERTY CARD" },',
  '{ id: "2",  label: "ALL 6/12 MUTATIONS AS PER 7/12 & PIKPANI EXTRACT" },',
  '{ id: "3",  label: "PIKPANI (1952 TILL DATE)" },',
  '{ id: "4",  label: "8A EXTRACT" },',
  '{ id: "5",  label: "ADVOCATE TITLE SEARCH REPORT FROM 1952 TILL DATE WITH RECEIPT" },',
  '{ id: "6",  label: "NO CLAIM" },',
  '{ id: "7",  label: "PAPER NOTICE" },',
  '{ id: "8",  label: "SALE PERMISSION IF APPLICABLE" },',
  '{ id: "9",  label: "NA ORDER / LAND CONVERSION WITH RECEIPT" },',
  '{ id: "10", label: "GAON NAKASHA" },',
  '{ id: "11", label: "GAVTHAN CERTIFICATION (IF APPLICABLE)" },',
  '{ id: "12", label: "PHYSICAL & LEVEL SURVEY WITH 100MT SURROUNDING" },',
  '{ id: "13", label: "GOOGLE LOCATION & SITE PHOTOS" },',
  '{ id: "14", label: "COPY OF LATEST RR RATE" },',
  '{ id: "15", label: "GUT BOOK" },',
  '{ id: "16", label: "TLR" },',
  '{ id: "17", label: "SOCIETY REGISTRATION CERTIFICATE" },',
  '{ id: "18", label: "INDIVIDUAL CONSENTS / MOU OF ALL MEMBERS (INDIVIDUAL / COMBINED) NOTARIZED" },',
  '{ id: "19", label: "GHARPATTI" },',
  '{ id: "20", label: "ASSESSMENT" },',
  '{ id: "21", label: "SHARE CERTIFICATE" },',
  '{ id: "22", label: "LIGHT BILL" },',
  '{ id: "23", label: "PAN CARDS" },',
  '{ id: "24", label: "AADHAR CARDS" },'
]

# We need to shift the remaining items from 22-71 to 25-74
def shift_id(match):
    old_id = int(match.group(1))
    return f'id: "{old_id + 3}"'

# Split array parsing
start_str = "export const PROGRESS_CHECKLIST_ITEMS = [\n"
end_str = "];\n"

idx_start = content.find(start_str)
idx_end = content.find(end_str, idx_start)

array_content = content[idx_start + len(start_str):idx_end]

lines = array_content.split("\n")
new_lines = new_items[:]

for line in lines:
    m = re.search(r'id:\s*"(\d+)"', line)
    if m:
        old_id = int(m.group(1))
        if old_id >= 22:
            new_lines.append(re.sub(r'id:\s*"\d+"', f'id: "{old_id + 3}"', line))

new_array_content = "\n  ".join(new_lines) + "\n"

content = content[:idx_start + len(start_str)] + "  " + new_array_content + content[idx_end:]

with open("src/lib/store.ts", "w") as f:
    f.write(content)

print("Done")
