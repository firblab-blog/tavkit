import { useState } from 'react'
import Icon from '../common/Icon'
import { apiClient } from '@/api/client'
import { logger } from '@/utils/logger'

interface ImportCharacterProps {
  onSuccess: () => void
  onCancel: () => void
  campaignId?: string | null
}

export default function ImportCharacter({ onSuccess, onCancel, campaignId }: ImportCharacterProps) {
  const [characterUrl, setCharacterUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleImport = async () => {
    if (!characterUrl.trim()) {
      setError('Please enter a D&D Beyond character URL')
      return
    }

    // Validate URL format
    const urlPattern = /^https?:\/\/(www\.)?dndbeyond\.com\/characters\/\d+/
    if (!urlPattern.test(characterUrl)) {
      setError(
        'Invalid D&D Beyond character URL. Should be like: https://www.dndbeyond.com/characters/123456789'
      )
      return
    }

    setLoading(true)
    setError('')

    try {
      const payload: { url: string; campaign_id?: string } = { url: characterUrl }
      if (campaignId) {
        payload.campaign_id = campaignId
      }
      const response = await apiClient.post('/characters/import/dndbeyond', payload)
      logger.debug('Character imported successfully:', response.data)
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to import character')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="characterUrl" className="block text-sm font-medium text-text mb-2">
          D&D Beyond Character URL
        </label>
        <input
          id="characterUrl"
          type="text"
          value={characterUrl}
          onChange={(e) => setCharacterUrl(e.target.value)}
          placeholder="https://www.dndbeyond.com/characters/148874291"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={loading}
        />
        <p className="text-xs text-text-muted mt-2">
          Enter the URL of your D&D Beyond character. You can find this in your browser's address
          bar when viewing your character sheet.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
        <div className="flex gap-3">
          <Icon name="AlertCircle" className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-semibold mb-1">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-300/80">
              <li>
                Your character must be set to <strong>public</strong> on D&D Beyond
              </li>
              <li>This will create a new character in your Guild Roster</li>
              <li>All character data will be imported including stats, items, and features</li>
              <li>Updates on D&D Beyond won't automatically sync - reimport to update</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={handleImport}
          disabled={loading || !characterUrl.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 disabled:bg-primary/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {loading ? (
            <>
              <Icon name="Loader2" className="w-5 h-5 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Icon name="Upload" className="w-5 h-5" />
              Import Character
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
