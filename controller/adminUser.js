import User from '../Models/userModel.js';
import AdminUser from '../Models/adminUserModel.js';
import Tenant from '../Models/tenantModel.js';
import jwt from 'jsonwebtoken';
import Class from '../Models/classModel.js';
import Attitude from '../Models/attitudeModel.js';
import emailService from '../services/emailService.js';
import { addTenantFilter } from '../Middlewares/tenantAuth.js';

// Criar Professor
export const createAdminUser = async (req, res) => {
  try {
    const { name, email, password, role, classrooms, sendWelcomeEmail = true } = req.body;

    const existingUser = await AdminUser.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: 'Email já está em uso!' });

    const validClassrooms = await Class.find({ _id: { $in: classrooms } });

    if (validClassrooms.length !== classrooms.length) {
      return res
        .status(400)
        .json({ message: 'Uma ou mais turmas fornecidas não existem!' });
    }

    let temporaryPassword = password;
    let emailSent = false;

    // Se não foi fornecida senha, gerar uma temporária e enviar por email
    if (!password && sendWelcomeEmail) {
      try {
        const emailResult = await emailService.sendWelcomeEmail({
          name,
          email,
          schoolName: req.user?.tenantName || 'LevelEdu',
          loginUrl: `${process.env.FRONTEND_URL}/login`
        });
        
        temporaryPassword = emailResult.temporaryPassword;
        emailSent = true;
      } catch (emailError) {
        console.error('Erro ao enviar email de boas-vindas:', emailError);
        // Continua com a criação do usuário mesmo se o email falhar
      }
    }

    const adminUser = new AdminUser({
      name,
      email,
      password: temporaryPassword,
      role,
      classrooms: validClassrooms.map((c) => c._id), // Garante que sejam ObjectIds válidos
    });
    await adminUser.save();

    res
      .status(201)
      .json({ 
        message: 'Professor criado com sucesso!', 
        adminUser: {
          _id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          classrooms: adminUser.classrooms
        },
        emailSent,
        temporaryPassword: emailSent ? 'Enviado por email' : temporaryPassword
      });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao criar professor', error: error.message });
  }
};

export const loginAdminUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar admin user com relação do tenant
    const adminUser = await AdminUser.findOne({ email }).populate('tenantId');
    if (!adminUser)
      return res.status(404).json({ message: 'Usuário não encontrado!' });

    const isMatch = await adminUser.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Senha inválida!' });

    const token = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.status(200).json({
      message: 'Login bem-sucedido!',
      user: {
        id: adminUser._id,
        _id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        tenantId: adminUser.tenantId?._id,
        tenantSubdomain: adminUser.tenantId?.subdomain,
        tenantName: adminUser.tenantId?.name
      },
      accessToken: token,
      refreshToken: token, // Por enquanto usar o mesmo token
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao fazer login', error: error.message });
  }
};

export const getAdminUsers = async (req, res) => {
  try {
    const adminUsers = await AdminUser.find()
      .select('-password') // Remove o campo de senha
      .populate('classrooms'); // Popula os detalhes das turmas (nome e código)

    res.status(200).json(adminUsers);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao buscar professores', error: error.message });
  }
};

export const deleteAdminUser = async (req, res) => {
  try {
    const { id } = req.params;

    const adminUser = await AdminUser.findByIdAndDelete(id);
    if (!adminUser)
      return res.status(404).json({ message: 'Professor não encontrado!' });

    res.status(200).json({ message: 'Professor deletado com sucesso!' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao deletar professor', error: error.message });
  }
};

export const updateAdminUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, classrooms } = req.body;

    const adminUser = await AdminUser.findById(id);
    if (!adminUser) {
      return res.status(404).json({ message: 'Professor não encontrado!' });
    }

    // Atualiza os campos permitidos
    if (name) adminUser.name = name;
    if (email) adminUser.email = email;
    if (password) {
      adminUser.password = password; // Será hashada automaticamente pelo pre-save do model
    }

    if (role) adminUser.role = role;

    if (classrooms) {
      const validClassrooms = await Class.find({ _id: { $in: classrooms } });

      if (validClassrooms.length !== classrooms.length) {
        return res
          .status(400)
          .json({ message: 'Uma ou mais turmas fornecidas não existem!' });
      }

      adminUser.classrooms = validClassrooms.map((c) => c._id);
    }

    await adminUser.save();

    res
      .status(200)
      .json({ message: 'Professor atualizado com sucesso!', adminUser });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao atualizar professor', error: error.message });
  }
};

