// Compatibility entry point. The implementation lives in src/.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startServer } from './src/server.mjs';
export * from './src/server.mjs';
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await startServer();
