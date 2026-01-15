// Main SectionContent component

import { useState } from 'react'
import Icon from '@/components/common/Icon'
import type { IconName } from '@/components/common/Icon'
import type { CampaignContent } from '../../types'
import { SectionHeader } from './SectionHeader'
import { ContentList } from './ContentList'
import { ContentEditor } from './ContentEditor'
import { ContentDetailView } from './ContentDetailView'
import { EmptyState } from './EmptyState'
import { useSectionContent } from './useSectionContent'

interface CampaignSection {
  id: string
  name: string
  icon: IconName
  description: string
  subsections?: string[]
}

interface Campaign {
  id: string
  name: string
  setting?: string
  [key: string]: any
}

interface SectionContentProps {
  campaign: Campaign
  section: CampaignSection
  subsection: string | null
  selectedEntryId: string | null
  onEntriesLoad: (entries: CampaignContent[]) => void
  onSelectEntry: (entryId: string | null) => void
}

// Get accepted file types based on section
function getAcceptedFileTypes(sectionId: string): string {
  switch (sectionId) {
    case 'pcs':
      return '.txt,.md,.markdown,.json,image/*,.jpg,.jpeg,.png,.gif,.webp'
    case 'maps':
    case 'art':
    case 'props':
    case 'handouts':
      return 'image/*,.jpg,.jpeg,.png,.gif,.webp,.svg'
    case 'soundscapes':
      return 'audio/*,.mp3,.wav,.ogg,.m4a,.flac'
    default:
      return '.txt,.md,.markdown,.pdf'
  }
}

export function SectionContent({
  campaign,
  section,
  subsection,
  selectedEntryId,
  onEntriesLoad,
  onSelectEntry,
}: SectionContentProps) {
  const [_showImportCharacterModal, setShowImportCharacterModal] = useState(false)

  const {
    entries,
    loading,
    uploading,
    searchQuery,
    setSearchQuery,
    showEditor,
    editingEntry,
    title,
    setTitle,
    content,
    setContent,
    fileInputRef,
    handleCreateNew,
    handleEditEntry,
    handleSaveEntry,
    handleDeleteEntry,
    handleFileUpload,
    handleCloseEditor,
  } = useSectionContent({
    campaignId: campaign.id,
    sectionId: section.id,
    subsection,
    onEntriesLoad,
  })

  // Handle import file click
  const handleImportFileClick = () => {
    fileInputRef.current?.click()
  }

  // Find selected entry
  const selectedEntry = selectedEntryId ? entries.find((e) => e.id === selectedEntryId) : null

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="Loader2" className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  // Selected entry view
  if (selectedEntry) {
    // Special handling for PCs with character data
    if (selectedEntry.section === 'pcs' && selectedEntry.characterData) {
      // TODO: Render CharacterSheet component
      return (
        <ContentDetailView
          entry={selectedEntry}
          sectionName={section.name}
          onBack={() => onSelectEntry(null)}
          onEdit={() => handleEditEntry(selectedEntry)}
          onDelete={() => handleDeleteEntry(selectedEntry.id)}
        />
      )
    }

    return (
      <ContentDetailView
        entry={selectedEntry}
        sectionName={section.name}
        onBack={() => onSelectEntry(null)}
        onEdit={() => handleEditEntry(selectedEntry)}
        onDelete={() => handleDeleteEntry(selectedEntry.id)}
      />
    )
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header with search and actions */}
      <SectionHeader
        name={section.name}
        icon={section.icon}
        description={section.description}
        subsection={subsection}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreateNew={handleCreateNew}
        onImportFile={handleImportFileClick}
        onImportFromRoster={
          section.id === 'pcs' ? () => setShowImportCharacterModal(true) : undefined
        }
        uploading={uploading}
        showPCsImport={section.id === 'pcs'}
        fileInputRef={fileInputRef}
        acceptedFileTypes={getAcceptedFileTypes(section.id)}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileUpload}
        disabled={uploading}
        accept={getAcceptedFileTypes(section.id)}
      />

      {/* Editor Modal */}
      <ContentEditor
        isOpen={showEditor}
        isEditing={!!editingEntry}
        title={title}
        content={content}
        onTitleChange={setTitle}
        onContentChange={setContent}
        onSave={handleSaveEntry}
        onClose={handleCloseEditor}
      />

      {/* Content */}
      {entries.length > 0 ? (
        <ContentList
          entries={entries}
          searchQuery={searchQuery}
          onSelectEntry={onSelectEntry}
          onClearSearch={() => setSearchQuery('')}
        />
      ) : (
        <EmptyState
          sectionId={section.id}
          onImportFromRoster={
            section.id === 'pcs' ? () => setShowImportCharacterModal(true) : undefined
          }
        />
      )}

      {/* Import Character Modal - would need to be implemented separately */}
      {/* {showImportCharacterModal && (
        <ImportCharacterModal
          campaignId={campaign.id}
          existingCharacterIds={entries.map((e) => e.id)}
          onClose={() => setShowImportCharacterModal(false)}
          onImportComplete={() => {
            setShowImportCharacterModal(false)
            loadContentData()
          }}
        />
      )} */}
    </div>
  )
}

export default SectionContent
