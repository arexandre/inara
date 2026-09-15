import subprocess

commits = subprocess.check_output(["git", "log", "--oneline", "bot/app/services/ai.py"]).decode("utf-8").strip().split("\n")

for commit in commits:
    hash = commit.split()[0]
    content = subprocess.check_output(["git", "show", f"{hash}:bot/app/services/ai.py"]).decode("utf-8")
    if "" in content or "ǟ" in content or "\x9d" in content:
        print(f"{hash} is CORRUPTED")
    else:
        print(f"{hash} is CLEAN!")
        break