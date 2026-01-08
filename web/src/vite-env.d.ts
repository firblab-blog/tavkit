/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_ENABLE_AI: string
  readonly VITE_ENABLE_GIT_INTEGRATION: string
  readonly VITE_ENABLE_DICE_ROLLER: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
