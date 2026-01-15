import Icon from "./common/Icon";
import { logger } from "@/utils/logger";

interface SavedContentDetailProps {
  content: any;
  type:
    | "npcs"
    | "monsters"
    | "encounters"
    | "dialogues"
    | "locations"
    | "quests"
    | "items"
    | "rumors"
    | "taverns"
    | "merchants"
    | "traps"
    | "critters"
    | "chases";
  onClose: () => void;
}

export default function SavedContentDetail({
  content,
  type,
  onClose,
}: SavedContentDetailProps) {
  logger.debug("[SavedContentDetail] Rendering detail for:", type, content);

  const renderNPCDetail = (npc: any) => {
    logger.debug("[SavedContentDetail] NPC data:", npc);
    logger.debug(
      "[SavedContentDetail] NPC stats raw:",
      npc.stats,
      typeof npc.stats,
    );

    let stats = null;
    try {
      if (npc.stats) {
        stats =
          typeof npc.stats === "string" ? JSON.parse(npc.stats) : npc.stats;
        logger.debug("[SavedContentDetail] Parsed stats:", stats);
      }
    } catch (error) {
      logger.error(
        "[SavedContentDetail] Failed to parse stats:",
        error,
        npc.stats,
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-tavern-light mb-2">
            {npc.name}
          </h2>
          <div className="flex gap-4 text-tavern-cream">
            {npc.race && <span className="text-sm">{npc.race}</span>}
            {npc.class && <span className="text-sm">{npc.class}</span>}
          </div>
        </div>

        {npc.personality && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              Personality
            </h3>
            <p className="text-tavern-cream leading-relaxed">
              {npc.personality}
            </p>
          </div>
        )}

        {npc.backstory && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              Backstory
            </h3>
            <p className="text-tavern-cream leading-relaxed whitespace-pre-wrap">
              {npc.backstory}
            </p>
          </div>
        )}

        {stats && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Statistics
            </h3>
            <div className="space-y-4">
              {/* Level and Alignment */}
              <div className="grid grid-cols-2 gap-4">
                {stats.level && (
                  <div className="bg-background-panel p-4 rounded-lg border border-border">
                    <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-1">
                      Level
                    </div>
                    <div className="text-2xl font-bold text-tavern-light">
                      {stats.level}
                    </div>
                  </div>
                )}
                {stats.alignment && (
                  <div className="bg-background-panel p-4 rounded-lg border border-border">
                    <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-1">
                      Alignment
                    </div>
                    <div className="text-lg font-semibold text-tavern-light">
                      {stats.alignment}
                    </div>
                  </div>
                )}
              </div>

              {/* Ability Scores */}
              {stats.abilities && (
                <div>
                  <h4 className="text-sm font-semibold text-tavern-cream mb-2">
                    Ability Scores
                  </h4>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {Object.entries(stats.abilities).map(
                      ([ability, score]: [string, any]) => (
                        <div
                          key={ability}
                          className="bg-background-panel p-3 rounded-lg border border-border text-center"
                        >
                          <div className="text-xs text-tavern-mauve uppercase">
                            {ability}
                          </div>
                          <div className="text-2xl font-bold text-tavern-light">
                            {score}
                          </div>
                          <div className="text-xs text-tavern-cream">
                            {Math.floor((score - 10) / 2) >= 0 ? "+" : ""}
                            {Math.floor((score - 10) / 2)}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Skills */}
              {stats.skills && stats.skills.length > 0 && (
                <div className="bg-background-panel p-4 rounded-lg border border-border">
                  <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-2">
                    Skills
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {stats.skills.map((skill: string, i: number) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-tavern-purple/30 text-tavern-cream rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Equipment */}
              {stats.equipment && stats.equipment.length > 0 && (
                <div className="bg-background-panel p-4 rounded-lg border border-border">
                  <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-2">
                    Equipment
                  </div>
                  <ul className="list-disc list-inside text-tavern-cream space-y-1">
                    {stats.equipment.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Role */}
              {stats.role && (
                <div className="bg-background-panel p-4 rounded-lg border border-border">
                  <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-1">
                    Role
                  </div>
                  <div className="text-tavern-light">{stats.role}</div>
                </div>
              )}

              {/* Plot Hooks */}
              {stats.plot_hooks && stats.plot_hooks.length > 0 && (
                <div className="bg-background-panel p-4 rounded-lg border border-border">
                  <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-2">
                    Plot Hooks
                  </div>
                  <ul className="list-disc list-inside text-tavern-cream space-y-1">
                    {stats.plot_hooks.map((hook: string, i: number) => (
                      <li key={i}>{hook}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMonsterDetail = (monster: any) => {
    let stats = null;
    try {
      if (monster.stats) {
        stats =
          typeof monster.stats === "string"
            ? JSON.parse(monster.stats)
            : monster.stats;
      }
    } catch (error) {
      logger.error(
        "[SavedContentDetail] Failed to parse monster stats:",
        error,
        monster.stats,
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-tavern-light mb-2">
            {monster.name}
          </h2>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-tavern-terra/20 text-tavern-terra rounded-lg font-semibold">
              CR {monster.cr}
            </span>
          </div>
        </div>

        {stats && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Combat Statistics
            </h3>
            <div className="bg-background-panel p-6 rounded-lg border border-border space-y-4">
              {stats.armor_class && (
                <div className="flex justify-between">
                  <span className="text-tavern-mauve">Armor Class</span>
                  <span className="text-tavern-light font-semibold">
                    {stats.armor_class}
                  </span>
                </div>
              )}
              {stats.hit_points && (
                <div className="flex justify-between">
                  <span className="text-tavern-mauve">Hit Points</span>
                  <span className="text-tavern-light font-semibold">
                    {typeof stats.hit_points === "object"
                      ? `${stats.hit_points.average} (${stats.hit_points.roll})`
                      : stats.hit_points}
                  </span>
                </div>
              )}
              {stats.speed && (
                <div>
                  <div className="text-tavern-mauve mb-2">Speed</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(stats.speed).map(
                      ([type, value]: [string, any]) => (
                        <div key={type} className="text-tavern-cream">
                          <span className="capitalize">{type}:</span> {value}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {stats?.abilities && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Ability Scores
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {Object.entries(stats.abilities).map(
                ([ability, score]: [string, any]) => (
                  <div
                    key={ability}
                    className="bg-background-panel p-3 rounded-lg border border-border text-center"
                  >
                    <div className="text-xs text-tavern-mauve uppercase">
                      {ability}
                    </div>
                    <div className="text-2xl font-bold text-tavern-light">
                      {score}
                    </div>
                    <div className="text-xs text-tavern-cream">
                      {Math.floor((score - 10) / 2) >= 0 ? "+" : ""}
                      {Math.floor((score - 10) / 2)}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {monster.lore && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              Lore
            </h3>
            <p className="text-tavern-cream leading-relaxed whitespace-pre-wrap">
              {monster.lore}
            </p>
          </div>
        )}

        {monster.tactics && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              Tactics
            </h3>
            <p className="text-tavern-cream leading-relaxed whitespace-pre-wrap">
              {monster.tactics}
            </p>
          </div>
        )}

        {stats?.actions && stats.actions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Actions
            </h3>
            <div className="space-y-3">
              {stats.actions.map((action: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-background-panel p-4 rounded-lg border border-border"
                >
                  <div className="font-semibold text-tavern-light mb-1">
                    {action.name}
                  </div>
                  <p className="text-tavern-cream text-sm">
                    {action.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEncounterDetail = (encounter: any) => {
    let creatures = [];
    let environment = null;
    let treasure = null;

    try {
      creatures = encounter.creatures
        ? typeof encounter.creatures === "string"
          ? JSON.parse(encounter.creatures)
          : encounter.creatures
        : [];
      environment = encounter.environment
        ? typeof encounter.environment === "string"
          ? JSON.parse(encounter.environment)
          : encounter.environment
        : null;
      treasure = encounter.treasure
        ? typeof encounter.treasure === "string"
          ? JSON.parse(encounter.treasure)
          : encounter.treasure
        : null;
    } catch (error) {
      logger.error(
        "[SavedContentDetail] Failed to parse encounter data:",
        error,
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-tavern-light mb-3">
            {encounter.name}
          </h2>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="px-3 py-1 bg-tavern-dark rounded-lg text-tavern-cream text-sm">
              Party Level: {encounter.party_level}
            </span>
            <span className="px-3 py-1 bg-tavern-dark rounded-lg text-tavern-cream text-sm">
              Party Size: {encounter.party_size}
            </span>
            <span
              className={`px-3 py-1 rounded-lg text-sm font-semibold capitalize ${
                encounter.difficulty === "deadly"
                  ? "bg-red-900/30 text-red-400"
                  : encounter.difficulty === "hard"
                    ? "bg-orange-900/30 text-orange-400"
                    : encounter.difficulty === "medium"
                      ? "bg-yellow-900/30 text-yellow-400"
                      : "bg-green-900/30 text-green-400"
              }`}
            >
              {encounter.difficulty}
            </span>
          </div>
        </div>

        {encounter.description && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              Description
            </h3>
            <p className="text-tavern-cream leading-relaxed whitespace-pre-wrap">
              {encounter.description}
            </p>
          </div>
        )}

        {environment && Object.keys(environment).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Environment
            </h3>
            <div className="bg-background-panel p-4 rounded-lg border border-border space-y-2">
              {environment.terrain && (
                <div>
                  <span className="text-tavern-mauve font-medium">
                    Terrain:
                  </span>{" "}
                  <span className="text-tavern-cream">
                    {environment.terrain}
                  </span>
                </div>
              )}
              {environment.lighting && (
                <div>
                  <span className="text-tavern-mauve font-medium">
                    Lighting:
                  </span>{" "}
                  <span className="text-tavern-cream">
                    {environment.lighting}
                  </span>
                </div>
              )}
              {environment.weather && (
                <div>
                  <span className="text-tavern-mauve font-medium">
                    Weather:
                  </span>{" "}
                  <span className="text-tavern-cream">
                    {environment.weather}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {creatures.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Creatures
            </h3>
            <div className="space-y-3">
              {creatures.map((creature: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-background-panel p-4 rounded-lg border border-border"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-tavern-light">
                        {creature.name}
                      </div>
                      <div className="text-sm text-tavern-mauve">
                        Quantity: {creature.quantity || 1}
                      </div>
                    </div>
                    {creature.cr && (
                      <span className="px-2 py-1 bg-tavern-terra/20 text-tavern-terra rounded text-xs">
                        CR {creature.cr}
                      </span>
                    )}
                  </div>
                  {creature.notes && (
                    <p className="text-tavern-cream text-sm mt-2">
                      {creature.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {encounter.xp_total && (
            <div className="bg-background-panel p-4 rounded-lg border border-border">
              <div className="text-tavern-mauve text-sm">Total XP</div>
              <div className="text-2xl font-bold text-tavern-light">
                {encounter.xp_total}
              </div>
            </div>
          )}
          {encounter.xp_per_player && (
            <div className="bg-background-panel p-4 rounded-lg border border-border">
              <div className="text-tavern-mauve text-sm">XP per Player</div>
              <div className="text-2xl font-bold text-tavern-light">
                {encounter.xp_per_player}
              </div>
            </div>
          )}
        </div>

        {treasure && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Treasure
            </h3>
            <div className="bg-background-panel p-4 rounded-lg border border-border space-y-3">
              {treasure.coins && Object.keys(treasure.coins).length > 0 && (
                <div>
                  <div className="text-sm text-tavern-mauve mb-2">Coins</div>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(treasure.coins).map(
                      ([coin, amount]: [string, any]) => (
                        <span
                          key={coin}
                          className="px-3 py-1 bg-tavern-gold/20 text-tavern-gold rounded-lg text-sm font-semibold"
                        >
                          {amount} {coin.toUpperCase()}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}
              {treasure.items && treasure.items.length > 0 && (
                <div>
                  <div className="text-sm text-tavern-mauve mb-2">Items</div>
                  <ul className="list-disc list-inside text-tavern-cream space-y-1">
                    {treasure.items.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {encounter.notes && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              Notes
            </h3>
            <p className="text-tavern-cream leading-relaxed">
              {encounter.notes}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderDialogueDetail = (dialogue: any) => {
    let dialogueTree = null;
    let skillChecks = [];
    let information = null;
    let quests = [];

    try {
      dialogueTree = dialogue.dialogue_tree
        ? typeof dialogue.dialogue_tree === "string"
          ? JSON.parse(dialogue.dialogue_tree)
          : dialogue.dialogue_tree
        : null;
      skillChecks = dialogue.skill_checks
        ? typeof dialogue.skill_checks === "string"
          ? JSON.parse(dialogue.skill_checks)
          : dialogue.skill_checks
        : [];
      information = dialogue.information
        ? typeof dialogue.information === "string"
          ? JSON.parse(dialogue.information)
          : dialogue.information
        : null;
      quests = dialogue.potential_quests
        ? typeof dialogue.potential_quests === "string"
          ? JSON.parse(dialogue.potential_quests)
          : dialogue.potential_quests
        : [];
    } catch (error) {
      logger.error(
        "[SavedContentDetail] Failed to parse dialogue data:",
        error,
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-tavern-light mb-2">
            {dialogue.character_name}
          </h2>
          <div className="flex gap-4 text-tavern-cream text-sm">
            {dialogue.scene_setting && <span>📍 {dialogue.scene_setting}</span>}
            {dialogue.mood && (
              <span className="flex items-center gap-1">
                <Icon name="Smile" className="w-4 h-4" />
                {dialogue.mood}
              </span>
            )}
          </div>
        </div>

        {dialogueTree && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Dialogue Options
            </h3>
            <div className="space-y-4">
              {dialogueTree.friendly && (
                <div className="bg-background-panel p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-green-400 flex items-center gap-1">
                      <Icon name="Smile" className="w-4 h-4" />
                      Friendly
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-tavern-cream">
                      <strong className="text-tavern-gold">Player:</strong> "
                      {dialogueTree.friendly.player_option}"
                    </p>
                    <p className="text-tavern-cream">
                      <strong className="text-tavern-gold">NPC:</strong>{" "}
                      {dialogueTree.friendly.npc_response}
                    </p>
                    <p className="text-tavern-mauve italic">
                      → {dialogueTree.friendly.outcome}
                    </p>
                  </div>
                </div>
              )}
              {dialogueTree.neutral && (
                <div className="bg-background-panel p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-yellow-400 flex items-center gap-1">
                      <Icon name="Meh" className="w-4 h-4" />
                      Neutral
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-tavern-cream">
                      <strong className="text-tavern-gold">Player:</strong> "
                      {dialogueTree.neutral.player_option}"
                    </p>
                    <p className="text-tavern-cream">
                      <strong className="text-tavern-gold">NPC:</strong>{" "}
                      {dialogueTree.neutral.npc_response}
                    </p>
                    <p className="text-tavern-mauve italic">
                      → {dialogueTree.neutral.outcome}
                    </p>
                  </div>
                </div>
              )}
              {dialogueTree.hostile && (
                <div className="bg-background-panel p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-red-400 flex items-center gap-1">
                      <Icon name="Frown" className="w-4 h-4" />
                      Hostile
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-tavern-cream">
                      <strong className="text-tavern-gold">Player:</strong> "
                      {dialogueTree.hostile.player_option}"
                    </p>
                    <p className="text-tavern-cream">
                      <strong className="text-tavern-gold">NPC:</strong>{" "}
                      {dialogueTree.hostile.npc_response}
                    </p>
                    <p className="text-tavern-mauve italic">
                      → {dialogueTree.hostile.outcome}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {skillChecks && skillChecks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Skill Checks
            </h3>
            <div className="space-y-3">
              {skillChecks.map((check: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-background-panel p-4 rounded-lg border border-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-tavern-light font-semibold">
                      {check.skill || check.name}
                    </span>
                    <span className="text-tavern-gold font-bold">
                      DC {check.dc}
                    </span>
                  </div>
                  {check.success && (
                    <p className="text-sm text-green-400 mb-1">
                      <strong>Success:</strong> {check.success}
                    </p>
                  )}
                  {check.failure && (
                    <p className="text-sm text-red-400">
                      <strong>Failure:</strong> {check.failure}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {information && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              Information Revealed
            </h3>
            <div className="bg-background-panel p-4 rounded-lg border border-border">
              {Array.isArray(information) ? (
                <ul className="list-disc list-inside text-tavern-cream space-y-1">
                  {information.map((info: string, idx: number) => (
                    <li key={idx}>{info}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-tavern-cream">{information}</p>
              )}
            </div>
          </div>
        )}

        {quests && quests.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Potential Quests
            </h3>
            <div className="space-y-3">
              {quests.map((quest: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-background-panel p-4 rounded-lg border border-border"
                >
                  <div className="font-semibold text-tavern-light mb-1">
                    Quest {idx + 1}
                  </div>
                  <p className="text-tavern-cream text-sm">
                    {typeof quest === "string"
                      ? quest
                      : quest.description ||
                        quest.name ||
                        JSON.stringify(quest)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLocationDetail = (location: any) => {
    let features = [];
    let secrets = [];
    let factions = [];
    let npcs = [];
    let encounters = [];

    try {
      features = location.features
        ? typeof location.features === "string"
          ? JSON.parse(location.features)
          : location.features
        : [];
      secrets = location.secrets
        ? typeof location.secrets === "string"
          ? JSON.parse(location.secrets)
          : location.secrets
        : [];
      factions = location.factions
        ? typeof location.factions === "string"
          ? JSON.parse(location.factions)
          : location.factions
        : [];
      npcs = location.npcs
        ? typeof location.npcs === "string"
          ? JSON.parse(location.npcs)
          : location.npcs
        : [];
      encounters = location.encounters
        ? typeof location.encounters === "string"
          ? JSON.parse(location.encounters)
          : location.encounters
        : [];
    } catch (error) {
      logger.error(
        "[SavedContentDetail] Failed to parse location data:",
        error,
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-tavern-light mb-2">
            {location.name}
          </h2>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-tavern-purple/30 text-tavern-cream rounded-lg text-sm capitalize">
              {location.type}
            </span>
            {location.theme && (
              <span className="px-3 py-1 bg-tavern-dark text-tavern-mauve rounded-lg text-sm">
                {location.theme}
              </span>
            )}
          </div>
        </div>

        {location.description && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              Description
            </h3>
            <p className="text-tavern-cream leading-relaxed whitespace-pre-wrap">
              {location.description}
            </p>
          </div>
        )}

        {features && features.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Notable Features
            </h3>
            <ul className="list-disc list-inside space-y-2 text-tavern-cream">
              {features.map((feature: any, idx: number) => (
                <li key={idx}>
                  {typeof feature === "string" ? feature : feature.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {secrets && secrets.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Secrets & Clues
            </h3>
            <div className="space-y-2">
              {secrets.map((secret: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-background-panel p-3 rounded-lg border border-border"
                >
                  <p className="text-tavern-cream text-sm">
                    {typeof secret === "string" ? secret : secret.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {factions && factions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Factions Present
            </h3>
            <div className="flex flex-wrap gap-2">
              {factions.map((faction: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-tavern-purple/30 text-tavern-cream rounded-full text-sm"
                >
                  {faction}
                </span>
              ))}
            </div>
          </div>
        )}

        {npcs && npcs.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              NPCs
            </h3>
            <div className="flex flex-wrap gap-2">
              {npcs.map((npc: any, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-tavern-dark text-tavern-cream rounded-full text-sm"
                >
                  {typeof npc === "string" ? npc : npc?.name || "Unnamed NPC"}
                </span>
              ))}
            </div>
          </div>
        )}

        {encounters && encounters.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Encounter Hooks
            </h3>
            <ul className="list-disc list-inside space-y-2 text-tavern-cream">
              {encounters.map((encounter: any, idx: number) => (
                <li key={idx}>
                  {typeof encounter === "string"
                    ? encounter
                    : encounter.description}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderQuestDetail = (quest: any) => {
    let objectives = [];
    let rewards = [];
    let complications = [];
    let npcsInvolved = [];
    let locationsInvolved = [];

    try {
      objectives = quest.objectives
        ? typeof quest.objectives === "string"
          ? JSON.parse(quest.objectives)
          : quest.objectives
        : [];
      rewards = quest.rewards
        ? typeof quest.rewards === "string"
          ? JSON.parse(quest.rewards)
          : quest.rewards
        : [];
      complications = quest.complications
        ? typeof quest.complications === "string"
          ? JSON.parse(quest.complications)
          : quest.complications
        : [];
      npcsInvolved = quest.npcs_involved
        ? typeof quest.npcs_involved === "string"
          ? JSON.parse(quest.npcs_involved)
          : quest.npcs_involved
        : [];
      locationsInvolved = quest.locations_involved
        ? typeof quest.locations_involved === "string"
          ? JSON.parse(quest.locations_involved)
          : quest.locations_involved
        : [];
    } catch (error) {
      logger.error("[SavedContentDetail] Failed to parse quest data:", error);
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-tavern-light mb-3">
            {quest.title}
          </h2>
          <div className="flex gap-2 flex-wrap">
            <span className="px-3 py-1 bg-tavern-purple/30 text-tavern-cream rounded-lg text-sm uppercase">
              {quest.type}
            </span>
            <span
              className={`px-3 py-1 rounded-lg text-sm uppercase ${
                quest.status === "available"
                  ? "bg-blue-900/30 text-blue-400"
                  : quest.status === "active"
                    ? "bg-green-900/30 text-green-400"
                    : quest.status === "completed"
                      ? "bg-tavern-gold/20 text-tavern-gold"
                      : "bg-red-900/30 text-red-400"
              }`}
            >
              {quest.status}
            </span>
            {quest.category && (
              <span className="px-3 py-1 bg-tavern-dark text-tavern-mauve rounded-lg text-sm capitalize">
                {quest.category}
              </span>
            )}
            {quest.party_level && (
              <span className="px-3 py-1 bg-tavern-terra/20 text-tavern-terra rounded-lg text-sm">
                Level {quest.party_level}
              </span>
            )}
          </div>
        </div>

        {quest.description && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              Description
            </h3>
            <p className="text-tavern-cream leading-relaxed whitespace-pre-wrap">
              {quest.description}
            </p>
          </div>
        )}

        {objectives && objectives.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Objectives
            </h3>
            <ul className="list-disc list-inside space-y-2 text-tavern-cream">
              {objectives.map((objective: any, idx: number) => (
                <li key={idx}>
                  {typeof objective === "string"
                    ? objective
                    : objective.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {rewards && rewards.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Rewards
            </h3>
            <div className="bg-tavern-gold/10 p-4 rounded-lg border border-tavern-gold/30">
              <ul className="space-y-1 text-tavern-cream">
                {rewards.map((reward: any, idx: number) => (
                  <li key={idx}>
                    {typeof reward === "string" ? reward : reward.description}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {complications && complications.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Complications
            </h3>
            <div className="space-y-2">
              {complications.map((complication: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-red-900/20 p-3 rounded-lg border border-red-500/30"
                >
                  <p className="text-tavern-cream text-sm">
                    {typeof complication === "string"
                      ? complication
                      : complication.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {quest.combat_intensity && (
            <div className="bg-background-panel p-4 rounded-lg border border-border">
              <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-1">
                Combat Intensity
              </div>
              <div className="text-tavern-light capitalize">
                {quest.combat_intensity}
              </div>
            </div>
          )}
          {quest.time_limit && (
            <div className="bg-background-panel p-4 rounded-lg border border-border">
              <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-1">
                Time Limit
              </div>
              <div className="text-tavern-light">{quest.time_limit}</div>
            </div>
          )}
        </div>

        {npcsInvolved && npcsInvolved.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              NPCs Involved
            </h3>
            <div className="flex flex-wrap gap-2">
              {npcsInvolved.map((npc: any, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-tavern-dark text-tavern-cream rounded-full text-sm"
                >
                  {typeof npc === "string" ? npc : npc?.name || "Unnamed NPC"}
                </span>
              ))}
            </div>
          </div>
        )}

        {locationsInvolved && locationsInvolved.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Locations
            </h3>
            <div className="flex flex-wrap gap-2">
              {locationsInvolved.map((location: any, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-tavern-purple/30 text-tavern-cream rounded-full text-sm"
                >
                  {typeof location === "string"
                    ? location
                    : location?.name || "Unnamed Location"}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderItemDetail = (item: any) => {
    let properties = null;
    let value = null;

    try {
      properties = item.properties
        ? typeof item.properties === "string"
          ? JSON.parse(item.properties)
          : item.properties
        : null;
      value = item.value
        ? typeof item.value === "string"
          ? JSON.parse(item.value)
          : item.value
        : null;
    } catch (error) {
      logger.error("[SavedContentDetail] Failed to parse item data:", error);
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-tavern-light mb-3">
            {item.name}
          </h2>
          <div className="flex gap-2 flex-wrap mb-3">
            <span className="px-3 py-1 bg-tavern-purple/30 text-tavern-cream rounded-lg text-sm capitalize">
              {item.type}
            </span>
            {item.rarity && (
              <span
                className={`px-3 py-1 rounded-lg text-sm capitalize ${
                  item.rarity === "common"
                    ? "bg-gray-700/50 text-gray-300"
                    : item.rarity === "uncommon"
                      ? "bg-green-900/30 text-green-400"
                      : item.rarity === "rare"
                        ? "bg-blue-900/30 text-blue-400"
                        : item.rarity === "very_rare"
                          ? "bg-purple-900/30 text-purple-400"
                          : item.rarity === "legendary"
                            ? "bg-orange-900/30 text-orange-400"
                            : "bg-tavern-gold/20 text-tavern-gold"
                }`}
              >
                {item.rarity.replace("_", " ")}
              </span>
            )}
            {item.requires_attunement && (
              <span className="px-3 py-1 bg-tavern-terra/20 text-tavern-terra rounded-lg text-sm">
                Requires Attunement
              </span>
            )}
          </div>
        </div>

        {item.description && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              Description
            </h3>
            <p className="text-tavern-cream leading-relaxed whitespace-pre-wrap">
              {item.description}
            </p>
          </div>
        )}

        {properties && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Properties
            </h3>
            <div className="bg-background-panel p-4 rounded-lg border border-border space-y-2">
              {Object.entries(properties).map(([key, val]: [string, any]) => {
                // Format damage_dice objects like {count: 1, die: 6, bonus: 2}
                let displayValue: string;
                if (
                  key === "damage_dice" &&
                  typeof val === "object" &&
                  val !== null
                ) {
                  const dice = val as any;
                  displayValue =
                    dice.count && dice.die
                      ? `${dice.count}d${dice.die}${dice.bonus ? ` + ${dice.bonus}` : ""}`
                      : JSON.stringify(val);
                } else if (typeof val === "object" && val !== null) {
                  displayValue = JSON.stringify(val);
                } else {
                  displayValue = String(val);
                }

                return (
                  <div key={key} className="flex justify-between">
                    <span className="text-tavern-mauve capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="text-tavern-light">{displayValue}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {item.origin && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              Origin
            </h3>
            <p className="text-tavern-cream leading-relaxed whitespace-pre-wrap">
              {item.origin}
            </p>
          </div>
        )}

        {item.curse && (
          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-2">Curse</h3>
            <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/30">
              <p className="text-tavern-cream leading-relaxed whitespace-pre-wrap">
                {item.curse}
              </p>
            </div>
          </div>
        )}

        {(value || item.value !== undefined || item.weight !== undefined) && (
          <div className="bg-tavern-gold/10 p-4 rounded-lg border border-tavern-gold/30">
            <div className="flex gap-6">
              {(value || item.value !== undefined) && (
                <div>
                  <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-1">
                    Value
                  </div>
                  <div className="text-tavern-light text-lg">
                    {typeof value === "object" && value !== null
                      ? `${value.amount} ${value.currency || "gp"}`
                      : typeof item.value === "number"
                        ? `${item.value} gp`
                        : value || item.value}
                  </div>
                </div>
              )}
              {item.weight !== undefined && (
                <div>
                  <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-1">
                    Weight
                  </div>
                  <div className="text-tavern-light text-lg">
                    {typeof item.weight === "object" &&
                    (item.weight as any).amount
                      ? `${(item.weight as any).amount} ${(item.weight as any).unit || "lb"}`
                      : `${item.weight} lb`}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRumorDetail = (rumor: any) => {
    let tags = [];

    try {
      tags = rumor.tags
        ? typeof rumor.tags === "string"
          ? JSON.parse(rumor.tags)
          : rumor.tags
        : [];
    } catch (error) {
      logger.error("[SavedContentDetail] Failed to parse rumor data:", error);
    }

    return (
      <div className="space-y-6">
        <div className="bg-background-panel p-6 rounded-lg border border-border">
          <p className="text-tavern-light text-xl italic leading-relaxed">
            &ldquo;{rumor.text}&rdquo;
          </p>
        </div>

        <div className="bg-background-panel p-4 rounded-lg border border-border inline-block">
          <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-2">
            Veracity
          </div>
          <span
            className={`px-3 py-1 rounded text-sm inline-block ${
              rumor.veracity === "true"
                ? "bg-green-900/30 text-green-400"
                : rumor.veracity === "partially_true"
                  ? "bg-yellow-900/30 text-yellow-400"
                  : "bg-red-900/30 text-red-400"
            }`}
          >
            {rumor.veracity.replace("_", " ")}
          </span>
        </div>

        {rumor.source && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              Source
            </h3>
            <p className="text-tavern-cream">{rumor.source}</p>
          </div>
        )}

        {rumor.context && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              Context
            </h3>
            <p className="text-tavern-cream leading-relaxed whitespace-pre-wrap">
              {rumor.context}
            </p>
          </div>
        )}

        {rumor.leads_to && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              Leads To
            </h3>
            <span className="px-3 py-1 bg-tavern-purple/30 text-tavern-cream rounded-lg text-sm capitalize">
              {rumor.leads_to}
            </span>
          </div>
        )}

        {rumor.foreshadowing && (
          <div className="bg-tavern-gold/10 p-4 rounded-lg border border-tavern-gold/30">
            <div className="flex items-center gap-2">
              <Icon name="AlertCircle" className="w-5 h-5 text-tavern-gold" />
              <span className="text-tavern-gold font-semibold">
                Foreshadows Future Events
              </span>
            </div>
          </div>
        )}

        {tags && tags.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-tavern-dark text-tavern-cream rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTavernDetail = (tavern: any) => {
    let menuFood, menuDrinks, rooms, patrons, events, rumors;
    try {
      menuFood = tavern.menu_food
        ? typeof tavern.menu_food === "string"
          ? JSON.parse(tavern.menu_food)
          : tavern.menu_food
        : null;
      menuDrinks = tavern.menu_drinks
        ? typeof tavern.menu_drinks === "string"
          ? JSON.parse(tavern.menu_drinks)
          : tavern.menu_drinks
        : null;
      rooms = tavern.rooms
        ? typeof tavern.rooms === "string"
          ? JSON.parse(tavern.rooms)
          : tavern.rooms
        : null;
      patrons = tavern.patrons
        ? typeof tavern.patrons === "string"
          ? JSON.parse(tavern.patrons)
          : tavern.patrons
        : null;
      events = tavern.events
        ? typeof tavern.events === "string"
          ? JSON.parse(tavern.events)
          : tavern.events
        : null;
      rumors = tavern.rumors
        ? typeof tavern.rumors === "string"
          ? JSON.parse(tavern.rumors)
          : tavern.rumors
        : null;
    } catch (error) {
      logger.error("[SavedContentDetail] Failed to parse tavern data:", error);
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background-panel p-4 rounded-lg border border-border">
            <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-2">
              Type
            </div>
            <div className="text-lg text-tavern-light capitalize">
              {tavern.type}
            </div>
          </div>
          {tavern.quality && (
            <div className="bg-background-panel p-4 rounded-lg border border-border">
              <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-2">
                Quality
              </div>
              <div className="text-lg text-tavern-light capitalize">
                {tavern.quality}
              </div>
            </div>
          )}
          {tavern.size && (
            <div className="bg-background-panel p-4 rounded-lg border border-border">
              <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-2">
                Size
              </div>
              <div className="text-lg text-tavern-light capitalize">
                {tavern.size}
              </div>
            </div>
          )}
        </div>

        {tavern.atmosphere && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              Atmosphere
            </h3>
            <p className="text-tavern-cream leading-relaxed">
              {tavern.atmosphere}
            </p>
            {tavern.description && (
              <p className="text-tavern-cream leading-relaxed mt-2">
                {tavern.description}
              </p>
            )}
          </div>
        )}

        {(tavern.keeper_name ||
          tavern.keeper_personality ||
          tavern.keeper_description) && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              The Keeper
            </h3>
            <div className="bg-background-panel p-4 rounded-lg border border-border space-y-2">
              {tavern.keeper_name && (
                <h4 className="font-semibold text-tavern-light text-lg">
                  {tavern.keeper_name}
                </h4>
              )}
              {tavern.keeper_personality && (
                <p className="text-tavern-cream italic text-sm">
                  {tavern.keeper_personality}
                </p>
              )}
              {tavern.keeper_description && (
                <p className="text-tavern-cream">{tavern.keeper_description}</p>
              )}
            </div>
          </div>
        )}

        {(menuFood || menuDrinks) && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Menu
            </h3>
            <div className="bg-background-panel p-4 rounded-lg border border-border space-y-4">
              {Array.isArray(menuFood) && menuFood.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-tavern-mauve mb-2">
                    Food
                  </h4>
                  <div className="space-y-2">
                    {menuFood.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between items-start"
                      >
                        <div className="flex-1">
                          <div className="text-tavern-light font-medium">
                            {item.name}
                          </div>
                          {item.description && (
                            <div className="text-tavern-cream text-sm">
                              {item.description}
                            </div>
                          )}
                        </div>
                        <span className="text-tavern-gold ml-4 whitespace-nowrap">
                          {item.price}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(menuDrinks) && menuDrinks.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-tavern-mauve mb-2">
                    Drinks
                  </h4>
                  <div className="space-y-2">
                    {menuDrinks.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between items-start"
                      >
                        <div className="flex-1">
                          <div className="text-tavern-light font-medium">
                            {item.name}
                          </div>
                          {item.description && (
                            <div className="text-tavern-cream text-sm">
                              {item.description}
                            </div>
                          )}
                        </div>
                        <span className="text-tavern-gold ml-4 whitespace-nowrap">
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

        {Array.isArray(rooms) && rooms.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Accommodations
            </h3>
            <div className="grid gap-3">
              {rooms.map((room: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-background-panel p-4 rounded-lg border border-border"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-tavern-light">
                        {room.type}
                      </h4>
                      {room.available && (
                        <span className="text-tavern-mauve text-xs">
                          ({room.available} available)
                        </span>
                      )}
                    </div>
                    <span className="text-tavern-gold whitespace-nowrap">
                      {room.price}
                    </span>
                  </div>
                  <p className="text-tavern-cream text-sm">
                    {room.description || room.details}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(patrons) && patrons.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Notable Patrons
            </h3>
            <div className="grid gap-3">
              {patrons.map((patron: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-background-panel p-4 rounded-lg border border-border"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <h4 className="font-semibold text-tavern-light">
                      {patron.name}
                    </h4>
                    {patron.race && (
                      <span className="text-tavern-mauve text-xs uppercase tracking-wide">
                        {patron.race}
                      </span>
                    )}
                  </div>
                  <p className="text-tavern-cream text-sm">
                    {patron.description}
                  </p>
                  {patron.hook && (
                    <p className="text-tavern-gold text-sm mt-2 flex items-start gap-2">
                      <span>💡</span>
                      <span>{patron.hook}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(events) && events.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Current Events
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {events.map((event: any, idx: number) => (
                <li key={idx} className="text-tavern-cream">
                  {typeof event === "string"
                    ? event
                    : event.description || event.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {Array.isArray(rumors) && rumors.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Rumors & Gossip
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {rumors.map((rumor: any, idx: number) => (
                <li key={idx} className="text-tavern-cream">
                  {typeof rumor === "string"
                    ? rumor
                    : rumor.text || rumor.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {Array.isArray(patrons) && patrons.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Notable Patrons
            </h3>
            <div className="grid gap-3">
              {patrons.map((patron: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-background-panel p-4 rounded-lg border border-border"
                >
                  <h4 className="font-semibold text-tavern-light mb-1">
                    {patron.name}
                  </h4>
                  <p className="text-tavern-cream text-sm">
                    {patron.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tavern.special_notes && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2 flex items-center gap-2">
              <Icon name="AlertCircle" className="w-5 h-5" />
              Special Notes
            </h3>
            <p className="text-tavern-cream leading-relaxed whitespace-pre-wrap">
              {tavern.special_notes}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderMerchantDetail = (merchant: any) => {
    let inventory, services, specialItems, rumors, recentlySold;
    try {
      inventory = merchant.inventory
        ? typeof merchant.inventory === "string"
          ? JSON.parse(merchant.inventory)
          : merchant.inventory
        : null;
      services = merchant.services
        ? typeof merchant.services === "string"
          ? JSON.parse(merchant.services)
          : merchant.services
        : null;
      specialItems = merchant.special_items
        ? typeof merchant.special_items === "string"
          ? JSON.parse(merchant.special_items)
          : merchant.special_items
        : null;
      rumors = merchant.rumors
        ? typeof merchant.rumors === "string"
          ? JSON.parse(merchant.rumors)
          : merchant.rumors
        : null;
      recentlySold = merchant.recently_sold
        ? typeof merchant.recently_sold === "string"
          ? JSON.parse(merchant.recently_sold)
          : merchant.recently_sold
        : null;
    } catch (error) {
      logger.error(
        "[SavedContentDetail] Failed to parse merchant data:",
        error,
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background-panel p-4 rounded-lg border border-border">
            <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-2">
              Shop Type
            </div>
            <div className="text-lg text-tavern-light capitalize">
              {merchant.shop_type?.replace(/_/g, " ")}
            </div>
          </div>
          {merchant.location && (
            <div className="bg-background-panel p-4 rounded-lg border border-border">
              <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-2">
                Location
              </div>
              <div className="text-lg text-tavern-light">
                {merchant.location}
              </div>
            </div>
          )}
        </div>

        {merchant.atmosphere && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              Atmosphere
            </h3>
            <p className="text-tavern-cream leading-relaxed">
              {merchant.atmosphere}
            </p>
            {merchant.description && (
              <p className="text-tavern-cream leading-relaxed mt-2">
                {merchant.description}
              </p>
            )}
          </div>
        )}

        {(merchant.owner_name ||
          merchant.owner_personality ||
          merchant.owner_description) && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              The Owner
            </h3>
            <div className="bg-background-panel p-4 rounded-lg border border-border space-y-2">
              {merchant.owner_name && (
                <h4 className="font-semibold text-tavern-light text-lg">
                  {merchant.owner_name}
                </h4>
              )}
              {merchant.owner_personality && (
                <p className="text-tavern-cream italic text-sm">
                  {merchant.owner_personality}
                </p>
              )}
              {merchant.owner_description && (
                <p className="text-tavern-cream">
                  {merchant.owner_description}
                </p>
              )}
              {merchant.haggle_willingness && (
                <p className="text-tavern-mauve text-sm">
                  🤝 Haggling: {merchant.haggle_willingness}
                </p>
              )}
            </div>
          </div>
        )}

        {Array.isArray(inventory) && inventory.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Inventory
            </h3>
            <div className="grid gap-3">
              {inventory.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-background-panel p-4 rounded-lg border border-border"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-tavern-light">
                      {item.name}
                    </h4>
                    <span className="text-tavern-gold whitespace-nowrap">
                      {item.price}
                    </span>
                  </div>
                  {item.quantity && (
                    <p className="text-tavern-mauve text-xs mb-1">
                      Stock: {item.quantity}
                    </p>
                  )}
                  <p className="text-tavern-cream text-sm">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(specialItems) && specialItems.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Special Items
            </h3>
            <div className="grid gap-3">
              {specialItems.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-background-panel p-4 rounded-lg border-2 border-tavern-gold/30"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-tavern-light">
                      {item.name}
                    </h4>
                    <span className="text-tavern-gold font-bold whitespace-nowrap">
                      {item.price}
                    </span>
                  </div>
                  {item.quantity && (
                    <p className="text-tavern-mauve text-xs mb-1">
                      Stock: {item.quantity}
                    </p>
                  )}
                  <p className="text-tavern-cream text-sm">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(services) && services.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Services Offered
            </h3>
            <div className="grid gap-3">
              {services.map((service: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-background-panel p-4 rounded-lg border border-border"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-tavern-light">
                      {service.name}
                    </h4>
                    <span className="text-tavern-gold whitespace-nowrap">
                      {service.price}
                    </span>
                  </div>
                  <p className="text-tavern-cream text-sm">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(recentlySold) && recentlySold.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Recently Sold
            </h3>
            <div className="grid gap-3">
              {recentlySold.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-background-panel p-4 rounded-lg border border-border opacity-75"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-tavern-light">
                      {item.name}
                    </h4>
                    <span className="text-tavern-mauve whitespace-nowrap line-through">
                      {item.price}
                    </span>
                  </div>
                  <p className="text-tavern-cream text-sm">
                    {item.description}
                  </p>
                  {item.buyer && (
                    <p className="text-tavern-mauve text-xs mt-1">
                      Sold to: {item.buyer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(rumors) && rumors.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Rumors & Gossip
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {rumors.map((rumor: any, idx: number) => (
                <li key={idx} className="text-tavern-cream">
                  {typeof rumor === "string"
                    ? rumor
                    : rumor.text || rumor.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {merchant.special_notes && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2 flex items-center gap-2">
              <Icon name="AlertCircle" className="w-5 h-5" />
              Special Notes
            </h3>
            <p className="text-tavern-cream leading-relaxed whitespace-pre-wrap">
              {merchant.special_notes}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderTrapDetail = (trap: any) => {
    let detection, solutionPaths, complications, rewards, scaling;
    try {
      detection = trap.detection
        ? typeof trap.detection === "string"
          ? JSON.parse(trap.detection)
          : trap.detection
        : null;
      solutionPaths = trap.solution_paths
        ? typeof trap.solution_paths === "string"
          ? JSON.parse(trap.solution_paths)
          : trap.solution_paths
        : null;
      complications = trap.complications
        ? typeof trap.complications === "string"
          ? JSON.parse(trap.complications)
          : trap.complications
        : null;
      rewards = trap.rewards
        ? typeof trap.rewards === "string"
          ? JSON.parse(trap.rewards)
          : trap.rewards
        : null;
      scaling = trap.scaling
        ? typeof trap.scaling === "string"
          ? JSON.parse(trap.scaling)
          : trap.scaling
        : null;
    } catch (error) {
      logger.error("[SavedContentDetail] Failed to parse trap data:", error);
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-background-panel p-4 rounded-lg border border-border">
            <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-2">
              Type
            </div>
            <div className="text-lg text-tavern-light capitalize">
              {trap.trap_type?.replace(/_/g, " ")}
            </div>
          </div>
          <div className="bg-background-panel p-4 rounded-lg border border-border">
            <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-2">
              Difficulty
            </div>
            <div
              className={`text-lg font-semibold capitalize ${
                trap.difficulty === "deadly"
                  ? "text-red-400"
                  : trap.difficulty === "hard"
                    ? "text-orange-400"
                    : trap.difficulty === "medium"
                      ? "text-yellow-400"
                      : "text-green-400"
              }`}
            >
              {trap.difficulty}
            </div>
          </div>
          <div className="bg-background-panel p-4 rounded-lg border border-border">
            <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-2">
              Environment
            </div>
            <div className="text-lg text-tavern-light capitalize">
              {trap.environment}
            </div>
          </div>
        </div>

        {trap.description && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              Description
            </h3>
            <p className="text-tavern-cream leading-relaxed">
              {trap.description}
            </p>
          </div>
        )}

        {trap.trigger && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2">
              Trigger
            </h3>
            <p className="text-tavern-cream leading-relaxed">{trap.trigger}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {trap.effect && (
            <div className="bg-background-panel p-4 rounded-lg border border-border">
              <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-2">
                Effect
              </div>
              <div className="text-tavern-light">{trap.effect}</div>
            </div>
          )}
          {trap.damage && (
            <div className="bg-background-panel p-4 rounded-lg border border-border">
              <div className="text-xs text-tavern-mauve uppercase tracking-wide mb-2">
                Damage
              </div>
              <div className="text-tavern-light font-mono">{trap.damage}</div>
            </div>
          )}
        </div>

        {detection && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Detection
            </h3>
            <div className="bg-background-panel p-4 rounded-lg border border-border space-y-3">
              {detection.passive_perception_dc && (
                <div className="flex items-center gap-2">
                  <span className="text-tavern-mauve">
                    Passive Perception DC:
                  </span>
                  <span className="text-tavern-light font-bold">
                    {detection.passive_perception_dc}
                  </span>
                </div>
              )}
              {detection.investigation_dc && (
                <div className="flex items-center gap-2">
                  <span className="text-tavern-mauve">Investigation DC:</span>
                  <span className="text-tavern-light font-bold">
                    {detection.investigation_dc}
                  </span>
                </div>
              )}
              {Array.isArray(detection.clues) && detection.clues.length > 0 && (
                <div>
                  <div className="text-sm text-tavern-mauve mb-2">Clues:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {detection.clues.map((clue: string, idx: number) => (
                      <li key={idx} className="text-tavern-cream">
                        {clue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {Array.isArray(solutionPaths) && solutionPaths.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Solution Paths
            </h3>
            <div className="grid gap-4">
              {solutionPaths.map((path: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-background-panel p-4 rounded-lg border border-tavern-purple"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-tavern-light">
                      {path.approach}
                    </h4>
                    <div className="flex gap-2">
                      {path.skill && (
                        <span className="px-2 py-1 bg-tavern-dark text-tavern-mauve rounded text-xs">
                          {path.skill}
                        </span>
                      )}
                      {path.dc && (
                        <span className="px-2 py-1 bg-tavern-gold/20 text-tavern-gold rounded text-xs font-bold">
                          DC {path.dc}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-tavern-cream text-sm mb-2">
                    {path.description}
                  </p>
                  {path.time && (
                    <p className="text-tavern-mauve text-xs">
                      ⏱️ Time: {path.time}
                    </p>
                  )}
                  {path.failure && (
                    <p className="text-red-400 text-xs mt-1">
                      ⚠️ On Failure: {path.failure}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(complications) && complications.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3 flex items-center gap-2">
              <Icon name="AlertCircle" className="w-5 h-5" />
              Complications
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {complications.map((comp: string, idx: number) => (
                <li key={idx} className="text-tavern-cream">
                  {comp}
                </li>
              ))}
            </ul>
          </div>
        )}

        {Array.isArray(rewards) && rewards.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Rewards
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {rewards.map((reward: string, idx: number) => (
                <li key={idx} className="text-tavern-cream">
                  {reward}
                </li>
              ))}
            </ul>
          </div>
        )}

        {scaling && (scaling.easier || scaling.harder) && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3">
              Scaling
            </h3>
            <div className="grid gap-4">
              {scaling.easier && (
                <div className="bg-green-900/20 p-4 rounded-lg border border-green-700">
                  <h4 className="font-semibold text-green-400 mb-2">
                    Easier Version
                  </h4>
                  <p className="text-tavern-cream text-sm">{scaling.easier}</p>
                </div>
              )}
              {scaling.harder && (
                <div className="bg-red-900/20 p-4 rounded-lg border border-red-700">
                  <h4 className="font-semibold text-red-400 mb-2">
                    Harder Version
                  </h4>
                  <p className="text-tavern-cream text-sm">{scaling.harder}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {trap.dm_notes && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2 flex items-center gap-2">
              <Icon name="BookOpen" className="w-5 h-5" />
              DM Notes
            </h3>
            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-700">
              <p className="text-tavern-cream leading-relaxed whitespace-pre-wrap">
                {trap.dm_notes}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCritterDetail = (critter: any) => {
    let stats, specialAbilities, uses, interestingFacts;
    try {
      stats = critter.stats
        ? typeof critter.stats === "string"
          ? JSON.parse(critter.stats)
          : critter.stats
        : null;
      specialAbilities = critter.special_abilities
        ? typeof critter.special_abilities === "string"
          ? JSON.parse(critter.special_abilities)
          : critter.special_abilities
        : [];
      uses = critter.uses
        ? typeof critter.uses === "string"
          ? JSON.parse(critter.uses)
          : critter.uses
        : [];
      interestingFacts = critter.interesting_facts
        ? typeof critter.interesting_facts === "string"
          ? JSON.parse(critter.interesting_facts)
          : critter.interesting_facts
        : [];
    } catch (e) {
      logger.error("Error parsing critter data:", e);
    }

    return (
      <div className="space-y-6">
        {/* Header with badges */}
        <div>
          <h2 className="text-2xl font-bold text-tavern-gold">
            {critter.name}
          </h2>
          {critter.species && (
            <p className="text-sm text-tavern-mauve italic mt-1">
              {critter.species}
            </p>
          )}
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="px-3 py-1 bg-tavern-purple/40 text-tavern-cream rounded text-sm capitalize">
              {critter.critter_type}
            </span>
            <span className="px-3 py-1 bg-blue-900/40 text-blue-300 rounded text-sm capitalize">
              {critter.size}
            </span>
            {critter.temperament && (
              <span className="px-3 py-1 bg-purple-900/40 text-purple-300 rounded text-sm capitalize">
                {critter.temperament}
              </span>
            )}
            {critter.habitat && (
              <span className="px-3 py-1 bg-green-900/40 text-green-300 rounded text-sm capitalize">
                {critter.habitat}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {critter.description && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2 flex items-center gap-2">
              <Icon name="FileText" className="w-5 h-5" />
              Description
            </h3>
            <p className="text-tavern-cream leading-relaxed">
              {critter.description}
            </p>
          </div>
        )}

        {/* Behavior */}
        {critter.behavior && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2 flex items-center gap-2">
              <Icon name="AlertCircle" className="w-5 h-5" />
              Behavior
            </h3>
            <p className="text-tavern-cream leading-relaxed">
              {critter.behavior}
            </p>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3 flex items-center gap-2">
              <Icon name="Package" className="w-5 h-5" />
              Stats
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {stats.ac !== undefined && (
                <div className="bg-tavern-dark p-3 rounded border border-tavern-purple">
                  <p className="text-xs text-tavern-mauve mb-1">Armor Class</p>
                  <p className="text-xl font-bold text-tavern-gold">
                    {stats.ac}
                  </p>
                </div>
              )}
              {stats.hp !== undefined && (
                <div className="bg-tavern-dark p-3 rounded border border-tavern-purple">
                  <p className="text-xs text-tavern-mauve mb-1">Hit Points</p>
                  <p className="text-xl font-bold text-red-400">{stats.hp}</p>
                </div>
              )}
              {stats.speed && (
                <div className="bg-tavern-dark p-3 rounded border border-tavern-purple">
                  <p className="text-xs text-tavern-mauve mb-1">Speed</p>
                  <p className="text-xl font-bold text-blue-400">
                    {stats.speed}
                  </p>
                </div>
              )}
            </div>

            {/* Ability Scores */}
            {(stats.str !== undefined ||
              stats.dex !== undefined ||
              stats.con !== undefined ||
              stats.int !== undefined ||
              stats.wis !== undefined ||
              stats.cha !== undefined) && (
              <div className="grid grid-cols-6 gap-2 mt-3">
                {stats.str !== undefined && (
                  <div className="bg-tavern-dark p-2 rounded border border-tavern-purple text-center">
                    <p className="text-xs text-tavern-mauve mb-1">STR</p>
                    <p className="text-lg font-bold text-tavern-cream">
                      {stats.str}
                    </p>
                  </div>
                )}
                {stats.dex !== undefined && (
                  <div className="bg-tavern-dark p-2 rounded border border-tavern-purple text-center">
                    <p className="text-xs text-tavern-mauve mb-1">DEX</p>
                    <p className="text-lg font-bold text-tavern-cream">
                      {stats.dex}
                    </p>
                  </div>
                )}
                {stats.con !== undefined && (
                  <div className="bg-tavern-dark p-2 rounded border border-tavern-purple text-center">
                    <p className="text-xs text-tavern-mauve mb-1">CON</p>
                    <p className="text-lg font-bold text-tavern-cream">
                      {stats.con}
                    </p>
                  </div>
                )}
                {stats.int !== undefined && (
                  <div className="bg-tavern-dark p-2 rounded border border-tavern-purple text-center">
                    <p className="text-xs text-tavern-mauve mb-1">INT</p>
                    <p className="text-lg font-bold text-tavern-cream">
                      {stats.int}
                    </p>
                  </div>
                )}
                {stats.wis !== undefined && (
                  <div className="bg-tavern-dark p-2 rounded border border-tavern-purple text-center">
                    <p className="text-xs text-tavern-mauve mb-1">WIS</p>
                    <p className="text-lg font-bold text-tavern-cream">
                      {stats.wis}
                    </p>
                  </div>
                )}
                {stats.cha !== undefined && (
                  <div className="bg-tavern-dark p-2 rounded border border-tavern-purple text-center">
                    <p className="text-xs text-tavern-mauve mb-1">CHA</p>
                    <p className="text-lg font-bold text-tavern-cream">
                      {stats.cha}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Special Abilities */}
        {Array.isArray(specialAbilities) && specialAbilities.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3 flex items-center gap-2">
              <Icon name="Sparkles" className="w-5 h-5" />
              Special Abilities
            </h3>
            <div className="space-y-3">
              {specialAbilities.map((ability: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-tavern-dark p-4 rounded border border-tavern-purple"
                >
                  <h4 className="font-semibold text-tavern-gold mb-2">
                    {ability.name}
                  </h4>
                  <p className="text-tavern-cream text-sm">
                    {ability.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uses */}
        {Array.isArray(uses) && uses.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3 flex items-center gap-2">
              <Icon name="Sparkles" className="w-5 h-5" />
              Potential Uses
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {uses.map((use: string, idx: number) => (
                <li key={idx} className="text-tavern-cream">
                  {use}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Training, Diet, Lifespan */}
        {(critter.training_difficulty || critter.diet || critter.lifespan) && (
          <div className="grid md:grid-cols-3 gap-4">
            {critter.training_difficulty && (
              <div>
                <h3 className="text-lg font-semibold text-tavern-gold mb-2 flex items-center gap-2">
                  <Icon name="AlertCircle" className="w-5 h-5" />
                  Training
                </h3>
                <p className="text-tavern-cream">
                  {critter.training_difficulty}
                </p>
              </div>
            )}
            {critter.diet && (
              <div>
                <h3 className="text-lg font-semibold text-tavern-gold mb-2 flex items-center gap-2">
                  <Icon name="Package" className="w-5 h-5" />
                  Diet
                </h3>
                <p className="text-tavern-cream">{critter.diet}</p>
              </div>
            )}
            {critter.lifespan && (
              <div>
                <h3 className="text-lg font-semibold text-tavern-gold mb-2 flex items-center gap-2">
                  <Icon name="Calendar" className="w-5 h-5" />
                  Lifespan
                </h3>
                <p className="text-tavern-cream">{critter.lifespan}</p>
              </div>
            )}
          </div>
        )}

        {/* Interesting Facts */}
        {Array.isArray(interestingFacts) && interestingFacts.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3 flex items-center gap-2">
              <Icon name="BookOpen" className="w-5 h-5" />
              Interesting Facts
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {interestingFacts.map((fact: string, idx: number) => (
                <li key={idx} className="text-tavern-cream">
                  {fact}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Encounter Notes */}
        {critter.encounter_notes && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2 flex items-center gap-2">
              <Icon name="MessageSquare" className="w-5 h-5" />
              Encounter Notes
            </h3>
            <div className="bg-amber-900/20 p-4 rounded border border-amber-700">
              <p className="text-tavern-cream leading-relaxed">
                {critter.encounter_notes}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderChaseDetail = (chase: any) => {
    let participants,
      obstacles,
      complications,
      shortcuts,
      chasePhases,
      endingConditions,
      rewards,
      environmentalFactors;
    try {
      participants = chase.participants
        ? typeof chase.participants === "string"
          ? JSON.parse(chase.participants)
          : chase.participants
        : null;
      obstacles = chase.obstacles
        ? typeof chase.obstacles === "string"
          ? JSON.parse(chase.obstacles)
          : chase.obstacles
        : [];
      complications = chase.complications
        ? typeof chase.complications === "string"
          ? JSON.parse(chase.complications)
          : chase.complications
        : [];
      shortcuts = chase.shortcuts
        ? typeof chase.shortcuts === "string"
          ? JSON.parse(chase.shortcuts)
          : chase.shortcuts
        : [];
      chasePhases = chase.chase_phases
        ? typeof chase.chase_phases === "string"
          ? JSON.parse(chase.chase_phases)
          : chase.chase_phases
        : [];
      endingConditions = chase.ending_conditions
        ? typeof chase.ending_conditions === "string"
          ? JSON.parse(chase.ending_conditions)
          : chase.ending_conditions
        : null;
      rewards = chase.rewards
        ? typeof chase.rewards === "string"
          ? JSON.parse(chase.rewards)
          : chase.rewards
        : null;
      environmentalFactors = chase.environmental_factors
        ? typeof chase.environmental_factors === "string"
          ? JSON.parse(chase.environmental_factors)
          : chase.environmental_factors
        : [];
    } catch (e) {
      logger.error("Error parsing chase data:", e);
    }

    return (
      <div className="space-y-6">
        {/* Header with badges */}
        <div>
          <h2 className="text-2xl font-bold text-tavern-gold">{chase.name}</h2>
          <div className="flex gap-2 mt-2 flex-wrap">
            {chase.chase_type && (
              <span className="px-3 py-1 bg-tavern-purple/40 text-tavern-cream rounded text-sm capitalize">
                {chase.chase_type.replace(/_/g, " ")}
              </span>
            )}
            {chase.terrain && (
              <span className="px-3 py-1 bg-blue-900/40 text-blue-300 rounded text-sm capitalize">
                {chase.terrain.replace(/_/g, " ")}
              </span>
            )}
            {chase.difficulty && (
              <span className="px-3 py-1 bg-purple-900/40 text-purple-300 rounded text-sm capitalize">
                {chase.difficulty}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {chase.description && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2 flex items-center gap-2">
              <Icon name="FileText" className="w-5 h-5" />
              Description
            </h3>
            <p className="text-tavern-cream leading-relaxed">
              {chase.description}
            </p>
          </div>
        )}

        {/* Setting */}
        {chase.setting && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2 flex items-center gap-2">
              <Icon name="MapPin" className="w-5 h-5" />
              Setting
            </h3>
            <p className="text-tavern-cream leading-relaxed">{chase.setting}</p>
          </div>
        )}

        {/* Participants */}
        {participants && (participants.quarry || participants.pursuers) && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3 flex items-center gap-2">
              <Icon name="Users" className="w-5 h-5" />
              Participants
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {participants.quarry && (
                <div className="bg-tavern-dark p-3 rounded border border-tavern-purple">
                  <span className="font-medium text-tavern-gold">Quarry:</span>
                  <p className="text-tavern-cream mt-1">
                    {participants.quarry}
                  </p>
                </div>
              )}
              {participants.pursuers && (
                <div className="bg-tavern-dark p-3 rounded border border-tavern-purple">
                  <span className="font-medium text-tavern-gold">
                    Pursuers:
                  </span>
                  <p className="text-tavern-cream mt-1">
                    {participants.pursuers}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Starting Conditions */}
        {chase.starting_conditions && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2 flex items-center gap-2">
              <Icon name="MapPin" className="w-5 h-5" />
              Starting Conditions
            </h3>
            <p className="text-tavern-cream leading-relaxed">
              {chase.starting_conditions}
            </p>
          </div>
        )}

        {/* Obstacles */}
        {Array.isArray(obstacles) && obstacles.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3 flex items-center gap-2">
              <Icon name="AlertCircle" className="w-5 h-5" />
              Obstacles
            </h3>
            <div className="space-y-3">
              {obstacles.map((obstacle: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-tavern-dark p-4 rounded border border-tavern-purple"
                >
                  <h4 className="font-semibold text-tavern-gold mb-2">
                    {obstacle.name}
                  </h4>
                  {obstacle.description && (
                    <p className="text-tavern-mauve text-sm mb-3">
                      {obstacle.description}
                    </p>
                  )}
                  <div className="grid md:grid-cols-2 gap-2 text-sm">
                    {obstacle.check && (
                      <div>
                        <span className="text-tavern-gold font-medium">
                          Check:
                        </span>
                        <p className="text-tavern-cream">{obstacle.check}</p>
                      </div>
                    )}
                    {obstacle.failure && (
                      <div>
                        <span className="text-red-400 font-medium">
                          Failure:
                        </span>
                        <p className="text-tavern-cream">{obstacle.failure}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Complications */}
        {Array.isArray(complications) && complications.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3 flex items-center gap-2">
              <Icon name="AlertCircle" className="w-5 h-5" />
              Complications
            </h3>
            <ul className="space-y-2">
              {complications.map((complication: string, idx: number) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-tavern-cream"
                >
                  <span className="text-tavern-gold">•</span>
                  <span>{complication}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Shortcuts */}
        {Array.isArray(shortcuts) && shortcuts.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3 flex items-center gap-2">
              <Icon name="Sparkles" className="w-5 h-5" />
              Shortcuts & Alternate Routes
            </h3>
            <div className="space-y-2">
              {shortcuts.map((shortcut: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-tavern-dark p-3 rounded border-2 border-tavern-gold/30"
                >
                  <h4 className="font-semibold text-tavern-cream mb-1">
                    {shortcut.name}
                  </h4>
                  {shortcut.description && (
                    <p className="text-tavern-mauve text-sm mb-1">
                      {shortcut.description}
                    </p>
                  )}
                  {shortcut.benefit && (
                    <p className="text-tavern-gold text-sm font-medium">
                      ✓ {shortcut.benefit}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chase Phases */}
        {Array.isArray(chasePhases) && chasePhases.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3 flex items-center gap-2">
              <Icon name="ArrowRight" className="w-5 h-5" />
              Chase Phases
            </h3>
            <div className="space-y-2">
              {chasePhases.map((phase: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-tavern-dark p-3 rounded border border-tavern-purple"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-tavern-gold">
                      Round {phase.round}
                    </span>
                    {phase.difficulty && (
                      <span className="text-sm px-2 py-0.5 bg-tavern-gold/20 text-tavern-gold rounded">
                        {phase.difficulty}
                      </span>
                    )}
                  </div>
                  <p className="text-tavern-cream text-sm">
                    {phase.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Environmental Factors */}
        {Array.isArray(environmentalFactors) &&
          environmentalFactors.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-tavern-gold mb-3 flex items-center gap-2">
                <Icon name="Globe" className="w-5 h-5" />
                Environmental Factors
              </h3>
              <ul className="space-y-2">
                {environmentalFactors.map((factor: string, idx: number) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-tavern-cream"
                  >
                    <span className="text-tavern-gold">•</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        {/* Special Rules */}
        {chase.special_rules && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-2 flex items-center gap-2">
              <Icon name="Book" className="w-5 h-5" />
              Special Rules
            </h3>
            <p className="text-tavern-cream leading-relaxed">
              {chase.special_rules}
            </p>
          </div>
        )}

        {/* Ending Conditions */}
        {endingConditions &&
          (endingConditions.success || endingConditions.failure) && (
            <div>
              <h3 className="text-lg font-semibold text-tavern-gold mb-3 flex items-center gap-2">
                <Icon name="Shield" className="w-5 h-5" />
                Ending Conditions
              </h3>
              <div className="space-y-2">
                {endingConditions.success && (
                  <div className="bg-green-900/20 p-3 rounded border border-green-700">
                    <span className="font-medium text-green-400">Success:</span>
                    <p className="text-tavern-cream mt-1">
                      {endingConditions.success}
                    </p>
                  </div>
                )}
                {endingConditions.failure && (
                  <div className="bg-red-900/20 p-3 rounded border border-red-700">
                    <span className="font-medium text-red-400">Failure:</span>
                    <p className="text-tavern-cream mt-1">
                      {endingConditions.failure}
                    </p>
                  </div>
                )}
                {endingConditions.alternative && (
                  <div className="bg-tavern-gold/10 p-3 rounded border border-tavern-gold/30">
                    <span className="font-medium text-tavern-gold">
                      Alternative:
                    </span>
                    <p className="text-tavern-cream mt-1">
                      {endingConditions.alternative}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Rewards */}
        {rewards && rewards.success && (
          <div>
            <h3 className="text-lg font-semibold text-tavern-gold mb-3 flex items-center gap-2">
              <Icon name="Package" className="w-5 h-5" />
              Rewards
            </h3>
            <div className="space-y-2">
              <div className="bg-tavern-dark p-3 rounded border border-tavern-purple">
                <span className="font-medium text-tavern-gold">Success:</span>
                <p className="text-tavern-cream mt-1">{rewards.success}</p>
              </div>
              {rewards.partial && (
                <div className="bg-tavern-dark p-3 rounded border border-tavern-purple">
                  <span className="font-medium text-tavern-gold">
                    Partial Success:
                  </span>
                  <p className="text-tavern-cream mt-1">{rewards.partial}</p>
                </div>
              )}
              {rewards.failure && (
                <div className="bg-tavern-dark p-3 rounded border border-tavern-purple">
                  <span className="font-medium text-tavern-mauve">
                    Failure:
                  </span>
                  <p className="text-tavern-cream mt-1">{rewards.failure}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-background w-full max-w-4xl max-h-[90vh] rounded-lg shadow-2xl border border-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            {type === "npcs" && (
              <Icon name="Users" className="w-6 h-6 text-tavern-gold" />
            )}
            {type === "monsters" && (
              <Icon name="Shield" className="w-6 h-6 text-tavern-gold" />
            )}
            {type === "encounters" && (
              <Icon name="Swords" className="w-6 h-6 text-tavern-gold" />
            )}
            {type === "dialogues" && (
              <Icon name="MessageSquare" className="w-6 h-6 text-tavern-gold" />
            )}
            {type === "locations" && (
              <Icon name="Map" className="w-6 h-6 text-tavern-gold" />
            )}
            {type === "quests" && (
              <Icon name="Scroll" className="w-6 h-6 text-tavern-gold" />
            )}
            {type === "items" && (
              <Icon name="Package" className="w-6 h-6 text-tavern-gold" />
            )}
            {type === "rumors" && (
              <Icon name="Quote" className="w-6 h-6 text-tavern-gold" />
            )}
            {type === "taverns" && (
              <Icon name="Beer" className="w-6 h-6 text-tavern-gold" />
            )}
            {type === "merchants" && (
              <Icon name="Package" className="w-6 h-6 text-tavern-gold" />
            )}
            {type === "traps" && (
              <Icon name="AlertCircle" className="w-6 h-6 text-tavern-gold" />
            )}
            {type === "critters" && (
              <Icon name="Shield" className="w-6 h-6 text-tavern-gold" />
            )}
            {type === "chases" && (
              <Icon name="ArrowRight" className="w-6 h-6 text-tavern-gold" />
            )}
            <h2 className="text-xl font-bold text-tavern-light">
              {type.slice(0, -1).charAt(0).toUpperCase() + type.slice(1, -1)}{" "}
              Details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-tavern-dark rounded-lg transition-colors"
          >
            <Icon
              name="X"
              className="w-5 h-5 text-tavern-mauve hover:text-tavern-light"
            />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {type === "npcs" && renderNPCDetail(content)}
          {type === "monsters" && renderMonsterDetail(content)}
          {type === "encounters" && renderEncounterDetail(content)}
          {type === "dialogues" && renderDialogueDetail(content)}
          {type === "locations" && renderLocationDetail(content)}
          {type === "quests" && renderQuestDetail(content)}
          {type === "items" && renderItemDetail(content)}
          {type === "rumors" && renderRumorDetail(content)}
          {type === "taverns" && renderTavernDetail(content)}
          {type === "merchants" && renderMerchantDetail(content)}
          {type === "traps" && renderTrapDetail(content)}
          {type === "critters" && renderCritterDetail(content)}
          {type === "chases" && renderChaseDetail(content)}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-tavern-mauve">
            <Icon name="Calendar" className="w-4 h-4" />
            <span>
              Created {new Date(content.created_at).toLocaleDateString()}
            </span>
          </div>
          {content.ai_generated && (
            <span className="px-2 py-1 bg-tavern-gold/20 text-tavern-gold rounded text-xs">
              AI Generated
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
