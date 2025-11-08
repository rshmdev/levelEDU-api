import Stripe from 'stripe';
import Tenant from '../Models/tenantModel.js';
import User from '../Models/userModel.js';
import AdminUser from '../Models/adminUserModel.js';
import Subscription from '../Models/subscriptionModel.js';
import emailService from '../services/emailService.js';
import httpStatus from 'http-status';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Handle Stripe webhooks
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    // Verificar assinatura do webhook
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log(`🎣 Webhook recebido: ${event.type}`);

    // Processar evento baseado no tipo
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('❌ Erro no webhook:', error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

// ===== HANDLERS DOS EVENTOS =====

// Função auxiliar para mapear planos
const mapPlanName = (planName) => {
  const planMap = {
    'starter': 'basic',
    'professional': 'professional', 
    'enterprise': 'enterprise',
    'trial': 'trial'
  };
  return planMap[planName?.toLowerCase()] || 'professional';
};

// Função auxiliar para mapear planos para subscription
const mapSubscriptionPlan = (planName) => {
  const planMap = {
    'starter': 'escolar',
    'basic': 'escolar',
    'professional': 'educacional', 
    'enterprise': 'institucional',
    'trial': 'trial'
  };
  return planMap[planName?.toLowerCase()] || 'educacional';
};

// Função auxiliar para converter timestamp do Stripe
const convertStripeTimestamp = (timestamp) => {
  if (!timestamp || timestamp === null || timestamp === undefined) {
    return null;
  }
  try {
    return new Date(timestamp * 1000);
  } catch (error) {
    console.error('Erro ao converter timestamp:', timestamp, error);
    return null;
  }
};

// 1. Checkout Session Completed - Criar tenant e usuário
const handleCheckoutSessionCompleted = async (session) => {
  try {
    console.log('📦 Processando checkout completado:', session.id);

    const { metadata, customer_details } = session;
    const { tenantSubdomain, email, customerName, signupFlow, planName } = metadata;
    const customerEmail = customer_details?.email || email;

    if (!tenantSubdomain || !customerEmail) {
      console.error('❌ Dados insuficientes no checkout:', { tenantSubdomain, customerEmail });
      return;
    }

    // Só processar se for novo signup
    if (signupFlow !== 'true') {
      console.log('⏭️ Checkout não é novo signup, ignorando...');
      return;
    }

    console.log(`🏗️ Criando tenant e usuário para: ${customerEmail}`);

    // Mapear o plano corretamente
    const mappedPlan = mapPlanName(planName);
    console.log(`📋 Plano mapeado: ${planName} → ${mappedPlan}`);

    // Criar ou atualizar tenant
    let tenant = await Tenant.findOne({ subdomain: tenantSubdomain });
    
    if (!tenant) {
      tenant = new Tenant({
        name: `Escola ${tenantSubdomain}`,
        subdomain: tenantSubdomain,
        contact: {
          adminEmail: customerEmail,
          adminName: customerName || customerEmail.split('@')[0]
        },
        status: 'active',
        plan: {
          type: mappedPlan,
        },
        billing: {
          customerId: session.customer,
          subscriptionId: session.subscription || null,
          subscriptionStatus: 'active',
        },
        branding: {
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
          accentColor: '#F59E0B',
        },
      });

      await tenant.save();
      console.log(`✅ Tenant criado: ${tenant._id}`);
    } else {
      tenant.billing.customerId = session.customer;
      tenant.billing.subscriptionId = session.subscription || tenant.billing.subscriptionId;
      tenant.plan.type = mappedPlan;
      await tenant.save();
      console.log(`✅ Tenant atualizado: ${tenant._id}`);
    }

    // Criar usuário administrador
    let adminUser = await AdminUser.findOne({ 
      email: customerEmail, 
      tenantId: tenant._id 
    });

    if (!adminUser) {
      try {
        // Enviar email de boas-vindas e obter senha temporária
        const emailResult = await emailService.sendWelcomeEmail({
          name: customerName || customerEmail.split('@')[0],
          email: customerEmail,
          schoolName: tenant.name,
          loginUrl: `${process.env.FRONTEND_URL}/login?subdomain=${tenant.subdomain}`
        });

        adminUser = new AdminUser({
          name: customerName || customerEmail.split('@')[0],
          email: customerEmail,
          password: emailResult.temporaryPassword, // Será hasheado automaticamente
          role: 'tenant_admin',
          tenantId: tenant._id,
          tenantSubdomain: tenant.subdomain,
          classrooms: [], // AdminUser precisa do campo classrooms
        });

        await adminUser.save();
        console.log(`✅ Admin criado: ${adminUser._id}`);
        console.log(`📧 Email de boas-vindas enviado para: ${customerEmail}`);

      } catch (emailError) {
        console.error('❌ Erro ao enviar email de boas-vindas:', emailError);
        
        // Criar usuário mesmo se o email falhar
        const tempPassword = Math.random().toString(36).slice(-8) + 'A1@';
        
        adminUser = new AdminUser({
          name: customerName || customerEmail.split('@')[0],
          email: customerEmail,
          password: tempPassword, // Será hasheado automaticamente
          role: 'tenant_admin',
          tenantId: tenant._id,
          tenantSubdomain: tenant.subdomain,
          classrooms: [],
        });

        await adminUser.save();
        console.log(`✅ Admin criado sem email: ${adminUser._id}`);
        console.log(`📧 Credenciais temporárias (falha no email): ${customerEmail} / ${tempPassword}`);
      }
    }

    // Marcar sessão como processada
    await stripe.checkout.sessions.update(session.id, {
      metadata: {
        ...session.metadata,
        processed: 'true',
        tenantId: tenant._id.toString(),
        adminUserId: adminUser._id.toString()
      }
    });

    console.log(`🎉 Signup concluído para: ${tenantSubdomain}`);

  } catch (error) {
    console.error('❌ Erro ao processar checkout:', error);
    throw error;
  }
};

// 2. Subscription Created
const handleSubscriptionCreated = async (subscription) => {
  try {
    console.log('📊 Processando subscription criada:', subscription.id);

    const customerId = subscription.customer;
    const tenant = await Tenant.findOne({ 'billing.customerId': customerId });

    if (!tenant) {
      console.error('❌ Tenant não encontrado para customer:', customerId);
      return;
    }

    // Mapear plano para subscription
    const planName = subscription.metadata?.planName || 'professional';
    const mappedSubscriptionPlan = mapSubscriptionPlan(planName);
    
    console.log(`📋 Plano subscription mapeado: ${planName} → ${mappedSubscriptionPlan}`);

    // Criar/atualizar registro de subscription
    const subscriptionData = {
      tenantId: tenant._id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price?.id,
      plan: mappedSubscriptionPlan,
      planName: planName === 'starter' ? 'Starter' : 
                planName === 'professional' ? 'Professional' : 
                planName === 'enterprise' ? 'Enterprise' : 'Professional',
      status: subscription.status,
      priceMonthly: subscription.items.data[0]?.price?.unit_amount || 0,
      currency: subscription.currency || 'BRL',
      currentPeriodStart: convertStripeTimestamp(subscription.current_period_start),
      currentPeriodEnd: convertStripeTimestamp(subscription.current_period_end),
      trialStart: convertStripeTimestamp(subscription.trial_start),
      trialEnd: convertStripeTimestamp(subscription.trial_end),
      isTrialing: subscription.status === 'trialing'
    };

    await Subscription.findOneAndUpdate(
      { tenantId: tenant._id },
      subscriptionData,
      { upsert: true, new: true }
    );

    // Atualizar tenant com dados da subscription
    tenant.billing.subscriptionId = subscription.id;
    tenant.billing.subscriptionStatus = subscription.status;
    tenant.billing.currentPeriodStart = convertStripeTimestamp(subscription.current_period_start);
    tenant.billing.currentPeriodEnd = convertStripeTimestamp(subscription.current_period_end);
    await tenant.save();

    console.log(`✅ Subscription configurada para tenant: ${tenant.subdomain}`);

  } catch (error) {
    console.error('❌ Erro ao processar subscription:', error);
  }
};

// 3. Subscription Updated
const handleSubscriptionUpdated = async (subscription) => {
  try {
    console.log('🔄 Processando subscription atualizada:', subscription.id);

    const updateData = {
      status: subscription.status,
      currentPeriodStart: convertStripeTimestamp(subscription.current_period_start),
      currentPeriodEnd: convertStripeTimestamp(subscription.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };

    // Remover campos null para evitar erro de cast
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === null || updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      updateData
    );

    // Atualizar tenant também
    const tenant = await Tenant.findOne({ 'billing.subscriptionId': subscription.id });
    if (tenant) {
      tenant.billing.subscriptionStatus = subscription.status;
      if (updateData.currentPeriodStart) tenant.billing.currentPeriodStart = updateData.currentPeriodStart;
      if (updateData.currentPeriodEnd) tenant.billing.currentPeriodEnd = updateData.currentPeriodEnd;
      tenant.billing.cancelAtPeriodEnd = subscription.cancel_at_period_end;
      await tenant.save();
    }

    console.log(`✅ Subscription atualizada: ${subscription.id}`);

  } catch (error) {
    console.error('❌ Erro ao atualizar subscription:', error);
  }
};

// 4. Subscription Deleted
const handleSubscriptionDeleted = async (subscription) => {
  try {
    console.log('❌ Processando subscription cancelada:', subscription.id);

    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        status: 'canceled',
        canceledAt: new Date()
      }
    );

    console.log(`✅ Subscription cancelada: ${subscription.id}`);

  } catch (error) {
    console.error('❌ Erro ao cancelar subscription:', error);
  }
};

