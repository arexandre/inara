import os, asyncio
from dotenv import load_dotenv
load_dotenv('bot/.env')
from bot.app.services.fast_track import get_supabase
async def main():
    sb = await get_supabase()
    try:
        res = await sb.table('profiles').select('telegram_id').eq('is_admin', True).execute()
        print('Type:', type(res))
        print('Data:', getattr(res, 'data', None))
    except Exception as e:
        print('Error:', type(e), str(e))
asyncio.run(main())
