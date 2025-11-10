import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    // Informações básicas do tenant
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    subdomain: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function(v) {
          return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v);
        },
        message: 'Subdomain must contain only lowercase letters, numbers, and hyphens'
      }
    },
    domain: { 
      type: String, 
      required: false // Para custom domains no futuro
    },
    
    // Status e configurações
    status: {
      type: String,
      enum: ['active', 'suspended', 'trial', 'inactive'],
      default: 'trial'
    },
    
    // Personalização da marca
    branding: {
      logo: { type: String }, // URL do logo
      primaryColor: { type: String, default: '#3B82F6' }, // Cor primária
      secondaryColor: { type: String, default: '#1E40AF' }, // Cor secundária
      accentColor: { type: String, default: '#F59E0B' }, // Cor de destaque
      backgroundColor: { type: String, default: '#FFFFFF' }, // Cor de fundo
      textColor: { type: String, default: '#1F2937' }, // Cor do texto
      favicon: { type: String }, // URL do favicon
      customCSS: { type: String }, // CSS customizado
    },
    
    // Configurações do plano
    plan: {
      type: {
        type: String,
        enum: ['trial', 'starter', 'professional', 'growth', 'enterprise'],
        default: 'trial'
      },
      limits: {
        maxUsers: { type: Number, default: 10 },
        maxClasses: { type: Number, default: 3 },
        maxMissions: { type: Number, default: 20 },
        maxStorage: { type: Number, default: 100 }, // MB
        customBranding: { type: Boolean, default: false },
        apiAccess: { type: Boolean, default: false },
        customDomain: { type: Boolean, default: false },
      },
      trialEndsAt: { type: Date },
    },
    
    // Informações de billing
    billing: {
      customerId: { type: String }, // Stripe customer ID
      subscriptionId: { type: String }, // Stripe subscription ID
      subscriptionStatus: { 
        type: String, 
        enum: ['active', 'past_due', 'canceled', 'unpaid'],
        default: 'active'
      },
      currentPeriodStart: { type: Date },
      currentPeriodEnd: { type: Date },
      cancelAtPeriodEnd: { type: Boolean, default: false },
    },
    
    // Informações de contato
    contact: {
      adminEmail: { type: String, required: true },
      adminName: { type: String, required: true },
      phone: { type: String },
      address: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        zipCode: { type: String },
        country: { type: String, default: 'BR' },
      },
    },
    
    // Configurações técnicas
    settings: {
      timezone: { type: String, default: 'America/Sao_Paulo' },
      language: { type: String, default: 'pt-BR' },
      currency: { type: String, default: 'BRL' },
      dateFormat: { type: String, default: 'DD/MM/YYYY' },
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        slack: { type: Boolean, default: false },
        webhook: { type: String }, // URL para webhooks
      },
    },
    
    // Métricas e estatísticas
    stats: {
      totalUsers: { type: Number, default: 0 },
      totalClasses: { type: Number, default: 0 },
      totalMissions: { type: Number, default: 0 },
      storageUsed: { type: Number, default: 0 }, // MB
      lastActivity: { type: Date, default: Date.now },
    },
    
    // Metadados
    metadata: {
      onboardingCompleted: { type: Boolean, default: false },
      source: { type: String }, // Como chegou até nós
      notes: { type: String }, // Notas internas
    },
    
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices para performance
tenantSchema.index({ subdomain: 1 }, { unique: true });
tenantSchema.index({ 'contact.adminEmail': 1 });
tenantSchema.index({ status: 1 });
tenantSchema.index({ 'plan.type': 1 });

// Virtual para URL completa
tenantSchema.virtual('fullUrl').get(function() {
  return this.domain || `${this.subdomain}.${process.env.MAIN_DOMAIN || 'leveledw.com'}`;
});

// Virtual para verificar se o trial expirou
tenantSchema.virtual('trialExpired').get(function() {
  if (!this.plan.trialEndsAt) return false;
  return this.plan.trialEndsAt < new Date();
});

// Middleware para atualizar estatísticas
tenantSchema.methods.updateStats = async function() {
  const User = mongoose.model('User');
  const Class = mongoose.model('Class');
  const Mission = mongoose.model('Mission');
  
  this.stats.totalUsers = await User.countDocuments({ tenantId: this._id });
  this.stats.totalClasses = await Class.countDocuments({ tenantId: this._id });
  this.stats.totalMissions = await Mission.countDocuments({ tenantId: this._id });
  this.stats.lastActivity = new Date();
  
  await this.save();
};

// Middleware para definir data de trial
tenantSchema.pre('save', function(next) {
  if (this.isNew && this.plan.type === 'trial' && !this.plan.trialEndsAt) {
    // Trial de 30 dias
    this.plan.trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

const Tenant = mongoose.model('Tenant', tenantSchema);

export default Tenant;