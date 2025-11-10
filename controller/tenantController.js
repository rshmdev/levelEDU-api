import Tenant from '../Models/tenantModel.js';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import httpStatus from 'http-status';

// Criar novo tenant
export const createTenant = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const {
      name,
      subdomain,
      contact,
      plan = 'trial'
    } = req.body;

    // Verificar se o subdomínio já existe
    const existingTenant = await Tenant.findOne({ subdomain });
    if (existingTenant) {
      return res.status(400).json({
        success: false,
        message: 'Subdomínio já está em uso'
      });
    }

    // Criar tenant
    const tenant = new Tenant({
      name,
      subdomain: subdomain.toLowerCase(),
      contact,
      plan: {
        type: plan,
        limits: getDefaultLimits(plan)
      }
    });

    await tenant.save();

    res.status(201).json({
      success: true,
      message: 'Tenant criado com sucesso',
      data: tenant
    });

  } catch (error) {
    console.error('Erro ao criar tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Listar todos os tenants (Super Admin)
export const getAllTenants = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      plan,
      search
    } = req.query;

    const filter = {};
    
    if (status) filter.status = status;
    if (plan) filter['plan.type'] = plan;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { subdomain: { $regex: search, $options: 'i' } },
        { 'contact.adminEmail': { $regex: search, $options: 'i' } }
      ];
    }

    const tenants = await Tenant.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-metadata.notes'); // Não expor notas internas

    const total = await Tenant.countDocuments(filter);

    res.json({
      success: true,
      data: {
        tenants,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });

  } catch (error) {
    console.error('Erro ao listar tenants:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter tenant por subdomínio
export const getTenantBySubdomain = async (req, res) => {
  try {
    const { subdomain } = req.params;

    const tenant = await Tenant.findOne({ subdomain });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant não encontrado'
      });
    }

    // Verificar se o tenant está ativo
    if (tenant.status !== 'active' && tenant.status !== 'trial') {
      return res.status(403).json({
        success: false,
        message: 'Tenant suspenso ou inativo'
      });
    }

    // Não expor informações sensíveis
    const publicTenant = {
      _id: tenant._id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      branding: tenant.branding,
      settings: tenant.settings,
      plan: {
        type: tenant.plan.type,
        limits: tenant.plan.limits
      }
    };

    res.json({
      success: true,
      data: publicTenant
    });

  } catch (error) {
    console.error('Erro ao obter tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Atualizar configurações do tenant
export const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remover campos que não podem ser atualizados diretamente
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.stats;
    delete updates.billing; // Billing tem endpoints específicos

    const tenant = await Tenant.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Tenant atualizado com sucesso',
      data: tenant
    });

  } catch (error) {
    console.error('Erro ao atualizar tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Atualizar personalização/branding
export const updateTenantBranding = async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { branding } = req.body;

    if (!subdomain) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Subdomain é obrigatório'
      });
    }

    if (!branding) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Dados de branding são obrigatórios'
      });
    }

    // Buscar tenant
    const tenant = await Tenant.findOne({ subdomain });
    if (!tenant) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Tenant não encontrado'
      });
    }

    // Atualizar branding
    tenant.branding = {
      ...tenant.branding,
      ...branding
    };

    await tenant.save();

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Branding atualizado com sucesso',
      data: tenant.branding
    });

  } catch (error) {
    console.error('Erro ao atualizar branding:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Atualizar onboarding do tenant
export const updateTenantOnboarding = async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { onboardingCompleted } = req.body;

    if (!subdomain) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Subdomain é obrigatório'
      });
    }

    // Buscar tenant
    const tenant = await Tenant.findOne({ subdomain });
    if (!tenant) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Tenant não encontrado'
      });
    }

    // Atualizar onboarding
    tenant.metadata = {
      ...tenant.metadata,
      onboardingCompleted: onboardingCompleted === true
    };

    await tenant.save();

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Onboarding atualizado com sucesso',
      data: { onboardingCompleted: tenant.metadata.onboardingCompleted }
    });

  } catch (error) {
    console.error('Erro ao atualizar onboarding:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Suspender/reativar tenant
export const updateTenantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const tenant = await Tenant.findByIdAndUpdate(
      id,
      { 
        $set: { 
          status,
          'metadata.suspensionReason': reason || null
        }
      },
      { new: true }
    );

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant não encontrado'
      });
    }

    res.json({
      success: true,
      message: `Tenant ${status === 'suspended' ? 'suspenso' : 'atualizado'} com sucesso`,
      data: { status: tenant.status }
    });

  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Atualizar estatísticas do tenant
