// Merchant content detail view

import Icon from "@/components/common/Icon";

interface InventoryItem {
  name: string;
  price: string;
  quantity?: number;
  description: string;
}

interface Service {
  name: string;
  price: string;
  description: string;
}

interface SoldItem extends InventoryItem {
  buyer?: string;
}

interface MerchantRumor {
  text?: string;
  description?: string;
}

interface MerchantData {
  name?: string;
  shop_type?: string;
  location?: string;
  atmosphere?: string;
  description?: string;
  owner_name?: string;
  owner_personality?: string;
  owner_description?: string;
  haggle_willingness?: string;
  inventory?: string | InventoryItem[];
  services?: string | Service[];
  special_items?: string | InventoryItem[];
  recently_sold?: string | SoldItem[];
  rumors?: string | (string | MerchantRumor)[];
  special_notes?: string;
}

interface MerchantDetailProps {
  merchant: MerchantData;
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

export function MerchantDetail({ merchant }: MerchantDetailProps) {
  const inventory = parseJSON<InventoryItem[]>(merchant.inventory);
  const services = parseJSON<Service[]>(merchant.services);
  const specialItems = parseJSON<InventoryItem[]>(merchant.special_items);
  const recentlySold = parseJSON<SoldItem[]>(merchant.recently_sold);
  const rumors = parseJSON<(string | MerchantRumor)[]>(merchant.rumors);

  return (
    <div className="space-y-6">
      {/* Type/Location */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="text-xs text-text-muted uppercase tracking-wide mb-2">
            Shop Type
          </div>
          <div className="text-lg text-text capitalize">
            {merchant.shop_type?.replace(/_/g, " ")}
          </div>
        </div>
        {merchant.location && (
          <div className="bg-surface p-4 rounded-lg border border-border">
            <div className="text-xs text-text-muted uppercase tracking-wide mb-2">
              Location
            </div>
            <div className="text-lg text-text">{merchant.location}</div>
          </div>
        )}
      </div>

      {/* Atmosphere */}
      {merchant.atmosphere && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">
            Atmosphere
          </h3>
          <p className="text-text leading-relaxed">{merchant.atmosphere}</p>
          {merchant.description && (
            <p className="text-text leading-relaxed mt-2">
              {merchant.description}
            </p>
          )}
        </div>
      )}

      {/* The Owner */}
      {(merchant.owner_name ||
        merchant.owner_personality ||
        merchant.owner_description) && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">The Owner</h3>
          <div className="bg-surface p-4 rounded-lg border border-border space-y-2">
            {merchant.owner_name && (
              <h4 className="font-semibold text-text text-lg">
                {merchant.owner_name}
              </h4>
            )}
            {merchant.owner_personality && (
              <p className="text-text italic text-sm">
                {merchant.owner_personality}
              </p>
            )}
            {merchant.owner_description && (
              <p className="text-text">{merchant.owner_description}</p>
            )}
            {merchant.haggle_willingness && (
              <p className="text-text-muted text-sm">
                🤝 Haggling: {merchant.haggle_willingness}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Inventory */}
      {Array.isArray(inventory) && inventory.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Inventory</h3>
          <div className="grid gap-3">
            {inventory.map((item, idx) => (
              <div
                key={idx}
                className="bg-surface p-4 rounded-lg border border-border"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-text">{item.name}</h4>
                  <span className="text-primary whitespace-nowrap">
                    {item.price}
                  </span>
                </div>
                {item.quantity && (
                  <p className="text-text-muted text-xs mb-1">
                    Stock: {item.quantity}
                  </p>
                )}
                <p className="text-text text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Special Items */}
      {Array.isArray(specialItems) && specialItems.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">
            Special Items
          </h3>
          <div className="grid gap-3">
            {specialItems.map((item, idx) => (
              <div
                key={idx}
                className="bg-surface p-4 rounded-lg border-2 border-primary/30"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-text">{item.name}</h4>
                  <span className="text-primary font-bold whitespace-nowrap">
                    {item.price}
                  </span>
                </div>
                {item.quantity && (
                  <p className="text-text-muted text-xs mb-1">
                    Stock: {item.quantity}
                  </p>
                )}
                <p className="text-text text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services */}
      {Array.isArray(services) && services.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">
            Services Offered
          </h3>
          <div className="grid gap-3">
            {services.map((service, idx) => (
              <div
                key={idx}
                className="bg-surface p-4 rounded-lg border border-border"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-text">{service.name}</h4>
                  <span className="text-primary whitespace-nowrap">
                    {service.price}
                  </span>
                </div>
                <p className="text-text text-sm">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Sold */}
      {Array.isArray(recentlySold) && recentlySold.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">
            Recently Sold
          </h3>
          <div className="grid gap-3">
            {recentlySold.map((item, idx) => (
              <div
                key={idx}
                className="bg-surface p-4 rounded-lg border border-border opacity-75"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-text">{item.name}</h4>
                  <span className="text-text-muted whitespace-nowrap line-through">
                    {item.price}
                  </span>
                </div>
                <p className="text-text text-sm">{item.description}</p>
                {item.buyer && (
                  <p className="text-text-muted text-xs mt-1">
                    Sold to: {item.buyer}
                  </p>
                )}
              </div>
            ))}
          </div>
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
      {merchant.special_notes && (
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5" />
            Special Notes
          </h3>
          <p className="text-text leading-relaxed whitespace-pre-wrap">
            {merchant.special_notes}
          </p>
        </div>
      )}
    </div>
  );
}
