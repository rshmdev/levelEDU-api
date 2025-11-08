import express from 'express';
import subscriptionController from '../controller/subscriptionController.js';
import { protect, restrictTo } from '../Middlewares/auth.js'; // Assuming you have auth middleware

const router = express.Router();

// Public routes
router.get('/plans', subscriptionController.getPlans);

// Create checkout session (public para novos signups)
router.post('/create-checkout', subscriptionController.createCheckoutSession);

// Verificar sessão do Stripe (público para página de sucesso)
router.get('/verify-session/:sessionId', subscriptionController.verifyCheckoutSession);

// Protected routes (require authentication)
router.use(protect); // Apply auth middleware to all routes below

// Subscription management routes (with tenant parameter)
router.get('/:subdomain/status', subscriptionController.getSubscriptionStatus);
router.post('/:subdomain/cancel', subscriptionController.cancelSubscription);
router.post('/:subdomain/portal', subscriptionController.createPortalSession);

export default router;