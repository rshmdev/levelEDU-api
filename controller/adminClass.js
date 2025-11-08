import mongoose from 'mongoose';
import AdminUser from '../Models/adminUserModel.js';
import Class from '../Models/classModel.js';
import User from '../Models/userModel.js';
import { addTenantFilter, validateTenantOwnership } from '../Middlewares/tenantAuth.js';

// Criar Turma (com tenant)
export const createClass = async (req, res) => {
  try {
    const { name, code } = req.body;

    // Verificar se já existe turma com este código no tenant
    const filter = addTenantFilter({ code }, req);
    const existingClass = await Class.findOne(filter);
    if (existingClass) {
      return res
        .status(400)
        .json({ message: 'Já existe uma turma com este código!' });
    }

    // Criar turma com tenantId
    const classData = { 
      name, 
      code,
      tenantId: req.tenant?.id 
    };
    const newClass = new Class(classData);
    await newClass.save();

    res.status(201).json({ message: 'Turma criada com sucesso!', newClass });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao criar turma', error: error.message });
  }
};

// Atualizar Turma (com validação de tenant)
export const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;

    // Buscar turma com filtro de tenant
    const filter = addTenantFilter({ _id: id }, req);
    const existingClass = await Class.findOne(filter);
    
    if (!existingClass) {
      return res.status(404).json({ message: 'Turma não encontrada!' });
    }

    // Atualizar apenas se pertence ao tenant
    const updatedClass = await Class.findByIdAndUpdate(
      id,
      { name, code },
      { new: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ message: 'Turma não encontrada!' });
    }

    res
      .status(200)
      .json({ message: 'Turma atualizada com sucesso!', updatedClass });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao atualizar turma', error: error.message });
  }
};

// Deletar Turma (com validação de tenant)
export const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar e deletar apenas se pertence ao tenant
    const filter = addTenantFilter({ _id: id }, req);
    const existingClass = await Class.findOne(filter);
    
    if (!existingClass) {
      return res.status(404).json({ message: 'Turma não encontrada!' });
    }

    const deletedClass = await Class.findByIdAndDelete(id);

    // Remove a turma dos alunos associados (apenas do tenant)
    const userFilter = addTenantFilter({ class: id }, req);
    await User.updateMany(userFilter, { $unset: { class: '' } });

    res.status(200).json({ message: 'Turma deletada com sucesso!' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao deletar turma', error: error.message });
  }
};

// Obter Todas as Turmas (filtradas por tenant)
export const getClasses = async (req, res) => {
  try {
    const filter = addTenantFilter({}, req);
    const classes = await Class.find(filter).populate('students', 'name email'); // Inclui os alunos do tenant
    res.status(200).json(classes);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erro ao buscar turmas', error: error.message });
  }
};

// Obter Alunos de uma Turma (com validação de tenant)
export const getStudentsByClass = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a turma pertence ao tenant
    const filter = addTenantFilter({ _id: id }, req);
    const classData = await Class.findOne(filter).populate(
      'students',
      'name email coins xp completedMissions'
    );
    if (!classData) {
      return res.status(404).json({ message: 'Turma não encontrada!' });
    }

    res.status(200).json(classData.students);
  } catch (error) {
    res.status(500).json({
      message: 'Erro ao buscar alunos da turma',
      error: error.message,
    });
  }
};

export const getClassByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await AdminUser.findById(teacherId)
      .populate('classrooms');

    if (!teacher) {
      return res.status(404).json({ message: 'Professor não encontrado!' });
    }

    console.log(teacher);

    if (teacher.role !== 'user') {
      const classes = await Class.find();
      if (!classes) {
        return res.status(404).json({ message: 'Turmas não encontradas!' });
      }

      return res.status(200).json(classes);
    }

    const classes = teacher.classrooms;
    if (!classes) {
      return res.status(404).json({ message: 'Turmas não encontradas!' });
    }

    res.status(200).json(classes);
  } catch (error) {
    res.status(500).json({
      message: 'Erro ao buscar turmas do professor',
      error: error.message,
    });
  }
};
