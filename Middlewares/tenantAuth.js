import Tenant from '../Models/tenantModel.js';
import jwt from 'jsonwebtoken';

// Helper para extrair subdomínio de host
function extractSubdomain(host) {
  const parts = host.split('.');
  if (parts.length > 2) {
    return parts[0];
  }
  return null;
}

// Middleware melhorado para isolamento de tenant
export const tenantIsolation = async (req, res, next) => {
  try {
    // Extrair informações do tenant dos headers ou do usuário autenticado
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    const tenantSubdomain = req.headers['x-tenant-subdomain'] || req.user?.tenantSubdomain;
    
    // Se o usuário não for super_admin, deve ter um tenant
    if (req.user && req.user.role !== 'super_admin') {
      if (!tenantId && !tenantSubdomain) {
        return res.status(403).json({ 
          message: 'Acesso negado: informações de tenant não encontradas' 
        });
      }
    }

    // Buscar informações do tenant se tiver subdomain
    let tenantInfo = null;
    if (tenantSubdomain) {
      tenantInfo = await Tenant.findOne({ subdomain: tenantSubdomain }).select('_id subdomain status');
    } else if (tenantId) {
      tenantInfo = await Tenant.findById(tenantId).select('_id subdomain status');
    }

    // Adicionar informações do tenant ao request para uso nos controllers
    req.tenant = {
      id: tenantInfo?._id || tenantId,
      subdomain: tenantInfo?.subdomain || tenantSubdomain,
      isSuperAdmin: req.user?.role === 'super_admin',
      info: tenantInfo
    };

    next();
  } catch (error) {
    console.error('Erro no tenant isolation:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Helper para adicionar filtro de tenant nas queries do MongoDB
export const addTenantFilter = (filter = {}, req) => {
  // Se for super admin, não adicionar filtro de tenant
  if (req.tenant?.isSuperAdmin) {
    return filter;
  }

  // Adicionar filtro de tenant se não for super admin
  if (req.tenant?.id) {
    return {
      ...filter,
      tenantId: req.tenant.id
    };
  }

  return filter;
};

// Helper para validar se o item pertence ao tenant do usuário
export const validateTenantOwnership = (item, req) => {
  // Super admin pode acessar qualquer item
  if (req.tenant?.isSuperAdmin) {
    return true;
  }

  // Verificar se o item pertence ao tenant do usuário
  return item.tenantId && item.tenantId.toString() === req.tenant?.id?.toString();
};

// Middleware para extrair tenant do subdomínio ou header
export const extractTenant = async (req, res, next) => {
  try {
    let tenantInfo = null;

    // 1. Tentar obter tenant do header (para APIs)
    const tenantHeader = req.headers['x-tenant-id'] || req.headers['x-tenant-subdomain'];
    
    if (tenantHeader) {
      if (tenantHeader.match(/^[0-9a-fA-F]{24}$/)) {
        // É um ObjectId
        tenantInfo = await Tenant.findById(tenantHeader).select('_id subdomain status plan');
      } else {
        // É um subdomínio
        tenantInfo = await Tenant.findOne({ subdomain: tenantHeader }).select('_id subdomain status plan');
      }
    }

    // 2. Tentar obter tenant do subdomínio na URL (para web)
    if (!tenantInfo) {
      const host = req.headers.host || req.headers['x-forwarded-host'];
      if (host) {
        const subdomain = extractSubdomain(host);
        if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
          tenantInfo = await Tenant.findOne({ subdomain }).select('_id subdomain status plan');
        }
      }
    }

    // 3. Se não encontrou tenant, verificar se é rota de super admin
    if (!tenantInfo) {
      const isSuperAdminRoute = req.path.startsWith('/api/tenants') || 
                              req.path.startsWith('/admin/super') ||
                              req.path.includes('/super-admin');
      
      if (!isSuperAdminRoute) {
        return res.status(400).json({
          success: false,
          message: 'Tenant não especificado ou inválido'
        });
      }
    }

    // 4. Verificar status do tenant
    if (tenantInfo && tenantInfo.status !== 'active' && tenantInfo.status !== 'trial') {
      return res.status(403).json({
        success: false,
        message: 'Tenant suspenso ou inativo'
      });
    }

    // Adicionar informações do tenant à requisição
    req.tenant = tenantInfo;
    req.tenantId = tenantInfo?._id;

    next();
  } catch (error) {
    console.error('Erro ao extrair tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Middleware para verificar permissões de tenant admin
export const requireTenantAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso requerido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const AdminUser = (await import('../Models/adminUserModel.js')).default;
    
    const user = await AdminUser.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar se é super admin (pode acessar qualquer tenant)
    if (user.role === 'super_admin') {
      req.user = user;
      req.isSuperAdmin = true;
      return next();
    }

    // Verificar se o usuário pertence ao tenant correto
    if (!req.tenantId || !user.tenantId || user.tenantId.toString() !== req.tenantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado para este tenant'
      });
    }

    // Verificar se é admin do tenant
    if (!['admin', 'coordinator'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permissões de administrador requeridas'
      });
    }

    req.user = user;
    req.isSuperAdmin = false;

    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

// Middleware para verificar permissões de super admin
export const requireSuperAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso requerido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const AdminUser = (await import('../Models/adminUserModel.js')).default;
    
    const user = await AdminUser.findById(decoded.id);
    
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Permissões de super administrador requeridas'
      });
    }

    req.user = user;
    req.isSuperAdmin = true;

    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

