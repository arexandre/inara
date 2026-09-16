import re

with open("web/app/(app)/layout.tsx", "r", encoding="utf-8") as f:
    text = f.read()

old_nav = """const NAV_ITEMS = [
  { href: "/dashboard",  label: "Início",    emoji: "🏠" },
  { href: "/tarefas",    label: "Tarefas",   emoji: "📦" },
  { href: "/compras",    label: "Compras",   emoji: "🛒" },
  { href: "/financas",   label: "Finanças",  emoji: "💸" },
  { href: "/calendario", label: "Calendário",emoji: "📅" },
  { href: "/historico",  label: "Histórico", emoji: "📜" },
  { href: "/chat",       label: "Web Chat",  emoji: "💬" },
];"""

new_nav = """const NAV_ITEMS = [
  { href: "/dashboard",  label: "Início",    emoji: "🏠" },
  { href: "/tarefas",    label: "Tarefas",   emoji: "📦" },
  { href: "/compras",    label: "Compras",   emoji: "🛒" },
  { href: "/financas",   label: "Finanças",  emoji: "💸" },
  { href: "/calendario", label: "Calendário",emoji: "📅" },
  { href: "/mural",      label: "Mural",     emoji: "📌" },
  { href: "/historico",  label: "Histórico", emoji: "📜" },
  { href: "/chat",       label: "Web Chat",  emoji: "💬" },
];"""

text = text.replace(old_nav, new_nav)

with open("web/app/(app)/layout.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("layout.tsx patched")