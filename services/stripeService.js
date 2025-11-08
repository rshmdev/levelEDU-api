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
    description: 'Período de teste gratuito de 30 dias',
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceMonthlyId: null,
    stripePriceYearlyId: null,
    features: [
      "Até 10 alunos", "2 turmas", "10 missões", "Funcionalidades básicas"
    ],
    limits: {
      maxStudents: 10,
      maxTeachers: 1,
      maxAdmins: 1
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfeito para escolas pequenas começando a usar o LevelEdu',
    priceMonthly: 9900, // R$ 99,00 em centavos
    priceYearly: 99000, // R$ 990,00 em centavos (10 meses)
    stripePriceMonthlyId: process.env.STRIPE_STARTER_PRICE_MONTHLY,
    stripePriceYearlyId: process.env.STRIPE_STARTER_PRICE_YEARLY,
    features: [
      'Até 50 estudantes',
      'Até 5 professores',
      'Até 2 administradores',
      '10 missões por mês',
      'Relatórios básicos',
      'Suporte por email'
    ],
    limits: {
      maxStudents: 50,
      maxTeachers: 5,
      maxAdmins: 2
    }
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Ideal para escolas em crescimento que precisam de mais recursos',
    priceMonthly: 19900, // R$ 199,00 em centavos
    priceYearly: 199000, // R$ 1.990,00 em centavos (10 meses)
    stripePriceMonthlyId: process.env.STRIPE_PROFESSIONAL_PRICE_MONTHLY,
    stripePriceYearlyId: process.env.STRIPE_PROFESSIONAL_PRICE_YEARLY,
    features: [
      'Até 200 estudantes',
      'Até 20 professores',
      'Até 5 administradores',
      'Missões ilimitadas',
      'Relatórios avançados',
      'Personalização da marca',
      'Suporte prioritário',
      'Integrações com outras plataformas'
    ],
    limits: {
      maxStudents: 200,
      maxTeachers: 20,
      maxAdmins: 5
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Para grandes instituições que precisam de recursos avançados e suporte dedicado',
    priceMonthly: 39900, // R$ 399,00 em centavos
    priceYearly: 399000, // R$ 3.990,00 em centavos (10 meses)
    stripePriceMonthlyId: process.env.STRIPE_ENTERPRISE_PRICE_MONTHLY,
    stripePriceYearlyId: process.env.STRIPE_ENTERPRISE_PRICE_YEARLY,
    features: [
      'Estudantes ilimitados',
      'Professores ilimitados',
      'Administradores ilimitados',
      'Missões ilimitadas',
      'Relatórios personalizados',
      'White-label completo',
      'API completa',
      'Suporte 24/7',
      'Gerente de conta dedicado',
      'Treinamento personalizado'
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
  return PLANS_CONFIG[planName] || PLANS_CONFIG.starter;
};

// Instância única do serviço
const stripeService = new StripeService();

export { PLANS_CONFIG, StripeService };
export default stripeService;