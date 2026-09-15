from dotenv import load_dotenv
load_dotenv()
import os
import google.generativeai as genai

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = genai.GenerativeModel('gemini-3.8-flash')
try:
    response = model.generate_content("Oi")
    print("SUCCESS:", response.text)
except Exception as e:
    print("ERROR:", e)