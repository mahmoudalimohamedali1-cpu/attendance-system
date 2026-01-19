
import re
import os

schema_path = r'C:\Users\Administrator\Downloads\attendance system\attendance-system\backend\prisma\schema.prisma'
backup_path = r'C:\Users\Administrator\Downloads\attendance system\attendance-system\backend\prisma\schema.prisma.backup_20260118_231159'

def get_model_content(file_path, model_names):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    models = {}
    for name in model_names:
        # Match model declaration and everything until the next model or enum or end of file
        # This is a bit simplistic but works if models are well-formed
        pattern = rf'model\s+{name}\s+{{(.*?)\n\}}'
        match = re.search(pattern, content, re.DOTALL)
        if match:
            models[name] = match.group(0)
    return models

def snake_to_pascal(name):
    return ''.join(word.capitalize() for word in name.split('_'))

def snake_to_camel(name):
    words = name.split('_')
    return words[0] + ''.join(word.capitalize() for word in words[1:])

def convert_model(model_text):
    # This is a complex mapping due to how Prisma models are structured
    # We need to convert:
    # 1. Model names: model tasks -> model Task
    # 2. Field names: company_id -> companyId
    # 3. Type names: tasks -> Task
    # 4. Relation names: @relation("tasks_assignee_idTousers", ...)
    
    lines = model_text.split('\n')
    new_lines = []
    
    # Model name
    model_match = re.match(r'model\s+([a-z_]+)\s+\{', lines[0])
    if model_match:
        old_name = model_match.group(1)
        new_name = snake_to_pascal(old_name)
        if new_name.endswith('s'): # Simple plural to singular
             if new_name != 'tasks': # special case for tasks -> Task
                 new_name = new_name[:-1]
             else:
                 new_name = 'Task'
        
        # Manually fix specific names if needed
        name_map = {
            'tasks': 'Task',
            'task_categories': 'TaskCategory',
            'task_templates': 'TaskTemplate',
            'task_assignments': 'TaskAssignment',
            'task_comments': 'TaskComment',
            'task_attachments': 'TaskAttachment',
            'task_checklists': 'TaskChecklist',
            'task_checklist_items': 'TaskChecklistItem',
            'task_activity_logs': 'TaskActivityLog',
            'task_approvals': 'TaskApproval',
            'task_evidences': 'TaskEvidence',
            'task_time_logs': 'TaskTimeLog',
            'task_watchers': 'TaskWatcher',
            'task_dependencies': 'TaskDependency',
            'task_automations': 'TaskAutomation',
            'automation_logs': 'AutomationLog',
            'sprints': 'Sprint'
        }
        new_name = name_map.get(old_name, new_name)
        new_lines.append(f'model {new_name} {{')
    else:
        new_lines.append(lines[0])

    for line in lines[1:]:
        if line.strip() == '}':
            new_lines.append(line)
            continue
        
        # Field conversion
        # Match field name, type, and optional attributes
        field_match = re.match(r'^(\s+)([a-z_]+)(\s+)([A-Za-z0-9_?\[\]]+)(.*)$', line)
        if field_match:
            indent, name, space, f_type, attrs = field_match.groups()
            
            # Map type names
            type_map = {
                'tasks': 'Task',
                'task_categories': 'TaskCategory',
                'task_templates': 'TaskTemplate',
                'task_assignments': 'TaskAssignment',
                'task_comments': 'TaskComment',
                'task_attachments': 'TaskAttachment',
                'task_checklists': 'TaskChecklist',
                'task_checklist_items': 'TaskChecklistItem',
                'task_activity_logs': 'TaskActivityLog',
                'task_approvals': 'TaskApproval',
                'task_evidences': 'TaskEvidence',
                'task_time_logs': 'TaskTimeLog',
                'task_watchers': 'TaskWatcher',
                'task_dependencies': 'TaskDependency',
                'task_automations': 'TaskAutomation',
                'automation_logs': 'AutomationLog',
                'sprints': 'Sprint',
                'users': 'User',
                'companies': 'Company',
                'projects': 'Project'
            }
            
            clean_type = f_type.replace('[]', '').replace('?', '')
            new_type = type_map.get(clean_type, clean_type)
            if f_type.endswith('[]'): new_type += '[]'
            elif f_type.endswith('?'): new_type += '?'
            
            # Map field names
            new_name = snake_to_camel(name)
            
            # Fix attributes
            if '@map' not in attrs and name != new_name and not f_type.endswith('[]') and clean_type not in type_map.values():
                 attrs += f' @map("{name}")'
            
            # Fix relations
            attrs = attrs.replace('fields: [', 'fields: [')
            for sn_field in re.findall(r'\[([a-z_,\s]+)\]', attrs):
                 pas_fields = ', '.join(snake_to_camel(f.strip()) for f in sn_field.split(','))
                 attrs = attrs.replace(f'[{sn_field}]', f'[{pas_fields}]')
            
            new_lines.append(f'{indent}{new_name}{space}{new_type}{attrs}')
        else:
            new_lines.append(line)
            
    return '\n'.join(new_lines)

