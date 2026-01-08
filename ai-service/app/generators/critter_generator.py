"""
Critter generator using AI provider.
"""

from app.providers.base import AIProvider
from app.prompts.critter_prompts import get_critter_prompt
from app.utils.response_utils import clean_json_response, repair_json
from app.utils.schema_validator import extract_fields, CRITTER_SCHEMA
from app.clients.go_backend import get_go_backend_client
import json


class CritterGenerator:
    def __init__(self, provider: AIProvider):
        self.provider = provider

    async def generate(
        self,
        critter_type: str = "mammal",
        size: str = "medium",
        temperament: str = "neutral",
        habitat: str = "forest",
        special_requests: str = "",
        campaign_id: str = None,  # Changed from campaign_context
        game_system: str = "dnd5e",
        max_tokens: int = 2000,
        timeout: int = 60,
        prompt: str = None,  # Optional: use raw prompt instead of template
    ) -> dict:
        """Generate a critter using the AI provider."""

        system_prompt = get_critter_prompt("system")
        
        # Fetch campaign context if campaign_id provided
        campaign_context = None
        if campaign_id:
            go_client = get_go_backend_client()
            campaign_context = await go_client.get_campaign_context(campaign_id)
        
        # Use provided prompt or build from template
        if prompt:
            user_prompt = prompt
            # Add campaign context summary if available
            if campaign_context:
                # Extract the campaign summary fields from Go backend response
                summary_parts = []
                
                # Get campaign basic info
                campaign = campaign_context.get("campaign", {})
                if campaign.get("name"):
                    summary_parts.append(f"Campaign: {campaign['name']}")
                if campaign.get("game_system"):
                    summary_parts.append(f"System: {campaign['game_system']}")
                if campaign.get("magic_level"):
                    summary_parts.append(f"Magic Level: {campaign['magic_level']}")
                if campaign.get("theme"):
                    summary_parts.append(f"Theme: {campaign['theme']}")
                if campaign.get("tone"):
                    summary_parts.append(f"Tone: {campaign['tone']}")
                
                # Get the AI-generated summaries (this is the good stuff!)
                summary_data = campaign_context.get("summary", {})
                if summary_data.get("overview"):
                    summary_parts.append(f"\nOverview: {summary_data['overview']}")
                if summary_data.get("setting_summary"):
                    summary_parts.append(f"\nSetting: {summary_data['setting_summary']}")
                if summary_data.get("characters_summary"):
                    summary_parts.append(f"\nKey Characters: {summary_data['characters_summary']}")
                if summary_data.get("plot_summary"):
                    summary_parts.append(f"\nPlot: {summary_data['plot_summary']}")
                if summary_data.get("tone_summary"):
                    summary_parts.append(f"\nTone: {summary_data['tone_summary']}")
                
                if summary_parts:
                    campaign_summary = "\n".join(summary_parts)
                    print(f"[GENERATOR] Campaign summary created ({len(campaign_summary)} chars):")
                    print(campaign_summary)
                    print("[GENERATOR] ---END SUMMARY---")
                    user_prompt += f"\n\nCampaign Context:\n{campaign_summary}"
                else:
                    print(f"[GENERATOR] Could not extract campaign summary from context")
            elif campaign_context:
                # Small context, include it all
                print(f"[GENERATOR] Including full campaign context ({len(str(campaign_context))} chars)")
                user_prompt += f"\n\nCampaign Context:\n{campaign_context}"
        else:
            user_prompt_template = get_critter_prompt("user")
            # Format user prompt with parameters
            user_prompt = user_prompt_template.format(
                critter_type=critter_type,
                size=size,
                temperament=temperament,
                habitat=habitat,
                special_requests=f"\nSpecial Requests: {special_requests}" if special_requests else "",
                campaign_context=f"\nCampaign Context: {campaign_context}" if campaign_context else "",
            )

        # Generate critter
        print(f"[GENERATOR] Calling AI provider with:")
        print(f"  - user_prompt length: {len(user_prompt)}")
        print(f"  - system_prompt length: {len(system_prompt)}")
        print(f"  - max_tokens: {max_tokens}")
        print(f"  - user_prompt preview: {user_prompt[:300]}...")
        
        response = await self.provider.generate(
            prompt=user_prompt,
            system_prompt=system_prompt,
            json_mode=True,
            max_tokens=max_tokens,
            timeout=timeout,
        )
        
        print(f"[GENERATOR] Received response from AI provider:")
        print(f"  - response length: {len(response)}")
        print(f"  - response preview: {response[:300]}...")

        # Parse JSON response (clean fences and markdown from all providers)
        raw = clean_json_response(response.strip())

        # Try to repair common JSON issues
        raw = repair_json(raw)

        try:
            critter_raw = json.loads(raw)
        except json.JSONDecodeError as e:
            # Log the error with more context
            print(f"[ERROR] JSON parse error at position {e.pos}: {e.msg}")
            print(f"[ERROR] Raw response length: {len(raw)}")
            print(f"[ERROR] First 500 chars: {raw[:500]}")
            print(
                f"[ERROR] Around error position: {raw[max(0, e.pos-100):min(len(raw), e.pos+100)]}"
            )
            raise ValueError(f"Failed to parse critter JSON: {e}")

        # Extract only expected fields, filtering out any unexpected AI additions
        critter = extract_fields(critter_raw, CRITTER_SCHEMA, strict=False)
        return critter
