import jwt from 'jsonwebtoken';
import AdminUser from '../Models/adminUserModel.js';

export const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res
        .status(401)
        .json({ message: 'Token de autenticação não fornecido!' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Busca o usuário pelo ObjectId
    const user = await AdminUser.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado!' });
    }

    req.user = user;
    next();
  } catch (error) {
    res
      .status(401)
      .json({ message: 'Token inválido ou expirado!', error: error.message });
  }
};

export const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acesso negado!' });
    }
    next();
  };
};

// Alias para compatibilidade com outras rotas
export const protect = authenticateUser;

// Função para restringir acesso a determinados roles
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado!' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Você não tem permissão para acessar este recurso!',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }
    
    next();
  };
};
