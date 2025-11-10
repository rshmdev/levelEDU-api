import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

// Configuração dos planos
const PLANS_CONFIG = {
  trial: {
    id: 'trial',
    name: 'Trial',
    description: 'Período de avaliação gratuita de 30 dias com acesso completo aos recursos essenciais',
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceMonthlyId: null,
    stripePriceYearlyId: null,
    features: [
      "Até 10 alunos", "2 turmas", "10 missões básicas", "Dashboard completo", "Suporte por email"
    ],
    limits: {
      maxStudents: 10,
      maxTeachers: 2,
      maxAdmins: 1
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Solução completa para escolas que buscam modernizar sua gestão educacional com tecnologia avançada',
    priceMonthly: 29900, // R$ 299,00 em centavos
    priceYearly: 299000, // R$ 2.990,00 em centavos (10 meses)
    stripePriceMonthlyId: process.env.STRIPE_STARTER_PRICE_MONTHLY,
    stripePriceYearlyId: process.env.STRIPE_STARTER_PRICE_YEARLY,
    features: [
      'Até 100 estudantes',
      'Até 10 professores',
      'Até 3 administradores',
      'Missões e atividades ilimitadas',
      'Relatórios de desempenho',
      'Suporte técnico especializado',
      'Dashboard analítico completo',
      'Sistema de gamificação avançado'
    ],
    limits: {
      maxStudents: 100,
      maxTeachers: 10,
      maxAdmins: 3
    }
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Plataforma robusta para instituições em crescimento que necessitam de recursos avançados de gestão',
    priceMonthly: 69900, // R$ 699,00 em centavos
    priceYearly: 699000, // R$ 6.990,00 em centavos (10 meses)
    stripePriceMonthlyId: process.env.STRIPE_PROFESSIONAL_PRICE_MONTHLY,
    stripePriceYearlyId: process.env.STRIPE_PROFESSIONAL_PRICE_YEARLY,
    features: [
      'Até 500 estudantes',
      'Até 25 professores',
      'Até 5 administradores',
      'Atividades e missões ilimitadas',
      'Relatórios avançados e analytics',
      'Personalização básica da marca',
      'Suporte prioritário',
      'Integrações com sistemas educacionais',
      'Backup automático de dados'
    ],
    limits: {
      maxStudents: 500,
      maxTeachers: 25,
      maxAdmins: 5
    }
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    description: 'Solução premium com personalização da marca, análises avançadas e integrações corporativas',
    priceMonthly: 99900, // R$ 999,00 em centavos
    priceYearly: 999000, // R$ 9.990,00 em centavos (10 meses)
    stripePriceMonthlyId: process.env.STRIPE_GROWTH_PRICE_MONTHLY,
    stripePriceYearlyId: process.env.STRIPE_GROWTH_PRICE_YEARLY,
    features: [
      'Até 1.000 estudantes',
      'Até 50 professores',
      'Até 10 administradores',
      'Recursos ilimitados',
      'Analytics empresarial completo',
      'White-label e personalização avançada',
      'API básica para integrações',
      'Integrações corporativas avançadas',
      'Suporte prioritário dedicado',
      'Treinamento da equipe incluído'
    ],
    limits: {
      maxStudents: 1000,
      maxTeachers: 50,
      maxAdmins: 10
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Solução empresarial customizada com suporte dedicado, API completa e implementação personalizada',
    priceMonthly: 199900, // R$ 1.999,00 em centavos (preço inicial)
    priceYearly: 1999000, // R$ 19.990,00 em centavos (preço inicial)
    stripePriceMonthlyId: process.env.STRIPE_ENTERPRISE_PRICE_MONTHLY,
    stripePriceYearlyId: process.env.STRIPE_ENTERPRISE_PRICE_YEARLY,
    features: [
      'Usuários ilimitados',
      'Recursos e funcionalidades ilimitados',
      'Relatórios personalizados sob demanda',
      'White-label completo e customização total',
      'API completa com documentação dedicada',
      'Suporte 24/7 com SLA garantido',
      'Gerente de conta exclusivo',
      'Customização e desenvolvimento sob medida',
      'Treinamento personalizado presencial/online',
      'Implementação assistida com consultoria',
      'Infraestrutura dedicada opcional'
    ],
    limits: {
      maxStudents: -1,
      maxTeachers: -1,
      maxAdmins: -1
    }
  }
};

// Função para obter todos os planos no formato esperado pelo frontend
export const getAllPlans = () => {
  return Object.values(PLANS_CONFIG).map(plan => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    priceMonthly: plan.priceMonthly,
    priceYearly: plan.priceYearly,
    features: plan.features,
    limits: {
      maxStudents: plan.limits.maxStudents,
      maxTeachers: plan.limits.maxTeachers,
      maxAdmins: plan.limits.maxAdmins
    }
  }));
};

