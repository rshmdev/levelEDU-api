import express from 'express';
import {
  createUser,
  updateUser,
  deleteUser,
  getUsers,
} from '../controller/adminUser.js';
import { completeMissionForUser } from '../controller/mobileMission.js';
import { authenticateUser } from '../Middlewares/auth.js';
import { tenantIsolation } from '../Middlewares/tenantAuth.js';
import { checkResourceLimit } from '../Middlewares/planLimits.js';

const router = express.Router();

/**
 * @swagger
 * /users:
 *   post:
 *     summary: "Criação de novo usuário"
 *     description: "Cria um novo usuário no sistema."
 *     responses:
 *       201:
 *         description: "Usuário criado com sucesso."
 *       400:
 *         description: "Erro de validação dos dados fornecidos."
 *       500:
 *         description: "Erro ao criar usuário."
 */
router.post('/users', authenticateUser, tenantIsolation, checkResourceLimit('student'), createUser);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: "Atualização de usuário"
 *     description: "Atualiza os dados de um usuário existente."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: "ID do usuário a ser atualizado."
 *         schema:
 *           type: string
 *           example: "1234567890abcdef12345678"
 *     responses:
 *       200:
 *         description: "Usuário atualizado com sucesso."
 *       400:
 *         description: "Erro de validação dos dados fornecidos."
 *       404:
 *         description: "Usuário não encontrado."
 *       500:
 *         description: "Erro ao atualizar usuário."
 */
router.put('/users/:id', authenticateUser, tenantIsolation, updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: "Deletar usuário"
 *     description: "Deleta um usuário do sistema."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: "ID do usuário a ser deletado."
 *         schema:
 *           type: string
 *           example: "1234567890abcdef12345678"
 *     responses:
 *       200:
 *         description: "Usuário deletado com sucesso."
 *       404:
 *         description: "Usuário não encontrado."
 *       500:
 *         description: "Erro ao deletar usuário."
 */
router.delete('/users/:id', authenticateUser, tenantIsolation, deleteUser);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: "Listar todos os usuários"
 *     description: "Retorna todos os usuários registrados no sistema."
 *     responses:
 *       200:
 *         description: "Lista de usuários retornada com sucesso."
 *       500:
 *         description: "Erro ao buscar usuários."
 */
router.get('/users', authenticateUser, tenantIsolation, getUsers);

/**
 * @swagger
 * /users/{userId}/missions/{missionId}:
 *   put:
 *     summary: "Concluir missão para um usuário"
 *     description: "Marca uma missão como concluída para um usuário específico."
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: "ID do usuário que está completando a missão."
 *         schema:
 *           type: string
 *           example: "1234567890abcdef12345678"
 *       - in: path
 *         name: missionId
 *         required: true
 *         description: "ID da missão a ser completada."
 *         schema:
 *           type: string
 *           example: "abcdef1234567890abcdef12"
 *     responses:
 *       200:
 *         description: "Missão concluída com sucesso para o usuário."
 *       400:
 *         description: "O usuário já completou essa missão."
 *       403:
 *         description: "O usuário não está autorizado a completar essa missão."
 *       404:
 *         description: "Missão ou usuário não encontrados."
 *       500:
 *         description: "Erro ao completar missão para o usuário."
 */
router.put('/users/:userId/missions/:missionId', completeMissionForUser);

export default router;
