import express from 'express';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
} from '../controller/adminProduct.js';
import {
  deliverPurchase,
  getPendingPurchases,
} from '../controller/adminPurchases.js';
import { authenticateUser, checkRole } from '../Middlewares/auth.js';
import { tenantIsolation } from '../Middlewares/tenantAuth.js';

const router = express.Router();

/**
 * @swagger
 * /products:
 *   post:
 *     summary: "Criação de novo produto"
 *     description: "Cria um novo produto no sistema."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Produto Exemplo"
 *               description:
 *                 type: string
 *                 example: "Descrição detalhada do produto"
 *               price:
 *                 type: number
 *                 example: 100
 *               maxPerUser:
 *                 type: number
 *                 example: 5
 *               stock:
 *                 type: number
 *                 example: 20
 *               category:
 *                 type: string
 *                 enum: ["Material", "Experiências", "Privilégios"]
 *                 example: "Material"
 *     responses:
 *       201:
 *         description: "Produto criado com sucesso."
 *       400:
 *         description: "Categoria inválida ou dados faltando."
 *       500:
 *         description: "Erro ao criar produto."
 */
router.post('/products', authenticateUser, tenantIsolation, checkRole(['tenant_admin']), createProduct);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: "Atualização de produto"
 *     description: "Atualiza as informações de um produto existente."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: "ID do produto a ser atualizado."
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
 *                 example: "Produto Atualizado"
 *               description:
 *                 type: string
 *                 example: "Descrição atualizada do produto"
 *               price:
 *                 type: number
 *                 example: 120
 *               maxPerUser:
 *                 type: number
 *                 example: 6
 *               stock:
 *                 type: number
 *                 example: 15
 *               category:
 *                 type: string
 *                 enum: ["Material", "Experiências", "Privilégios"]
 *                 example: "Experiências"
 *     responses:
 *       200:
 *         description: "Produto atualizado com sucesso."
 *       400:
 *         description: "Categoria inválida ou dados de entrada incorretos."
 *       404:
 *         description: "Produto não encontrado."
 *       500:
 *         description: "Erro ao atualizar produto."
 */
router.put('/products/:id', authenticateUser, tenantIsolation, checkRole(['tenant_admin']), updateProduct);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: "Deletar produto"
 *     description: "Deleta um produto do sistema."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: "ID do produto a ser deletado."
 *         schema:
 *           type: string
 *           example: "1234567890abcdef12345678"
 *     responses:
 *       200:
 *         description: "Produto deletado com sucesso."
 *       404:
 *         description: "Produto não encontrado."
 *       500:
 *         description: "Erro ao deletar produto."
 */
router.delete('/products/:id', authenticateUser, tenantIsolation, checkRole(['tenant_admin']), deleteProduct);

/**
 * @swagger
 * /products:
 *   get:
 *     summary: "Obter lista de produtos"
 *     description: "Retorna todos os produtos cadastrados no sistema."
 *     responses:
 *       200:
 *         description: "Lista de produtos retornada com sucesso."
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       500:
 *         description: "Erro ao buscar produtos."
 */
router.get('/products', authenticateUser, tenantIsolation, checkRole(['tenant_admin', 'teacher']), getProducts);

/**
 * @swagger
 * /purchases/pending:
 *   get:
 *     summary: "Obter compras pendentes"
 *     description: "Retorna todas as compras pendentes que precisam ser entregues."
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: "Compras pendentes retornadas com sucesso."
 *       401:
 *         description: "Usuário não autenticado."
 *       403:
 *         description: "Usuário sem permissão suficiente."
 *       500:
 *         description: "Erro ao buscar compras pendentes."
 */
router.get(
  '/purchases/pending',
  authenticateUser,
  tenantIsolation,
  checkRole(['tenant_admin', 'teacher']),
  getPendingPurchases
);

/**
 * @swagger
 * /purchases/{purchaseId}/deliver:
 *   put:
 *     summary: "Entregar compra"
 *     description: "Marca uma compra como entregue."
 *     parameters:
 *       - in: path
 *         name: purchaseId
 *         required: true
 *         description: "ID da compra a ser entregue."
 *         schema:
 *           type: string
 *           example: "abcdef1234567890abcdef12"
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: "Compra entregue com sucesso."
 *       404:
 *         description: "Compra não encontrada."
 *       403:
 *         description: "Usuário sem permissão para realizar essa ação."
 *       500:
 *         description: "Erro ao entregar a compra."
 */
router.put(
  '/purchases/:purchaseId/deliver',
  authenticateUser,
  tenantIsolation,
  checkRole(['tenant_admin', 'teacher']),
  deliverPurchase
);

export default router;
