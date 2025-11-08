import User from '../Models/userModel.js';

// Login via QR Code
export const loginWithQRCode = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado!' });

    res.status(200).json({ message: 'Login bem-sucedido!', user });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao fazer login', error: error.message });
  }
};

export const revalidateUserData = async (req, res) => {
  try {
    const { id } = req.params;

    // Busca o usuário pelo ID
    const user = await User.findById(id).select('name email coins xp class completedMissions');

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado!' });
    }

    res.status(200).json({ message: 'Dados do usuário atualizados!', user });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao revalidar os dados do usuário', error: error.message });
  }
};
