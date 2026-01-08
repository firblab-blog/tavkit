import { useState } from 'react'
import Icon from './common/Icon'
import { useTheme } from '../contexts/ThemeContext'
import { getThemeList } from '../config/themes'

export function ThemeSelector() {
  const { themeId, setTheme, currentTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const themes = getThemeList()

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-background-panel border border-border rounded-lg hover:bg-tavern-dark transition-colors text-tavern-cream"
        title="Change color theme"
      >
        <Icon name="Palette" className="w-5 h-5" />
        <span className="hidden sm:inline">{currentTheme.name}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-72 bg-background-panel border border-border rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-border">
              <h3 className="font-semibold text-tavern-cream flex items-center gap-2">
                <Icon name="Palette" className="w-4 h-4" />
                Color Theme
              </h3>
              <p className="text-xs text-tavern-mauve mt-1">Palettes from Lospec</p>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    setTheme(theme.id)
                    setIsOpen(false)
                  }}
                  className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-tavern-dark transition-colors ${
                    themeId === theme.id ? 'bg-tavern-purple' : ''
                  }`}
                >
                  {/* Color Preview */}
                  <div className="flex gap-1 mt-1">
                    <div
                      className="w-4 h-4 rounded border border-border"
                      style={{ backgroundColor: theme.palette.color1 }}
                      title="Darkest"
                    />
                    <div
                      className="w-4 h-4 rounded border border-border"
                      style={{ backgroundColor: theme.palette.color4 }}
                      title="Mid-Dark"
                    />
                    <div
                      className="w-4 h-4 rounded border border-border"
                      style={{ backgroundColor: theme.palette.color6 }}
                      title="Mid-Light"
                    />
                    <div
                      className="w-4 h-4 rounded border border-border"
                      style={{ backgroundColor: theme.palette.color8 }}
                      title="Lightest"
                    />
                  </div>

                  {/* Theme Info */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-tavern-cream">{theme.name}</span>
                      {themeId === theme.id && (
                        <Icon name="Check" className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <a
                      href={theme.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-tavern-mauve hover:text-primary flex items-center gap-1 mt-1"
                    >
                      View on Lospec
                      <Icon name="ExternalLink" className="w-3 h-3" />
                    </a>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border bg-tavern-dark">
              <p className="text-xs text-tavern-mauve text-center">
                Add more themes in{' '}
                <code className="text-tavern-cream">web/src/config/themes.ts</code>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
