// Main content detail component - routes to type-specific renderers

import { ContentDetailLayout, type ContentType } from "./ContentDetailLayout";
import {
  NPCDetail,
  MonsterDetail,
  EncounterDetail,
  DialogueDetail,
  LocationDetail,
  QuestDetail,
  ItemDetail,
  RumorDetail,
  TavernDetail,
  MerchantDetail,
  TrapDetail,
  CritterDetail,
  ChaseDetail,
} from "./types";

interface ContentDetailProps {
  content: any;
  type: ContentType;
  onClose: () => void;
}

// Map content types to their detail components
const ContentRenderers: Record<
  ContentType,
  React.ComponentType<{ [key: string]: any }>
> = {
  npcs: ({ npc }) => <NPCDetail npc={npc} />,
  monsters: ({ monster }) => <MonsterDetail monster={monster} />,
  encounters: ({ encounter }) => <EncounterDetail encounter={encounter} />,
  dialogues: ({ dialogue }) => <DialogueDetail dialogue={dialogue} />,
  locations: ({ location }) => <LocationDetail location={location} />,
  quests: ({ quest }) => <QuestDetail quest={quest} />,
  items: ({ item }) => <ItemDetail item={item} />,
  rumors: ({ rumor }) => <RumorDetail rumor={rumor} />,
  taverns: ({ tavern }) => <TavernDetail tavern={tavern} />,
  merchants: ({ merchant }) => <MerchantDetail merchant={merchant} />,
  traps: ({ trap }) => <TrapDetail trap={trap} />,
  critters: ({ critter }) => <CritterDetail critter={critter} />,
  chases: ({ chase }) => <ChaseDetail chase={chase} />,
};

// Map content types to the prop name used by each renderer
const contentPropNames: Record<ContentType, string> = {
  npcs: "npc",
  monsters: "monster",
  encounters: "encounter",
  dialogues: "dialogue",
  locations: "location",
  quests: "quest",
  items: "item",
  rumors: "rumor",
  taverns: "tavern",
  merchants: "merchant",
  traps: "trap",
  critters: "critter",
  chases: "chase",
};

export function ContentDetail({ content, type, onClose }: ContentDetailProps) {
  const Renderer = ContentRenderers[type];
  const propName = contentPropNames[type];

  return (
    <ContentDetailLayout
      type={type}
      createdAt={content.created_at}
      aiGenerated={content.ai_generated}
      onClose={onClose}
    >
      <Renderer {...{ [propName]: content }} />
    </ContentDetailLayout>
  );
}

export { ContentDetailLayout, type ContentType } from "./ContentDetailLayout";
export default ContentDetail;
