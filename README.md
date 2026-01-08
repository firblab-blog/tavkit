<p align="center">
  <img src="https://github.com/firblab-blog/tavkit/releases/download/assets/tavkit-logo-master.png" alt="TavKit Logo" width="200">
</p>

# TavKit - Tavern Toolkit

A web app I built to help me run D&D campaigns. It started as a way to keep my browser tabs organized, and turned into something that actually makes prep and session running easier.

![TavKit Home](https://github.com/firblab-blog/tavkit/releases/download/assets/home.gif)

## What is this?

I got tired of having 47 browser tabs open during game sessions, losing track of NPCs I made up on the spot, and forgetting which merchant the party already visited. TavKit is my solution to that mess.

It's built around two distinct workflows:
1. **Artificer's Toolkit** - Generate and organize content before the session
2. **Tavern Toolkit** - View content and run interactive encounters during the session

The AI generation stuff is built to understand your campaign context. It reads through your existing content—NPCs, locations, session notes, lore—and builds a summary that feeds into every generator. When you generate a new location, it knows about your existing NPCs and places and weaves them into the results. No more accidentally contradicting yourself three sessions later.

## What's Actually Built

### Campaign Management
- Create multiple campaigns with their own settings, themes, and details
- AI-generated Campaign Summaries that provide context for all content generation
- Control exactly what content gets included in the summary
- Track which content belongs to which campaign

![Campaign Summary](https://github.com/firblab-blog/tavkit/releases/download/assets/campaign-summary.gif)

### Artificer's Toolkit (Content Generation)

Generate campaign content with AI that understands your world:

- **NPCs** - Characters with personalities, backstories, and stats
- **Monsters** - Creatures with combat stats and tactics
- **Locations** - Places with features, secrets, and plot hooks
- **Quests** - Adventures with objectives and complications
- **Items** - Equipment and magic items with history
- **Encounters** - Combat scenarios balanced for your party
- **Dialogues** - Conversation trees with skill checks
- **Rumors** - Plot hooks and world-building flavor
- **Taverns** - Inns with keepers, menus, patrons, and rumors
- **Merchants** - Shops with inventory, owners, and haggling willingness
- **Traps** - Hazards with triggers, effects, and solutions
- **Critters** - Small creatures, familiars, and companions
- **Chases** - Pursuit scenarios with obstacles and complications

Every generator can save directly to your campaign with one click. The content shows up in the Campaign Ledger immediately.

### Tavern Toolkit (Session Running)

Tools for viewing content and running live gameplay:

- **Campaign Ledger** - Browse all your campaign content organized by type. View NPCs, Locations, Sessions, Lore, GM Notes, and everything else. Search, filter, and edit entries with full markdown support.

![Campaign Sessions](https://github.com/firblab-blog/tavkit/releases/download/assets/campaign-sessions.gif)

- **Guild Roster** - Import player characters from D&D Beyond. Link characters to campaigns and track party composition.

![Guild Roster](https://github.com/firblab-blog/tavkit/releases/download/assets/guild-roster.gif)

- **The Pursuit** - Run chase scenes with distance tracking, obstacle management, and participant tracking. Works with content from the Chase Generator.

Coming eventually:
- **Quest Board** - Job board interface for quest briefings and mission handouts. Works with content from the Quest Generator.
- **The Road** - Travel and exploration manager for overland journeys. Trigger random encounters and discover locations on the fly. Works with content from the Random Encounter and Location Generators.
- **The Brawl** - Combat tracker with initiative, HP, and conditions. Works with content from the Monster and Encounter Generators.
- **The Parley** - Social encounter manager with disposition tracking. Works with content from the NPC and Dialogue Generators.
- **The Gathering** - Tavern session runner for patron interactions. Works with content from the Tavern and Rumor Generators.
- **The Market** - Shopping encounters with haggling mechanics. Works with content from the Merchant and Item Generators.

### External Tool Integration

Embed your favorite D&D sites directly in the app:
- 5etools
- Roll20
- Foundry VTT
- Kobold Fight Club
- Or any custom URL you want

Sites stay loaded when you switch between them—no more losing your scroll position or having to log in again.

![External Tools](https://github.com/firblab-blog/tavkit/releases/download/assets/tavkit-ext-tools.gif)

**Note on D&D Beyond**: Due to browser security restrictions (X-Frame-Options, CORS, third-party script requirements), D&D Beyond cannot be embedded directly. It opens in a new tab instead. Full embedding with login support would require an Electron desktop app wrapper—that's on the future roadmap.

## How It Works

The Campaign Summary is the magic that ties everything together. It reads through all your campaign content and generates a comprehensive overview that feeds into every generator.

When generating new content, you select which campaign to use as context. The AI then knows about your world's themes, existing NPCs, locations, and plot threads. Generate a new location and it might reference NPCs you created earlier or tie into existing places in your world.

The summary regenerates automatically when you add significant new content, keeping everything in sync.

## Themes

TavKit includes multiple color themes to match your style.

## Tech Stack

- **Backend**: Go (Gin framework)
- **Frontend**: React + TypeScript + Vite
- **Database**: PostgreSQL or SQLite (SQLite is zero-config default)
- **AI Service**: Python FastAPI microservice
- **AI Providers**: Anthropic Claude, OpenAI, or local Ollama models

## Security

TavKit has been through comprehensive security audits. Key security features include:

- **Authentication**: JWT tokens in HttpOnly cookies with CSRF protection
- **Password Security**: Argon2id hashing with constant-time comparison
- **SQL Injection**: All queries use parameterized statements
- **XSS Protection**: DOMPurify sanitization for user-generated content
- **SSRF Protection**: Proxy whitelist with private IP blocking
- **Rate Limiting**: Token bucket per-IP throttling

For details, see:
- [Backend Security Audit](docs/BACKEND_SECURITY_AUDIT.md)
- [Frontend Security Audit](docs/FRONTEND_SECURITY_AUDIT.md)

## Getting Started

Check [GETTING_STARTED.md](docs/GETTING_STARTED.md) for setup instructions. You'll need Docker, or you can run things manually if you prefer.

The AI stuff works with:
- **Ollama** (runs locally on your machine—free and private)
- **OpenAI** (if you have an API key)
- **Anthropic Claude** (if you have an API key)

I use Ollama with a local model most of the time. It's fast enough and I don't have to pay per request.

## Contributing

This is a personal project that I'm happy to share. If you find it useful and want to add something or fix something that's broken, pull requests are welcome.

I'm not trying to build the next big SaaS or whatever. This is just a tool I wanted for my games, and if it helps you run your games better, that's cool.

## Built With Help From AI

Yeah, Claude helped me write a lot of this code. Modern software development is weird.

## License

MIT License—use it however you want.

---

Made by someone who got tired of having 47 browser tabs open during game night.