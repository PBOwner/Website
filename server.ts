import 'zone.js/dist/zone-node';

import { ngExpressEngine } from '@nguniversal/express-engine';
import express from 'express'; // Change this line
import { join } from 'path';

import { AppServerModule } from './src/main.server';
import { APP_BASE_HREF } from '@angular/common';
import { existsSync } from 'fs';
import compression from 'compression';

import domino from 'domino';
import fs from 'fs';
import 'localstorage-polyfill';
import fetch from 'node-fetch';

const template = fs.readFileSync(join(process.cwd(), 'dist/dlist-website/browser', 'index.html')).toString();
const win = domino.createWindow(template) as any;

global['fetch'] = fetch;
global['localStorage'] = localStorage;

global['window'] = win;
global['document'] = win.document;
global['DOMTokenList'] = win.DOMTokenList;
global['Node'] = win.Node;
global['Text'] = win.Text;
global['HTMLElement'] = win.HTMLElement;
global['navigator'] = win.navigator;

// The Express app is exported so that it can be used by serverless Functions.
export function app() {
  const server = express(); // This should now work correctly

  const distFolder = join(process.cwd(), 'dist/dlist-website/browser');
  const indexHtml = existsSync(join(distFolder, 'index.original.html')) ? 'index.original.html' : 'index';

  // Our Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
  server.engine('html', ngExpressEngine({
    bootstrap: AppServerModule
  }));

  server.set('view engine', 'html');
  server.set('views', distFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.get('*.*', compression(), express.static(distFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Universal engine
  server.get('*', compression(), (req, res) => {
    res.render(indexHtml, { req, providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }] });
  });

  return server;
}

function run(): void {
  const port = process.env.PORT || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export * from './src/main.server';