// Classe do serviço Stripe
class StripeService {

  // Criar cliente no Stripe
  async createCustomer(customerData) {
    try {
      // Detectar se é novo signup (formato simples) ou tenant existente (formato complexo)
      const isNewSignup = customerData.email && !customerData.contact;
      
      let customerConfig;
      
      if (isNewSignup) {
        // Novo signup: dados simples { email, name, metadata }
        customerConfig = {
          email: customerData.email,
          name: customerData.name || customerData.email.split('@')[0],
          description: `Cliente LevelEdu - Novo Signup`,
          metadata: customerData.metadata || {}
        };
      } else {
        // Tenant existente: formato original
        customerConfig = {
          email: customerData.contact?.adminEmail,
          name: customerData.name,
          description: `Cliente LevelEdu - ${customerData.name}`,
          metadata: {
            tenantId: customerData._id?.toString(),
            subdomain: customerData.subdomain,
            plan: customerData.plan?.type || 'trial'
          }
        };
      }

      const customer = await stripe.customers.create(customerConfig);
      return customer;
    } catch (error) {
      console.error('Erro ao criar cliente no Stripe:', error);
      throw error;
    }
  }

  // Criar sessão de checkout
  async createCheckoutSession({ customerId, planName, isYearly = false, metadata = {}, successUrl, cancelUrl }) {
    try {
      const planConfig = PLANS_CONFIG[planName];

      if (!planConfig) {
        throw new Error(`Plano ${planName} não encontrado`);
      }

      // Determinar qual preço usar baseado na modalidade (mensal/anual)
      const stripePriceId = isYearly ? planConfig.stripePriceYearlyId : planConfig.stripePriceMonthlyId;

      if (!stripePriceId) {
        throw new Error(`ID do preço não configurado para o plano ${planName} (${isYearly ? 'anual' : 'mensal'})`);
      }

      const sessionConfig = {
        mode: 'subscription',
        payment_method_types: ['card', 'boleto'],
        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],
        success_url: `${successUrl}`,
        cancel_url: cancelUrl,
        metadata: {
          planName,
          isYearly: isYearly.toString(),
          ...metadata
        },
        subscription_data: {
          metadata: {
            planName,
            isYearly: isYearly.toString(),
            ...metadata
          }
        },
        locale: 'pt-BR',
        currency: 'brl'
      };

      // Adicionar customer se fornecido
      if (customerId) {
        sessionConfig.customer = customerId;
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      return session;
    } catch (error) {
      console.error('Erro ao criar sessão de checkout:', error);
      throw error;
    }
  }

