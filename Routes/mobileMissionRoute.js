import express from 'express';
import { getAvailableMissions, completeMissionForUser } from '../controller/mobileMission.js';

const router = express.Router();

/**
 * @swagger
 * /missions/{userId}/available:
 *   get:
 *     summary: Retorna as missões disponíveis para o usuário
 *     description: Retorna uma lista de missões que o usuário ainda não completou.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário para buscar missões disponíveis.
 *     responses:
 *       200:
 *         description: Lista de missões disponíveis retornada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Mission'
 *       404:
 *         description: Usuário não encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuário não encontrado!"
 *       500:
 *         description: Erro ao buscar missões disponíveis.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erro ao buscar missões disponíveis"
 *                 error:
 *                   type: string
 *                   example: "Mensagem de erro detalhada"
 */
router.get('/missions/:userId/available', getAvailableMissions);

/**
 * @swagger
 * /missions/{userId}/{missionId}/complete:
 *   put:
 *     summary: Conclui uma missão para o usuário
 *     description: Marca uma missão como concluída para o usuário e atualiza suas recompensas (moedas e XP).
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário que está concluindo a missão.
 *       - in: path
 *         name: missionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da missão que está sendo concluída.
 *     responses:
 *       200:
 *         description: Missão concluída com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Missão concluída para o usuário!"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 newLevel:
 *                   type: number
 *                   description: Novo nível do usuário após concluir a missão.
 *                   example: 2
 *       400:
 *         description: Usuário já completou esta missão.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuário já completou esta missão!"
 *       403:
 *         description: Usuário não está liberado para completar esta missão.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuário não está liberado para completar esta missão!"
 *       404:
 *         description: Missão ou usuário não encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Missão não encontrada!"
 *       500:
 *         description: Erro ao completar missão.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erro ao completar missão"
 *                 error:
 *                   type: string
 *                   example: "Mensagem de erro detalhada"
 */
router.put('/missions/:userId/:missionId/complete', completeMissionForUser);

export default router;