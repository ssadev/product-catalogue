import { Router } from 'express';
import { z } from 'zod';
import type { CatalogService } from '../services/catalogService.js';
import { parseOrThrow } from './validation.js';

const searchQuerySchema = z.object({ q: z.string().trim().min(1).max(200) });

export function productRoutes(catalog: CatalogService): Router {
  const router = Router();

  router.get('/categories', async (_req, res) => {
    res.json(await catalog.listCategories());
  });

  router.get('/categories/:slug/products', async (req, res) => {
    res.json(await catalog.getCategoryProducts(req.params.slug));
  });

  router.get('/products/featured', async (_req, res) => {
    res.json(await catalog.getFeatured());
  });

  router.get('/products', async (req, res) => {
    const { q } = parseOrThrow(searchQuerySchema, req.query);
    res.json(await catalog.search(q));
  });

  router.get('/products/:id', async (req, res) => {
    res.json(await catalog.getProduct(req.params.id));
  });

  return router;
}
