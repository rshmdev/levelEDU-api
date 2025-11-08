import express from 'express';
import { getUserAttitudes, claimAttitudeReward } from '../controller/mobileAttitude.js';

const router = express.Router();

/**
 * @swagger
 * /attitudes/{userId}:
 *   get:
 *     summary: "Consulta atitudes do aluno"
 *     description: "Retorna uma lista de atitudes associadas a um aluno, incluindo a descrição, título, status e recompensas."
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: "ID do usuário do aluno."
 *         schema:
 *           type: string
 *           example: "1234567890abcdef12345678"
 *     responses:
 *       200:
 *         description: "Atitudes do aluno encontradas com sucesso."
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Attitude'
 *       500:
 *         description: "Erro ao buscar atitudes do aluno."
 *       404:
 *         description: "Aluno não encontrado."
 */
router.get('/attitudes/:userId', getUserAttitudes);

/**
 * @swagger
 * /attitudes/{userId}/{attitudeId}/claim:
 *   put:
 *     summary: "Resgate de recompensa"
 *     description: "Permite ao usuário resgatar uma recompensa de atitude, atualizando o status da recompensa."
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: "ID do usuário do aluno."
 *         schema:
 *           type: string
 *           example: "1234567890abcdef12345678"
 *       - in: path
 *         name: attitudeId
 *         required: true
 *         description: "ID da atitude que o usuário deseja resgatar."
 *         schema:
 *           type: string
 *           example: "abcdef1234567890abcdef12"
 *     responses:
 *       200:
 *         description: "Recompensa resgatada com sucesso."
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Recompensa resgatada com sucesso!"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: "A recompensa já foi resgatada."
 *       403:
 *         description: "Usuário não tem permissão para resgatar essa atitude."
 *       404:
 *         description: "Atitude ou usuário não encontrados."
 *       500:
 *         description: "Erro ao resgatar recompensa."
 */
router.put('/attitudes/:userId/:attitudeId/claim', claimAttitudeReward);

export default router;
