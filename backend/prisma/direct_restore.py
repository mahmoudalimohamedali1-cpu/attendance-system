import shutil
import os

# Define paths
backup_path = r'C:\Users\Administrator\Downloads\attendance system\attendance-system\backend\prisma\schema.prisma.backup_20260118_231159'
target_path = r'C:\Users\Administrator\Downloads\attendance system\attendance-system\backend\prisma\schema.prisma'

print(f"Source: {backup_path}")
print(f"Target: {target_path}")

# Verify source exists
if not os.path.exists(backup_path):
    print(f"ERROR: Source file not found: {backup_path}")
    exit(1)

# Get source size
src_size = os.path.getsize(backup_path)
print(f"Source size: {src_size} bytes")

# Read source content
with open(backup_path, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"Read {len(content)} characters from source")

# Write to target (overwrite)
with open(target_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Wrote content to target file")

# Verify target size
dst_size = os.path.getsize(target_path)
print(f"Target size: {dst_size} bytes")

if src_size == dst_size:
    print("SUCCESS: File sizes match!")
else:
    print(f"WARNING: Size mismatch! Source: {src_size}, Target: {dst_size}")

# Verify by reading back
with open(target_path, 'r', encoding='utf-8') as f:
    target_content = f.read()

if content == target_content:
    print("SUCCESS: Content verification passed!")
else:
    print("ERROR: Content verification failed!")
