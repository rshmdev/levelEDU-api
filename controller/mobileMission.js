import Mission from '../Models/missionModel.js';
import User from '../Models/userModel.js';

// Obter Missões (Mobile)

export const getAvailableMissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      return res.status(400).json({ message: 'Header x-tenant-id é obrigatório!' });
    }

    const user = await User.findOne({ _id: userId, tenantId: tenantId }).populate('completedMissions');
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado neste tenant!' });

    const completedMissionIds = user.completedMissions.map((mission) => mission._id);

    // Filtrar missões que o usuário ainda não completou com filtro de tenant
    const availableMissions = await Mission.find({
      _id: { $nin: completedMissionIds }, // Exclui as missões já concluídas
      isCompleted: false, // Missões que ainda não foram concluídas globalmente
      classId: user.class._id, // Missões disponíveis para a turma do usuário
      tenantId: tenantId // Filtro de tenant
    });

    res.status(200).json(availableMissions);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar missões disponíveis', error: error.message });
  }
};

export const completeMission = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      return res.status(400).json({ message: 'Header x-tenant-id é obrigatório!' });
    }

    const mission = await Mission.findOneAndUpdate(
      { _id: id, tenantId: tenantId },
      { isCompleted: true },
      { new: true }
    );

    if (!mission) return res.status(404).json({ message: 'Missão não encontrada neste tenant!' });

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
