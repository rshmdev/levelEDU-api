import AttitudeAssignment from '../Models/AttitudeAssignment.js';
import User from '../Models/userModel.js';

// Obter Atitudes do Aluno
export const getUserAttitudes = async (req, res) => {
  try {
    const { userId } = req.params;
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      return res.status(400).json({ message: 'Header x-tenant-id é obrigatório!' });
    }

    // Busca todas as atitudes associadas ao usuário na tabela de relacionamentos com filtro de tenant
    const assignments = await AttitudeAssignment.find({ 
      studentId: userId,
      tenantId: tenantId 
    }).populate('attitudeId', 'isPositive coins xp description title') // Popula os dados da atitude

    if (!assignments.length) {
      return res.status(200).json([]); // Retorna array vazio se não houver atitudes
    }

    // Retorna um array formatado com as informações necessárias
    const attitudes = assignments.map((assignment) => ({
      _id: assignment.attitudeId._id,
      title: assignment.attitudeId.title,
      description: assignment.attitudeId.description,
      isPositive: assignment.attitudeId.isPositive,
      coins: assignment.attitudeId.coins,
      xp: assignment.attitudeId.xp,
      isClaimed: assignment.isClaimed, // Agora pegamos de AttitudeAssignment
    }));

    res.status(200).json(attitudes);
  } catch (error) {
    res.status(500).json({ 
      message: 'Erro ao buscar atitudes do aluno', 
      error: error.message 
    });
  }
};


// Resgatar Prêmio de Atitude
export const claimAttitudeReward = async (req, res) => {
  try {
    const { userId, attitudeId } = req.params;
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      return res.status(400).json({ message: 'Header x-tenant-id é obrigatório!' });
    }

    // Verifica se a relação entre aluno e atitude existe com filtro de tenant
    const assignment = await AttitudeAssignment.findOne({ 
      studentId: userId, 
      attitudeId,
      tenantId: tenantId 
    }).populate('attitudeId', 'coins xp');

    if (!assignment) {
      return res.status(404).json({ message: 'Atitude não encontrada ou não atribuída ao aluno neste tenant!' });
    }

    if (assignment.isClaimed) {
      return res.status(400).json({ message: 'A recompensa já foi resgatada!' });
    }

    // Busca o usuário para atualizar as recompensas com filtro de tenant
    const user = await User.findOne({ _id: userId, tenantId: tenantId });
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado neste tenant!' });
    }

    // Adiciona os prêmios ao usuário
    user.coins += assignment.attitudeId.coins;
    user.xp += assignment.attitudeId.xp;

    // Atualiza o status para resgatado
    assignment.isClaimed = true;

    await user.save();
    await assignment.save();

    res.status(200).json({ 
      message: 'Recompensa resgatada com sucesso!', 
      user 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Erro ao resgatar recompensa', 
      error: error.message 
    });
  }
};
