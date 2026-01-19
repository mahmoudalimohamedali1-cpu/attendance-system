import shutil
import os
import sys

source = r'C:\Users\Administrator\Downloads\attendance system\attendance-system\backend\prisma\schema.prisma.backup_20260118_231159'
destination = r'C:\Users\Administrator\Downloads\attendance system\attendance-system\backend\prisma\schema.prisma'

try:
    if os.path.exists(destination):
        os.remove(destination)
        print(f"Removed existing {destination}")
    shutil.copy2(source, destination)
    print(f"Successfully copied {source} to {destination}")
    
    # Verify file size
    src_size = os.path.getsize(source)
    dst_size = os.path.getsize(destination)
    print(f"Source size: {src_size}, Destination size: {dst_size}")
    if src_size == dst_size:
        print("Size verification PASSED")
    else:
        print("Size verification FAILED")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
