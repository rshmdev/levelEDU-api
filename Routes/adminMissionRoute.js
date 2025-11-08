import express from 'express';
import {
  createMission,
  updateMission,
  deleteMission,
  getMissions,
  allowUserForMission
} from '../controller/adminMission.js';
import { authenticateUser, checkRole } from '../Middlewares/auth.js';
import { tenantIsolation } from '../Middlewares/tenantAuth.js';

const router = express.Router();

/**
 * @swagger
 * /missions:
 *   post:
 *     summary: "Criação de nova missão"
 *     description: "Cria uma nova missão no sistema."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Missão de Teste"
 *               description:
 *                 type: string
 *                 example: "Complete essa missão para ganhar prêmios."
 *               coins:
 *                 type: number
 *                 example: 100
 *     responses:
 *       201:
 *         description: "Missão criada com sucesso."
 *       400:
 *         description: "Dados de entrada inválidos."
 *       500:
 *         description: "Erro ao criar missão."
 */
router.post('/missions', authenticateUser, tenantIsolation, checkRole(['tenant_admin', 'teacher']), createMission);

/**
 * @swagger
 * /missions/{id}:
 *   put:
 *     summary: "Atualizar missão"
 *     description: "Atualiza os detalhes de uma missão existente."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: "ID da missão a ser atualizada."
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
 *               title:
 *                 type: string
 *                 example: "Missão Atualizada"
 *               description:
 *                 type: string
 *                 example: "Missão atualizada com novos requisitos."
 *               coins:
 *                 type: number
 *                 example: 150
 *     responses:
 *       200:
 *         description: "Missão atualizada com sucesso."
 *       400:
 *         description: "Dados inválidos ou formato incorreto."
 *       404:
 *         description: "Missão não encontrada."
 *       500:
 *         description: "Erro ao atualizar missão."
 */
router.put('/missions/:id', authenticateUser, tenantIsolation, checkRole(['tenant_admin', 'teacher']), updateMission);

/**
 * @swagger
 * /missions/{id}:
 *   delete:
 *     summary: "Deletar missão"
 *     description: "Deleta uma missão do sistema."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: "ID da missão a ser deletada."
 *         schema:
 *           type: string
 *           example: "1234567890abcdef12345678"
 *     responses:
 *       200:
 *         description: "Missão deletada com sucesso."
 *       404:
 *         description: "Missão não encontrada."
 *       500:
 *         description: "Erro ao deletar missão."
 */
router.delete('/missions/:id', authenticateUser, tenantIsolation, checkRole(['tenant_admin']), deleteMission);

/**
 * @swagger
 * /missions:
 *   get:
 *     summary: "Obter lista de missões"
 *     description: "Retorna todas as missões cadastradas no sistema."
 *     responses:
 *       200:
 *         description: "Lista de missões retornada com sucesso."
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Mission'
 *       500:
 *         description: "Erro ao buscar missões."
 */
router.get('/missions', authenticateUser, tenantIsolation, checkRole(['tenant_admin', 'teacher']), getMissions);

/**
 * @swagger
 * /missions/{missionId}/allow:
 *   put:
 *     summary: "Liberar usuário para uma missão"
 *     description: "Permite que usuários selecionados participem de uma missão."
 *     parameters:
 *       - in: path
 *         name: missionId
 *         required: true
 *         description: "ID da missão para a qual os usuários serão liberados."
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
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: "abcdef1234567890abcdef12"
 *     responses:
 *       200:
 *         description: "Usuários liberados para completar a missão."
 *       400:
 *         description: "Alguns usuários já completaram a missão ou dados inválidos."
 *       404:
 *         description: "Missão ou usuários não encontrados."
 *       500:
 *         description: "Erro ao liberar usuários para a missão."
 */
router.put('/missions/:missionId/allow', authenticateUser, tenantIsolation, checkRole(['tenant_admin', 'teacher']), allowUserForMission);

export default router;
