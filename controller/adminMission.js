import Class from '../Models/classModel.js';
import Mission from '../Models/missionModel.js';
import User from '../Models/userModel.js';

// Criar Missão
export const createMission = async (req, res) => {
  try {
    const { title, description, coins, classId } = req.body;

    // Verifica se a turma existe
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({ message: 'Turma não encontrada!' });
    }

    // Criando a missão vinculada à turma
    const mission = new Mission({ title, description, coins, classId });
    await mission.save();

    res.status(201).json({ message: 'Missão criada com sucesso!', mission });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar missão', error: error.message });
  }
};

// Atualizar Missão
export const updateMission = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, coins } = req.body;

    const mission = await Mission.findByIdAndUpdate(
      id,
      { title, description, coins },
      { new: true }
    );

    if (!mission) return res.status(404).json({ message: 'Missão não encontrada!' });

    res.status(200).json({ message: 'Missão atualizada com sucesso!', mission });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar missão', error: error.message });
  }
};

// Deletar Missão
export const deleteMission = async (req, res) => {
  try {
    const { id } = req.params;

    const mission = await Mission.findByIdAndDelete(id);

    if (!mission) return res.status(404).json({ message: 'Missão não encontrada!' });

    res.status(200).json({ message: 'Missão deletada com sucesso!' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar missão', error: error.message });
  }
};

// Obter Missões
export const getMissions = async (req, res) => {
  try {
    const missions = await Mission.find();
    res.status(200).json(missions);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar missões', error: error.message });
  }
};

// Liberar Usuário para uma Missão
export const allowUserForMission = async (req, res) => {
  try {
    const { missionId } = req.params;
    const { userIds } = req.body; // Recebe um array de IDs de usuários

    // Verifica se a missão existe
    const mission = await Mission.findById(missionId);
    if (!mission) {
      return res.status(404).json({ message: 'Missão não encontrada!' });
    }

    // Verifica se os usuários existem
    const users = await User.find({ _id: { $in: userIds } });
    if (users.length !== userIds.length) {
      return res.status(404).json({ message: 'Um ou mais usuários não foram encontrados!' });
    }

    // Verifica se algum usuário já completou a missão
    const usersWhoCompletedMission = users.filter((user) =>
      mission.allowedUsers.includes(user._id)
    );

    if (usersWhoCompletedMission.length > 0) {
      const userNames = usersWhoCompletedMission.map((user) => user.name).join(', ');
      return res.status(400).json({
        message: `Os seguintes usuários já completaram a missão: ${userNames}`,
      });
    }

    // Adiciona os usuários à lista de permitidos, caso não estejam
    userIds.forEach((userId) => {
      if (!mission.allowedUsers.includes(userId)) {
        mission.allowedUsers.push(userId);
      }
    });

    await mission.save();

    res.status(200).json({ message: 'Usuários liberados para completar a missão!', mission });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao liberar usuários para a missão', error: error.message });
  }
};