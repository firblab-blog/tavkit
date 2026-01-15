import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ContainerType = 'external' | 'internal'

export interface ContainerInstance {
  id: string
  type: ContainerType
  tool: string
  title: string
  url: string
  icon?: string
}

interface ContainerState {
  containers: ContainerInstance[]
  activeId: string | null

  openContainer: (container: Omit<ContainerInstance, 'id'>) => void
  closeContainer: (id: string) => void
  closeAllContainers: () => void
  setActive: (id: string | null) => void
  moveContainer: (id: string, direction: 'left' | 'right') => void
}

let nextId = 0
const generateId = () => `container-${++nextId}-${Date.now()}`

export const useContainerStore = create<ContainerState>()(
  persist(
    (set, get) => ({
      containers: [],
      activeId: null,

      openContainer: (container) => {
        // Check if a container with the same url already exists
        const existingContainer = get().containers.find((c) => c.url === container.url)

        // If exists, just switch to that tab
        if (existingContainer) {
          set({ activeId: existingContainer.id })
          return
        }

        // Otherwise, create a new container
        const id = generateId()
        const newContainer = { ...container, id }

        set((state) => ({
          containers: [...state.containers, newContainer],
          activeId: id,
        }))
      },

      closeContainer: (id) => {
        set((state) => {
          const remaining = state.containers.filter((c) => c.id !== id)
          // If closing active tab, switch to the last remaining tab
          const newActiveId =
            state.activeId === id
              ? remaining.length > 0
                ? remaining[remaining.length - 1].id
                : null
              : state.activeId

          return {
            containers: remaining,
            activeId: newActiveId,
          }
        })
      },

      closeAllContainers: () => {
        set({ containers: [], activeId: null })
      },

      setActive: (id) => {
        set({ activeId: id })
      },

      moveContainer: (id, direction) => {
        set((state) => {
          const index = state.containers.findIndex((c) => c.id === id)
          if (index === -1) return state

          const newIndex = direction === 'left' ? index - 1 : index + 1
          if (newIndex < 0 || newIndex >= state.containers.length) return state

          const newContainers = [...state.containers]
          const [movedContainer] = newContainers.splice(index, 1)
          newContainers.splice(newIndex, 0, movedContainer)

          return { containers: newContainers }
        })
      },
    }),
    {
      name: 'tavkit-containers',
      partialize: (state) => ({
        containers: state.containers,
        activeId: state.activeId,
      }),
    }
  )
)
