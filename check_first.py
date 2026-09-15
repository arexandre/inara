import subprocess

content = subprocess.check_output(["git", "show", "3774999:bot/app/services/ai.py"]).decode("utf-8")
for i, line in enumerate(content.split("\n")):
    if "\x9d" in line or "ǟ" in line:
        print(f"Line {i+1}: {repr(line)}")