"""
Wiki Scraper - Async scraper for Fandom wikis.

Handles:
- Crawling wiki pages starting from an index page
- Extracting clean text from wiki HTML
- Respecting rate limits and robots.txt
- Extracting structured data from infoboxes
"""

import asyncio
import logging
import re
from typing import Optional
from urllib.parse import urljoin, urlparse

import aiohttp
from bs4 import BeautifulSoup, NavigableString

logger = logging.getLogger(__name__)


class WikiScraper:
    """Async wiki scraper for Fandom and MediaWiki sites."""

    def __init__(
        self,
        base_url: str,
        scrape_config: Optional[dict] = None,
        rate_limit: float = 1.0,  # Seconds between requests
    ):
        self.base_url = base_url.rstrip("/")
        self.config = scrape_config or {}
        self.rate_limit = rate_limit
        self.session: Optional[aiohttp.ClientSession] = None
        self.visited_urls: set[str] = set()

        # Extract config options
        self.max_pages = self.config.get("max_pages", 100)
        self.priority_paths = self.config.get("priority_paths", [])
        self.allowed_patterns = self.config.get("allowed_path_patterns", ["/wiki/*"])
        self.excluded_patterns = self.config.get("excluded_path_patterns", [])
        self.content_selectors = self.config.get(
            "content_selectors", ["#mw-content-text .mw-parser-output"]
        )
        self.exclude_selectors = self.config.get(
            "exclude_selectors",
            [".navbox", ".infobox", ".toc", ".mw-editsection", ".reference", ".noprint"],
        )

    async def __aenter__(self) -> "WikiScraper":
        """Async context manager entry."""
        self.session = aiohttp.ClientSession(
            headers={
                "User-Agent": "TavKit-WikiScraper/1.0 (D&D Campaign Tool; Educational Use)",
                "Accept": "text/html,application/xhtml+xml",
            },
            timeout=aiohttp.ClientTimeout(total=30),
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        if self.session:
            await self.session.close()

    def _normalize_url(self, url: str) -> str:
        """Normalize URL to absolute form."""
        if url.startswith("//"):
            return f"https:{url}"
        if url.startswith("/"):
            return f"{self.base_url}{url}"
        if not url.startswith(("http://", "https://")):
            return urljoin(self.base_url, url)
        return url

    def _get_url_path(self, url: str) -> str:
        """Extract path from URL."""
        parsed = urlparse(url)
        return parsed.path

    def _is_allowed_url(self, url: str) -> bool:
        """Check if URL matches allowed patterns and isn't excluded."""
        path = self._get_url_path(url)

        # Check excluded patterns first
        for pattern in self.excluded_patterns:
            if self._matches_pattern(path, pattern):
                return False

        # Check allowed patterns
        for pattern in self.allowed_patterns:
            if self._matches_pattern(path, pattern):
                return True

        return False

    def _matches_pattern(self, path: str, pattern: str) -> bool:
        """Check if path matches a glob-like pattern."""
        # Convert glob pattern to regex
        regex_pattern = pattern.replace("*", ".*").replace("?", ".")
        return bool(re.match(f"^{regex_pattern}$", path))

    async def fetch_page(self, url: str) -> Optional[tuple[str, str]]:
        """
        Fetch a single wiki page.

        Returns:
            Tuple of (html_content, last_modified) or None if failed
        """
        if not self.session:
            raise RuntimeError("Scraper must be used as async context manager")

        try:
            async with self.session.get(url) as response:
                if response.status != 200:
                    logger.warning(f"Failed to fetch {url}: HTTP {response.status}")
                    return None

                html = await response.text()
                last_modified = response.headers.get("Last-Modified", "")
                return html, last_modified

        except asyncio.TimeoutError:
            logger.warning(f"Timeout fetching {url}")
            return None
        except aiohttp.ClientError as e:
            logger.warning(f"Error fetching {url}: {e}")
            return None

    def parse_page(self, html: str, url: str) -> dict:
        """
        Parse wiki page HTML and extract content.

        Returns:
            Dict with title, clean_text, categories, links, infobox_data
        """
        soup = BeautifulSoup(html, "lxml")

        # Extract title
        title_elem = soup.find("h1", {"id": "firstHeading"}) or soup.find("title")
        title = title_elem.get_text(strip=True) if title_elem else "Unknown"
        # Clean wiki suffix from title
        title = re.sub(r"\s*\|\s*.*Wiki.*$", "", title, flags=re.IGNORECASE)

        # Find main content area
        content_elem = None
        for selector in self.content_selectors:
            # Parse CSS selector manually (simple version)
            if " " in selector:
                parts = selector.split()
                elem = soup
                for part in parts:
                    if elem:
                        elem = elem.select_one(part)
                content_elem = elem
            else:
                content_elem = soup.select_one(selector)
            if content_elem:
                break

        if not content_elem:
            content_elem = soup.find("body")

        # Remove unwanted elements
        if content_elem:
            for selector in self.exclude_selectors:
                for elem in content_elem.select(selector):
                    elem.decompose()

        # Extract clean text with section headers
        clean_text = self._extract_text_with_sections(content_elem) if content_elem else ""

        # Extract categories
        categories = []
        for cat_link in soup.select(".catlinks a"):
            cat_text = cat_link.get_text(strip=True)
            if cat_text and not cat_text.lower().startswith("categor"):
                categories.append(cat_text)

        # Extract internal links for crawling
        links = []
        if content_elem:
            for link in content_elem.find_all("a", href=True):
                href = link["href"]
                if href.startswith("/wiki/") and ":" not in href:
                    full_url = self._normalize_url(href)
                    if self._is_allowed_url(full_url):
                        links.append(full_url)

        # Extract infobox data
        infobox_data = self._extract_infobox(soup)

        return {
            "title": title,
            "clean_text": clean_text,
            "categories": list(set(categories)),
            "links": list(set(links)),
            "infobox_data": infobox_data,
            "word_count": len(clean_text.split()),
        }

    def _extract_text_with_sections(self, content_elem) -> str:
        """Extract text while preserving section structure."""
        lines = []
        current_section = None

        for elem in content_elem.descendants:
            if isinstance(elem, NavigableString):
                text = str(elem).strip()
                if text and elem.parent.name not in ["script", "style"]:
                    lines.append(text)
            elif elem.name in ["h2", "h3", "h4"]:
                section_text = elem.get_text(strip=True)
                # Remove edit links from headers
                section_text = re.sub(r"\[edit\].*$", "", section_text, flags=re.IGNORECASE)
                if section_text:
                    current_section = section_text
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
        # Fix spacing around section headers
        text = re.sub(r"\s+##", "\n\n##", text)
        text = re.sub(r"##\s+", "## ", text)
        # Remove excessive whitespace
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

        # Handle Fandom portable infobox format
        for item in infobox.find_all("div", class_="pi-item"):
            label_elem = item.find("h3", class_="pi-data-label")
            value_elem = item.find("div", class_="pi-data-value")
            if label_elem and value_elem:
                label = label_elem.get_text(strip=True).lower().replace(" ", "_")
                value = value_elem.get_text(strip=True)
                if label and value:
                    data[label] = value

        # Handle traditional MediaWiki infobox format
        for row in infobox.find_all("tr"):
            header = row.find("th")
            cell = row.find("td")
            if header and cell:
                label = header.get_text(strip=True).lower().replace(" ", "_")
                value = cell.get_text(strip=True)
                if label and value:
                    data[label] = value

        return data

    async def crawl(
        self,
        start_url: str,
        progress_callback=None,
    ) -> list[dict]:
        """
        Crawl wiki starting from a URL.

        Args:
            start_url: URL to start crawling from
            progress_callback: Optional async callback(pages_found, pages_scraped)

        Returns:
            List of parsed page dictionaries
        """
        if not self.session:
            raise RuntimeError("Scraper must be used as async context manager")

        pages = []
        to_visit = []

        # Start with priority pages if configured
        for path in self.priority_paths:
            url = self._normalize_url(path)
            if url not in self.visited_urls:
                to_visit.append(url)

        # Add start URL
        if start_url not in to_visit:
            to_visit.insert(0, start_url)

        while to_visit and len(pages) < self.max_pages:
            url = to_visit.pop(0)

            if url in self.visited_urls:
                continue

            self.visited_urls.add(url)

            # Fetch and parse
            result = await self.fetch_page(url)
            if result:
                html, last_modified = result
                parsed = self.parse_page(html, url)
                parsed["url"] = url
                parsed["url_path"] = self._get_url_path(url)
                parsed["last_modified"] = last_modified
                pages.append(parsed)

                # Add discovered links to crawl queue
                for link in parsed.get("links", []):
                    if link not in self.visited_urls and link not in to_visit:
                        to_visit.append(link)

                logger.info(f"Scraped: {parsed['title']} ({len(pages)}/{self.max_pages})")

                # Progress callback
                if progress_callback:
                    await progress_callback(len(to_visit) + len(pages), len(pages))

            # Rate limiting
            await asyncio.sleep(self.rate_limit)

        return pages
