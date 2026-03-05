import httpx

from auth import get_graph_token
from config import settings


class GraphClient:
    def __init__(self):
        self._token: str | None = None
        self._client: httpx.AsyncClient | None = None

    async def _ensure_client(self):
        if self._client is None:
            self._token = get_graph_token()
            self._client = httpx.AsyncClient(
                base_url=settings.graph_api_base,
                headers={
                    "Authorization": f"Bearer {self._token}",
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )

    async def refresh_token(self):
        self._token = get_graph_token()
        if self._client:
            self._client.headers["Authorization"] = f"Bearer {self._token}"

    async def get(self, endpoint: str) -> dict:
        await self._ensure_client()
        response = await self._client.get(endpoint)
        if response.status_code == 401:
            await self.refresh_token()
            response = await self._client.get(endpoint)
        response.raise_for_status()
        return response.json()

    async def get_all(self, endpoint: str) -> list:
        results = []
        data = await self.get(endpoint)
        results.extend(data.get("value", []))
        while "@odata.nextLink" in data:
            next_url = data["@odata.nextLink"]
            next_endpoint = next_url.replace(settings.graph_api_base, "")
            data = await self.get(next_endpoint)
            results.extend(data.get("value", []))
        return results

    async def patch(self, endpoint: str, data: dict) -> dict:
        await self._ensure_client()
        response = await self._client.patch(endpoint, json=data)
        if response.status_code == 401:
            await self.refresh_token()
            response = await self._client.patch(endpoint, json=data)
        response.raise_for_status()
        if response.status_code == 204:
            return {}
        return response.json()

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None


graph_client = GraphClient()