// Middleware para adicionar filtro de tenant nas queries do Mongoose
// export const addTenantFilter = (req, res, next) => {
//   if (!req.tenantId) {
//     return next();
//   }

//   // Adicionar hook para automaticamente filtrar por tenant
//   const originalFind = req.Model?.find;
//   const originalFindOne = req.Model?.findOne;
//   const originalFindOneAndUpdate = req.Model?.findOneAndUpdate;
//   const originalDeleteMany = req.Model?.deleteMany;
//   const originalCountDocuments = req.Model?.countDocuments;

//   if (req.Model) {
//     // Override dos métodos de query
//     req.Model.find = function(filter = {}) {
//       filter.tenantId = req.tenantId;
//       return originalFind.call(this, filter);
//     };

//     req.Model.findOne = function(filter = {}) {
//       filter.tenantId = req.tenantId;
//       return originalFindOne.call(this, filter);
//     };

//     req.Model.findOneAndUpdate = function(filter = {}, update, options) {
//       filter.tenantId = req.tenantId;
//       return originalFindOneAndUpdate.call(this, filter, update, options);
//     };

//     req.Model.deleteMany = function(filter = {}) {
//       filter.tenantId = req.tenantId;
//       return originalDeleteMany.call(this, filter);
//     };

//     req.Model.countDocuments = function(filter = {}) {
//       filter.tenantId = req.tenantId;
//       return originalCountDocuments.call(this, filter);
//     };
//   }

//   next();
// };

// Função auxiliar para extrair subdomínio
// function extractSubdomain(host) {
//   // Remove porta se existir
//   const hostname = host.split(':')[0];
  
//   // Split por pontos
//   const parts = hostname.split('.');
  
//   // Se tem apenas uma parte ou é localhost, não há subdomínio
//   if (parts.length <= 1 || hostname === 'localhost') {
//     return null;
//   }
  
//   // Se tem 2 partes (ex: example.com), não há subdomínio
//   if (parts.length === 2) {
//     return null;
//   }
  
//   // Se tem 3+ partes, o primeiro é o subdomínio (ex: app.example.com)
//   return parts[0];
// }

// Middleware para verificar limites do tenant
export const checkTenantLimits = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (!req.tenant) {
        return next(); // Pular se não há tenant (super admin)
      }

      const tenant = await Tenant.findById(req.tenantId);
      
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant não encontrado'
        });
      }

      const limits = tenant.plan.limits;
      const stats = tenant.stats;

      // Verificar limites baseado no tipo de recurso
      let exceeded = false;
      let message = '';

      switch (resourceType) {
        case 'users':
          if (limits.maxUsers > 0 && stats.totalUsers >= limits.maxUsers) {
            exceeded = true;
            message = `Limite de usuários atingido (${limits.maxUsers})`;
          }
          break;
        
        case 'classes':
          if (limits.maxClasses > 0 && stats.totalClasses >= limits.maxClasses) {
            exceeded = true;
            message = `Limite de turmas atingido (${limits.maxClasses})`;
          }
          break;
        
        case 'missions':
          if (limits.maxMissions > 0 && stats.totalMissions >= limits.maxMissions) {
            exceeded = true;
            message = `Limite de missões atingido (${limits.maxMissions})`;
          }
          break;
        
        case 'storage':
          if (limits.maxStorage > 0 && stats.storageUsed >= limits.maxStorage) {
            exceeded = true;
            message = `Limite de armazenamento atingido (${limits.maxStorage}MB)`;
          }
          break;
      }

      if (exceeded) {
        return res.status(403).json({
          success: false,
          message,
          code: 'TENANT_LIMIT_EXCEEDED',
          limits,
          usage: stats
        });
      }

      next();
    } catch (error) {
      console.error('Erro ao verificar limites:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };
};

export default {
  extractTenant,
  requireTenantAdmin,
  requireSuperAdmin,
  addTenantFilter,
  checkTenantLimits
};