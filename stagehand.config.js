/** @type {import('@browserbasehq/stagehand').StagehandConfig} */
const config = {
  env: 'LOCAL',
  verbose: 1,
  debugDom: false,
  headless: false,
  enableCaching: true,
  modelName: 'claude-sonnet-4-5-20251001',
  modelClientOptions: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
};

module.exports = config;
