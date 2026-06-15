import { defineCliConfig } from 'sanity/cli'
import { resolve } from 'path'

export default defineCliConfig({
  api: {
    projectId: 'qg0o7wrr',
    dataset: 'production',
  },
  vite: {
    resolve: {
      alias: {
        '@': resolve(__dirname, '.'),
      },
    },
  },
})
