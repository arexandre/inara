import re

with open("web/app/actions.ts", "r", encoding="utf-8") as f:
    text = f.read()

old_logic = """  if (profile?.is_admin) {
    const idle_time_min = Number(formData.get("idle_time_min"));
    const house_address = formData.get("house_address") as string;
    const house_rules = formData.get("house_rules") as string;

    await supabase.from("system_settings").update({
      idle_time_min,
      house_address,
      house_rules
    }).eq("id", 1);
  }"""

new_logic = """  if (profile?.is_admin) {
    const idleRaw = formData.get("idle_time_min");
    const house_address = formData.get("house_address") as string;
    const house_rules = formData.get("house_rules") as string;

    const updateObj: any = { house_address, house_rules };
    if (idleRaw !== null && idleRaw !== "") {
      updateObj.idle_time_min = Number(idleRaw);
    }

    await supabase.from("system_settings").update(updateObj).eq("id", 1);
  }"""

text = text.replace(old_logic, new_logic)

with open("web/app/actions.ts", "w", encoding="utf-8") as f:
    f.write(text)

print("actions.ts patched!")