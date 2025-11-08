import Subscription from '../Models/subscriptionModel.js';
import Tenant from '../Models/tenantModel.js';
import stripeService, { getAllPlans, getPlanConfig, formatCurrency } from '../services/stripeService.js';
import { validationResult } from 'express-validator';

// Listar todos os planos disponíveis
export const getPlans = async (req, res) => {
  try {
    const plans = getAllPlans().map(plan => ({
      id: plan.id,
      name: plan.name,
      price: formatCurrency(plan.priceMonthly),
      priceRaw: plan.priceMonthly,
      features: plan.features,
      limits: plan.limits,
      popular: plan.id === 'educacional' // Marcar plano mais popular
    }));

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Erro ao listar planos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Obter assinatura atual do tenant
export const getCurrentSubscription = async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Buscar assinatura ativa
    const subscription = await Subscription.findOne({
      tenantId,
      status: { $in: ['active', 'trialing', 'past_due'] }
    }).populate('tenantId', 'name subdomain');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Assinatura não encontrada'
      });
    }

    // Obter limites do plano
    const planLimits = subscription.getPlanLimits();
    
    // Calcular uso atual (você pode implementar contadores reais)
    const currentUsage = {
      users: 0, // Implementar contador real
      classes: 0, // Implementar contador real
      missions: 0, // Implementar contador real
      storage: 0 // Implementar contador real
    };

    const response = {
      id: subscription._id,
      plan: subscription.plan,
      planName: subscription.planName,
      status: subscription.status,
      price: formatCurrency(subscription.priceMonthly),
      currency: subscription.currency,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      daysUntilRenewal: subscription.daysUntilRenewal,
      isTrialing: subscription.isTrialing,
      willCancel: subscription.willCancel,
      limits: planLimits,
      usage: currentUsage,
      usagePercentage: {
        users: planLimits.maxUsers > 0 ? (currentUsage.users / planLimits.maxUsers) * 100 : 0,
        classes: planLimits.maxClasses > 0 ? (currentUsage.classes / planLimits.maxClasses) * 100 : 0,
        missions: planLimits.maxMissions > 0 ? (currentUsage.missions / planLimits.maxMissions) * 100 : 0,
        storage: planLimits.maxStorage > 0 ? (currentUsage.storage / planLimits.maxStorage) * 100 : 0
      }
    };

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Erro ao obter assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Criar sessão de checkout para upgrade/novo plano
export const createCheckoutSession = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { tenantId } = req.params;
    const { plan } = req.body;

    // Verificar se o tenant existe
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant não encontrado'
      });
    }

    // Verificar se o plano é válido
    const planConfig = getPlanConfig(plan);
    if (!planConfig) {
      return res.status(400).json({
        success: false,
        message: 'Plano inválido'
      });
    }

    // URLs de retorno
    const successUrl = `${process.env.FRONTEND_URL}/billing/success`;
    const cancelUrl = `${process.env.FRONTEND_URL}/billing/cancel`;

    // Criar sessão no Stripe
    const session = await stripeService.createCheckoutSession(
      tenantId,
      plan,
      successUrl,
      cancelUrl
    );

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });

  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar pagamento'
    });
  }
};

// Criar portal do cliente (para gerenciar assinatura)
export const createCustomerPortal = async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Buscar assinatura do tenant
    const subscription = await Subscription.findOne({ tenantId });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Assinatura não encontrada'
      });
    }

    // URL de retorno
    const returnUrl = `${process.env.FRONTEND_URL}/billing`;

    // Criar sessão do portal
    const session = await stripeService.createCustomerPortal(
      subscription.stripeCustomerId,
      returnUrl
    );

    res.json({
      success: true,
      data: {
        url: session.url
      }
    });

  } catch (error) {
    console.error('Erro ao criar portal do cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao acessar portal de cobrança'
    });
  }
};

