import logging
from zoneinfo import ZoneInfo
from datetime import datetime

# Setup Timezone BRT
BRT = ZoneInfo("America/Sao_Paulo")

def setup_logger():
    # Force logging to use BRT
    class BRTFormatter(logging.Formatter):
        def converter(self, timestamp):
            return datetime.fromtimestamp(timestamp, tz=BRT).timetuple()

    logger = logging.getLogger("inara")
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = BRTFormatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    
    return logger

logger = setup_logger()