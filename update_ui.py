import re

files = [
    "src/app/dashboard/clients/[id]/page.tsx",
    "src/app/staff-dashboard/projects/[id]/page.tsx"
]

for file_path in files:
    with open(file_path, "r") as f:
        content = f.read()

    # Update Group 1
    content = content.replace(
        'title: "General Land & Personal Documents (1-38)",',
        'title: "General Land & Personal Documents (1-41)",'
    )
    content = re.sub(
        r'const num = parseInt\(item\.id, 10\);\n\s*return num <= 38;',
        'const num = parseInt(item.id, 10);\n                  return num <= 41;',
        content
    )

    # Update Group 2
    content = content.replace(
        'title: "₹500 Stamp Paper Affidavits (39)",',
        'title: "₹500 Stamp Paper Affidavits (42)",'
    )
    content = re.sub(
        r'const num = parseInt\(item\.id, 10\);\n\s*return num === 39;',
        'const num = parseInt(item.id, 10);\n                  return num === 42;',
        content
    )

    # Update Group 3
    content = content.replace(
        'title: "CC/RDP Approvals & NOCs (40-71)",',
        'title: "CC/RDP Approvals & NOCs (43-74)",'
    )
    content = re.sub(
        r'const num = parseInt\(item\.id, 10\);\n\s*return num >= 40;',
        'const num = parseInt(item.id, 10);\n                  return num >= 43;',
        content
    )

    with open(file_path, "w") as f:
        f.write(content)

print("Done")
