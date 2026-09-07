import { createApp } from './app.js';
import { config } from './config.js';

createApp().listen(config.port, () => {
  console.info(`Woodcarver API listening on port ${config.port}`);
});
