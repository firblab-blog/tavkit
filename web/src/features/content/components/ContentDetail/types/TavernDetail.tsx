// Tavern content detail view

import Icon from "@/components/common/Icon";

interface MenuItem {
  name: string;
  description?: string;
  price: string;
}

interface Room {
  type: string;
  available?: number;
  price: string;
  description?: string;
  details?: string;
}

interface Patron {
  name: string;
  race?: string;
  description: string;
  hook?: string;
}

interface TavernEvent {
  name?: string;
  description?: string;
}

interface TavernRumor {
  text?: string;
  description?: string;
}

interface TavernData {
  name?: string;
  type: string;
  quality?: string;
  size?: string;
  atmosphere?: string;
  description?: string;
  keeper_name?: string;
  keeper_personality?: string;
  keeper_description?: string;
  menu_food?: string | MenuItem[];
  menu_drinks?: string | MenuItem[];
  rooms?: string | Room[];
  patrons?: string | Patron[];
  events?: string | (string | TavernEvent)[];
  rumors?: string | (string | TavernRumor)[];
  special_notes?: string;
}

interface TavernDetailProps {
  tavern: TavernData;
}

function parseJSON<T>(value: string | T | undefined): T | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

export function TavernDetail({ tavern }: TavernDetailProps) {
  const menuFood = parseJSON<MenuItem[]>(tavern.menu_food);
  const menuDrinks = parseJSON<MenuItem[]>(tavern.menu_drinks);
  const rooms = parseJSON<Room[]>(tavern.rooms);
  const patrons = parseJSON<Patron[]>(tavern.patrons);
  const events = parseJSON<(string | TavernEvent)[]>(tavern.events);
  const rumors = parseJSON<(string | TavernRumor)[]>(tavern.rumors);

  return (
    <div className="space-y-6">
      {/* Type/Quality/Size */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="text-xs text-text-muted uppercase tracking-wide mb-2">
            Type
          </div>
          <div className="text-lg text-text capitalize">{tavern.type}</div>
        </div>
        {tavern.quality && (
          <div className="bg-surface p-4 rounded-lg border border-border">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-2">
              Quality
            </div>
            <div className="text-lg text-text capitalize">{tavern.quality}</div>
          </div>
        )}
        {tavern.size && (
          <div className="bg-surface p-4 rounded-lg border border-border">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-2">
              Size
            </div>
            <div className="text-lg text-text capitalize">{tavern.size}</div>
          </div>
        )}
      </div>

      {/* Atmosphere */}
      {tavern.atmosphere && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">
            Atmosphere
          </h3>
          <p className="text-text leading-relaxed">{tavern.atmosphere}</p>
          {tavern.description && (
            <p className="text-text leading-relaxed mt-2">
              {tavern.description}
            </p>
          )}
        </div>
      )}

      {/* The Keeper */}
      {(tavern.keeper_name ||
        tavern.keeper_personality ||
        tavern.keeper_description) && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">
            The Keeper
          </h3>
          <div className="bg-surface p-4 rounded-lg border border-border space-y-2">
            {tavern.keeper_name && (
              <h4 className="font-semibold text-text text-lg">
                {tavern.keeper_name}
              </h4>
            )}
            {tavern.keeper_personality && (
              <p className="text-text italic text-sm">
                {tavern.keeper_personality}
              </p>
            )}
            {tavern.keeper_description && (
              <p className="text-text">{tavern.keeper_description}</p>
            )}
          </div>
        </div>
      )}

      {/* Menu */}
      {(menuFood || menuDrinks) && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Menu</h3>
          <div className="bg-surface p-4 rounded-lg border border-border space-y-4">
            {Array.isArray(menuFood) && menuFood.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-text-muted mb-2">
                  Food
                </h4>
                <div className="space-y-2">
                  {menuFood.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-text font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-text-muted text-sm">
                            {item.description}
                          </div>
                        )}
                      </div>
                      <span className="text-primary ml-4 whitespace-nowrap">
                        {item.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(menuDrinks) && menuDrinks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-text-muted mb-2">
                  Drinks
                </h4>
                <div className="space-y-2">
                  {menuDrinks.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-text font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-text-muted text-sm">
                            {item.description}
                          </div>
                        )}
                      </div>
                      <span className="text-primary ml-4 whitespace-nowrap">
                        {item.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rooms */}
      {Array.isArray(rooms) && rooms.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">
            Accommodations
          </h3>
          <div className="grid gap-3">
            {rooms.map((room, idx) => (
              <div
                key={idx}
                className="bg-surface p-4 rounded-lg border border-border"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-text">{room.type}</h4>
                    {room.available && (
                      <span className="text-text-muted text-xs">
                        ({room.available} available)
                      </span>
                    )}
                  </div>
                  <span className="text-primary whitespace-nowrap">
                    {room.price}
                  </span>
                </div>
                <p className="text-text text-sm">
                  {room.description || room.details}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patrons */}
      {Array.isArray(patrons) && patrons.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">
            Notable Patrons
          </h3>
          <div className="grid gap-3">
            {patrons.map((patron, idx) => (
              <div
                key={idx}
                className="bg-surface p-4 rounded-lg border border-border"
              >
                <div className="flex items-start gap-3 mb-2">
                  <h4 className="font-semibold text-text">{patron.name}</h4>
                  {patron.race && (
                    <span className="text-text-muted text-xs uppercase tracking-wide">
                      {patron.race}
                    </span>
                  )}
                </div>
                <p className="text-text text-sm">{patron.description}</p>
                {patron.hook && (
                  <p className="text-primary text-sm mt-2 flex items-start gap-2">
                    <span>💡</span>
                    <span>{patron.hook}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events */}
      {Array.isArray(events) && events.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">
            Current Events
          </h3>
          <ul className="list-disc list-inside space-y-1">
            {events.map((event, idx) => (
              <li key={idx} className="text-text">
                {typeof event === "string"
                  ? event
                  : event.description || event.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rumors */}
      {Array.isArray(rumors) && rumors.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">
            Rumors & Gossip
          </h3>
          <ul className="list-disc list-inside space-y-1">
            {rumors.map((rumor, idx) => (
              <li key={idx} className="text-text">
                {typeof rumor === "string"
                  ? rumor
                  : rumor.text || rumor.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Special Notes */}
      {tavern.special_notes && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5" />
            Special Notes
          </h3>
          <p className="text-text leading-relaxed whitespace-pre-wrap">
            {tavern.special_notes}
          </p>
        </div>
      )}
    </div>
  );
}
