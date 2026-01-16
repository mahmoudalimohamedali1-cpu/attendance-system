#!/usr/bin/env python3
import re

with open('/var/www/attendance-system/backend/src/app.module.ts', 'r') as f:
    content = f.read()

# Comment out TasksModule
content = re.sub(r"import \{ TasksModule \}", '// import { TasksModule }', content)
content = re.sub(r'TasksModule,', '// TasksModule,', content)

# Comment out AiChatModule  
content = re.sub(r"import \{ AiChatModule \}", '// import { AiChatModule }', content)
content = re.sub(r'AiChatModule,', '// AiChatModule,', content)

with open('/var/www/attendance-system/backend/src/app.module.ts', 'w') as f:
    f.write(content)

print('Done - modules commented out')