# 1. Read current schema to identify duplication
with open(schema_path, 'r', encoding='utf-8') as f:
    schema_lines = f.readlines()

# Duplication starts at 4710 (index 4709)
# Duplication ends before model Webhook (around 5807)
dupe_start = 4709
dupe_end = 0
for i in range(len(schema_lines)):
    if 'model Webhook {' in schema_lines[i]:
        dupe_end = i
        break

if not dupe_end:
    dupe_end = len(schema_lines)

print(f"Duplication block: {dupe_start+1} to {dupe_end}")

# 2. Extract unique enums from dupe block
unique_enums = []
seen_enum_names = set()
# First, collect all enum names in the VALID part
for i in range(dupe_start):
    match = re.match(r'enum\s+([A-Za-z0-9_]+)\s+\{', schema_lines[i])
    if match:
        seen_enum_names.add(match.group(1))

current_enum = []
in_enum = False
for i in range(dupe_start, dupe_end):
    line = schema_lines[i]
    match = re.match(r'enum\s+([A-Za-z0-9_]+)\s+\{', line)
    if match:
        if match.group(1) not in seen_enum_names:
            in_enum = True
            current_enum = [line]
            seen_enum_names.add(match.group(1))
    elif in_enum:
        current_enum.append(line)
        if '}' in line:
            unique_enums.append(''.join(current_enum))
            in_enum = False

print(f"Found {len(unique_enums)} unique enums in dupe block")

# 3. Extract and convert missing models from backup
missing_model_names = [
    'tasks', 'task_categories', 'task_templates', 'task_assignments',
    'task_comments', 'task_attachments', 'task_checklists', 'task_checklist_items',
    'task_activity_logs', 'task_approvals', 'task_evidences', 'task_time_logs',
    'task_watchers', 'task_dependencies', 'task_automations', 'automation_logs',
    'sprints'
]

backup_models = get_model_content(backup_path, missing_model_names)
converted_models = []
for name in missing_model_names:
    if name in backup_models:
        converted_models.append(convert_model(backup_models[name]))

print(f"Converted {len(converted_models)} models from backup")

# 4. Construct final schema
# Remove dupe block
new_schema_content = schema_lines[:dupe_start] + ['\n', '// ========== RESTORED MODELS & ENUMS ==========\n', '\n']
new_schema_content += unique_enums
new_schema_content += ['\n']
new_schema_content += converted_models
new_schema_content += ['\n']
new_schema_content += schema_lines[dupe_end:]

final_content = ''.join(new_schema_content)

# 5. Fix datasource in the final content
final_content = final_content.replace('url      = env("DATABASE_URL")', 'url      = env("DATABASE_URL")') # No change needed if we follow local

# 6. Update User and Company models if necessary
# (This is tricky to do with simple string replace, but let's try some key relations)

# Add relation to User
user_relations = """
  // Tasks relations
  tasksCreated      Task[]           @relation("tasks_created_by_idTousers")
  tasksAssigned     Task[]           @relation("tasks_assignee_idTousers")
  tasksApproved     Task[]           @relation("tasks_approver_idTousers")
  tasksReviewed     Task[]           @relation("tasks_reviewer_idTousers")
  taskAssignments   TaskAssignment[]
  taskWatchers      TaskWatcher[]
  taskComments      TaskComment[]
  taskTimeLogs      TaskTimeLog[]
  taskActivityLogs  TaskActivityLog[]
  sprintsCreated    Sprint[]         @relation("SprintCreator")
"""

# Find User model and insert before closing bracket
match = re.search(r'model User \{.*?(\n\s+@@map\("users"\))', final_content, re.DOTALL)
if match:
    final_content = final_content.replace(match.group(1), user_relations + match.group(1))

# Add relation to Company
company_relations = """
  tasks              Task[]
  taskCategories     TaskCategory[]
  taskTemplates      TaskTemplate[]
  sprints            Sprint[]
"""
match = re.search(r'model Company \{.*?(\n\s+@@map\("companies"\))', final_content, re.DOTALL)
if match:
    final_content = final_content.replace(match.group(1), company_relations + match.group(1))

# Write the final schema
output_path = r'C:\Users\Administrator\Downloads\attendance system\attendance-system\backend\prisma\schema.prisma'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(final_content)

print("Schema fix complete.")
