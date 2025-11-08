import express from 'express';
import { body, param, query } from 'express-validator';
import {
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
} from '../controller/tenantController.js';
// import { requireSuperAdmin, requireTenantAdmin } from '../middlewares/tenantAuth.js'; // Vamos criar depois

const router = express.Router();

// Validações para criar tenant
const createTenantValidation = [
  body('name')
    .notEmpty()
    .withMessage('Nome é obrigatório')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  
  body('subdomain')
    .notEmpty()
    .withMessage('Subdomínio é obrigatório')
    .isLength({ min: 3, max: 30 })
    .withMessage('Subdomínio deve ter entre 3 e 30 caracteres')
    .matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .withMessage('Subdomínio deve conter apenas letras minúsculas, números e hífens'),
  
  body('contact.adminEmail')
    .isEmail()
    .withMessage('Email do administrador é obrigatório e deve ser válido'),
  
  body('contact.adminName')
    .notEmpty()
    .withMessage('Nome do administrador é obrigatório')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome do administrador deve ter entre 2 e 100 caracteres'),
  
  body('plan')
    .optional()
    .isIn(['trial', 'basic', 'professional', 'enterprise'])
    .withMessage('Plano inválido')
];

// Validações para atualização de branding
const brandingValidation = [
  body('branding.primaryColor')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Cor primária deve estar no formato hexadecimal (#RRGGBB)'),
  
  body('branding.secondaryColor')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Cor secundária deve estar no formato hexadecimal (#RRGGBB)'),
  
  body('branding.accentColor')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Cor de destaque deve estar no formato hexadecimal (#RRGGBB)'),
];

// === ROTAS PÚBLICAS ===

// Verificar disponibilidade de subdomínio
router.get('/check-subdomain/:subdomain', 
  param('subdomain').matches(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  checkSubdomainAvailability
);

// Obter dados públicos do tenant por subdomínio
router.get('/public/:subdomain', 
  param('subdomain').matches(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  getTenantBySubdomain
);

// === ROTAS PARA SUPER ADMIN ===

// Criar novo tenant (apenas super admin)
router.post('/', 
  // requireSuperAdmin, // Middleware de autenticação - implementar depois
  createTenantValidation,
  createTenant
);

// Listar todos os tenants (apenas super admin)
router.get('/',
  // requireSuperAdmin,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['active', 'suspended', 'trial', 'inactive']),
  query('plan').optional().isIn(['trial', 'basic', 'professional', 'enterprise']),
  getAllTenants
);

// Atualizar status do tenant (suspender/reativar)
router.patch('/:id/status',
  // requireSuperAdmin,
  param('id').isMongoId(),
  body('status').isIn(['active', 'suspended', 'trial', 'inactive']),
  body('reason').optional().isLength({ max: 500 }),
  updateTenantStatus
);

// === ROTAS PARA TENANT ADMIN ===

// Atualizar configurações do tenant
router.patch('/:id',
  // requireTenantAdmin,
  param('id').isMongoId(),
  updateTenant
);

// Atualizar personalização/branding
router.patch('/:id/branding',
  // requireTenantAdmin,
  param('id').isMongoId(),
  brandingValidation,
  updateTenantBranding
);

// Atualizar estatísticas do tenant
router.post('/:id/update-stats',
  // requireTenantAdmin,
  param('id').isMongoId(),
  updateTenantStats
);

// === ROTAS DE MÉTRICAS ===

// Obter métricas resumidas (dashboard)
router.get('/:id/metrics',
  // requireTenantAdmin,
  param('id').isMongoId(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const Tenant = (await import('../Models/tenantModel.js')).default;
      
      const tenant = await Tenant.findById(id).select('stats plan');
      
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant não encontrado'
        });
      }

      res.json({
        success: true,
        data: {
          stats: tenant.stats,
          limits: tenant.plan.limits,
          usage: {
            users: {
              current: tenant.stats.totalUsers,
              limit: tenant.plan.limits.maxUsers,
              percentage: tenant.plan.limits.maxUsers > 0 
                ? (tenant.stats.totalUsers / tenant.plan.limits.maxUsers) * 100 
                : 0
            },
            classes: {
              current: tenant.stats.totalClasses,
              limit: tenant.plan.limits.maxClasses,
              percentage: tenant.plan.limits.maxClasses > 0 
                ? (tenant.stats.totalClasses / tenant.plan.limits.maxClasses) * 100 
                : 0
            },
            missions: {
              current: tenant.stats.totalMissions,
              limit: tenant.plan.limits.maxMissions,
              percentage: tenant.plan.limits.maxMissions > 0 
                ? (tenant.stats.totalMissions / tenant.plan.limits.maxMissions) * 100 
                : 0
            },
            storage: {
              current: tenant.stats.storageUsed,
              limit: tenant.plan.limits.maxStorage,
              percentage: tenant.plan.limits.maxStorage > 0 
                ? (tenant.stats.storageUsed / tenant.plan.limits.maxStorage) * 100 
                : 0
            }
          }
        }
      });

    } catch (error) {
      console.error('Erro ao obter métricas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
);

// === ROTAS PÚBLICAS PARA TENANT VERIFICATION ===
// Verificar se subdomain está disponível (público para signup)
router.get('/check-availability/:subdomain', checkTenantAvailability);

// Obter informações públicas de um tenant (público para branding)
router.get('/info/:subdomain', getTenantInfo);

// === ROTAS PARA PERSONALIZAÇÃO ===
// Atualizar branding do tenant
router.put('/:subdomain/branding', 
  param('subdomain')
    .notEmpty()
    .withMessage('Subdomain é obrigatório')
    .matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .withMessage('Subdomain inválido'),
  updateTenantBranding
);

// Atualizar onboarding do tenant  
router.put('/:subdomain/onboarding',
  param('subdomain')
    .notEmpty()
    .withMessage('Subdomain é obrigatório')
    .matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .withMessage('Subdomain inválido'),
  body('onboardingCompleted')
    .isBoolean()
    .withMessage('onboardingCompleted deve ser boolean'),
  updateTenantOnboarding
);

export default router;