  // Obter sessão de checkout
  async getCheckoutSession(sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['customer', 'subscription']
      });
      return session;
    } catch (error) {
      console.error('Erro ao obter sessão de checkout:', error);
      throw error;
    }
  }

  // Criar portal do cliente
  async createCustomerPortal(customerId, returnUrl) {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return session;
    } catch (error) {
      console.error('Erro ao criar portal do cliente:', error);
      throw error;
    }
  }

  // Obter assinatura
  async getSubscription(subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice', 'customer']
      });

      return subscription;
    } catch (error) {
      console.error('Erro ao obter assinatura:', error);
      throw error;
    }
  }

  // Cancelar assinatura
  async cancelSubscription(subscriptionId, immediate = false) {
    try {
      if (immediate) {
        // Cancelamento imediato
        const subscription = await stripe.subscriptions.cancel(subscriptionId);
        return subscription;
      } else {
        // Cancelar no final do período
        const subscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true
        });
        return subscription;
      }
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      throw error;
    }
  }

  // Alterar plano da assinatura
  async changeSubscriptionPlan(subscriptionId, newPriceId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations'
      });

      return updatedSubscription;
    } catch (error) {
      console.error('Erro ao alterar plano:', error);
      throw error;
    }
  }

  // Reativar assinatura cancelada
  async reactivateSubscription(subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false
      });

      return subscription;
    } catch (error) {
      console.error('Erro ao reativar assinatura:', error);
      throw error;
    }
  }

  // Obter invoices do cliente
  async getCustomerInvoices(customerId, limit = 10) {
    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: limit
      });

      return invoices;
    } catch (error) {
      console.error('Erro ao obter invoices:', error);
      throw error;
    }
  }

  // Criar invoice único (para cobrança avulsa)
  async createOneTimeInvoice(customerId, amount, description) {
    try {
      // Criar item de invoice
      await stripe.invoiceItems.create({
        customer: customerId,
        amount: amount, // em centavos
        currency: 'brl',
        description: description
      });

      // Criar e finalizar invoice
      const invoice = await stripe.invoices.create({
        customer: customerId,
        auto_advance: true
      });

      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

      return finalizedInvoice;
    } catch (error) {
      console.error('Erro ao criar invoice único:', error);
      throw error;
    }
  }

  // Obter uso/métricas
  async getUsageMetrics(subscriptionId) {
    try {
      const subscription = await this.getSubscription(subscriptionId);

      // Calcular métricas básicas
      const metrics = {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        daysUntilRenewal: Math.ceil((subscription.current_period_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24)),
        totalAmount: subscription.items.data[0]?.price?.unit_amount || 0,
        currency: subscription.currency
      };

      return metrics;
    } catch (error) {
      console.error('Erro ao obter métricas de uso:', error);
      throw error;
    }
  }
}

// Funções helper
export const formatCurrency = (amountInCents, currency = 'BRL') => {
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  });

  return formatter.format(amountInCents / 100);
};

export const getPlanConfig = (planName) => {
  return PLANS_CONFIG[planName] || PLANS_CONFIG.trial;
};

// Função para identificar plano pelo preço
export const getPlanByPrice = (priceAmount, isYearly = false) => {
  for (const [planId, config] of Object.entries(PLANS_CONFIG)) {
    const targetPrice = isYearly ? config.priceYearly : config.priceMonthly;
    if (targetPrice === priceAmount) {
      return {
        id: planId,
        name: config.name,
        config: config
      };
    }
  }
  
  // Fallback para trial se não encontrar
  return {
    id: 'trial',
    name: 'Trial',
    config: PLANS_CONFIG.trial
  };
};

// Função para identificar plano pelo Stripe Price ID
export const getPlanByStripePrice = (stripePriceId) => {
  for (const [planId, config] of Object.entries(PLANS_CONFIG)) {
    if (config.stripePriceMonthlyId === stripePriceId || config.stripePriceYearlyId === stripePriceId) {
      const isYearly = config.stripePriceYearlyId === stripePriceId;
      return {
        id: planId,
        name: config.name,
        config: config,
        isYearly: isYearly
      };
    }
  }
  
  // Fallback para trial se não encontrar
  return {
    id: 'trial',
    name: 'Trial',
    config: PLANS_CONFIG.trial,
    isYearly: false
  };
};

// Instância única do serviço
const stripeService = new StripeService();

export { PLANS_CONFIG, StripeService };
export default stripeService;