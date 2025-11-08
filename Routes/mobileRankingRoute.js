import express from 'express';
import { getRankingByCoins, getRankingByXP } from '../controller/mobileRanking.js';

const router = express.Router();

/**
 * @swagger
 * /ranking/coins:
 *   get:
 *     summary: Retorna o ranking de usuários ordenado por coins
 *     description: Retorna uma lista de usuários ordenados pela quantidade de coins (do maior para o menor).
 *     responses:
 *       200:
 *         description: Ranking de usuários por coins retornado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserRanking'
 *       500:
 *         description: Erro ao obter o ranking por coins.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erro ao obter ranking por coins"
 *                 error:
 *                   type: string
 *                   example: "Mensagem de erro detalhada"
 */
router.get('/ranking/coins', getRankingByCoins);

/**
 * @swagger
 * /ranking/xp:
 *   get:
 *     summary: Retorna o ranking de usuários ordenado por XP
 *     description: Retorna uma lista de usuários ordenados pela quantidade de XP (do maior para o menor).
 *     responses:
 *       200:
 *         description: Ranking de usuários por XP retornado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserRanking'
 *       500:
 *         description: Erro ao obter o ranking por XP.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erro ao obter ranking geral"
 *                 error:
 *                   type: string
 *                   example: "Mensagem de erro detalhada"
 */
router.get('/ranking/xp', getRankingByXP);

export default router;