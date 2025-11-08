import Mission from '../Models/missionModel.js';
import User from '../Models/userModel.js';

// Obter Missões (Mobile)

export const getAvailableMissions = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate('completedMissions');
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado!' });

    const completedMissionIds = user.completedMissions.map((mission) => mission._id);

    // Filtrar missões que o usuário ainda não completou
    const availableMissions = await Mission.find({
      _id: { $nin: completedMissionIds }, // Exclui as missões já concluídas
      isCompleted: false, // Missões que ainda não foram concluídas globalmente
      classId: user.class._id, // Missões disponíveis para a turma do usuário
    });

    res.status(200).json(availableMissions);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar missões disponíveis', error: error.message });
  }
};

export const completeMission = async (req, res) => {
  try {
    const { id } = req.params;

    const mission = await Mission.findByIdAndUpdate(
      id,
      { isCompleted: true },
      { new: true }
    );

    if (!mission) return res.status(404).json({ message: 'Missão não encontrada!' });

    res.status(200).json({ message: 'Missão concluída com sucesso!', mission });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao concluir missão', error: error.message });
  }
};


export const completeMissionForUser = async (req, res) => {
  try {
    const { userId, missionId } = req.params;

    
    // Busca a missão
    const mission = await Mission.findById(missionId);
    if (!mission) return res.status(404).json({ message: 'Missão não encontrada!' });

    if (!mission.allowedUsers.includes(userId)) {
      return res.status(403).json({ message: 'Usuário não está liberado para completar esta missão!' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado!' });

    // Verifica se o usuário já completou a missão
    if (user.completedMissions.includes(missionId)) {
      return res.status(400).json({ message: 'Usuário já completou esta missão!' });
    }

    // Recompensas
    const rewardCoins = mission.coins;
    const rewardXP = 100;

    // Atualiza o progresso do usuário
    user.completedMissions.push(missionId);
    user.coins += rewardCoins;
    user.xp += rewardXP;

    await user.save();

    res.status(200).json({
      message: 'Missão concluída para o usuário!',
      user,
      newLevel: user.calculateLevel(), // Retorna o nível do usuário
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao completar missão', error: error.message });
  }
};
