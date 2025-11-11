import mongoose from 'mongoose';

// Definição dos limites por plano
const PLAN_LIMITS = {
  trial: {
    maxStudents: 50,
    maxTeachers: 3,
    maxAdmins: 2,
    maxClasses: 5,
    maxMissions: 10,
    maxProducts: 5,
    maxAttitudes: 20,
    customBranding: false,
    apiAccess: false,
    advancedReports: false
  },
  starter: {
    maxStudents: 100,
    maxTeachers: 5,
    maxAdmins: 3,
    maxClasses: 10,
    maxMissions: 25,
    maxProducts: 15,
    maxAttitudes: 50,
    customBranding: false,
    apiAccess: false,
    advancedReports: false
  },
  professional: {
    maxStudents: 500,
    maxTeachers: 15,
    maxAdmins: 8,
    maxClasses: 50,
    maxMissions: 100,
    maxProducts: 50,
    maxAttitudes: 200,
    customBranding: true,
    apiAccess: true,
    advancedReports: true
  },
  growth: {
    maxStudents: 1500,
    maxTeachers: 50,
    maxAdmins: 25,
    maxClasses: 200,
    maxMissions: 500,
    maxProducts: 200,
    maxAttitudes: 1000,
    customBranding: true,
    apiAccess: true,
    advancedReports: true
  }
};

// Função para buscar assinatura ativa do tenant
async function getTenantSubscription(tenantId) {
  try {
    const subscription = await mongoose.connection.db.collection('subscriptions').findOne({
      tenantId: tenantId,
      status: { $in: ['active', 'trialing'] }
    });

    return subscription;
  } catch (error) {
    console.error('Error fetching tenant subscription:', error);
    throw new Error('Erro ao buscar assinatura do tenant');
  }
}

// Função para contar recursos atuais do tenant
async function getCurrentUsage(tenantId) {
  try {
    const [students, teachers, admins, classes, missions, products, attitudes] = await Promise.all([
      mongoose.connection.db.collection('users').countDocuments({ 
        tenantId: tenantId,
        role: 'student',
        isActive: true 
      }),
      mongoose.connection.db.collection('adminusers').countDocuments({ 
        tenantId: tenantId,
        role: 'teacher',
        isActive: true 
      }),
      mongoose.connection.db.collection('adminusers').countDocuments({ 
        tenantId: tenantId,
        role: { $in: ['tenant_admin', 'admin'] },
        isActive: true 
      }),
      mongoose.connection.db.collection('classes').countDocuments({ 
        tenantId: tenantId,
        isActive: true 
      }),
      mongoose.connection.db.collection('missions').countDocuments({ 
        tenantId: tenantId,
        isActive: true 
      }),
      mongoose.connection.db.collection('products').countDocuments({ 
        tenantId: tenantId,
        isActive: true 
      }),
      mongoose.connection.db.collection('attitudes').countDocuments({ 
        tenantId: tenantId,
        isActive: true 
      })
    ]);

    return {
      students,
      teachers, 
      admins,
      classes,
      missions,
      products,
      attitudes
    };
  } catch (error) {
    console.error('Error fetching current usage:', error);
    throw new Error('Erro ao buscar uso atual do tenant');
  }
}

// Middleware para verificar limites antes de criar recursos
export const checkResourceLimit = (resourceType) => {
  return async (req, res, next) => {
    try {
      const tenantId = req.user?.tenantId || req.tenant?._id;
      
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID não encontrado'
        });
      }

      // Buscar assinatura atual
      const subscription = await getTenantSubscription(tenantId);
      
      if (!subscription) {
        return res.status(403).json({
          success: false,
          message: 'Assinatura não encontrada ou inativa',
          errorCode: 'SUBSCRIPTION_REQUIRED'
        });
      }

      // Determinar o plano atual
      const planType = subscription.planType || 'trial';
      const limits = PLAN_LIMITS[planType];

      if (!limits) {
        return res.status(400).json({
          success: false,
          message: 'Plano não reconhecido'
        });
      }

      // Buscar uso atual
      const currentUsage = await getCurrentUsage(tenantId);

      // Verificar limite específico do recurso
      const resourceLimitKey = `max${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}s`;
      const currentCount = currentUsage[resourceType + 's'] || currentUsage[resourceType];
      const limit = limits[resourceLimitKey];

      if (currentCount >= limit) {
        return res.status(403).json({
          success: false,
          message: `Limite de ${resourceType}s atingido para o plano ${planType}`,
          errorCode: 'RESOURCE_LIMIT_EXCEEDED',
          data: {
            resourceType,
            current: currentCount,
            limit: limit,
            planType: planType
          }
        });
      }

      // Adicionar informações do limite ao request para uso posterior
      req.limits = limits;
      req.currentUsage = currentUsage;
      req.planType = planType;

      next();
    } catch (error) {
      console.error('Error checking resource limits:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao verificar limites'
      });
    }
  };
};

// Middleware para verificar features específicas do plano
export const checkPlanFeature = (feature) => {
  return async (req, res, next) => {
    try {
      const tenantId = req.user?.tenantId || req.tenant?._id;
      
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID não encontrado'
        });
      }

      // Buscar assinatura atual
      const subscription = await getTenantSubscription(tenantId);
      
      if (!subscription) {
        return res.status(403).json({
          success: false,
          message: 'Assinatura não encontrada',
          errorCode: 'SUBSCRIPTION_REQUIRED'
        });
      }

      const planType = subscription.planType || 'trial';
      const limits = PLAN_LIMITS[planType];

      if (!limits || !limits[feature]) {
        return res.status(403).json({
          success: false,
          message: `Feature '${feature}' não disponível no plano ${planType}`,
          errorCode: 'FEATURE_NOT_AVAILABLE',
          data: {
            feature,
            planType,
            upgradeRequired: true
          }
        });
      }

      next();
    } catch (error) {
      console.error('Error checking plan feature:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao verificar feature'
      });
    }
  };
};

// Função para obter informações completas de uso e limites
export const getTenantUsageAndLimits = async (tenantId) => {
  try {
    const subscription = await getTenantSubscription(tenantId);
    
    if (!subscription) {
      throw new Error('Assinatura não encontrada');
    }

    const planType = subscription.planType || 'trial';
    const limits = PLAN_LIMITS[planType];
    const currentUsage = await getCurrentUsage(tenantId);

    return {
      planType,
      limits,
      currentUsage,
      subscription: {
        id: subscription._id,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
      },
      percentageUsed: {
        students: Math.round((currentUsage.students / limits.maxStudents) * 100),
        teachers: Math.round((currentUsage.teachers / limits.maxTeachers) * 100),
        admins: Math.round((currentUsage.admins / limits.maxAdmins) * 100),
        classes: Math.round((currentUsage.classes / limits.maxClasses) * 100),
        missions: Math.round((currentUsage.missions / limits.maxMissions) * 100),
        products: Math.round((currentUsage.products / limits.maxProducts) * 100)
      }
    };
  } catch (error) {
    console.error('Error getting tenant usage and limits:', error);
    throw error;
  }
};

export { PLAN_LIMITS };