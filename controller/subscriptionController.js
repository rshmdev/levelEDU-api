import stripeService, { getAllPlans } from '../services/stripeService.js';
import httpStatus from 'http-status';

// Get available subscription plans
export const getPlans = async (req, res) => {
  try {
    const plans = getAllPlans();
    
    res.status(httpStatus.OK).json({
      success: true,
      data: plans,
      message: 'Plans retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch plans'
    });
  }
};

// Create checkout session for subscription
export const createCheckoutSession = async (req, res) => {
  try {
    const { 
      planId, 
      isYearly = false, 
      tenantSubdomain, 
      customerEmail, 
      customerName 
    } = req.body;
    
    // Para usuários autenticados (opcional)
    const userId = req.user?.id;
    const isAuthenticatedUser = !!userId;

    if (!planId || !tenantSubdomain) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Plan ID and tenant subdomain are required'
      });
    }

    // Para novos signups, email é obrigatório
    if (!isAuthenticatedUser && !customerEmail) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Customer email is required for new signups'
      });
    }

    let customerId;

    if (isAuthenticatedUser) {
      // Fluxo para usuários autenticados
      // Validate user permissions
      if (!req.user.role || !['tenant_admin', 'super_admin'].includes(req.user.role)) {
        return res.status(httpStatus.FORBIDDEN).json({
          success: false,
          message: 'Insufficient permissions to create subscription'
        });
      }

      // Check if user belongs to the tenant (unless super admin)
      if (req.user.role !== 'super_admin' && req.user.tenantSubdomain !== tenantSubdomain) {
        return res.status(httpStatus.FORBIDDEN).json({
          success: false,
          message: 'Access denied to this tenant'
        });
      }

      // Get or create Stripe customer for authenticated user
      customerId = req.user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripeService.createCustomer({
          email: req.user.email,
          name: req.user.name,
          metadata: {
            userId: userId.toString(),
            tenantSubdomain,
            role: req.user.role
          }
        });
        
        customerId = customer.id;
        // TODO: Save stripe customer ID to user in database
      }
    } else {
      // Fluxo para novos signups (sem autenticação)
      const customer = await stripeService.createCustomer({
        email: customerEmail,
        name: customerName || customerEmail.split('@')[0],
        metadata: {
          tenantSubdomain,
          signupFlow: 'true',
          tempUser: 'true'
        }
      });
      
      customerId = customer.id;
    }

    // Create checkout session
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await stripeService.createCheckoutSession({
      customerId,
      planName: planId,
      isYearly,
      metadata: {
        userId: userId?.toString() || 'new_signup',
        tenantSubdomain,
        userRole: req.user?.role || 'tenant_admin',
        email: customerEmail || req.user?.email,
        customerName: customerName || req.user?.name,
        signupFlow: !isAuthenticatedUser ? 'true' : 'false'
      },
      successUrl: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/billing/cancelled`
    });

    res.status(httpStatus.OK).json({
      success: true,
      data: {
        sessionId: session.id,
        sessionUrl: session.url
      },
      message: 'Checkout session created successfully'
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to create checkout session'
    });
  }
};

// Get current subscription status
export const getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantSubdomain = req.params.subdomain;

    // Validate tenant access
    if (req.user.role !== 'super_admin' && req.user.tenantSubdomain !== tenantSubdomain) {
      return res.status(httpStatus.FORBIDDEN).json({
        success: false,
        message: 'Access denied to this tenant'
      });
    }

    // Get user's Stripe customer ID
    const customerId = req.user.stripeCustomerId;
    
    if (!customerId) {
      return res.status(httpStatus.OK).json({
        success: true,
        data: {
          hasSubscription: false,
          plan: null,
          status: 'no_subscription'
        }
      });
    }

    // Get active subscriptions
    const subscriptions = await stripeService.getCustomerSubscriptions(customerId);
    const activeSubscription = subscriptions.find(sub => 
      ['active', 'trialing'].includes(sub.status)
    );

    if (!activeSubscription) {
      return res.status(httpStatus.OK).json({
        success: true,
        data: {
          hasSubscription: false,
          plan: null,
          status: 'no_active_subscription'
        }
      });
    }

    // Get subscription details
    const planName = activeSubscription.metadata?.planName || 'trial';
    const isYearly = activeSubscription.metadata?.isYearly === 'true';

    res.status(httpStatus.OK).json({
      success: true,
      data: {
        hasSubscription: true,
        subscription: {
          id: activeSubscription.id,
          status: activeSubscription.status,
          currentPeriodEnd: new Date(activeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: activeSubscription.cancel_at_period_end,
          planName,
          isYearly,
          amount: activeSubscription.items.data[0].price.unit_amount,
          currency: activeSubscription.items.data[0].price.currency
        }
      }
    });

  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to get subscription status'
    });
  }
};

// Cancel subscription
export const cancelSubscription = async (req, res) => {
  try {
    const { immediately = false } = req.body;
    const tenantSubdomain = req.params.subdomain;

    // Validate tenant access and permissions
    if (!['tenant_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(httpStatus.FORBIDDEN).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    if (req.user.role !== 'super_admin' && req.user.tenantSubdomain !== tenantSubdomain) {
      return res.status(httpStatus.FORBIDDEN).json({
        success: false,
        message: 'Access denied to this tenant'
      });
    }

    const customerId = req.user.stripeCustomerId;
    if (!customerId) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Get active subscription
    const subscriptions = await stripeService.getCustomerSubscriptions(customerId);
    const activeSubscription = subscriptions.find(sub => 
      ['active', 'trialing'].includes(sub.status)
    );

    if (!activeSubscription) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'No active subscription to cancel'
      });
    }

    // Cancel subscription
    const cancelledSubscription = await stripeService.cancelSubscription(
      activeSubscription.id,
      immediately
    );

    res.status(httpStatus.OK).json({
      success: true,
      data: {
        subscription: cancelledSubscription,
        cancelledImmediately: immediately
      },
      message: immediately 
        ? 'Subscription cancelled immediately' 
        : 'Subscription will be cancelled at the end of the current period'
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
};

// Create customer portal session
export const createPortalSession = async (req, res) => {
  try {
    const tenantSubdomain = req.params.subdomain;
    const { returnUrl } = req.body;

    // Validate tenant access
    if (req.user.role !== 'super_admin' && req.user.tenantSubdomain !== tenantSubdomain) {
      return res.status(httpStatus.FORBIDDEN).json({
        success: false,
        message: 'Access denied to this tenant'
      });
    }

    const customerId = req.user.stripeCustomerId;
    if (!customerId) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'No Stripe customer found'
      });
    }

    const defaultReturnUrl = `${process.env.FRONTEND_URL}/s/${tenantSubdomain}/billing`;
    const session = await stripeService.createPortalSession(
      customerId,
      returnUrl || defaultReturnUrl
    );

    res.status(httpStatus.OK).json({
      success: true,
      data: {
        portalUrl: session.url
      },
      message: 'Portal session created successfully'
    });

  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to create portal session'
    });
  }
};

// Verificar sessão do Stripe (para página de sucesso)
export const verifyCheckoutSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Session ID é obrigatório'
      });
    }

    // Buscar sessão no Stripe
    const session = await stripeService.getCheckoutSession(sessionId);

    if (!session) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Sessão não encontrada'
      });
    }

    // Extrair dados relevantes
    const sessionData = {
      id: session.id,
      status: session.payment_status,
      customerEmail: session.customer_details?.email,
      tenantSubdomain: session.metadata?.tenantSubdomain,
      planName: session.metadata?.planName,
      customerName: session.metadata?.customerName,
      amount: session.amount_total,
      currency: session.currency,
      subscriptionId: session.subscription,
      isProcessed: session.metadata?.processed === 'true'
    };

    res.status(httpStatus.OK).json({
      success: true,
      data: sessionData,
      message: 'Sessão verificada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro ao verificar sessão'
    });
  }
};

export default {
  getPlans,
  createCheckoutSession,
  getSubscriptionStatus,
  cancelSubscription,
  createPortalSession,
  verifyCheckoutSession
};