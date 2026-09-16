import re

with open("web/app/(app)/perfil/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Add import
text = text.replace('import { updateProfileSettings } from "@/app/actions";', 'import { updateProfileSettings } from "@/app/actions";\nimport AdminWidget from "./AdminWidget";')

# Add component at the end of the main tag
old_footer = '      </form>\n    </main>'
new_footer = '      </form>\n      {isAdmin && <AdminWidget />}\n    </main>'

text = text.replace(old_footer, new_footer)

with open("web/app/(app)/perfil/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
print("perfil patched")