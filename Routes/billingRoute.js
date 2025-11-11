import express from 'express';
import { body, param } from 'express-validator';
import {
  getPlans,
  getCurrentSubscription,
  createCheckoutSession,
  createCustomerPortal,
  cancelSubscription,
  reactivateSubscription,
  getInvoices,
  getBillingMetrics
} from '../controller/billingController.js';
// import { requireTenantAdmin, extractTenant } from '../Middlewares/tenantAuth.js';

const router = express.Router();

// === ROTAS PÚBLICAS ===

// Listar planos disponíveis (público para landing page)
router.get('/plans', getPlans);

// === ROTAS PROTEGIDAS (TENANT ADMIN) ===

// Obter assinatura atual do tenant
router.get('/subscription/:tenantId',
  param('tenantId').isMongoId(),
  // requireTenantAdmin,
  getCurrentSubscription
);

// Obter métricas de cobrança
router.get('/metrics/:tenantId',
  param('tenantId').isMongoId(),
  // requireTenantAdmin,
  getBillingMetrics
);

// Criar sessão de checkout para novo plano
router.post('/checkout/:tenantId',
  param('tenantId').isMongoId(),
  body('plan')
    .isIn(['escolar', 'educacional', 'institucional'])
    .withMessage('Plano deve ser: escolar, educacional ou institucional'),
  // requireTenantAdmin,
  createCheckoutSession
);

// Criar portal do cliente (Stripe Billing Portal)
router.post('/portal/:tenantId',
  param('tenantId').isMongoId(),
  // requireTenantAdmin,
  createCustomerPortal
);

// Cancelar assinatura
router.post('/cancel/:tenantId',
  param('tenantId').isMongoId(),
  body('immediate').optional().isBoolean(),
  body('reason').optional().isLength({ max: 500 }),
  // requireTenantAdmin,
  cancelSubscription
);

// Cancelar assinatura (endpoint alternativo para compatibilidade)
router.post('/subscription/:tenantId/cancel',
  param('tenantId').isMongoId(),
  body('immediate').optional().isBoolean(),
  body('reason').optional().isLength({ max: 500 }),
  // requireTenantAdmin,
  cancelSubscription
);

// Reativar assinatura cancelada
router.post('/reactivate/:tenantId',
  param('tenantId').isMongoId(),
  // requireTenantAdmin,
  reactivateSubscription
);

// Obter faturas do cliente
router.get('/invoices/:tenantId',
  param('tenantId').isMongoId(),
  // requireTenantAdmin,
  getInvoices
);

// === ROTAS DE WEBHOOKS ===

// Webhook do Stripe (sem autenticação - validado pelo Stripe)
router.post('/webhook', 
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET não configurado');
        return res.status(400).send('Webhook secret not configured');
      }

      // Importar stripe aqui para evitar problemas de inicialização
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err) {
        console.error('Erro na verificação da assinatura do webhook:', err.message);
        return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
      }

      // Processar eventos do webhook
      await processWebhookEvent(event);

      res.json({ received: true });

    } catch (error) {
      console.error('Erro no webhook:', error);
      res.status(500).json({ error: 'Webhook error' });
    }
  }
);

// Função para processar eventos do webhook
async function processWebhookEvent(event) {
  const { Subscription } = await import('../Models/subscriptionModel.js');
  const { Tenant } = await import('../Models/tenantModel.js');

  console.log('Processando evento do webhook:', event.type);

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      await updateSubscriptionFromStripe(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await handleSubscriptionCanceled(subscription);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      await handlePaymentSucceeded(invoice);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      await handlePaymentFailed(invoice);
      break;
    }

    default:
      console.log(`Evento não tratado: ${event.type}`);
  }
}

// Funções auxiliares para processar webhooks
async function updateSubscriptionFromStripe(stripeSubscription) {
  try {
    const { Subscription } = await import('../Models/subscriptionModel.js');
    
    const tenantId = stripeSubscription.metadata.tenantId;
    if (!tenantId) {
      console.error('TenantId não encontrado nos metadados da assinatura');
      return;
    }

    // Determinar o plano baseado no price_id
    const priceId = stripeSubscription.items.data[0]?.price?.id;
    const plan = getPlanFromPriceId(priceId);

    const subscriptionData = {
      tenantId,
      stripeCustomerId: stripeSubscription.customer,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: priceId,
      plan: plan.id,
      planName: plan.name,
      priceMonthly: stripeSubscription.items.data[0]?.price?.unit_amount || 0,
      status: stripeSubscription.status,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
      trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null
    };

    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: stripeSubscription.id },
      subscriptionData,
      { upsert: true, new: true }
    );

    console.log('Assinatura atualizada:', stripeSubscription.id);

  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error);
  }
}

async function handleSubscriptionCanceled(stripeSubscription) {
  try {
    const { Subscription } = await import('../Models/subscriptionModel.js');
    
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: stripeSubscription.id },
      {
        status: 'canceled',
        canceledAt: new Date(),
        cancelAtPeriodEnd: false
      }
    );

    console.log('Assinatura cancelada:', stripeSubscription.id);

  } catch (error) {
    console.error('Erro ao processar cancelamento:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  try {
    const { Subscription } = await import('../Models/subscriptionModel.js');
    
    if (invoice.subscription) {
      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: invoice.subscription },
        {
          $inc: { totalRevenue: invoice.amount_paid }
        }
      );
    }

    console.log('Pagamento bem-sucedido:', invoice.id);

  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
  }
}

async function handlePaymentFailed(invoice) {
  try {
    const { Subscription } = await import('../Models/subscriptionModel.js');
    
    if (invoice.subscription) {
      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: invoice.subscription },
        {
          status: 'past_due',
          nextPaymentAttempt: invoice.next_payment_attempt ? 
            new Date(invoice.next_payment_attempt * 1000) : null
        }
      );
    }

    console.log('Falha no pagamento:', invoice.id);

  } catch (error) {
    console.error('Erro ao processar falha de pagamento:', error);
  }
}

// Helper para determinar plano baseado no price_id
function getPlanFromPriceId(priceId) {
  const priceMapping = {
    [process.env.STRIPE_PRICE_ESCOLAR_MONTHLY]: { id: 'escolar', name: 'Plano Escolar' },
    [process.env.STRIPE_PRICE_EDUCACIONAL_MONTHLY]: { id: 'educacional', name: 'Plano Educacional' },
    [process.env.STRIPE_PRICE_INSTITUCIONAL_MONTHLY]: { id: 'institucional', name: 'Plano Institucional' }
  };

  return priceMapping[priceId] || { id: 'trial', name: 'Trial' };
}

export default router;