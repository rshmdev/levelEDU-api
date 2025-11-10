import AttitudeAssignment from '../Models/AttitudeAssignment.js';
import Attitude from '../Models/attitudeModel.js';
import Class from '../Models/classModel.js';
import User from '../Models/userModel.js';

// Criar Atitude
export const createAttitude = async (req, res) => {
  try {
    const { isPositive, coins, xp, title, description, classId } = req.body;

    // Verificar se tenantId está disponível
    if (!req.tenant || !req.tenant.id) {
      return res.status(400).json({ 
        message: 'Informações de tenant não encontradas. Verifique os headers x-tenant-id ou x-tenant-subdomain.' 
      });
    }

    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({ message: 'Turma não encontrada!' });
    }

    const attitude = new Attitude({
      isPositive,
      coins,
      xp,
      title,
      description,
      classId,
      tenantId: req.tenant.id  // Adicionar tenantId do middleware
    });
    await attitude.save();

    res
      .status(201)
      .json({ message: 'Atitude registrada com sucesso!', attitude });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao registrar atitude', error: error.message });
  }
};


export const assignAttitudeToStudents = async (req, res) => {
  try {
    const { attitudeId, studentIds } = req.body;

    // Verificar se tenantId está disponível
    if (!req.tenant || !req.tenant.id) {
      return res.status(400).json({ 
        message: 'Informações de tenant não encontradas. Verifique os headers x-tenant-id ou x-tenant-subdomain.' 
      });
    }

    // Verifica se a atitude existe
    const attitude = await Attitude.findById(attitudeId);
    if (!attitude) {
      return res.status(404).json({ message: 'Atitude não encontrada!' });
    }

    // Verifica se os alunos existem
    const students = await User.find({ _id: { $in: studentIds } });
    if (students.length !== studentIds.length) {
      return res.status(404).json({ message: 'Um ou mais alunos não encontrados!' });
    }

    // Associa a atitude aos alunos, garantindo que a entrada ainda não existe
    for (const studentId of studentIds) {
      const alreadyAssigned = await AttitudeAssignment.findOne({ attitudeId, studentId });

      if (!alreadyAssigned) {
        await AttitudeAssignment.create({ 
          attitudeId, 
          studentId, 
          isClaimed: false,
          tenantId: req.tenant.id  // Adicionar tenantId
        });
      }
    }

    res.status(200).json({ message: 'Atitude atribuída aos alunos com sucesso!' });
  } catch (error) {
    res.status(500).json({
      message: 'Erro ao associar atitude aos alunos',
      error: error.message,
    });
  }
};


// Atualizar Atitude
export const updateAttitude = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPositive, coins, xp, title, description, classId } = req.body;

    // Verificar se tenantId está disponível
    if (!req.tenant || !req.tenant.id) {
      return res.status(400).json({ 
        message: 'Informações de tenant não encontradas. Verifique os headers x-tenant-id ou x-tenant-subdomain.' 
      });
    }

    const attitude = await Attitude.findByIdAndUpdate(
      id,
      { isPositive, coins, xp, title, description, classId, tenantId: req.tenant.id },
      { new: true }
    );

    if (!attitude)
      return res.status(404).json({ message: 'Atitude não encontrada!' });

    res
      .status(200)
      .json({ message: 'Atitude atualizada com sucesso!', attitude });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao atualizar atitude', error: error.message });
  }
};

// Deletar Atitude
export const deleteAttitude = async (req, res) => {
  try {
    const { id } = req.params;

    const attitude = await Attitude.findByIdAndDelete(id);
    if (!attitude)
      return res.status(404).json({ message: 'Atitude não encontrada!' });

    res.status(200).json({ message: 'Atitude deletada com sucesso!' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao deletar atitude', error: error.message });
  }
};

// Obter Atitudes
export const getAttitudes = async (req, res) => {
  try {
    const attitudes = await Attitude.find().populate('classId'); // Inclui nome do aluno
    res.status(200).json(attitudes);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao buscar atitudes', error: error.message });
  }
};
