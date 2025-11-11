const Subscription = require('../Models/subscriptionModel');
const Tenant = require('../Models/tenantModel');

/**
 * Middleware para verificar se o tenant tem assinatura ativa
 */
const requireActiveSubscription = async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID é obrigatório'
      });
    }

    // Buscar tenant
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant não encontrado'
      });
    }

    // Buscar assinatura ativa do tenant
    const activeSubscription = await Subscription.findOne({
      tenantId: tenantId,
      status: { $in: ['active', 'trialing'] }
    });

    if (!activeSubscription) {
      return res.status(403).json({
        success: false,
        message: 'Assinatura inválida ou vencida',
        errorCode: 'SUBSCRIPTION_REQUIRED',
        data: {
          tenantId,
          subscriptionStatus: 'inactive'
        }
      });
    }

    // Verificar se a assinatura não está vencida
    const now = new Date();
    if (activeSubscription.currentPeriodEnd && activeSubscription.currentPeriodEnd < now) {
      return res.status(403).json({
        success: false,
        message: 'Assinatura vencida',
        errorCode: 'SUBSCRIPTION_EXPIRED',
        data: {
          tenantId,
          subscriptionStatus: 'expired',
          expiredAt: activeSubscription.currentPeriodEnd
        }
      });
    }

    // Adicionar informações da assinatura ao request
    req.subscription = activeSubscription;
    req.tenant = tenant;
    
    next();
  } catch (error) {
    console.error('Erro no middleware de assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      errorCode: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware mais permissivo que permite trial mas bloqueia assinaturas vencidas
 */
const allowTrialOrActiveSubscription = async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID é obrigatório'
      });
    }

    // Buscar tenant
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant não encontrado'
      });
    }

    // Buscar assinatura do tenant
    const subscription = await Subscription.findOne({
      tenantId: tenantId
    }).sort({ createdAt: -1 }); // Mais recente

    if (!subscription) {
      // Sem assinatura - permitir por enquanto (implementação gradual)
      req.subscription = null;
      req.tenant = tenant;
      return next();
    }

    // Se tem assinatura mas está cancelada/vencida, bloquear
    if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      return res.status(403).json({
        success: false,
        message: 'Assinatura cancelada ou pagamento pendente',
        errorCode: 'SUBSCRIPTION_CANCELED',
        data: {
          tenantId,
          subscriptionStatus: subscription.status
        }
      });
    }

    req.subscription = subscription;
    req.tenant = tenant;
    next();
  } catch (error) {
    console.error('Erro no middleware de assinatura (trial):', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  requireActiveSubscription,
  allowTrialOrActiveSubscription
};