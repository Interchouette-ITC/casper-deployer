// These options were migrated by @nx/webpack:convert-to-inferred from
// the project.json file and merged with the options in this file
const configValues = {
  build: {
    default: {
      target: 'node',
      compiler: 'tsc',
      main: 'apps/api/src/main.ts',
      tsConfig: 'apps/api/tsconfig.app.json',
      assets: ['apps/api/src/assets'],
      outputPath: '../../dist/apps/api',
    },
    production: {
      optimization: true,
      extractLicenses: true,
      inspect: false,
      fileReplacements: [
        {
          replace: './src/environments/environment.ts',
          with: './src/environments/environment.prod.ts',
        },
      ],
    },
  },
};

// Determine the correct configValue to use based on the configuration
const configuration = process.env.NX_TASK_TARGET_CONFIGURATION || 'default';

const buildOptions = {
  ...configValues.build.default,
  ...configValues.build[configuration],
};
const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');

module.exports = {
  plugins: [new NxAppWebpackPlugin(buildOptions)],
};
