with open("app/services/scheduler.py", "r", encoding="utf-8") as f:
    text = f.read()
    
# Fix 1: model name
text = text.replace('"gemini-3.8-flash"', '"gemini-3.5-flash-lite"')

# Fix 2: ambiguous join
text = text.replace('profiles(username)', 'profiles!tasks_assignee_id_fkey(username)')

with open("app/services/scheduler.py", "w", encoding="utf-8") as f:
    f.write(text)
print("scheduler.py fixed.")