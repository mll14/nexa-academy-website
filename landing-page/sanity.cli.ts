import { defineCliConfig } from 'sanity/cli'
import { resolve } from 'path'

export default defineCliConfig({
  api: {
    projectId: 'qg0o7wrr',
    dataset: 'production',
  },
  // Hosted Studio at https://nexa-academy.sanity.studio
  studioHost: 'nexa-academy',
  vite: {
    resolve: {
      alias: {
        '@': resolve(__dirname, '.'),
      },
    },
  },
})