export const updateTenantStats = async (req, res) => {
  try {
    const { id } = req.params;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant não encontrado'
      });
    }

    await tenant.updateStats();

    res.json({
      success: true,
      message: 'Estatísticas atualizadas com sucesso',
      data: tenant.stats
    });

  } catch (error) {
    console.error('Erro ao atualizar estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Validar se subdomínio está disponível
export const checkSubdomainAvailability = async (req, res) => {
  try {
    const { subdomain } = req.params;
    
    // Validar formato do subdomínio
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(subdomain)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de subdomínio inválido'
      });
    }

    // Verificar palavras reservadas
    const reservedSubdomains = [
      'www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 
      'support', 'help', 'docs', 'status', 'test', 'dev'
    ];
    
    if (reservedSubdomains.includes(subdomain)) {
      return res.status(400).json({
        success: false,
        message: 'Este subdomínio é reservado'
      });
    }

    const existingTenant = await Tenant.findOne({ subdomain });
    
    res.json({
      success: true,
      available: !existingTenant,
      message: existingTenant ? 'Subdomínio já está em uso' : 'Subdomínio disponível'
    });

  } catch (error) {
    console.error('Erro ao verificar subdomínio:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Helper function para definir limites padrão por plano
function getDefaultLimits(planType) {
  const limits = {
    trial: {
      maxUsers: 10,
      maxClasses: 2,
      maxMissions: 10,
      maxStorage: 50,
      customBranding: false,
      apiAccess: false,
      customDomain: false,
    },
    starter: {
      maxUsers: 100,
      maxClasses: 10,
      maxMissions: -1, // Ilimitado
      maxStorage: 500,
      customBranding: false,
      apiAccess: false,
      customDomain: false,
    },
    professional: {
      maxUsers: 500,
      maxClasses: 25,
      maxMissions: -1, // Ilimitado
      maxStorage: 2000,
      customBranding: true,
      apiAccess: false,
      customDomain: false,
    },
    growth: {
      maxUsers: 1000,
      maxClasses: 50,
      maxMissions: -1, // Ilimitado
      maxStorage: 5000,
      customBranding: true,
      apiAccess: true,
      customDomain: false,
    },
    enterprise: {
      maxUsers: -1, // Ilimitado
      maxClasses: -1,
      maxMissions: -1,
      maxStorage: 10000,
      customBranding: true,
      apiAccess: true,
      customDomain: true,
    }
  };

  return limits[planType] || limits.trial;
}

// Verificar disponibilidade de subdomain (público)
export const checkTenantAvailability = async (req, res) => {
  try {
    const { subdomain } = req.params;

    if (!subdomain) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Subdomain é obrigatório'
      });
    }

    // Normalizar subdomain
    const normalizedSubdomain = subdomain.toLowerCase().trim();

    // Verificar se subdomain é válido
    if (!/^[a-z0-9]+$/.test(normalizedSubdomain)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Subdomain deve conter apenas letras minúsculas e números',
        available: false
      });
    }

    // Lista de subdomains reservados
    const reservedSubdomains = [
      'www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'shop', 'store',
      'support', 'help', 'docs', 'dev', 'test', 'staging', 'demo', 'beta',
      'alpha', 'cdn', 'static', 'assets', 'media', 'images', 'files',
      'dashboard', 'panel', 'cpanel', 'control', 'manage', 'system',
      'root', 'user', 'users', 'account', 'accounts', 'login', 'signup',
      'register', 'auth', 'oauth', 'sso', 'security', 'privacy',
      'terms', 'legal', 'about', 'contact', 'careers', 'jobs'
    ];

    if (reservedSubdomains.includes(normalizedSubdomain)) {
      return res.status(httpStatus.OK).json({
        success: true,
        data: {
          subdomain: normalizedSubdomain,
          available: false,
          reason: 'Subdomain reservado pelo sistema'
        }
      });
    }

    // Verificar se já existe no banco
    const existingTenant = await Tenant.findOne({ 
      subdomain: normalizedSubdomain 
    });

    const isAvailable = !existingTenant;

    res.status(httpStatus.OK).json({
      success: true,
      data: {
        subdomain: normalizedSubdomain,
        available: isAvailable,
        reason: isAvailable ? 'Subdomain disponível' : 'Subdomain já está em uso'
      }
    });

  } catch (error) {
    console.error('Erro ao verificar subdomain:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Buscar informações públicas de um tenant
export const getTenantInfo = async (req, res) => {
  try {
    const { subdomain } = req.params;

    if (!subdomain) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Subdomain é obrigatório'
      });
    }

    const tenant = await Tenant.findOne({ 
      subdomain: subdomain.toLowerCase(),
      status: 'active' 
    }).select('name subdomain settings.branding status plan');

    if (!tenant) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Escola não encontrada ou inativa'
      });
    }

    // Dados públicos do tenant
    const tenantInfo = {
      name: tenant.name,
      subdomain: tenant.subdomain,
      branding: {
        primaryColor: tenant.settings?.branding?.primaryColor || '#3b82f6',
        secondaryColor: tenant.settings?.branding?.secondaryColor || '#1e40af',
        logo: tenant.settings?.branding?.logo || null
      },
      plan: tenant.plan?.type || 'trial',
      status: tenant.status
    };

    res.status(httpStatus.OK).json({
      success: true,
      data: tenantInfo
    });

  } catch (error) {
    console.error('Erro ao buscar tenant:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

export default {
  createTenant,
  getAllTenants,
  getTenantBySubdomain,
  updateTenant,
  updateTenantBranding,
  updateTenantOnboarding,
  updateTenantStatus,
  updateTenantStats,
  checkSubdomainAvailability,
  checkTenantAvailability,
  getTenantInfo
};