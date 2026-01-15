import { useEffect, useState } from "react";
import Icon from "../../common/Icon";
import {
  usePlayerEncountersStore,
  LocationVisit,
} from "../../../store/playerEncountersStore";
import { useCampaignStore } from "../../../store/campaignStore";
import LocationDetailModal from "./LocationDetailModal";

export default function LocationsVisited() {
  const {
    locations,
    loadingLocations,
    error,
    fetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
  } = usePlayerEncountersStore();
  const getActiveCampaign = useCampaignStore(
    (state) => state.getActiveCampaign,
  );
  const activeCampaign = getActiveCampaign();

  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationVisit | null>(
    null,
  );
  const [viewingLocation, setViewingLocation] = useState<LocationVisit | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    first_visit_session: "",
    notes: "",
  });

  useEffect(() => {
    fetchLocations(activeCampaign?.id);
  }, [fetchLocations, activeCampaign?.id]);

  const filteredLocations = locations.filter((loc) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !loc.name.toLowerCase().includes(query) &&
        !loc.description?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    return true;
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      first_visit_session: "",
      notes: "",
    });
    setEditingLocation(null);
    setShowForm(false);
  };

  const handleView = (location: LocationVisit) => {
    setViewingLocation(location);
  };

  const handleEdit = (location: LocationVisit) => {
    setViewingLocation(null);
    setEditingLocation(location);
    setFormData({
      name: location.name,
      description: location.description || "",
      first_visit_session: location.first_visit_session?.toString() || "",
      notes: location.notes || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const data = {
      campaign_id: activeCampaign?.id,
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      first_visit_session: formData.first_visit_session
        ? parseInt(formData.first_visit_session)
        : undefined,
      notes: formData.notes.trim() || undefined,
    };

    if (editingLocation) {
      await updateLocation(editingLocation.id, data);
    } else {
      await createLocation(data);
    }
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to remove this location?")) {
      await deleteLocation(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
          />
          <input
            type="text"
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary text-sm"
          />
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors text-sm"
        >
          <Icon name="Plus" className="w-4 h-4" />
          Add Location
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loadingLocations && locations.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <Icon name="Loader2" className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loadingLocations && filteredLocations.length === 0 && (
        <div className="text-center py-8 bg-background-panel border border-border rounded-xl">
          <Icon
            name="MapPin"
            className="w-10 h-10 text-text-muted mx-auto mb-3"
          />
          <h3 className="text-text font-medium mb-1">
            {searchQuery ? "No matching locations" : "No locations logged yet"}
          </h3>
          <p className="text-text-muted text-sm">
            {searchQuery
              ? "Try adjusting your search."
              : "Start tracking places you visit in your adventures!"}
          </p>
        </div>
      )}

      {/* Location Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLocations.map((location) => (
          <div
            key={location.id}
            onClick={() => handleView(location)}
            className="bg-background-panel border border-emerald-500/20 rounded-xl p-4 hover:border-emerald-500/40 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="MapPin" className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-text font-medium truncate">
                    {location.name}
                  </h4>
                  {location.first_visit_session && (
                    <span className="text-xs text-text-muted">
                      Session {location.first_visit_session}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {location.is_gm_revealed && (
                  <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                    GM
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(location);
                  }}
                  className="p-1 hover:bg-background rounded text-text-muted hover:text-text"
                >
                  <Icon name="Pencil" className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(location.id);
                  }}
                  className="p-1 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400"
                >
                  <Icon name="Trash2" className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {location.description && (
              <p className="text-text-muted text-sm line-clamp-2">
                {location.description}
              </p>
            )}

            {location.notes && (
              <p className="text-text-muted/70 text-xs mt-2 line-clamp-1 italic">
                {location.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && resetForm()}
        >
          <form
            onSubmit={handleSubmit}
            className="bg-background-panel border border-border rounded-xl w-full max-w-md"
          >
            <div className="border-b border-border px-5 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text">
                {editingLocation ? "Edit Location" : "Add Location"}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="p-1 hover:bg-background rounded text-text-muted hover:text-text"
              >
                <Icon name="X" className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Location name"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of this location"
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  First Visit (Session)
                </label>
                <input
                  type="number"
                  value={formData.first_visit_session}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      first_visit_session: e.target.value,
                    })
                  }
                  placeholder="e.g., 3"
                  min="1"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Personal notes about this location"
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:border-primary resize-y"
                />
              </div>
            </div>

            <div className="border-t border-border px-5 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-text-muted hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loadingLocations || !formData.name.trim()}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {editingLocation ? "Save" : "Add"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Modal */}
      {viewingLocation && (
        <LocationDetailModal
          location={viewingLocation}
          onClose={() => setViewingLocation(null)}
          onEdit={() => handleEdit(viewingLocation)}
          onDelete={() => {
            handleDelete(viewingLocation.id);
            setViewingLocation(null);
          }}
        />
      )}
    </div>
  );
}
