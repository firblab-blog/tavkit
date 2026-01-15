// Section header with title, description, and action buttons

import Icon, { type IconName } from "@/components/common/Icon";

interface SectionHeaderProps {
  name: string;
  icon: IconName;
  description: string;
  subsection: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreateNew: () => void;
  onImportFile: () => void;
  onImportFromRoster?: () => void;
  uploading: boolean;
  showPCsImport: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  acceptedFileTypes: string;
}

export function SectionHeader({
  name,
  icon,
  description,
  subsection,
  searchQuery,
  onSearchChange,
  onCreateNew,
  onImportFile,
  onImportFromRoster,
  uploading,
  showPCsImport,
  fileInputRef,
  acceptedFileTypes,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Title and description row */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Icon name={icon} className="w-6 h-6 text-primary flex-shrink-0" />
            <h2 className="text-xl sm:text-2xl font-bold text-text">{name}</h2>
          </div>
          {subsection && (
            <p className="text-sm text-text-muted ml-9">{subsection}</p>
          )}
          <p className="text-sm text-text-muted mt-2 ml-9 hidden sm:block">
            {description}
          </p>
        </div>

        {/* Action buttons - icons only on mobile */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Import from Guild Roster for PCs */}
          {showPCsImport && onImportFromRoster && (
            <button
              onClick={onImportFromRoster}
              className="p-2 sm:px-4 sm:py-2 bg-primary hover:bg-primary-dark text-background font-medium rounded-lg transition-colors flex items-center gap-2"
              title="Import from Guild Roster"
            >
              <Icon name="Users" className="w-4 h-4" />
              <span className="hidden sm:inline">Import from Guild Roster</span>
            </button>
          )}

          {/* File import */}
          <input
            ref={fileInputRef}
            type="file"
            id="file-upload"
            className="hidden"
            onChange={onImportFile}
            disabled={uploading}
            accept={acceptedFileTypes}
          />
          <label
            htmlFor="file-upload"
            className="p-2 sm:px-4 sm:py-2 bg-surface hover:bg-surface-hover text-text font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer border border-border"
            title="Import File"
          >
            <Icon name="Upload" className="w-4 h-4" />
            <span className="hidden sm:inline">
              {uploading ? "Importing..." : "Import File"}
            </span>
          </label>

          {/* New entry */}
          <button
            onClick={onCreateNew}
            className="p-2 sm:px-4 sm:py-2 bg-surface hover:bg-surface-hover text-text font-medium rounded-lg transition-colors flex items-center gap-2 border border-border"
            title="New Entry"
          >
            <Icon name="Plus" className="w-4 h-4" />
            <span className="hidden sm:inline">New Entry</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Icon
          name="Search"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search entries..."
          className="w-full pl-9 pr-8 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-surface rounded transition-colors"
          >
            <Icon name="X" className="w-3 h-3 text-text-muted" />
          </button>
        )}
      </div>
    </div>
  );
}
