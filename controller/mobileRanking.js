import User from '../Models/userModel.js';

// Ranking por Coins
export const getRankingByCoins = async (req, res) => {
  try {
    const users = await User.find({})
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
    const users = await User.find({})
      .sort({ xp: -1 }) // Ordena por XP (maior para menor)
      .select('name coins xp'); // Retorna apenas os campos necessários

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao obter ranking geral', error: error.message });
  }
};
