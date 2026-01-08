# Tavkit AI Service

AI-powered content generation service for Tavkit, providing LLM-based generation of D&D NPCs, monsters, encounters, and dialogues.

## Features

- NPC generation with personality traits and backstories
- Monster creation with stat blocks
- Encounter building
- Dialogue generation
- Support for multiple LLM providers (OpenAI, Anthropic, Ollama)

## Setup

```bash
pip install .
```

## Configuration

Set environment variables or use `.env` file:
- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Anthropic API key
- `OLLAMA_BASE_URL`: Ollama server URL (default: http://localhost:11434)

## Running

```bash
uvicorn app.main:app --reload
```
