/**
 * Theme definitions from Lospec color palettes
 * Each theme uses all 8 colors from the palette with light/dark mode variants
 */

export interface ThemeColors {
  // All 8 colors from the palette
  color1: string // Darkest
  color2: string
  color3: string
  color4: string
  color5: string
  color6: string
  color7: string
  color8: string // Lightest
}

export interface Theme {
  id: string
  name: string
  source: string // Lospec URL
  palette: ThemeColors
}

// Helper to generate semantic colors based on mode
export function getSemanticColors(palette: ThemeColors, mode: 'light' | 'dark') {
  if (mode === 'dark') {
    return {
      darkest: palette.color1,
      dark: palette.color2,
      panel: palette.color3,
      primary: palette.color5,
      primaryDark: palette.color4,
      primaryLight: palette.color6,
      text: palette.color8,
      textMuted: palette.color7,
      border: palette.color4,
      accent: palette.color6,
    }
  } else {
    return {
      darkest: palette.color8,
      dark: palette.color7,
      panel: palette.color6,
      primary: palette.color4,
      primaryDark: palette.color5,
      primaryLight: palette.color3,
      text: palette.color1,
      textMuted: palette.color2,
      border: palette.color5,
      accent: palette.color3,
    }
  }
}

export const themes: Record<string, Theme> = {
  blueGlass: {
    id: 'blueGlass',
    name: 'Blue Glass',
    source: 'https://lospec.com/palette-list/blue-glass',
    palette: {
      color1: '#0c0a1b',
      color2: '#222034',
      color3: '#394c62',
      color4: '#626d83',
      color5: '#6882b6',
      color6: '#83aa9c',
      color7: '#a4c2cd',
      color8: '#cbdbfc',
    },
  },
  nightRain: {
    id: 'nightRain',
    name: 'Night Rain',
    source: 'https://lospec.com/palette-list/night-rain',
    palette: {
      color1: '#000000',
      color2: '#012036',
      color3: '#1c3757',
      color4: '#3a7baa',
      color5: '#6cafd5',
      color6: '#7d8fae',
      color7: '#a1b4c1',
      color8: '#ffffff',
    },
  },
  slso8: {
    id: 'slso8',
    name: 'SLSO8',
    source: 'https://lospec.com/palette-list/slso8',
    palette: {
      color1: '#0d2b45',
      color2: '#203c56',
      color3: '#3e3546',
      color4: '#544e68',
      color5: '#6d5568',
      color6: '#8d697a',
      color7: '#c0737a',
      color8: '#ffaa5e',
    },
  },
  oldTownGold: {
    id: 'oldTownGold',
    name: 'Old Town Gold',
    source: 'https://lospec.com/palette-list/old-town-gold',
    palette: {
      color1: '#0d041b',
      color2: '#301213',
      color3: '#4b251d',
      color4: '#7a3126',
      color5: '#91633a',
      color6: '#bf9455',
      color7: '#e2c465',
      color8: '#d7d8ee',
    },
  },
  ammo8: {
    id: 'ammo8',
    name: 'Ammo 8',
    source: 'https://lospec.com/palette-list/ammo-8',
    palette: {
      color1: '#040c06',
      color2: '#112318',
      color3: '#1e3a29',
      color4: '#305d42',
      color5: '#4d8061',
      color6: '#89a257',
      color7: '#bedc7f',
      color8: '#eeffcc',
    },
  },
  dreamscape8: {
    id: 'dreamscape8',
    name: 'Dreamscape 8',
    source: 'https://lospec.com/palette-list/dreamscape8',
    palette: {
      color1: '#515262',
      color2: '#543344',
      color3: '#63787d',
      color4: '#8b4049',
      color5: '#8ea091',
      color6: '#ae6a47',
      color7: '#caa05a',
      color8: '#c9cca1',
    },
  },
  pollen8: {
    id: 'pollen8',
    name: 'Pollen 8',
    source: 'https://lospec.com/palette-list/pollen8',
    palette: {
      color1: '#73464c',
      color2: '#ab5675',
      color3: '#34acba',
      color4: '#6daa84',
      color5: '#72dcbb',
      color6: '#ee6a7c',
      color7: '#ffa7a5',
      color8: '#ffe7d6',
    },
  },
  citrink: {
    id: 'citrink',
    name: 'Citrink',
    source: 'https://lospec.com/palette-list/citrink',
    palette: {
      color1: '#201533',
      color2: '#252446',
      color3: '#166e7a',
      color4: '#254d70',
      color5: '#52c33f',
      color6: '#b2d942',
      color7: '#fcf660',
      color8: '#ffffff',
    },
  },
  berryNebula: {
    id: 'berryNebula',
    name: 'Berry Nebula',
    source: 'https://lospec.com/palette-list/berry-nebula',
    palette: {
      color1: '#0d001a',
      color2: '#2e0a30',
      color3: '#4f1446',
      color4: '#6f1d5c',
      color5: '#6e5181',
      color6: '#6d85a5',
      color7: '#6cb9c9',
      color8: '#6ceded',
    },
  },
  funkyFuture8: {
    id: 'funkyFuture8',
    name: 'Funky Future 8',
    source: 'https://lospec.com/palette-list/funkyfuture-8',
    palette: {
      color1: '#2b0f54',
      color2: '#ab1f65',
      color3: '#3368dc',
      color4: '#49e7ec',
      color5: '#ff4f69',
      color6: '#ff8142',
      color7: '#ffda45',
      color8: '#fff7f8',
    },
  },
  waverator: {
    id: 'waverator',
    name: 'Waverator',
    source: 'https://lospec.com/palette-list/waverator',
    palette: {
      color1: '#0c0d14',
      color2: '#181c28',
      color3: '#23313d',
      color4: '#33505d',
      color5: '#4e7f7d',
      color6: '#53a788',
      color7: '#70d38b',
      color8: '#cbffd8',
    },
  },
  hortensiaDiamond: {
    id: 'hortensiaDiamond',
    name: 'Hortensia Diamond',
    source: 'https://lospec.com/palette-list/hortensia-diamond',
    palette: {
      color1: '#332b48',
      color2: '#3c4059',
      color3: '#4c587e',
      color4: '#713f52',
      color5: '#8977c9',
      color6: '#bc8dff',
      color7: '#fc9bd3',
      color8: '#d4faff',
    },
  },
  retrotronicDX: {
    id: 'retrotronicDX',
    name: 'Retrotronic DX',
    source: 'https://lospec.com/palette-list/retrotronic-dx',
    palette: {
      color1: '#392b35',
      color2: '#423952',
      color3: '#444760',
      color4: '#713f52',
      color5: '#bb474f',
      color6: '#486b7f',
      color7: '#7a9c96',
      color8: '#d1bfb0',
    },
  },
  sweetHope: {
    id: 'sweetHope',
    name: 'Sweet Hope',
    source: 'https://lospec.com/palette-list/sweethope',
    palette: {
      color1: '#615e85',
      color2: '#717fb0',
      color3: '#90b4de',
      color4: '#9c8dc2',
      color5: '#a3d1af',
      color6: '#d9a3cd',
      color7: '#ebc3a7',
      color8: '#e0e0dc',
    },
  },
  st8Moonlight: {
    id: 'st8Moonlight',
    name: 'ST-8 Moonlight',
    source: 'https://lospec.com/palette-list/st-8-moonlight',
    palette: {
      color1: '#0b0c0d',
      color2: '#222426',
      color3: '#363940',
      color4: '#4c5359',
      color5: '#667480',
      color6: '#8598a6',
      color7: '#a3becc',
      color8: '#c3dce5',
    },
  },
  godblood8: {
    id: 'godblood8',
    name: 'Godblood 8',
    source: 'https://lospec.com/palette-list/godblood8',
    palette: {
      color1: '#000511',
      color2: '#051233',
      color3: '#122a5e',
      color4: '#15526b',
      color5: '#227a7a',
      color6: '#38ba8b',
      color7: '#55ff79',
      color8: '#c5ff8c',
    },
  },
  evidenceInDarkness: {
    id: 'evidenceInDarkness',
    name: 'Evidence in Darkness',
    source: 'https://lospec.com/palette-list/evidence-in-darkness',
    palette: {
      color1: '#000000',
      color2: '#57457a',
      color3: '#756a8b',
      color4: '#76428a',
      color5: '#c8b59e',
      color6: '#ffffff',
      color7: '#ffffff',
      color8: '#ffffff',
    },
  },
  tokyoLoFi8: {
    id: 'tokyoLoFi8',
    name: 'Tokyo Lo-Fi 8',
    source: 'https://lospec.com/palette-list/tokyo-lo-fi-8',
    palette: {
      color1: '#161412',
      color2: '#2e3334',
      color3: '#6d8577',
      color4: '#976159',
      color5: '#9c4827',
      color6: '#ccba9b',
      color7: '#df9a73',
      color8: '#ecdfbf',
    },
  },
  nyx8: {
    id: 'nyx8',
    name: 'Nyx8',
    source: 'https://lospec.com/palette-list/nyx8',
    palette: {
      color1: '#08141e',
      color2: '#0f2a3f',
      color3: '#20394f',
      color4: '#4e495f',
      color5: '#816271',
      color6: '#997577',
      color7: '#c3a38a',
      color8: '#f6d6bd',
    },
  },
  justParchment8: {
    id: 'justParchment8',
    name: 'Just Parchment 8',
    source: 'https://lospec.com/palette-list/just-parchment-8',
    palette: {
      color1: '#292418',
      color2: '#524839',
      color3: '#73654a',
      color4: '#8b7d62',
      color5: '#a48d6a',
      color6: '#bda583',
      color7: '#cdba94',
      color8: '#e6ceac',
    },
  },
  paper8: {
    id: 'paper8',
    name: 'Paper 8',
    source: 'https://lospec.com/palette-list/paper-8',
    palette: {
      color1: '#1f244b',
      color2: '#3c6b64',
      color3: '#654053',
      color4: '#60ae7b',
      color5: '#a8605d',
      color6: '#b6cf8e',
      color7: '#d1a67e',
      color8: '#f6e79c',
    },
  },
  dreamHaze8: {
    id: 'dreamHaze8',
    name: 'Dream Haze 8',
    source: 'https://lospec.com/palette-list/dream-haze-8',
    palette: {
      color1: '#3c42c4',
      color2: '#6e51c8',
      color3: '#a065cd',
      color4: '#ce79d2',
      color5: '#d68fb8',
      color6: '#dda2a3',
      color7: '#eac4ae',
      color8: '#f4dfbe',
    },
  },
  gothicBit: {
    id: 'gothicBit',
    name: 'Gothic Bit',
    source: 'https://lospec.com/palette-list/gothic-bit',
    palette: {
      color1: '#0e0e12',
      color2: '#1a1a24',
      color3: '#333346',
      color4: '#535373',
      color5: '#8080a4',
      color6: '#a6a6bf',
      color7: '#c1c1d2',
      color8: '#e6e6ec',
    },
  },
  purpleMorning8: {
    id: 'purpleMorning8',
    name: 'Purple Morning 8',
    source: 'https://lospec.com/palette-list/purple-morning-8',
    palette: {
      color1: '#211d38',
      color2: '#2e2a4f',
      color3: '#3b405e',
      color4: '#60556e',
      color5: '#9a6278',
      color6: '#c7786f',
      color7: '#cfa98a',
      color8: '#cdd4a5',
    },
  },
  fluffy8: {
    id: 'fluffy8',
    name: 'Fluffy8',
    source: 'https://lospec.com/palette-list/fluffy8',
    palette: {
      color1: '#44387a',
      color2: '#7679db',
      color3: '#933a63',
      color4: '#96b3fd',
      color5: '#d4d5f6',
      color6: '#ff95b1',
      color7: '#ffc4cf',
      color8: '#ffecf0',
    },
  },
}

export const defaultTheme = 'blueGlass'
export const defaultMode: 'light' | 'dark' = 'dark'

export function getTheme(themeId: string): Theme {
  return themes[themeId] || themes[defaultTheme]
}

export function getThemeList(): Theme[] {
  return Object.values(themes)
}
