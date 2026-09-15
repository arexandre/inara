import re

with open("app/services/ai.py", "r", encoding="utf-8") as f:
    text = f.read()

# Replace the scoring logic in Round Robin
old_logic = """
                        t_res = sb.table("tasks").select("assignee_id, title, status").gte("created_at", last_30d).execute()
                        
                        # Score: quanto MENOR, maior a chance de receber a tarefa.
                        scores = {p: 0 for p in profiles}
                        
                        # Extrair palavras chaves do título novo (maior q 3 letras)
                        new_title_words = set(w.lower() for w in params["title"].split() if len(w) > 3)
                        
                        if t_res.data:
                            for t in t_res.data:
                                aid = t.get("assignee_id")
                                if aid in scores:
                                    # Carga geral: tarefa em aberto pesa mais (2), concluída pesa menos (1)
                                    if t.get("status") != "done":
                                        scores[aid] += 2
                                    else:
                                        scores[aid] += 1
"""

new_logic = """
                        t_res = sb.table("tasks").select("assignee_id, title, status, weight").gte("created_at", last_30d).execute()
                        
                        # Score: quanto MENOR, maior a chance de receber a tarefa.
                        scores = {p: 0 for p in profiles}
                        
                        # Extrair palavras chaves do t\u00edtulo novo (maior q 3 letras)
                        new_title_words = set(w.lower() for w in params["title"].split() if len(w) > 3)
                        
                        if t_res.data:
                            for t in t_res.data:
                                aid = t.get("assignee_id")
                                weight = t.get("weight") or 1  # Fallback to 1 if not set
                                if aid in scores:
                                    # Carga baseada no PESO da tarefa
                                    if t.get("status") != "done":
                                        scores[aid] += (weight * 2)
                                    else:
                                        scores[aid] += weight
"""

if "scores[aid] += 2" in text:
    text = text.replace(old_logic.strip(), new_logic.strip())
    with open("app/services/ai.py", "w", encoding="utf-8") as f:
        f.write(text)
    print("AI Round-Robin Updated!")
else:
    print("Could not find old logic.")