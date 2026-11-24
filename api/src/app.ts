import express, { type Express } from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './http/errorHandler.js';
import { productRoutes } from './http/productRoutes.js';
import type { CatalogService } from './services/catalogService.js';

export interface AppDeps {
  catalog: CatalogService;
}

export function createApp(deps: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api', productRoutes(deps.catalog));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
