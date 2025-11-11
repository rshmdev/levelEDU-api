import User from '../Models/userModel.js';

// Ranking por Coins
export const getRankingByCoins = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      return res.status(400).json({ message: 'Header x-tenant-id é obrigatório!' });
    }

    const users = await User.find({ tenantId: tenantId })
      .sort({ coins: -1 }) // Ordena por coins (maior para menor)
      .select('name coins xp'); // Retorna apenas os campos necessários

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao obter ranking por coins', error: error.message });
  }
};

// Ranking Geral por XP
export const getRankingByXP = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      return res.status(400).json({ message: 'Header x-tenant-id é obrigatório!' });
    }

    const users = await User.find({ tenantId: tenantId })
      .sort({ xp: -1 }) // Ordena por XP (maior para menor)
      .select('name coins xp'); // Retorna apenas os campos necessários

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao obter ranking geral', error: error.message });
  }
};
