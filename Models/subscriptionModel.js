import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    
    // Dados do Stripe
    stripeCustomerId: {
      type: String,
      required: true,
      unique: true
    },
    stripeSubscriptionId: {
      type: String,
      required: true,
      unique: true
    },
    stripePriceId: {
      type: String,
      required: true
    },
    
    // Informações do plano
    plan: {
      type: String,
      enum: ['trial', 'escolar', 'educacional', 'institucional'],
      required: true
    },
    planName: {
      type: String,
      required: true
    },
    
    // Preços em centavos (BRL)
    priceMonthly: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'BRL'
    },
    
    // Status da assinatura
    status: {
      type: String,
      enum: [
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'incomplete',
        'incomplete_expired',
        'trialing',
        'paused'
      ],
      required: true
    },
    
    // Período de cobrança
    currentPeriodStart: {
      type: Date,
      required: true
    },
    currentPeriodEnd: {
      type: Date,
      required: true
    },
    
    // Trial
    trialStart: {
      type: Date
    },
    trialEnd: {
      type: Date
    },
    
    // Cancelamento
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    },
    canceledAt: {
      type: Date
    },
    cancellationReason: {
      type: String
    },
    
    // Histórico de mudanças
    planHistory: [{
      plan: String,
      priceMonthly: Number,
      changedAt: { type: Date, default: Date.now },
      reason: String
    }],
    
    // Métricas
    totalRevenue: {
      type: Number,
      default: 0
    },
    monthsSubscribed: {
      type: Number,
      default: 0
    },
    
    // Dados de cobrança
    billingInfo: {
      email: String,
      name: String,
      document: String, // CPF/CNPJ
      address: {
        street: String,
        number: String,
        complement: String,
        neighborhood: String,
        city: String,
        state: String,
        zipCode: String
      },
      phone: String
    },
    
    // Próxima cobrança
    nextPaymentAttempt: {
      type: Date
    },
    
    // Metadados
    metadata: {
      source: String, // Como chegou até nós
      utm_campaign: String,
      utm_source: String,
      utm_medium: String
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices para performance
subscriptionSchema.index({ tenantId: 1 });
subscriptionSchema.index({ stripeCustomerId: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ plan: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1 });

// Virtual para verificar se está em trial
subscriptionSchema.virtual('isTrialing').get(function() {
  return this.status === 'trialing' || 
         (this.trialEnd && new Date() < this.trialEnd);
});

// Virtual para verificar se está ativa
subscriptionSchema.virtual('isActive').get(function() {
  return ['active', 'trialing', 'past_due'].includes(this.status);
});

// Virtual para verificar se vai cancelar
subscriptionSchema.virtual('willCancel').get(function() {
  return this.cancelAtPeriodEnd && this.status !== 'canceled';
});

// Virtual para dias restantes no período atual
subscriptionSchema.virtual('daysUntilRenewal').get(function() {
  if (!this.currentPeriodEnd) return 0;
  const now = new Date();
  const diff = this.currentPeriodEnd.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Middleware para atualizar métricas
subscriptionSchema.pre('save', function(next) {
  // Calcular meses de assinatura
  if (this.currentPeriodStart) {
    const now = new Date();
    const months = Math.floor((now.getTime() - this.currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24 * 30));
    this.monthsSubscribed = Math.max(months, 0);
  }
  
  next();
});

// Método para obter limites do plano
subscriptionSchema.methods.getPlanLimits = function() {
  const limits = {
    trial: {
      maxUsers: 10,
      maxClasses: 2,
      maxMissions: 10,
      maxStorage: 50, // MB
      customBranding: false,
      apiAccess: false,
      customDomain: false,
      whiteLabel: false,
      support: 'email',
      reports: 'basic'
    },
    escolar: {
      maxUsers: 100,
      maxClasses: 10,
      maxMissions: 100,
      maxStorage: 500,
      customBranding: true,
      apiAccess: false,
      customDomain: false,
      whiteLabel: false,
      support: 'email',
      reports: 'basic'
    },
    educacional: {
      maxUsers: 500,
      maxClasses: 50,
      maxMissions: -1, // Ilimitado
      maxStorage: 2000,
      customBranding: true,
      apiAccess: true,
      customDomain: false,
      whiteLabel: false,
      support: 'priority',
      reports: 'advanced'
    },
    institucional: {
      maxUsers: -1, // Ilimitado
      maxClasses: -1, // Ilimitado
      maxMissions: -1, // Ilimitado
      maxStorage: 10000,
      customBranding: true,
      apiAccess: true,
      customDomain: true,
      whiteLabel: true,
      support: '24/7',
      reports: 'advanced'
    }
  };

  return limits[this.plan] || limits.trial;
};

// Método para calcular preço com desconto anual
subscriptionSchema.methods.getAnnualDiscount = function() {
  // 20% de desconto no plano anual
  return Math.round(this.priceMonthly * 12 * 0.8);
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;