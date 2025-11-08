import express from 'express';
import {
  createAttitude,
  updateAttitude,
  deleteAttitude,
  getAttitudes,
  assignAttitudeToStudents,
} from '../controller/adminAttitude.js';
import { authenticateUser, checkRole } from '../Middlewares/auth.js';
import { tenantIsolation } from '../Middlewares/tenantAuth.js';

const router = express.Router();

/**
 * @swagger
 * /attitudes:
 *   post:
 *     summary: "Criar uma nova atitude"
 *     description: "Registra uma nova atitude associada a um usuário."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "1234567890abcdef12345678"
 *               isPositive:
 *                 type: boolean
 *                 example: true
 *               coins:
 *                 type: number
 *                 example: 50
 *               xp:
 *                 type: number
 *                 example: 100
 *               title:
 *                 type: string
 *                 example: "Missão Cumprida"
 *               description:
 *                 type: string
 *                 example: "Atitude positiva após completar a missão."
 *     responses:
 *       201:
 *         description: "Atitude registrada com sucesso."
 *       404:
 *         description: "Usuário não encontrado."
 *       500:
 *         description: "Erro ao registrar atitude."
 */
router.post('/attitudes', authenticateUser, tenantIsolation, checkRole(['tenant_admin', 'teacher']), createAttitude);

router.post('/attitudes/reward', authenticateUser, tenantIsolation, checkRole(['tenant_admin', 'teacher']), assignAttitudeToStudents);

/**
 * @swagger
 * /attitudes/{id}:
 *   put:
 *     summary: "Atualizar uma atitude"
 *     description: "Atualiza os dados de uma atitude existente."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: "ID da atitude a ser atualizada."
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
 *               isPositive:
 *                 type: boolean
 *                 example: false
 *               coins:
 *                 type: number
 *                 example: 75
 *               xp:
 *                 type: number
 *                 example: 200
 *               title:
 *                 type: string
 *                 example: "Missão Falhada"
 *               description:
 *                 type: string
 *                 example: "Atitude negativa após falha na missão."
 *     responses:
 *       200:
 *         description: "Atitude atualizada com sucesso."
 *       404:
 *         description: "Atitude não encontrada."
 *       500:
 *         description: "Erro ao atualizar atitude."
 */
router.put('/attitudes/:id', authenticateUser, tenantIsolation, checkRole(['tenant_admin', 'teacher']), updateAttitude);

/**
 * @swagger
 * /attitudes/{id}:
 *   delete:
 *     summary: "Deletar uma atitude"
 *     description: "Deleta uma atitude existente."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: "ID da atitude a ser deletada."
 *         schema:
 *           type: string
 *           example: "1234567890abcdef12345678"
 *     responses:
 *       200:
 *         description: "Atitude deletada com sucesso."
 *       404:
 *         description: "Atitude não encontrada."
 *       500:
 *         description: "Erro ao deletar atitude."
 */
router.delete('/attitudes/:id', authenticateUser, tenantIsolation, checkRole(['tenant_admin']), deleteAttitude);

/**
 * @swagger
 * /attitudes:
 *   get:
 *     summary: "Obter todas as atitudes"
 *     description: "Retorna todas as atitudes registradas no sistema."
 *     responses:
 *       200:
 *         description: "Lista de atitudes retornada com sucesso."
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Attitude'
 *       500:
 *         description: "Erro ao buscar atitudes."
 */
router.get('/attitudes', authenticateUser, tenantIsolation, checkRole(['tenant_admin', 'teacher']), getAttitudes);

export default router;
