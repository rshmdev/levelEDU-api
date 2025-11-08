import express from 'express';
import {
  createClass,
  updateClass,
  deleteClass,
  getClasses,
  getStudentsByClass,
  getClassByTeacher,
} from '../controller/adminClass.js';
import { authenticateUser, checkRole } from '../Middlewares/auth.js'; // Middleware de autenticação
import { tenantIsolation } from '../Middlewares/tenantAuth.js';

const router = express.Router();

/**
 * @swagger
 * /classes:
 *   post:
 *     summary: "Criar uma nova turma"
 *     description: "Cria uma nova turma no sistema, com nome e código."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Turma A"
 *               code:
 *                 type: string
 *                 example: "TURMA001"
 *     responses:
 *       201:
 *         description: "Turma criada com sucesso."
 *       400:
 *         description: "Já existe uma turma com este código."
 *       500:
 *         description: "Erro ao criar turma."
 */
router.post(
  '/classes',
  authenticateUser,
  tenantIsolation,
  checkRole(['tenant_admin', 'teacher']),
  createClass
);

/**
 * @swagger
 * /classes/{id}:
 *   put:
 *     summary: "Atualizar informações de uma turma"
 *     description: "Atualiza o nome e código de uma turma existente."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: "ID da turma a ser atualizada."
 *         schema:
 *           type: string
 *           example: "1234567890abcdef12345678"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Turma B"
 *               code:
 *                 type: string
 *                 example: "TURMA002"
 *     responses:
 *       200:
 *         description: "Turma atualizada com sucesso."
 *       404:
 *         description: "Turma não encontrada."
 *       500:
 *         description: "Erro ao atualizar turma."
 */
router.put(
  '/classes/:id',
  authenticateUser,
  tenantIsolation,
  checkRole(['tenant_admin', 'teacher']),
  updateClass
);

/**
 * @swagger
 * /classes/{id}:
 *   delete:
 *     summary: "Deletar uma turma"
 *     description: "Deleta uma turma e remove os alunos associados."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: "ID da turma a ser deletada."
 *         schema:
 *           type: string
 *           example: "1234567890abcdef12345678"
 *     responses:
 *       200:
 *         description: "Turma deletada com sucesso."
 *       404:
 *         description: "Turma não encontrada."
 *       500:
 *         description: "Erro ao deletar turma."
 */
router.delete(
  '/classes/:id',
  authenticateUser,
  tenantIsolation,
  checkRole(['tenant_admin']),
  deleteClass
);

/**
 * @swagger
 * /classes:
 *   get:
 *     summary: "Obter todas as turmas"
 *     description: "Retorna todas as turmas cadastradas no sistema, incluindo os alunos associados."
 *     responses:
 *       200:
 *         description: "Lista de turmas retornada com sucesso."
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Class'
 *       500:
 *         description: "Erro ao buscar turmas."
 */
router.get(
  '/classes',
  authenticateUser,
  tenantIsolation,
  checkRole(['tenant_admin', 'teacher']),
  getClasses
);

/**
 * @swagger
 * /classes/{id}/students:
 *   get:
 *     summary: "Obter alunos de uma turma"
 *     description: "Retorna a lista de alunos de uma turma específica."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: "ID da turma para a qual os alunos serão listados."
 *         schema:
 *           type: string
 *           example: "1234567890abcdef12345678"
 *     responses:
 *       200:
 *         description: "Lista de alunos da turma retornada com sucesso."
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       404:
 *         description: "Turma não encontrada."
 *       500:
 *         description: "Erro ao buscar alunos da turma."
 */
router.get(
  '/classes/:id/students',
  authenticateUser,
  tenantIsolation,
  checkRole(['tenant_admin', 'teacher']),
  getStudentsByClass
);

router.get(
  '/classes/:teacherId/teacher',
  authenticateUser,
  tenantIsolation,
  checkRole(['tenant_admin', 'teacher']),
  getClassByTeacher
);

export default router;
