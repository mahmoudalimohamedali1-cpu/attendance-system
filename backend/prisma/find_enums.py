
import re
import os

schema_path = r'C:\Users\Administrator\Downloads\attendance system\attendance-system\backend\prisma\schema.prisma'
output_path = r'C:\Users\Administrator\Downloads\attendance system\attendance-system\backend\prisma\enum_report.txt'

try:
    with open(schema_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    enums = {}
    for i, line in enumerate(lines):
        match = re.search(r'enum\s+(\w+)', line)
        if match:
            name = match.group(1)
            if name not in enums:
                enums[name] = []
            enums[name].append(i + 1)
            
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("--- ENUM DISCOVERY RESULTS ---\n")
        for name, locations in sorted(enums.items()):
            if len(locations) > 1:
                f.write(f"DUPLICATE: {name} at {locations}\n")
            else:
                f.write(f"Single: {name} at {locations[0]}\n")
        f.write("--- END ---\n")
    print(f"Report written to {output_path}")
except Exception as e:
    print(f"Error: {e}")
