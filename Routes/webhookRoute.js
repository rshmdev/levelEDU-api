import express from 'express';
import webhookController from '../controller/webhookController.js';

const router = express.Router();

// Stripe webhook route
// Note: This route should receive raw body, not JSON parsed
router.post('/stripe', 
  express.raw({ type: 'application/json' }), 
  webhookController.handleStripeWebhook
);

export default router;