#!/usr/bin/env python3
import subprocess
import re

# Run build and capture output
result = subprocess.run(
    ['npm', 'run', 'build'],
    capture_output=True,
    text=True,
    cwd='/var/www/attendance-system/backend'
)

output = result.stdout + result.stderr

# Find missing Prisma properties
missing_props = set()
pattern = r"Property '([^']+)' does not exist on type 'PrismaService'"
for match in re.finditer(pattern, output):
    missing_props.add(match.group(1))

# Find missing exported members
missing_exports = set()
pattern2 = r"has no exported member '([^']+)'"
for match in re.finditer(pattern2, output):
    missing_exports.add(match.group(1))

# Find files with errors
files_with_errors = set()
pattern3 = r"src/([^:]+):\d+:\d+ - error"
for match in re.finditer(pattern3, output):
    files_with_errors.add("src/" + match.group(1))

print("=== Missing Prisma Models/Properties ===")
for prop in sorted(missing_props):
    print(f"  - {prop}")

print("\n=== Missing Exported Members ===")
for member in sorted(missing_exports):
    print(f"  - {member}")

print(f"\n=== Files with Errors ({len(files_with_errors)}) ===")
for f in sorted(files_with_errors):
    print(f"  - {f}")

print(f"\nTotal: {len(missing_props)} missing props, {len(missing_exports)} missing exports, {len(files_with_errors)} files")
