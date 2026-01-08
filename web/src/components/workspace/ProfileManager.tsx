import { useState, useEffect } from 'react'
import { useProfileStore } from '../../store/profileStore'
import { useContainerStore } from '../../store/containerStore'
import Icon from '../common/Icon'
import { logger } from '@/utils/logger'

export default function ProfileManager() {
  const {
    profiles,
    isLoading,
    loadProfiles,
    createProfile,
    deleteProfile,
    loadProfile,
    setDefaultProfile,
  } = useProfileStore()
  const { loadContainers } = useContainerStore()
  const [isOpen, setIsOpen] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [newProfileDescription, setNewProfileDescription] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadProfiles()
    }
  }, [isOpen, loadProfiles])

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return

    setCreating(true)
    try {
      await createProfile(newProfileName, newProfileDescription || undefined)
      setNewProfileName('')
      setNewProfileDescription('')
    } catch (error) {
      logger.error('Failed to create profile:', error)
      alert('Failed to create profile')
    } finally {
      setCreating(false)
    }
  }

  const handleLoadProfile = async (id: string) => {
    try {
      await loadProfile(id)
      await loadContainers()
      setIsOpen(false)
    } catch (error) {
      logger.error('Failed to load profile:', error)
      alert('Failed to load profile')
    }
  }

  const handleDeleteProfile = async (id: string, name: string) => {
    if (!confirm(`Delete profile "${name}"?`)) return

    try {
      await deleteProfile(id)
    } catch (error) {
      logger.error('Failed to delete profile:', error)
      alert('Failed to delete profile')
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultProfile(id)
    } catch (error) {
      logger.error('Failed to set default profile:', error)
      alert('Failed to set default profile')
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors flex items-center gap-2"
        title="Profiles"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Tab Profiles</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Close"
          >
            <Icon name="X" className="w-6 h-6 text-gray-400 hover:text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          {/* Create new profile */}
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-3">Save Current Tabs as Profile</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Profile name (e.g., 'DM Session', 'Player View')"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-primary-600"
              />
              <input
                type="text"
                value={newProfileDescription}
                onChange={(e) => setNewProfileDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-primary-600"
              />
              <button
                onClick={handleCreateProfile}
                disabled={creating || !newProfileName.trim()}
                className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                {creating ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>

          {/* Profile list */}
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Loading profiles...</div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">📋</div>
              <p>No profiles yet. Save your current tabs to create one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-semibold text-white">{profile.name}</h4>
                        {profile.is_default && (
                          <span className="px-2 py-0.5 bg-primary-600/20 text-primary-400 text-xs rounded">
                            Default
                          </span>
                        )}
                      </div>
                      {profile.description && (
                        <p className="text-sm text-gray-400 mt-1">{profile.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {JSON.parse(profile.containers as any).length} tabs
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLoadProfile(profile.id)}
                        className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded transition-colors"
                      >
                        Load
                      </button>
                      {!profile.is_default && (
                        <button
                          onClick={() => handleSetDefault(profile.id)}
                          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                          title="Set as default"
                        >
                          ⭐
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteProfile(profile.id, profile.name)}
                        className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