// Criar Usuário
export const createUser = async (req, res) => {
  try {
    const { name, classId } = req.body;

    if (classId) {
      const existingClass = await Class.findById(classId);
      if (!existingClass) {
        return res.status(404).json({ message: 'Turma não encontrada!' });
      }
    }
    const user = new User({ name, class: classId });
    await user.save();

    if (classId) {
      await Class.findByIdAndUpdate(classId, { $push: { students: user._id } });
    }

    res.status(201).json({ message: 'Usuário criado com sucesso!', user });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao criar usuário', error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, classId } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado!' });
    }

    // Verifica se a nova turma existe (se fornecida)
    if (classId) {
      const existingClass = await Class.findById(classId);
      if (!existingClass) {
        return res.status(404).json({ message: 'Nova turma não encontrada!' });
      }
    }

    // Se o usuário já estava associado a uma turma, remove-o da turma antiga
    if (user.class && user.class.toString() !== classId) {
      await Class.findByIdAndUpdate(user.class, {
        $pull: { students: user._id },
      });
    }

    // Atualiza os dados do usuário
    const updatedData = { name };
    if (classId) updatedData.class = classId;

    const updatedUser = await User.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    // Adiciona o usuário na nova turma, se necessário
    if (classId) {
      await Class.findByIdAndUpdate(classId, { $push: { students: user._id } });
    }

    // Retorna os dados do usuário atualizado com a turma populada
    const populatedUser = await User.findById(updatedUser._id).populate(
      'class'
    );

    res.status(200).json({
      message: 'Usuário atualizado com sucesso!',
      user: populatedUser,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao atualizar usuário', error: error.message });
  }
};

// Deletar Usuário
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user)
      return res.status(404).json({ message: 'Usuário não encontrado!' });

    res.status(200).json({ message: 'Usuário deletado com sucesso!' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao deletar usuário', error: error.message });
  }
};

// Obter Usuários (com filtro de tenant)
export const getUsers = async (req, res) => {
  try {
    // Aplicar filtro de tenant
    const filter = addTenantFilter({}, req);
    
    // Busca todos os usuários do tenant e popula os campos necessários
    const users = await User.find(filter).populate('completedMissions class');

    // Para cada usuário, busca as atitudes e calcula as estatísticas
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        // Busca as atitudes do usuário (também filtradas por tenant)
        const attitudeFilter = addTenantFilter({ userId: user._id }, req);
        const attitudes = await Attitude.find(attitudeFilter);

        // Calcula as estatísticas
        const stats = {
          negativeAttitudes: attitudes.filter(
            (attitude) => !attitude.isPositive
          ).length, // Atitudes negativas
          positiveAttitudes: attitudes.filter((attitude) => attitude.isPositive)
            .length, // Atitudes positivas
          coins: user.coins || 0, // Saldo de moedas
          xp: user.xp || 0, // Pontos de experiência
        };

        // Retorna o usuário com as estatísticas
        return {
          ...user.toObject(), // Converte o documento Mongoose para um objeto JavaScript
          stats, // Adiciona o objeto `stats`
        };
      })
    );

    res.status(200).json(usersWithStats);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao buscar usuários', error: error.message });
  }
};

// Redefinir senha e enviar por email
export const resetPasswordByEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email é obrigatório!' });
    }

    const adminUser = await AdminUser.findOne({ email });
    if (!adminUser) {
      return res.status(404).json({ message: 'Usuário não encontrado!' });
    }

    try {
      const emailResult = await emailService.sendPasswordResetEmail({
        name: adminUser.name,
        email: adminUser.email,
        schoolName: req.user?.tenantName || 'LevelEdu',
        loginUrl: `${process.env.FRONTEND_URL}/login`
      });

      // Atualizar a senha no banco de dados
      adminUser.password = emailResult.newPassword;
      await adminUser.save();

      res.status(200).json({
        success: true,
        message: 'Nova senha enviada por email com sucesso!',
        emailSent: true
      });
    } catch (emailError) {
      console.error('Erro ao enviar email de redefinição:', emailError);
      res.status(500).json({
        success: false,
        message: 'Erro ao enviar email. Tente novamente mais tarde.',
        error: emailError.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Testar configuração de email
export const testEmailConfig = async (req, res) => {
  try {
    const testResult = await emailService.testConnection();
    res.status(200).json(testResult);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao testar configuração de email',
      error: error.message
    });
  }
};
