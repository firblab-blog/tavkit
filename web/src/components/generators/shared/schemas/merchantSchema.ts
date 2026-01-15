// Field schema for manual Merchant entry

export interface ManualInventoryItem {
  name: string
  description: string
  price: string
}

export interface ManualMerchantData {
  name: string
  merchant_type: string
  description: string
  personality: string
  appearance: string
  backstory: string
  inventory: ManualInventoryItem[]
  services: string[]
  specialties: string[]
  quirks: string[]
  rumors: string[]
  connections: string[]
}

export const defaultMerchantData: ManualMerchantData = {
  name: '',
  merchant_type: 'general',
  description: '',
  personality: '',
  appearance: '',
  backstory: '',
  inventory: [],
  services: [],
  specialties: [],
  quirks: [],
  rumors: [],
  connections: [],
}

export const merchantTypeOptions = [
  { value: 'general', label: 'General Store' },
  { value: 'weapons', label: 'Weaponsmith' },
  { value: 'armor', label: 'Armorer' },
  { value: 'magic', label: 'Magic Shop' },
  { value: 'potions', label: 'Alchemist/Potions' },
  { value: 'scrolls', label: 'Scribe/Scrolls' },
  { value: 'exotic', label: 'Exotic Goods' },
  { value: 'blackmarket', label: 'Black Market' },
  { value: 'jeweler', label: 'Jeweler' },
  { value: 'tailor', label: 'Tailor' },
]
