"""
MediaWiki API Client - Async client for MediaWiki API.

Uses the official MediaWiki API for reliable, bot-friendly access to wiki content.
This is the preferred method for Fandom wikis and other MediaWiki-based sites.

API Documentation: https://www.mediawiki.org/wiki/API:Main_page
"""

import asyncio
import logging
import re
from typing import Optional
from urllib.parse import urlparse

import aiohttp
from bs4 import BeautifulSoup, NavigableString

logger = logging.getLogger(__name__)


class MediaWikiAPIClient:
    """
    Async client for MediaWiki API.

    Provides reliable access to wiki content without triggering bot protection.
    """

    def __init__(
        self,
        base_url: str,
        scrape_config: Optional[dict] = None,
        rate_limit: float = 0.5,  # Seconds between requests (API is more tolerant)
        max_retries: int = 3,
        retry_delay: float = 2.0,
    ):
        """
        Initialize MediaWiki API client.

        Args:
            base_url: Wiki base URL (e.g., "https://eberron.fandom.com")
            scrape_config: Configuration dict with max_pages, excluded patterns, etc.
            rate_limit: Seconds between API requests
            max_retries: Maximum retry attempts for failed requests
            retry_delay: Base delay for exponential backoff
        """
        self.base_url = base_url.rstrip("/")
        self.api_url = f"{self.base_url}/api.php"
        self.config = scrape_config or {}
        self.rate_limit = rate_limit
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.session: Optional[aiohttp.ClientSession] = None

        # Config options
        self.max_pages = self.config.get("max_pages", 100)
        self.excluded_patterns = self.config.get("excluded_path_patterns", [])
        self.exclude_selectors = self.config.get(
            "exclude_selectors",
            [".navbox", ".infobox", ".toc", ".mw-editsection", ".reference", ".noprint"],
        )

    async def __aenter__(self) -> "MediaWikiAPIClient":
        """Async context manager entry."""
        self.session = aiohttp.ClientSession(
            headers={
                "User-Agent": "TavKit/1.0 (D&D Campaign Tool; Educational Use; "
                "https://github.com/firblab/tavkit)",
                "Accept": "application/json",
            },
            timeout=aiohttp.ClientTimeout(total=60),
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        if self.session:
            await self.session.close()

    def _is_fandom_wiki(self) -> bool:
        """Check if this is a Fandom wiki."""
        return "fandom.com" in self.base_url

    async def _api_request(self, params: dict) -> Optional[dict]:
        """
        Make an API request with retry logic.

        Args:
            params: API parameters

        Returns:
            JSON response dict or None if failed
        """
        if not self.session:
            raise RuntimeError("Client must be used as async context manager")

        params["format"] = "json"

        for attempt in range(self.max_retries):
            try:
                async with self.session.get(self.api_url, params=params) as response:
                    if response.status == 200:
                        return await response.json()

                    logger.warning(
                        f"API request failed: HTTP {response.status} "
                        f"(attempt {attempt + 1}/{self.max_retries})"
                    )

            except asyncio.TimeoutError:
                logger.warning(f"API timeout (attempt {attempt + 1}/{self.max_retries})")
            except aiohttp.ClientError as e:
                logger.warning(
                    f"API error: {e} (attempt {attempt + 1}/{self.max_retries})"
                )

            # Exponential backoff
            if attempt < self.max_retries - 1:
                delay = self.retry_delay * (2**attempt)
                logger.info(f"Retrying in {delay}s...")
                await asyncio.sleep(delay)

        return None

    async def check_api_available(self) -> bool:
        """Check if the MediaWiki API is available."""
        print(f"[API] Checking API availability at {self.api_url}")
        result = await self._api_request(
            {"action": "query", "meta": "siteinfo", "siprop": "general"}
        )
        available = result is not None and "query" in result
        print(f"[API] API available: {available}")
        return available

    async def get_all_pages(
        self,
        namespace: int = 0,
        limit_per_request: int = 50,
        progress_callback=None,
    ) -> list[dict]:
        """
        Get list of all pages in namespace.

        Args:
            namespace: MediaWiki namespace (0 = main articles)
            limit_per_request: Pages per API request (max 500)
            progress_callback: Optional async callback(total_found)

        Returns:
            List of page info dicts with pageid, title
        """
        pages = []
        continue_token = None

        while len(pages) < self.max_pages:
            params = {
                "action": "query",
                "list": "allpages",
                "apnamespace": namespace,
                "aplimit": min(limit_per_request, self.max_pages - len(pages)),
            }

            if continue_token:
                params["apcontinue"] = continue_token

            result = await self._api_request(params)
            if not result or "query" not in result:
                break

            batch = result["query"].get("allpages", [])
            for page in batch:
                # Filter excluded patterns
                title = page.get("title", "")
                if not self._is_excluded(title):
                    pages.append(page)

            if progress_callback:
                await progress_callback(len(pages))

            # Check for continuation
            if "continue" in result:
                continue_token = result["continue"].get("apcontinue")
            else:
                break

            await asyncio.sleep(self.rate_limit)

        return pages[: self.max_pages]

    def _is_excluded(self, title: str) -> bool:
        """Check if a page title should be excluded."""
        # Convert title to path format for pattern matching
        path = f"/wiki/{title.replace(' ', '_')}"

        for pattern in self.excluded_patterns:
            regex_pattern = pattern.replace("*", ".*").replace("?", ".")
            if re.match(f"^{regex_pattern}$", path):
                return True

        return False

    async def get_page_content(self, title: str) -> Optional[dict]:
        """
        Get parsed content for a single page.

        Args:
            title: Page title

        Returns:
            Dict with title, html, categories, or None if failed
        """
        result = await self._api_request(
            {
                "action": "parse",
                "page": title,
                "prop": "text|categories|revid",
                "disabletoc": "true",
            }
        )

        if not result or "parse" not in result:
            if result and "error" in result:
                logger.warning(f"API error for '{title}': {result['error']}")
            return None

        parse_data = result["parse"]

        return {
            "title": parse_data.get("title", title),
            "pageid": parse_data.get("pageid"),
            "revid": parse_data.get("revid"),
            "html": parse_data.get("text", {}).get("*", ""),
            "categories": [
                cat.get("*", "") for cat in parse_data.get("categories", [])
            ],
        }

    def parse_html_content(self, html: str, title: str) -> dict:
        """
        Parse HTML content from API into clean text.

        Args:
            html: Raw HTML from API
            title: Page title

        Returns:
            Dict with clean_text, infobox_data, word_count
        """
        soup = BeautifulSoup(html, "lxml")

        # Remove unwanted elements
        for selector in self.exclude_selectors:
            for elem in soup.select(selector):
                elem.decompose()

        # Extract clean text with sections
        clean_text = self._extract_text_with_sections(soup)

        # Extract infobox data
        infobox_data = self._extract_infobox(soup)

        return {
            "clean_text": clean_text,
            "infobox_data": infobox_data,
            "word_count": len(clean_text.split()),
        }

    def _extract_text_with_sections(self, soup: BeautifulSoup) -> str:
        """Extract text while preserving section structure."""
        lines = []

        for elem in soup.descendants:
            if isinstance(elem, NavigableString):
                text = str(elem).strip()
                if text and elem.parent.name not in ["script", "style"]:
                    lines.append(text)
            elif elem.name in ["h2", "h3", "h4"]:
                section_text = elem.get_text(strip=True)
                section_text = re.sub(
                    r"\[edit\].*$", "", section_text, flags=re.IGNORECASE
                )
                if section_text:
                    lines.append(f"\n## {section_text}\n")
            elif elem.name == "p":
                text = elem.get_text(strip=True)
                if text:
                    lines.append(text + "\n")
            elif elem.name == "li":
                text = elem.get_text(strip=True)
                if text:
                    lines.append(f"- {text}")

        # Join and clean up
        text = " ".join(lines)
        text = re.sub(r"\s+##", "\n\n##", text)
        text = re.sub(r"##\s+", "## ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r" {2,}", " ", text)

        return text.strip()

    def _extract_infobox(self, soup: BeautifulSoup) -> dict:
        """Extract structured data from wiki infobox."""
        infobox = soup.find("aside", class_="portable-infobox") or soup.find(
            "table", class_="infobox"
        )

        if not infobox:
            return {}

        data = {}

        # Fandom portable infobox format
        for item in infobox.find_all("div", class_="pi-item"):
            label_elem = item.find("h3", class_="pi-data-label")
            value_elem = item.find("div", class_="pi-data-value")
            if label_elem and value_elem:
                label = label_elem.get_text(strip=True).lower().replace(" ", "_")
                value = value_elem.get_text(strip=True)
                if label and value:
                    data[label] = value

        # Traditional MediaWiki infobox format
        for row in infobox.find_all("tr"):
            header = row.find("th")
            cell = row.find("td")
            if header and cell:
                label = header.get_text(strip=True).lower().replace(" ", "_")
                value = cell.get_text(strip=True)
                if label and value:
                    data[label] = value

        return data

    async def crawl(self, progress_callback=None) -> list[dict]:
        """
        Crawl wiki using the MediaWiki API.

        Args:
            progress_callback: Optional async callback(pages_found, pages_scraped)

        Returns:
            List of parsed page dictionaries
        """
        if not self.session:
            raise RuntimeError("Client must be used as async context manager")

        # Check API availability
        if not await self.check_api_available():
            print(f"[API] MediaWiki API not available at {self.api_url}")
            logger.error(f"MediaWiki API not available at {self.api_url}")
            return []

        print(f"[API] Using MediaWiki API at {self.api_url}")
        logger.info(f"Using MediaWiki API at {self.api_url}")

        # Get list of all pages
        print("[API] Fetching page list...")
        logger.info("Fetching page list...")

        async def page_list_progress(count):
            if progress_callback:
                await progress_callback(count, 0)

        page_list = await self.get_all_pages(progress_callback=page_list_progress)
        total_pages = len(page_list)
        print(f"[API] Found {total_pages} pages to scrape")
        logger.info(f"Found {total_pages} pages to scrape")

        # Fetch content for each page
        pages = []
        for i, page_info in enumerate(page_list):
            title = page_info.get("title", "")

            content = await self.get_page_content(title)
            if content:
                parsed = self.parse_html_content(content["html"], title)

                page_data = {
                    "title": content["title"],
                    "url": f"{self.base_url}/wiki/{title.replace(' ', '_')}",
                    "url_path": f"/wiki/{title.replace(' ', '_')}",
                    "clean_text": parsed["clean_text"],
                    "categories": content["categories"],
                    "infobox_data": parsed["infobox_data"],
                    "word_count": parsed["word_count"],
                    "last_modified": "",  # API doesn't provide this easily
                    "links": [],  # Not needed for API-based crawling
                }
                pages.append(page_data)

                logger.info(f"Scraped: {title} ({len(pages)}/{total_pages})")

            if progress_callback:
                await progress_callback(total_pages, len(pages))

            await asyncio.sleep(self.rate_limit)

        return pages
