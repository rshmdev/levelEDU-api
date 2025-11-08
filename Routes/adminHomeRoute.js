import express from 'express';
import { getAdminHomeSummary } from '../controller/adminHome.js';
import { authenticateUser, checkRole } from '../Middlewares/auth.js';
import { tenantIsolation } from '../Middlewares/tenantAuth.js';

const router = express.Router();

/**
 * @swagger
 * /home:
 *   get:
 *     summary: "Obter resumo da home do administrador"
 *     description: "Retorna um resumo com as principais informações para o painel administrativo, incluindo a quantidade de usuários, missões, produtos, compras pendentes e os 3 alunos com mais coins."
 *     responses:
 *       200:
 *         description: "Resumo obtido com sucesso."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminHomeSummary'
 *       500:
 *         description: "Erro ao buscar resumo da home."
 */
router.get('/home', authenticateUser, tenantIsolation, checkRole(['tenant_admin', 'teacher']), getAdminHomeSummary);

export default router;
