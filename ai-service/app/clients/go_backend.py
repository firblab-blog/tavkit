"""Client for calling the Go backend API."""
import httpx
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class GoBackendClient:
    """Client for interacting with the Go backend API."""
    
    def __init__(self, base_url: str = "http://backend:8080"):
        """
        Initialize the Go backend client.
        
        Args:
            base_url: Base URL of the Go backend API
        """
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def get_campaign_context(self, campaign_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch campaign context from the Go backend.
        
        Args:
            campaign_id: ID of the campaign to fetch context for
            
        Returns:
            Campaign context dict with campaign metadata, summaries, etc.
            Returns None if the request fails.
        """
        try:
            url = f"{self.base_url}/api/v1/campaigns/{campaign_id}/context"
            logger.info(f"[GO_BACKEND] Fetching campaign context: GET {url}")
            
            response = await self.client.get(url)
            
            if response.status_code == 200:
                context = response.json()
                logger.info(f"[GO_BACKEND] Campaign context retrieved ({len(str(context))} chars)")
                return context
            else:
                logger.warning(
                    f"[GO_BACKEND] Failed to fetch campaign context: "
                    f"status={response.status_code}, campaign_id={campaign_id}"
                )
                return None
                
        except Exception as e:
            logger.error(f"[GO_BACKEND] Error fetching campaign context: {e}", exc_info=True)
            return None
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()


# Global instance
_go_backend_client: Optional[GoBackendClient] = None


def get_go_backend_client() -> GoBackendClient:
    """Get or create the global Go backend client instance."""
    global _go_backend_client
    if _go_backend_client is None:
        _go_backend_client = GoBackendClient()
    return _go_backend_client
