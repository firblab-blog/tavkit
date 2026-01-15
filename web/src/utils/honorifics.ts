/**
 * Fun rotating honorifics/titles for user greetings.
 * A random one is selected on login and persisted for the session.
 */

export const HONORIFICS = [
  // Classic fantasy titles
  "the Magnificent",
  "the Bold",
  "the Wise",
  "the Cunning",
  "the Brave",
  "the Legendary",
  "the Mighty",
  "the Daring",
  "the Illustrious",
  "the Renowned",
  "the Valiant",
  "the Adventurous",
  "the Fearless",
  "the Noble",
  "the Glorious",
  "the Unbreakable",
  "the Steadfast",
  "the Resolute",

  // Fun D&D/TTRPG themed
  "Slayer of Deadlines",
  "Keeper of Dice",
  "Master of Maps",
  "Wielder of the d20",
  "Scribe of Tales",
  "Bane of Goblins",
  "Friend of Dragons",
  "Seeker of Treasure",
  "Tamer of Mimics",
  "Breaker of Curses",
  "Weaver of Plots",
  "Herald of Adventure",
  "Warden of the Realm",
  "Chronicler of Legends",
  "Bringer of Snacks",
  "Roller of Nat 20s",
  "Survivor of TPKs",
  "Whisperer to Dice",
];

/**
 * Get a random honorific from the list.
 * Call this on login and store the result.
 */
export function getRandomHonorific(): string {
  const index = Math.floor(Math.random() * HONORIFICS.length);
  return HONORIFICS[index];
}
