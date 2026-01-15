// Merchant Result Renderer
// Displays generated Merchant data in a structured format

import Icon from "@/components/common/Icon";
import { ActionsBar } from "@/components/ui/ActionsBar";
import { RawDataViewer, ParseWarning } from "../components";
import type { GeneratedMerchantData } from "../normalizers/merchant";

interface MerchantRendererProps {
  merchant: GeneratedMerchantData;
  showRawResponse: boolean;
  isSaved: boolean;
  onSave: () => void;
  onCopy: () => void;
}

export function MerchantRenderer({
  merchant,
  showRawResponse,
  isSaved,
  onSave,
  onCopy,
}: MerchantRendererProps) {
  return (
    <div className="space-y-6">
      {/* Parse warning */}
      {merchant._parseError && <ParseWarning message={merchant._parseError} />}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary">
          {merchant.name || "Unnamed Shop"}
        </h2>
        <p className="text-sm text-text-muted capitalize">
          {merchant.shop_type ? merchant.shop_type.replace(/_/g, " ") : "Shop"}
        </p>
        {merchant.location && (
          <p className="text-sm text-text-muted mt-1">{merchant.location}</p>
        )}
      </div>

      {/* Atmosphere & Description */}
      {(merchant.atmosphere || merchant.description) && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="Package" className="w-5 h-5 text-primary" />
            Atmosphere
          </h3>
          {merchant.atmosphere && (
            <p className="text-text-muted italic mb-2">{merchant.atmosphere}</p>
          )}
          {merchant.description && (
            <p className="text-text">{merchant.description}</p>
          )}
        </div>
      )}

      {/* Owner */}
      {merchant.owner_name && merchant.owner_name !== "Unknown" && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="User" className="w-5 h-5 text-primary" />
            The Owner
          </h3>
          <p className="text-text font-medium">{merchant.owner_name}</p>
          {merchant.owner_personality && (
            <p className="text-text-muted italic mb-2">
              {merchant.owner_personality}
            </p>
          )}
          {merchant.owner_description && (
            <p className="text-text">{merchant.owner_description}</p>
          )}
          {merchant.haggle_willingness && (
            <p className="text-sm text-primary mt-2">
              Haggling: {merchant.haggle_willingness}
            </p>
          )}
        </div>
      )}

      {/* Inventory */}
      {merchant.inventory.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Package" className="w-5 h-5 text-primary" />
            Inventory
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {merchant.inventory.map((item, idx) => (
              <div
                key={idx}
                className="bg-background p-3 rounded border border-border"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-text">{item.name}</span>
                  <span className="text-primary font-medium">{item.price}</span>
                </div>
                {item.quantity && (
                  <p className="text-xs text-text-muted mb-1">
                    Stock: {item.quantity}
                  </p>
                )}
                {item.description && (
                  <p className="text-sm text-text-muted">{item.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Special Items */}
      {merchant.special_items.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Sparkles" className="w-5 h-5 text-primary" />
            Special Items
          </h3>
          <div className="space-y-3">
            {merchant.special_items.map((item, idx) => (
              <div
                key={idx}
                className="bg-background p-4 rounded border-2 border-primary/30"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-text">{item.name}</span>
                  <span className="text-primary font-bold">{item.price}</span>
                </div>
                {item.quantity && (
                  <p className="text-xs text-text-muted mb-1">
                    Stock: {item.quantity}
                  </p>
                )}
                {item.description && (
                  <p className="text-sm text-text">{item.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services */}
      {merchant.services.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Wrench" className="w-5 h-5 text-primary" />
            Services Offered
          </h3>
          <div className="space-y-2">
            {merchant.services.map((service, idx) => (
              <div
                key={idx}
                className="bg-background p-3 rounded border border-border"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-text">{service.name}</span>
                  <span className="text-primary font-medium">
                    {service.price}
                  </span>
                </div>
                {service.description && (
                  <p className="text-sm text-text-muted">
                    {service.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Sold */}
      {merchant.recently_sold.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="Package" className="w-5 h-5 text-primary" />
            Recently Sold
          </h3>
          <ul className="space-y-2">
            {merchant.recently_sold.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <span className="text-primary">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rumors */}
      {merchant.rumors.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="MessageCircle" className="w-5 h-5 text-primary" />
            Rumors & Gossip
          </h3>
          <ul className="space-y-2">
            {merchant.rumors.map((rumor, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text">
                <span className="text-primary">•</span>
                <span className="italic">{rumor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Special Notes */}
      {merchant.special_notes && (
        <div>
          <h3 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5 text-primary" />
            Special Notes
          </h3>
          <p className="text-text">{merchant.special_notes}</p>
        </div>
      )}

      {/* Raw/unexpected fields */}
      {merchant._raw && (
        <RawDataViewer data={merchant._raw} defaultExpanded={showRawResponse} />
      )}

      <ActionsBar
        onCopy={onCopy}
        onSave={isSaved ? undefined : onSave}
        showRegenerate={false}
        isSaved={isSaved}
      />
    </div>
  );
}

// Helper to format Merchant for clipboard
export function formatMerchantForClipboard(
  merchant: GeneratedMerchantData,
): string {
  let text = `${merchant.name || "Unnamed Shop"}\n${merchant.shop_type ? merchant.shop_type.replace(/_/g, " ") : "Shop"}\n${merchant.location ? `Location: ${merchant.location}\n` : ""}\n${merchant.atmosphere || ""}\n${merchant.description || ""}\n\nOwner: ${merchant.owner_name || "Unknown"}\n${merchant.owner_personality || ""}\n${merchant.owner_description || ""}`;

  if (merchant.haggle_willingness) {
    text += `\nHaggling: ${merchant.haggle_willingness}`;
  }

  if (merchant.inventory && merchant.inventory.length > 0) {
    text += "\n\nInventory:\n";
    merchant.inventory.forEach((item) => {
      text += `${item.name} - ${item.price}${item.quantity ? ` (${item.quantity})` : ""}\n${item.description}\n\n`;
    });
  }

  if (merchant.special_items && merchant.special_items.length > 0) {
    text += "\nSpecial Items:\n";
    merchant.special_items.forEach((item) => {
      text += `${item.name} - ${item.price}${item.quantity ? ` (${item.quantity})` : ""}\n${item.description}\n\n`;
    });
  }

  if (merchant.services && merchant.services.length > 0) {
    text += "\nServices:\n";
    merchant.services.forEach((service) => {
      text += `${service.name} - ${service.price}\n${service.description}\n\n`;
    });
  }

  if (merchant.recently_sold && merchant.recently_sold.length > 0) {
    text += "\nRecently Sold:\n";
    merchant.recently_sold.forEach((item) => {
      text += `- ${item}\n`;
    });
  }

  if (merchant.rumors && merchant.rumors.length > 0) {
    text += "\nRumors:\n";
    merchant.rumors.forEach((rumor) => {
      text += `- ${rumor}\n`;
    });
  }

  if (merchant.special_notes) {
    text += `\nSpecial Notes: ${merchant.special_notes}`;
  }

  return text;
}
