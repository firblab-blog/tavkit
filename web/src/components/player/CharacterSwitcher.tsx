import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../common/Icon";
import { useCharacterStore, Character } from "../../store/characterStore";
import { useContextStore } from "../../store/contextStore";

interface CharacterSwitcherProps {
  activeCharacterId?: string | null;
  onCharacterSelect?: (character: Character) => void;
  onCreateCharacter?: () => void;
}

/**
 * CharacterSwitcher - Dropdown component for switching between characters in Player mode.
 *
 * Similar to CampaignSwitcher but for characters. Shows all user's characters
 * and allows switching the active character context.
 */
export default function CharacterSwitcher({
  activeCharacterId,
  onCharacterSelect,
  onCreateCharacter,
}: CharacterSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Don't fetch here - parent component (PlayerHome) handles fetching
  // This prevents duplicate API calls that can trigger rate limiting
  const { characters } = useCharacterStore();
  const { updateContext } = useContextStore();

  const activeCharacter = characters.find((c) => c.id === activeCharacterId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelectCharacter = async (character: Character) => {
    // Update context to track this character
    await updateContext({
      last_context_type: "player_campaign",
      last_character_id: character.id,
    });
    setIsOpen(false);
    onCharacterSelect?.(character);
  };

  const handleCreateCharacter = () => {
    setIsOpen(false);
    if (onCreateCharacter) {
      onCreateCharacter();
    } else {
      // Fallback to navigation if no callback provided
      navigate("/dashboard/player?tab=library&subtab=characters");
    }
  };

  // Get display info for active character
  const getDisplayName = () => {
    if (activeCharacter) {
      return activeCharacter.name;
    }
    return "Select Character";
  };

  const getDisplaySubtitle = () => {
    if (activeCharacter) {
      return `Level ${activeCharacter.level} ${activeCharacter.class_info}`;
    }
    return "No character selected";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-background-panel hover:bg-background border border-border hover:border-primary/40 rounded-lg transition-colors group"
      >
        {/* Character avatar */}
        {activeCharacter?.avatar ? (
          <img
            src={activeCharacter.avatar}
            alt={activeCharacter.name}
            className="w-8 h-8 rounded-full object-cover border border-blue-500/40"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
            <Icon name="User" className="w-4 h-4 text-blue-400" />
          </div>
        )}
        <div className="text-left">
          <span className="font-medium text-text block truncate max-w-[150px]">
            {getDisplayName()}
          </span>
          <span className="text-xs text-text-muted truncate max-w-[150px] block">
            {getDisplaySubtitle()}
          </span>
        </div>
        <Icon
          name="ChevronDown"
          className={`w-4 h-4 text-text-muted group-hover:text-primary transition-all ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-background-panel border border-border rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Characters List */}
          {characters.length > 0 ? (
            <div className="p-3 border-b border-border">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Icon name="Users" className="w-3.5 h-3.5" />
                Your Characters
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {characters.map((character) => (
                  <button
                    key={character.id}
                    onClick={() => handleSelectCharacter(character)}
                    className={`w-full text-left p-3 rounded-lg transition-colors group flex items-center gap-3 ${
                      character.id === activeCharacterId
                        ? "bg-blue-500/10 border border-blue-500/20"
                        : "hover:bg-background"
                    }`}
                  >
                    {/* Avatar */}
                    {character.avatar ? (
                      <img
                        src={character.avatar}
                        alt={character.name}
                        className={`w-10 h-10 rounded-full object-cover flex-shrink-0 ${
                          character.id === activeCharacterId
                            ? "border border-blue-500/40"
                            : "border border-border group-hover:border-blue-500/40"
                        }`}
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          character.id === activeCharacterId
                            ? "bg-blue-500/20 border border-blue-500/40"
                            : "bg-background border border-border group-hover:border-blue-500/40"
                        }`}
                      >
                        <Icon
                          name="User"
                          className={`w-5 h-5 ${
                            character.id === activeCharacterId
                              ? "text-blue-400"
                              : "text-text-muted group-hover:text-blue-400"
                          }`}
                        />
                      </div>
                    )}
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <span
                        className={`block truncate font-medium ${
                          character.id === activeCharacterId
                            ? "text-text"
                            : "text-text"
                        }`}
                      >
                        {character.name}
                      </span>
                      <span className="text-xs text-text-muted truncate block">
                        Level {character.level} {character.race}{" "}
                        {character.class_info}
                      </span>
                    </div>
                    {/* Check mark for active */}
                    {character.id === activeCharacterId && (
                      <Icon
                        name="Check"
                        className="w-4 h-4 text-blue-400 flex-shrink-0"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center">
              <Icon
                name="User"
                className="w-10 h-10 text-text-muted mx-auto mb-2"
              />
              <p className="text-text-muted text-sm">No characters yet</p>
              <p className="text-text-muted/60 text-xs mt-1">
                Create your first character below
              </p>
            </div>
          )}

          {/* Create Character */}
          <button
            onClick={handleCreateCharacter}
            className="w-full p-3 hover:bg-background transition-colors flex items-center gap-2 text-primary font-medium"
          >
            <Icon name="Plus" className="w-4 h-4" />
            Create Character
          </button>
        </div>
      )}
    </div>
  );
}
