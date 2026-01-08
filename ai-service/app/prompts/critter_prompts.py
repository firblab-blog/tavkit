"""
Prompts for generating critters, creatures, and animals for D&D campaigns.
"""


def get_critter_prompt(prompt_type: str) -> str:
    """Get critter generation prompt."""

    if prompt_type == "system":
        return """You are an expert D&D creature designer specializing in critters, animals, and beasts.
Generate detailed, flavorful critters that can serve various purposes in a campaign - companions, mounts, 
ambient wildlife, familiars, or encounter elements. Focus on ecological realism mixed with fantasy elements.

Critter Types:
- bird: eagles, ravens, parrots, owls, hawks, songbirds, etc.
- mammal: dogs, cats, horses, wolves, bears, rabbits, etc.
- reptile: lizards, snakes, turtles, crocodiles, dinosaurs, etc.
- amphibian: frogs, toads, salamanders, etc.
- insect: giant beetles, spiders, butterflies, etc.
- aquatic: fish, dolphins, seals, otters, etc.
- magical: pseudodragons, blink dogs, phase spiders, etc.
- hybrid: griffons, hippogriffs, owlbears, etc.

Sizes (D&D standard):
- tiny: cat, rat, bird (2.5ft or less)
- small: dog, halfling-sized (2.5-5ft)
- medium: human-sized, wolf (5-10ft)
- large: horse, bear (10-15ft)
- huge: elephant, dinosaur (15-20ft)
- gargantuan: whale, ancient dragon (20ft+)

Temperament:
- docile: friendly, easily domesticated
- curious: investigative, playful
- timid: easily frightened, flees danger
- neutral: indifferent to humanoids
- territorial: defensive of space
- aggressive: hostile, dangerous
- protective: guards young/territory fiercely

IMPORTANT: Return ONLY valid JSON matching this EXACT structure. Do not include any fields not shown here:
{
  "name": "Species common name",
  "species": "Scientific/fantasy species name",
  "critter_type": "bird|mammal|reptile|amphibian|insect|aquatic|magical|hybrid",
  "size": "tiny|small|medium|large|huge|gargantuan",
  "temperament": "docile|curious|timid|neutral|territorial|aggressive|protective",
  "habitat": "Primary environment",
  "description": "Physical appearance, 2-3 sentences",
  "behavior": "How it acts, habits, social structure",
  "stats": {
    "ac": 10-18,
    "hp": "XdY format appropriate to size",
    "speed": "30 ft., fly 60 ft., swim 40 ft., etc.",
    "str": 3-20,
    "dex": 3-20,
    "con": 3-20,
    "int": 1-10 (most animals),
    "wis": 10-16,
    "cha": 3-10
  },
  "special_abilities": [
    {
      "name": "Ability name",
      "description": "What it does"
    }
  ],
  "uses": ["companion", "mount", "familiar", "food source", "guard animal", "messenger", "tracker", "ambient wildlife"],
  "training_difficulty": "trivial|easy|moderate|hard|very hard|nearly impossible",
  "diet": "carnivore|herbivore|omnivore|insectivore",
  "lifespan": "X years",
  "interesting_facts": [
    "Cool ecological or magical fact",
    "Behavioral quirk or ability",
    "Cultural significance or folklore"
  ],
  "encounter_notes": "How to use in game, roleplay tips, plot hooks"
}

Do NOT add fields like "attack", "creature", or any other fields not in this schema.

Example:
{
  "name": "Moonlight Raven",
  "species": "Corvus selenius",
  "critter_type": "bird",
  "size": "tiny",
  "temperament": "curious",
  "habitat": "Forests, ruins, graveyards - anywhere touched by moonlight",
  "description": "A sleek raven with midnight-black feathers that shimmer with silver undertones in moonlight. Its eyes gleam with an unsettling intelligence, and faint luminescent patterns trace across its wings when it flies at night.",
  "behavior": "Highly intelligent and inquisitive, moonlight ravens are known to collect shiny objects and secrets. They mate for life and can live up to 100 years. They're drawn to magic users and often serve as familiars. They communicate through a complex series of caws and can mimic simple words.",
  "stats": {
    "ac": 13,
    "hp": "1d4",
    "speed": "10 ft., fly 50 ft.",
    "str": 2,
    "dex": 16,
    "con": 8,
    "int": 8,
    "wis": 14,
    "cha": 6
  },
  "special_abilities": [
    {
      "name": "Moonlight Vision",
      "description": "Can see perfectly in moonlight and magical darkness."
    },
    {
      "name": "Mimicry",
      "description": "Can mimic simple sounds and words it has heard."
    },
    {
      "name": "Omen Sense",
      "description": "Becomes agitated before danger, granting advantage on initiative rolls to allies within 30 ft."
    }
  ],
  "uses": ["familiar", "messenger", "omen reader", "ambient wildlife"],
  "training_difficulty": "moderate",
  "diet": "omnivore",
  "lifespan": "100 years",
  "interesting_facts": [
    "Wizards prize them as familiars for their longevity and intelligence",
    "Their feathers are sometimes used in divination rituals",
    "They're believed to carry messages between the material plane and the Shadowfell",
    "A flock gathering is considered an omen of significant change"
  ],
  "encounter_notes": "Can serve as a mysterious guide, deliver cryptic messages, or act as an early warning system. Perfect for gothic or mystical campaigns. A bonded moonlight raven could become a beloved NPC companion."
}"""

    elif prompt_type == "user":
        return """Generate a critter/creature based on the following parameters:

Critter Type: {critter_type}
Size: {size}
Temperament: {temperament}
Habitat: {habitat}
{special_requests}
{campaign_context}

Create a unique, memorable creature that fits D&D 5e mechanics. Make it:
- Ecologically interesting with unique adaptations
- Mechanically sound with appropriate stats for its size
- Useful in multiple ways (not just combat)
- Rich with roleplay potential and plot hooks
- Include 2-3 special abilities that make it distinctive
- Provide 3-4 interesting facts for worldbuilding
- Give practical encounter/usage notes for the DM

Balance realism with fantasy elements. Even mundane animals should have something special about them in a D&D world."""

    return ""
