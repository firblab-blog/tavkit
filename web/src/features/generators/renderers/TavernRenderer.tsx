// Tavern Result Renderer
// Displays generated Tavern data in a structured format

import Icon from '@/components/common/Icon'
import { ActionsBar } from '@/components/ui/ActionsBar'
import { RawDataViewer, ParseWarning } from '../components'
import type { GeneratedTavernData } from '../normalizers/tavern'

interface TavernRendererProps {
  tavern: GeneratedTavernData
  showRawResponse: boolean
  isSaved: boolean
  onSave: () => void
  onCopy: () => void
}

export function TavernRenderer({
  tavern,
  showRawResponse,
  isSaved,
  onSave,
  onCopy,
}: TavernRendererProps) {
  return (
    <div className="space-y-6">
      {/* Parse warning */}
      {tavern._parseError && <ParseWarning message={tavern._parseError} />}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">{tavern.name}</h2>
        <p className="text-sm text-text-muted capitalize">{tavern.type}</p>
      </div>

      {/* Atmosphere & Description */}
      {(tavern.atmosphere || tavern.description) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Package" className="w-5 h-5 text-primary" />
            Atmosphere
          </h3>
          {tavern.atmosphere && <p className="text-text-muted italic mb-2">{tavern.atmosphere}</p>}
          {tavern.description && <p className="text-text">{tavern.description}</p>}
        </div>
      )}

      {/* Keeper */}
      {tavern.keeper_name && tavern.keeper_name !== 'Unknown' && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="User" className="w-5 h-5 text-primary" />
            The Keeper
          </h3>
          <p className="text-text font-medium">{tavern.keeper_name}</p>
          {tavern.keeper_personality && (
            <p className="text-text-muted italic mb-2">{tavern.keeper_personality}</p>
          )}
          {tavern.keeper_description && <p className="text-text">{tavern.keeper_description}</p>}
        </div>
      )}

      {/* Menu */}
      {(tavern.menu_food.length > 0 || tavern.menu_drinks.length > 0) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="FileText" className="w-5 h-5 text-primary" />
            Menu
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {tavern.menu_food.length > 0 && (
              <div>
                <h4 className="font-medium text-text mb-2">Food</h4>
                <div className="space-y-2">
                  {tavern.menu_food.map((item, idx) => (
                    <div key={idx} className="bg-background p-3 rounded border border-border">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-text">{item.name}</span>
                        <span className="text-primary font-medium">{item.price}</span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-text-muted">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tavern.menu_drinks.length > 0 && (
              <div>
                <h4 className="font-medium text-text mb-2">Drinks</h4>
                <div className="space-y-2">
                  {tavern.menu_drinks.map((item, idx) => (
                    <div key={idx} className="bg-background p-3 rounded border border-border">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-text">{item.name}</span>
                        <span className="text-primary font-medium">{item.price}</span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-text-muted">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rooms */}
      {tavern.rooms.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Store" className="w-5 h-5 text-primary" />
            Accommodations
          </h3>
          <div className="space-y-2">
            {tavern.rooms.map((room, idx) => (
              <div key={idx} className="bg-background p-3 rounded border border-border">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="font-medium text-text">{room.type}</span>
                    <span className="text-sm text-text-muted ml-2">
                      ({room.available} available)
                    </span>
                  </div>
                  <span className="text-primary font-medium">{room.price}</span>
                </div>
                {room.description && <p className="text-sm text-text-muted">{room.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patrons */}
      {tavern.patrons.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Users" className="w-5 h-5 text-primary" />
            Current Patrons
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {tavern.patrons.map((patron, idx) => (
              <div key={idx} className="bg-background p-3 rounded border border-border">
                <p className="font-medium text-text">{patron.name}</p>
                <p className="text-sm text-text-muted italic mb-1">{patron.race}</p>
                {patron.description && <p className="text-sm text-text">{patron.description}</p>}
                {patron.hook && <p className="text-sm text-primary mt-2">{patron.hook}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events */}
      {tavern.events.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Calendar" className="w-5 h-5 text-primary" />
            Current Events
          </h3>
          <ul className="space-y-2">
            {tavern.events.map((event, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <span className="text-primary">•</span>
                <span>{event}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rumors */}
      {tavern.rumors.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="MessageCircle" className="w-5 h-5 text-primary" />
            Rumors & Gossip
          </h3>
          <ul className="space-y-2">
            {tavern.rumors.map((rumor, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <span className="text-primary">•</span>
                <span className="italic">{rumor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Special Notes */}
      {tavern.special_notes && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5 text-primary" />
            Special Notes
          </h3>
          <p className="text-text">{tavern.special_notes}</p>
        </div>
      )}

      {/* Raw/unexpected fields */}
      {tavern._raw && <RawDataViewer data={tavern._raw} defaultExpanded={showRawResponse} />}

      <ActionsBar
        onCopy={onCopy}
        onSave={isSaved ? undefined : onSave}
        showRegenerate={false}
        isSaved={isSaved}
      />
    </div>
  )
}

// Helper to format Tavern for clipboard
export function formatTavernForClipboard(tavern: GeneratedTavernData): string {
  let text = `${tavern.name}\n${tavern.type}\n\n${tavern.atmosphere}\n${tavern.description}\n\nKeeper: ${tavern.keeper_name}\n${tavern.keeper_personality}\n${tavern.keeper_description || ''}`

  if (tavern.menu_food && tavern.menu_food.length > 0) {
    text += '\n\nFood Menu:\n'
    tavern.menu_food.forEach((item) => {
      text += `${item.name} - ${item.price}\n${item.description}\n\n`
    })
  }

  if (tavern.menu_drinks && tavern.menu_drinks.length > 0) {
    text += '\nDrink Menu:\n'
    tavern.menu_drinks.forEach((item) => {
      text += `${item.name} - ${item.price}\n${item.description}\n\n`
    })
  }

  if (tavern.rooms && tavern.rooms.length > 0) {
    text += '\nAccommodations:\n'
    tavern.rooms.forEach((room) => {
      text += `${room.type} - ${room.price} (${room.available} available)\n${room.description}\n\n`
    })
  }

  if (tavern.patrons && tavern.patrons.length > 0) {
    text += '\nCurrent Patrons:\n'
    tavern.patrons.forEach((patron) => {
      text += `${patron.name} (${patron.race})\n${patron.description}\n${patron.hook ? `Hook: ${patron.hook}\n` : ''}\n`
    })
  }

  if (tavern.events && tavern.events.length > 0) {
    text += '\nCurrent Events:\n'
    tavern.events.forEach((event) => {
      text += `- ${event}\n`
    })
  }

  if (tavern.rumors && tavern.rumors.length > 0) {
    text += '\nRumors:\n'
    tavern.rumors.forEach((rumor) => {
      text += `- ${rumor}\n`
    })
  }

  if (tavern.special_notes) {
    text += `\nSpecial Notes: ${tavern.special_notes}`
  }

  return text
}
