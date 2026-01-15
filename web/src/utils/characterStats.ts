/**
 * Character stats utility functions for D&D 5e calculations
 */

/**
 * Calculate ability modifier from ability score
 * @param abilityScore - The ability score (e.g., Strength, Dexterity, etc.)
 * @returns The calculated modifier
 */
export function getAbilityModifier(abilityScore: number | undefined): number {
  if (abilityScore === undefined) return 0
  return Math.floor((abilityScore - 10) / 2)
}

/**
 * Format ability modifier with + or - sign
 * @param modifier - The modifier value
 * @returns Formatted string (e.g., "+2", "-1", "+0")
 */
export function formatModifier(modifier: number): string {
  if (modifier >= 0) return `+${modifier}`
  return `${modifier}`
}

/**
 * Get the constitution modifier for HP calculations
 * @param constitution - Constitution ability score
 * @returns The constitution modifier
 */
export function getConstitutionModifier(constitution: number | undefined): number {
  return getAbilityModifier(constitution)
}

/**
 * Calculate total max HP including constitution modifier per level
 * @param baseMaxHP - The base max HP value stored in the character (without constitution)
 * @param level - Character level
 * @param constitution - Constitution score
 * @returns Object with base HP, constitution bonus, and total HP
 */
export function getHPBreakdown(
  baseMaxHP: number | undefined,
  level: number,
  constitution: number | undefined
): { base: number; conBonus: number; total: number } {
  if (!baseMaxHP) {
    return { base: 0, conBonus: 0, total: 0 }
  }

  const conMod = getConstitutionModifier(constitution)
  const conBonus = conMod * level
  const total = baseMaxHP + conBonus

  return {
    base: baseMaxHP,
    conBonus,
    total,
  }
}
