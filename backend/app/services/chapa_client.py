from typing import Any

import httpx

from app.core.config import get_settings


class ChapaClientError(Exception):
	pass


class ChapaClient:
	def __init__(self) -> None:
		settings = get_settings()
		self.base_url = settings.chapa_base_url.rstrip("/")
		self.secret_key = settings.chapa_secret_key
		self.callback_url = settings.chapa_callback_url or "http://localhost:8000/api/v1/payments/chapa/callback"
		self.return_url = settings.chapa_return_url or "http://localhost:3000/payments/chapa/result"
		self.timeout = httpx.Timeout(10.0, connect=5.0)

	async def initialize_transaction(self, *, amount: str, tx_ref: str, email: str, first_name: str, last_name: str) -> dict[str, Any]:
		payload = {
			"amount": amount, "currency": "ETB", "email": email,
			"first_name": first_name, "last_name": last_name, "tx_ref": tx_ref,
			"callback_url": self.callback_url, "return_url": self.return_url,
		}
		try:
			async with httpx.AsyncClient(timeout=self.timeout) as client:
				response = await client.post(
					f"{self.base_url}/v1/transaction/initialize",
					headers={"Authorization": f"Bearer {self.secret_key}"}, json=payload,
				)
				response.raise_for_status()
				data = response.json()
		except (httpx.HTTPError, ValueError) as exc:
			raise ChapaClientError("Chapa initialization failed") from exc
		checkout_url = data.get("data", {}).get("checkout_url")
		if not checkout_url:
			raise ChapaClientError("Chapa returned no checkout URL")
		return data

	async def verify_transaction(self, tx_ref: str) -> dict[str, Any]:
		try:
			async with httpx.AsyncClient(timeout=self.timeout) as client:
				response = await client.get(
					f"{self.base_url}/v1/transaction/verify/{tx_ref}",
					headers={"Authorization": f"Bearer {self.secret_key}"},
				)
				response.raise_for_status()
				return response.json()
		except (httpx.HTTPError, ValueError) as exc:
			raise ChapaClientError("Chapa verification failed") from exc