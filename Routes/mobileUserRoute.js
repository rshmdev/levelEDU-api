import express from 'express';
import { loginWithQRCode, revalidateUserData } from '../controller/mobileUser.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: "APP - Users"
 *     description: "Endpoints para manipulação de usuários no app mobile"
 * /login:
 *   post:
 *     summary: "Faz login usando um QR Code"
 *     description: "Realiza o login de um usuário com base no ID fornecido no corpo da requisição."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: "ID do usuário para login."
 *             example:
 *               userId: "1234567890abcdef12345678"
 *     responses:
 *       200:
 *         description: "Login bem-sucedido."
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login bem-sucedido!"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: "Usuário não encontrado."
 *       500:
 *         description: "Erro ao fazer login."
 */
router.post('/login', loginWithQRCode);

/**
 * @swagger
 * tags:
 *   - name: "APP - Users"
 *     description: "Endpoints para manipulação de usuários no app mobile"
 * /users/{id}/revalidate:
 *   get:
 *     summary: "Revalida os dados do usuário"
 *     description: "Revalida e retorna os dados atualizados do usuário com base no ID fornecido."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID do usuário para revalidar os dados."
 *     responses:
 *       200:
 *         description: "Dados do usuário revalidados com sucesso."
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Dados do usuário atualizados!"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: "Usuário não encontrado."
 *       500:
 *         description: "Erro ao revalidar os dados do usuário."
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erro ao revalidar os dados do usuário"
 *                 error:
 *                   type: string
 *                   example: "Mensagem de erro detalhada"
 */
router.get('/users/:id/revalidate', revalidateUserData);

export default router;
