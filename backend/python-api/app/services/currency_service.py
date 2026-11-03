import os
import json
import logging
from datetime import datetime, date
from pathlib import Path
from typing import Optional
import httpx

logger = logging.getLogger("kono.currency_service")

CACHE_FILE = Path("/data/storage/exchange_rates.json")
if not os.path.exists("/data/storage"):
    CACHE_FILE = Path("./data/storage/exchange_rates.json")

class CurrencyExchangeService:
    """
    Manages daily USD/COP currency conversion rates.
    Consults once per day and caches the rate locally to avoid unnecessary AI/API costs.
    """

    def __init__(self, default_rate: float = 4150.0):
        self.default_rate = default_rate
        self._cached_rate: Optional[float] = None
        self._cached_date: Optional[str] = None
        self._load_cache()

    def _load_cache(self):
        try:
            if CACHE_FILE.exists():
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._cached_rate = data.get("usd_cop_rate")
                    self._cached_date = data.get("date")
                    logger.info("Loaded USD/COP exchange rate from cache: $%s (Date: %s)", self._cached_rate, self._cached_date)
        except Exception as e:
            logger.warning("Could not read exchange rate cache: %s", e)

    def _save_cache(self, rate: float):
        try:
            CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
            today_str = date.today().isoformat()
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump({
                    "usd_cop_rate": rate,
                    "date": today_str,
                    "updated_at": datetime.utcnow().isoformat(),
                }, f, indent=2)
            self._cached_rate = rate
            self._cached_date = today_str
            logger.info("Saved fresh USD/COP rate to cache: $%s", rate)
        except Exception as e:
            logger.warning("Could not save exchange rate cache: %s", e)

    def get_current_rate_sync(self) -> float:
        """Returns the active cached rate or default rate immediately."""
        return self._cached_rate or self.default_rate

    async def get_usd_to_cop_rate(self) -> float:
        """
        Returns the current USD to COP rate.
        If already cached for today, returns cached rate immediately (0-cost).
        Otherwise, fetches the live rate (or queries OpenAI/Gemini/free fx api) and caches it for 24h.
        """
        today_str = date.today().isoformat()
        if self._cached_rate and self._cached_date == today_str:
            return self._cached_rate

        # 1. Try public lightweight financial API (fast, 0-tokens)
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get("https://open.er-api.com/v6/latest/USD")
                if res.status_code == 200:
                    data = res.json()
                    cop_rate = float(data.get("rates", {}).get("COP", 0.0))
                    if cop_rate > 3000.0:
                        self._save_cache(round(cop_rate, 2))
                        return round(cop_rate, 2)
        except Exception as api_err:
            logger.info("Public FX API failed, falling back to AI / default: %s", api_err)

        # 2. Try LLM Query if OpenAI key is present
        openai_key = os.environ.get("OPENAI_API_KEY")
        if openai_key:
            try:
                from openai import AsyncOpenAI
                ai_client = AsyncOpenAI(api_key=openai_key)
                completion = await ai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a financial currency service. Respond ONLY with the current approximate USD to COP exchange rate as a single float number (e.g. 4180.50). Nothing else."},
                        {"role": "user", "content": f"What is the official TRM exchange rate for 1 USD to Colombian Pesos (COP) for today {today_str}?"}
                    ],
                    max_tokens=10,
                    temperature=0.0,
                )
                txt = completion.choices[0].message.content.strip().replace(",", "")
                parsed_rate = float(''.join(c for c in txt if c.isdigit() or c == '.'))
                if 3000.0 <= parsed_rate <= 6000.0:
                    self._save_cache(parsed_rate)
                    return parsed_rate
            except Exception as ai_err:
                logger.warning("AI currency check failed: %s", ai_err)

        # Fallback default
        fallback = self._cached_rate or self.default_rate
        self._save_cache(fallback)
        return fallback

    def convert_usd_to_cop_sync(self, amount_usd: float) -> float:
        """Synchronous conversion using cached rate or default rate."""
        rate = self._cached_rate or self.default_rate
        return round(amount_usd * rate, 2)

currency_service = CurrencyExchangeService()
