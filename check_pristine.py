import subprocess

content = subprocess.check_output(["git", "show", "f8bd743:bot/app/services/ai.py"]).decode("utf-8")
print(content[:500])

for line in content.split("\n"):
    if "todo" in line and "emoji_map" in line:
        print("EMOJIS:", line.strip())