import express from 'express';
import { authenticateUser, checkRole } from '../Middlewares/auth.js';
import { tenantIsolation } from '../Middlewares/tenantAuth.js';
import { allowTrialOrActiveSubscription } from '../Middlewares/subscriptionAuth.js';
import { checkResourceLimit } from '../Middlewares/planLimits.js';
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  loginAdminUser,
  updateAdminUser,
  resetPasswordByEmail,
  testEmailConfig,
} from '../controller/adminUser.js';

const router = express.Router();

/**
 * @swagger
 * /login:
 *   post:
 *     summary: "Login de usuário administrador"
 *     description: "Realiza o login de um usuário administrador com email e senha."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "joao.silva@example.com"
 *               password:
 *                 type: string
 *                 example: "senha123"
 *     responses:
 *       200:
 *         description: "Login bem-sucedido, retorna o token de autenticação."
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "jwt_token_example"
 *                 _id:
 *                   type: string
 *                   example: "1234567890abcdef12345678"
 *                 name:
 *                   type: string
 *                   example: "João Silva"
 *                 email:
 *                   type: string
 *                   example: "joao.silva@example.com"
 *                 role:
 *                   type: string
 *                   example: "admin"
 *       400:
 *         description: "Senha inválida ou usuário não encontrado."
 *       500:
 *         description: "Erro interno ao realizar login."
 */
router.post('/login', loginAdminUser);

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: "Logout de usuário administrador"
 *     description: "Invalida a sessão/token do usuário administrador."
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "Logout realizado com sucesso."
 *       401:
 *         description: "Token inválido ou não fornecido."
 *       500:
 *         description: "Erro interno ao realizar logout."
 */
router.post('/logout', authenticateUser, (req, res) => {
  try {
    // Log the logout for auditing purposes
    console.log(`User ${req.user.email} logged out at ${new Date().toISOString()}`);
    
    // Here you could invalidate the token in a blacklist if needed
    // For now, we just acknowledge the logout
    res.status(200).json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao realizar logout'
    });
  }
});

/**
 * @swagger
 * /register:
 *   post:
 *     summary: "Criar um novo usuário administrador"
 *     description: "Permite a criação de um novo usuário administrador, acessível apenas por admins."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "João Silva"
 *               email:
 *                 type: string
 *                 example: "joao.silva@example.com"
 *               password:
 *                 type: string
 *                 example: "senha123"
 *               role:
 *                 type: string
 *                 example: "admin"
 *     responses:
 *       201:
 *         description: "Usuário criado com sucesso."
 *       400:
 *         description: "Email já está em uso."
 *       500:
 *         description: "Erro ao criar usuário."
 */
router.post('/register', authenticateUser, tenantIsolation, allowTrialOrActiveSubscription, checkResourceLimit('admin'), checkRole(['tenant_admin']), createAdminUser);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: "Obter lista de usuários administradores"
 *     description: "Retorna todos os usuários administradores cadastrados."
 *     responses:
 *       200:
 *         description: "Lista de usuários retornada com sucesso."
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AdminUser'
 *       500:
 *         description: "Erro ao buscar usuários."
 */
router.get('/users', authenticateUser, tenantIsolation, allowTrialOrActiveSubscription, checkRole(['tenant_admin', 'teacher']), getAdminUsers);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: "Atualizar dados do usuário administrador"
 *     description: "Atualiza os dados do usuário administrador, incluindo nome, email e senha."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: "ID do usuário administrador"
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
 *                 example: "João Silva"
 *               email:
 *                 type: string
 *                 example: "joao.silva@example.com"
 *               password:
 *                 type: string
 *                 example: "nova_senha123"
 *     responses:
 *       200:
 *         description: "Usuário atualizado com sucesso."
 *       404:
 *         description: "Usuário não encontrado."
 *       500:
 *         description: "Erro ao atualizar usuário."
 */
router.put('/users/:id', authenticateUser, tenantIsolation, allowTrialOrActiveSubscription, checkRole(['tenant_admin', 'teacher']), updateAdminUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: "Deletar um usuário administrador"
 *     description: "Deleta um usuário administrador do sistema, acessível apenas para admins."
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
router.delete('/users/:id', authenticateUser, tenantIsolation, allowTrialOrActiveSubscription, checkRole(['tenant_admin']), deleteAdminUser);

/**
 * @swagger
 * /reset-password:
 *   post:
 *     summary: "Redefinir senha e enviar por email"
 *     description: "Gera uma nova senha temporária e envia por email para o usuário."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "usuario@example.com"
 *     responses:
 *       200:
 *         description: "Nova senha enviada por email com sucesso."
 *       404:
 *         description: "Usuário não encontrado."
 *       500:
 *         description: "Erro ao enviar email."
 */
router.post('/reset-password', resetPasswordByEmail);

/**
 * @swagger
 * /test-email:
 *   get:
 *     summary: "Testar configuração de email"
 *     description: "Verifica se a configuração SMTP está funcionando corretamente."
 *     responses:
 *       200:
 *         description: "Teste de email realizado com sucesso."
 *       500:
 *         description: "Erro na configuração de email."
 */
router.get('/test-email', authenticateUser, tenantIsolation, allowTrialOrActiveSubscription, checkRole(['tenant_admin']), testEmailConfig);

export default router;
