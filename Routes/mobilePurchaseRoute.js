import express from 'express';
import { purchaseProduct, getProducts } from '../controller/mobilePurchase.js';

const router = express.Router();

/**
 * @swagger
 * /purchases:
 *   post:
 *     summary: Compra um produto
 *     description: Realiza a compra de um produto por um usuário, verificando estoque, saldo de moedas e limite de compras.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID do usuário que está realizando a compra.
 *               productId:
 *                 type: string
 *                 description: ID do produto que está sendo comprado.
 *             example:
 *               userId: "1234567890abcdef12345678"
 *               productId: "0987654321abcdef12345678"
 *     responses:
 *       201:
 *         description: Produto comprado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Produto comprado com sucesso!"
 *                 purchase:
 *                   $ref: '#/components/schemas/Purchase'
 *       400:
 *         description: Erro na compra (estoque esgotado, moedas insuficientes, limite de compras atingido).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Moedas insuficientes!"
 *       404:
 *         description: Produto ou usuário não encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Produto não encontrado!"
 *       500:
 *         description: Erro ao processar a compra.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erro ao comprar produto"
 *                 error:
 *                   type: string
 *                   example: "Mensagem de erro detalhada"
 */
router.post('/purchases', purchaseProduct);

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Retorna a lista de produtos disponíveis
 *     description: Retorna uma lista de todos os produtos disponíveis para compra.
 *     responses:
 *       200:
 *         description: Lista de produtos retornada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       500:
 *         description: Erro ao buscar produtos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erro ao buscar produtos"
 *                 error:
 *                   type: string
 *                   example: "Mensagem de erro detalhada"
 */
router.get('/products/:userId', getProducts);

export default router;