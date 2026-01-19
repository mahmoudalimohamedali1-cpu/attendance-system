import os
import shutil

path = r'C:\Users\Administrator\Downloads\attendance system\attendance-system\backend\prisma\schema.prisma'
backup = r'C:\Users\Administrator\Downloads\attendance system\attendance-system\backend\prisma\schema.prisma.backup_20260118_231159'
temp_path = path + '.to_delete'

try:
    if os.path.exists(path):
        os.rename(path, temp_path)
        print(f"Renamed {path} to {temp_path}")
    shutil.copy2(backup, path)
    print(f"Copied {backup} to {path}")
    if os.path.exists(temp_path):
        os.remove(temp_path)
        print(f"Removed {temp_path}")
except Exception as e:
    print(f"Standard error: {e}")
    # Try another way
    try:
        with open(backup, 'rb') as f_src:
            content = f_src.read()
        with open(path, 'wb') as f_dst:
            f_dst.write(content)
        print(f"Wrote content directly to {path}")
    except Exception as e2:
        print(f"Direct write error: {e2}")