// 5. Payment Succeeded
const handlePaymentSucceeded = async (invoice) => {
  try {
    console.log('💰 Processando pagamento bem-sucedido:', invoice.id);

    if (invoice.subscription) {
      const updateData = {
        $inc: { totalRevenue: invoice.amount_paid },
        lastPaymentAt: new Date()
      };

      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: invoice.subscription },
        updateData
      );

      // Atualizar status do tenant também
      const tenant = await Tenant.findOne({ 'billing.subscriptionId': invoice.subscription });
      if (tenant && tenant.billing.subscriptionStatus !== 'active') {
        tenant.billing.subscriptionStatus = 'active';
        await tenant.save();
      }
    }

    console.log(`✅ Pagamento processado: ${invoice.id}`);

  } catch (error) {
    console.error('❌ Erro ao processar pagamento:', error);
  }
};

// 6. Payment Failed
const handlePaymentFailed = async (invoice) => {
  try {
    console.log('⚠️ Processando falha de pagamento:', invoice.id);

    if (invoice.subscription) {
      const updateData = {
        status: 'past_due',
      };

      // Só adicionar nextPaymentAttempt se não for null
      if (invoice.next_payment_attempt) {
        updateData.nextPaymentAttempt = convertStripeTimestamp(invoice.next_payment_attempt);
      }

      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: invoice.subscription },
        updateData
      );

      // Atualizar status do tenant
      const tenant = await Tenant.findOne({ 'billing.subscriptionId': invoice.subscription });
      if (tenant) {
        tenant.billing.subscriptionStatus = 'past_due';
        await tenant.save();
      }
    }

    console.log(`✅ Falha de pagamento processada: ${invoice.id}`);

  } catch (error) {
    console.error('❌ Erro ao processar falha de pagamento:', error);
  }
};

export default {
  handleStripeWebhook
};