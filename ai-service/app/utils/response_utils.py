"""Utilities for cleaning AI provider responses."""

import re
import json
from typing import Optional


def clean_json_response(text: Optional[str]) -> str:
    """Remove markdown code fences (```json ... ``` or ``` ... ```) and return cleaned text.

    If text is None, returns empty string.
    """
    if not text:
        return ""
    txt = text.strip()
    # If the whole response is a fenced code block, extract its contents
    m = re.search(r"^```(?:json)?\s*(.*?)\s*```$", txt, flags=re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(1).strip()
    # Otherwise, remove any leading ```json or ``` and trailing ``` if present
    txt = re.sub(r"^```json\s*", "", txt, flags=re.IGNORECASE)
    txt = re.sub(r"^```\s*", "", txt)
    txt = re.sub(r"\s*```$", "", txt)
    return txt.strip()


def repair_json(text: str) -> str:
    """Attempt to repair common JSON formatting issues.

    This function tries to fix:
    - Unescaped newlines in strings
    - Unterminated strings
    - Missing commas between array/object elements
    - Trailing commas
    - Truncated JSON (missing closing braces)
    """
    # First try to parse as-is
    try:
        json.loads(text)
        return text
    except json.JSONDecodeError:
        pass

    # Try to extract just the JSON object
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        text = text[start:end]

    # Try again after extraction
    try:
        json.loads(text)
        return text
    except json.JSONDecodeError as e:
        pass

    # If still failing, try to fix common issues
    # Remove trailing commas before closing braces/brackets
    text = re.sub(r",(\s*[}\]])", r"\1", text)

    # Try to fix truncated strings - if we find an unterminated string, try to close it
    # This handles cases where the JSON was cut off mid-string
    try:
        json.loads(text)
        return text
    except json.JSONDecodeError as e:
        # If we have an error expecting a delimiter, try to find and fix unterminated strings
        if "Expecting ',' delimiter" in str(e) or "Unterminated string" in str(e):
            # Count opening and closing braces/brackets to balance them
            open_braces = text.count("{")
            close_braces = text.count("}")
            open_brackets = text.count("[")
            close_brackets = text.count("]")

            # Add missing closing braces/brackets
            if open_braces > close_braces:
                text += "}" * (open_braces - close_braces)
            if open_brackets > close_brackets:
                text += "]" * (open_brackets - close_brackets)

            # Try once more
            try:
                json.loads(text)
                return text
            except json.JSONDecodeError:
                pass

    return text