// Cancelar assinatura
export const cancelSubscription = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { immediate = false, reason } = req.body;

    // Buscar assinatura
    const subscription = await Subscription.findOne({ tenantId });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Assinatura não encontrada'
      });
    }

    // Cancelar no Stripe
    const stripeSubscription = await stripeService.cancelSubscription(
      subscription.stripeSubscriptionId,
      immediate
    );

    // Atualizar no banco
    subscription.cancelAtPeriodEnd = !immediate;
    subscription.cancellationReason = reason;
    
    if (immediate) {
      subscription.status = 'canceled';
      subscription.canceledAt = new Date();
    }

    await subscription.save();

    res.json({
      success: true,
      message: immediate ? 'Assinatura cancelada imediatamente' : 'Assinatura será cancelada no final do período',
      data: {
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        currentPeriodEnd: subscription.currentPeriodEnd
      }
    });

  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao cancelar assinatura'
    });
  }
};

// Reativar assinatura cancelada
export const reactivateSubscription = async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Buscar assinatura
    const subscription = await Subscription.findOne({ tenantId });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Assinatura não encontrada'
      });
    }

    // Reativar no Stripe
    await stripeService.reactivateSubscription(subscription.stripeSubscriptionId);

    // Atualizar no banco
    subscription.cancelAtPeriodEnd = false;
    subscription.cancellationReason = null;
    subscription.status = 'active';

    await subscription.save();

    res.json({
      success: true,
      message: 'Assinatura reativada com sucesso',
      data: {
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
      }
    });

  } catch (error) {
    console.error('Erro ao reativar assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao reativar assinatura'
    });
  }
};

// Obter faturas do cliente
export const getInvoices = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { limit = 10 } = req.query;

    // Buscar assinatura
    const subscription = await Subscription.findOne({ tenantId });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Assinatura não encontrada'
      });
    }

    // Obter faturas do Stripe
    const invoices = await stripeService.getCustomerInvoices(
      subscription.stripeCustomerId,
      parseInt(limit)
    );

    const formattedInvoices = invoices.data.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amount: formatCurrency(invoice.amount_paid || invoice.amount_due),
      amountRaw: invoice.amount_paid || invoice.amount_due,
      currency: invoice.currency,
      created: new Date(invoice.created * 1000),
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      pdfUrl: invoice.invoice_pdf,
      hostedUrl: invoice.hosted_invoice_url
    }));

    res.json({
      success: true,
      data: formattedInvoices
    });

  } catch (error) {
    console.error('Erro ao obter faturas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter faturas'
    });
  }
};

// Obter métricas de cobrança (para dashboard)
export const getBillingMetrics = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const subscription = await Subscription.findOne({ tenantId });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Assinatura não encontrada'
      });
    }

    // Calcular métricas
    const metrics = {
      currentPlan: {
        name: subscription.planName,
        price: formatCurrency(subscription.priceMonthly),
        status: subscription.status
      },
      billing: {
        nextPayment: subscription.currentPeriodEnd,
        daysUntilRenewal: subscription.daysUntilRenewal,
        totalRevenue: formatCurrency(subscription.totalRevenue || 0),
        monthsSubscribed: subscription.monthsSubscribed
      },
      usage: subscription.getPlanLimits(),
      alerts: []
    };

    // Adicionar alertas se necessário
    if (subscription.daysUntilRenewal <= 7) {
      metrics.alerts.push({
        type: 'info',
        message: `Sua assinatura será renovada em ${subscription.daysUntilRenewal} dias`
      });
    }

    if (subscription.willCancel) {
      metrics.alerts.push({
        type: 'warning',
        message: 'Sua assinatura será cancelada no final do período atual'
      });
    }

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

export default {
  getPlans,
  getCurrentSubscription,
  createCheckoutSession,
  createCustomerPortal,
  cancelSubscription,
  reactivateSubscription,
  getInvoices,
  getBillingMetrics
};