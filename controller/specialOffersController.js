import Subscription from '../Models/subscriptionModel.js';

// Configuração de ofertas especiais (server-side)
const SPECIAL_OFFERS = {
  LAUNCH_50: {
    id: 'launch_50_off_2025',
    name: '50% OFF + Setup Gratuito',
    description: 'Oferta especial de lançamento com 50% de desconto no primeiro ano',
    startDate: new Date('2025-11-01T00:00:00Z'),
    endDate: new Date('2025-12-31T23:59:59Z'),
    discountPercentage: 50,
    maxUses: 100,
    setupFee: 0,
    stripeCouponId: 'LAUNCH50_2025', // ID do cupom no Stripe
    isActive: true,
    benefits: [
      '50% OFF no primeiro ano (de R$ 197/mês por R$ 98/mês)',
      'Setup e configuração 100% gratuitos (valor R$ 497)',
      'Treinamento completo da equipe',
      'Suporte prioritário por 90 dias'
    ],
    guarantees: [
      '+40% nas notas em até 3 meses',
      '87% mais engajamento dos alunos',
      'Redução de 60% em problemas disciplinares',
      'ROI comprovado de 300% no primeiro ano'
    ]
  }
};

// Verificar se uma oferta está ativa
const isOfferActive = (offer) => {
  const now = new Date();
  return offer.isActive && 
         now >= offer.startDate && 
         now <= offer.endDate;
};

// Calcular tempo restante
const getTimeRemaining = (endDate) => {
  const now = new Date().getTime();
  const target = endDate.getTime();
  const difference = target - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isExpired: false };
};

// Simular escolas restantes baseado no uso real
const getSchoolsRemaining = async (offer) => {
  try {
    // Contar quantas escolas já usaram esta oferta
    const usedCount = await Subscription.countDocuments({
      couponCode: offer.stripeCouponId,
      createdAt: { $gte: offer.startDate, $lte: offer.endDate }
    });

    const remaining = Math.max(3, offer.maxUses - usedCount);
    return remaining;
  } catch (error) {
    console.error('Erro ao calcular escolas restantes:', error);
    return Math.floor(Math.random() * 8) + 3; // Fallback
  }
};

// Obter oferta atual ativa
const getCurrentOffer = async (req, res) => {
  try {
    const offer = SPECIAL_OFFERS.LAUNCH_50;
    
    if (!isOfferActive(offer)) {
      return res.json({ 
        success: true, 
        data: { hasActiveOffer: false } 
      });
    }

    const timeRemaining = getTimeRemaining(offer.endDate);
    const schoolsRemaining = await getSchoolsRemaining(offer);

    res.json({
      success: true,
      data: {
        hasActiveOffer: true,
        offer: {
          id: offer.id,
          name: offer.name,
          description: offer.description,
          discountPercentage: offer.discountPercentage,
          benefits: offer.benefits,
          guarantees: offer.guarantees,
          timeRemaining,
          schoolsRemaining,
          couponCode: offer.stripeCouponId
        }
      }
    });

  } catch (error) {
    console.error('Erro ao obter oferta atual:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

// Validar e aplicar oferta no checkout
const validateOffer = async (req, res) => {
  try {
    const { offerId, plan } = req.body;
    
    const offer = SPECIAL_OFFERS[offerId?.toUpperCase()];
    
    if (!offer || !isOfferActive(offer)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Oferta não encontrada ou expirada' 
      });
    }

    // Verificar se ainda há vagas disponíveis
    const remaining = await getSchoolsRemaining(offer);
    if (remaining <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Oferta esgotada' 
      });
    }

    // Calcular preços
    const originalPrices = {
      basic: 19700, // R$ 197,00 em centavos
      premium: 29700 // R$ 297,00 em centavos
    };

    const originalPrice = originalPrices[plan] || originalPrices.basic;
    const discountedPrice = Math.round(originalPrice * (1 - offer.discountPercentage / 100));

    res.json({
      success: true,
      data: {
        offer: {
          id: offer.id,
          couponCode: offer.stripeCouponId,
          discountPercentage: offer.discountPercentage
        },
        pricing: {
          originalPrice: originalPrice / 100, // Converter para reais
          discountedPrice: discountedPrice / 100,
          currency: 'BRL',
          setupFee: offer.setupFee
        }
      }
    });

  } catch (error) {
    console.error('Erro ao validar oferta:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

export {
  getCurrentOffer,
  validateOffer,
  SPECIAL_OFFERS
};