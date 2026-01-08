// Simple event emitter for content changes
// Used to notify components (like QuickStatsBar) when content is saved

import { logger } from '@/utils/logger'

type ContentEventListener = () => void

const listeners: Set<ContentEventListener> = new Set()

export function onContentSaved(listener: ContentEventListener): () => void {
  listeners.add(listener)
  // Return cleanup function
  return () => {
    listeners.delete(listener)
  }
}

export function emitContentSaved(): void {
  listeners.forEach((listener) => {
    try {
      listener()
    } catch (error) {
      logger.error('Error in content saved listener:', error)
    }
  })
}
