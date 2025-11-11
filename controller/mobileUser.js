import User from '../Models/userModel.js';

// Login via QR Code
export const loginWithQRCode = async (req, res) => {
  try {
    const { userId, tenantId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'ID do usuário é obrigatório!' });
    }

    if (!tenantId) {
      return res.status(400).json({ message: 'ID do tenant é obrigatório!' });
    }

    // Buscar usuário validando tenant
    const user = await User.findOne({ _id: userId, tenantId: tenantId });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado neste tenant!' });

    res.status(200).json({ 
      message: 'Login bem-sucedido!', 
      user,
      tenant: {
        id: tenantId
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao fazer login', error: error.message });
  }
};

export const revalidateUserData = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      return res.status(400).json({ message: 'Header x-tenant-id é obrigatório!' });
    }

    // Busca o usuário pelo ID e tenantId
    const user = await User.findOne({ 
      _id: id, 
      tenantId: tenantId 
    }).select('name email coins xp class completedMissions tenantId');

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado neste tenant!' });
    }

    res.status(200).json({ message: 'Dados do usuário atualizados!', user });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao revalidar os dados do usuário', error: error.message });
  }
};
