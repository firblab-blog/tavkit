import { useUISettingsStore } from '../../store/uiSettingsStore'
import { useTheme } from '../../contexts/ThemeContext'
import { getThemeList } from '../../config/themes'
import Icon from '../common/Icon'

export default function AppearanceSettings() {
  const {
    iconSet,
    toolbarPosition,
    showCampaignSummary,
    mobileTabBarBehavior,
    setIconSet,
    setToolbarPosition,
    setShowCampaignSummary,
    setMobileTabBarBehavior,
  } = useUISettingsStore()

  const { themeId, mode, setTheme, setMode } = useTheme()
  const themes = getThemeList()

  return (
    <div className="space-y-8">
      {/* Theme Selector */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-text">Color Theme</h3>
            <p className="text-sm text-text-muted mt-1">
              Choose a color palette that suits your style
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('dark')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 ${
                mode === 'dark'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:border-primary/40 text-text'
              }`}
            >
              <Icon name="Moon" className="w-3.5 h-3.5" />
              Dark
            </button>
            <button
              onClick={() => setMode('light')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 ${
                mode === 'light'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:border-primary/40 text-text'
              }`}
            >
              <Icon name="Sun" className="w-3.5 h-3.5" />
              Light
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              className={`relative p-3 rounded-lg border text-left transition-all group ${
                themeId === theme.id
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border bg-background hover:border-primary/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-sm font-medium ${
                    themeId === theme.id ? 'text-primary' : 'text-text'
                  }`}
                >
                  {theme.name}
                </span>
                {themeId === theme.id && (
                  <Icon name="Check" className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </div>
              <div className="grid grid-cols-8 gap-1">
                {Object.values(theme.palette).map((color, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded border border-border/50"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Icon Set */}
      <section>
        <h3 className="text-lg font-semibold text-text mb-2">Icon Library</h3>
        <p className="text-sm text-text-muted mb-4">
          Game Icons provides D&D-themed icons perfect for fantasy RPGs
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { value: 'lucide', label: 'Lucide' },
            { value: 'heroicons', label: 'Heroicons' },
            { value: 'react-icons', label: 'Game Icons' },
            { value: 'tabler', label: 'Tabler' },
            { value: 'phosphor', label: 'Phosphor' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setIconSet(value as any)}
              className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                iconSet === value
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-border bg-background hover:border-primary/40 text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Toolbar Position */}
      <section>
        <h3 className="text-lg font-semibold text-text mb-2">Toolbar Position</h3>
        <p className="text-sm text-text-muted mb-4">Choose where the main toolbar appears</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['top', 'left', 'right', 'bottom'] as const).map((position) => (
            <button
              key={position}
              onClick={() => setToolbarPosition(position)}
              className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all capitalize ${
                toolbarPosition === position
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-border bg-background hover:border-primary/40 text-text'
              }`}
            >
              {position}
            </button>
          ))}
        </div>
      </section>

      {/* Mobile Tab Bar Behavior */}
      <section>
        <h3 className="text-lg font-semibold text-text mb-2">Mobile Tab Bar</h3>
        <p className="text-sm text-text-muted mb-4">
          Choose how breadcrumb tabs appear on mobile devices (screens smaller than 768px)
        </p>
        <div className="space-y-2">
          <button
            onClick={() => setMobileTabBarBehavior('auto-hide')}
            className={`w-full px-4 py-3 rounded-lg border text-left transition-all ${
              mobileTabBarBehavior === 'auto-hide'
                ? 'border-primary bg-primary/10 shadow-sm'
                : 'border-border bg-background hover:border-primary/40'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="mobileTabBar"
                checked={mobileTabBarBehavior === 'auto-hide'}
                onChange={() => setMobileTabBarBehavior('auto-hide')}
                className="mt-1 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <div
                  className={`text-sm font-medium mb-1 ${
                    mobileTabBarBehavior === 'auto-hide' ? 'text-primary' : 'text-text'
                  }`}
                >
                  Auto-Hide (Smart)
                </div>
                <div className="text-xs text-text-muted">
                  Tab bar hides when scrolling down, shows when scrolling up or after pausing
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setMobileTabBarBehavior('always-show')}
            className={`w-full px-4 py-3 rounded-lg border text-left transition-all ${
              mobileTabBarBehavior === 'always-show'
                ? 'border-primary bg-primary/10 shadow-sm'
                : 'border-border bg-background hover:border-primary/40'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="mobileTabBar"
                checked={mobileTabBarBehavior === 'always-show'}
                onChange={() => setMobileTabBarBehavior('always-show')}
                className="mt-1 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <div
                  className={`text-sm font-medium mb-1 ${
                    mobileTabBarBehavior === 'always-show' ? 'text-primary' : 'text-text'
                  }`}
                >
                  Always Show
                </div>
                <div className="text-xs text-text-muted">
                  Tab bar stays fixed at the bottom of the screen
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setMobileTabBarBehavior('hidden')}
            className={`w-full px-4 py-3 rounded-lg border text-left transition-all ${
              mobileTabBarBehavior === 'hidden'
                ? 'border-primary bg-primary/10 shadow-sm'
                : 'border-border bg-background hover:border-primary/40'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="mobileTabBar"
                checked={mobileTabBarBehavior === 'hidden'}
                onChange={() => setMobileTabBarBehavior('hidden')}
                className="mt-1 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <div
                  className={`text-sm font-medium mb-1 ${
                    mobileTabBarBehavior === 'hidden' ? 'text-primary' : 'text-text'
                  }`}
                >
                  Hidden
                </div>
                <div className="text-xs text-text-muted">
                  No tab bar on mobile - use drawer menu for navigation
                </div>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Campaign Summary Toggle */}
      <section className="pt-4 border-t border-border">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={showCampaignSummary}
            onChange={(e) => setShowCampaignSummary(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-text group-hover:text-primary transition-colors">
              Show AI Campaign Summaries
            </span>
            <p className="text-xs text-text-muted mt-1">
              Display AI-generated summaries with key NPCs, locations, and plot points
            </p>
          </div>
        </label>
      </section>
    </div>
  )
}
