import { defineConfig } from 'cypress';
import { nxE2EPreset } from '@nx/cypress/plugins/cypress-preset';

export default defineConfig({
  e2e: {
    ...nxE2EPreset(__dirname, {
      webServerCommands: {
        default: 'npx nx run frontend:serve:development',
        production: 'npx nx run frontend:serve:production',
      },
    }),
    baseUrl: 'http://127.0.0.1:4242',
    viewportHeight: 1000,
    viewportWidth: 1920,
    video: false,
    // Please ensure you use `cy.origin()` when navigating between domains and remove this option.
    // See https://docs.cypress.io/app/references/migration-guide#Changes-to-cyorigin
    injectDocumentDomain: true,
  },
});
