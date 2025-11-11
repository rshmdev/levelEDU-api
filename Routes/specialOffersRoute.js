import express from 'express';
import { getCurrentOffer, validateOffer } from '../controller/specialOffersController.js';

const router = express.Router();

/**
 * @swagger
 * /api/special-offers/current:
 *   get:
 *     summary: Obter oferta especial ativa atual
 *     tags: [Special Offers]
 *     responses:
 *       200:
 *         description: Oferta especial atual (se houver)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasActiveOffer:
 *                       type: boolean
 *                     offer:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         discountPercentage:
 *                           type: number
 *                         timeRemaining:
 *                           type: object
 *                           properties:
 *                             days:
 *                               type: number
 *                             hours:
 *                               type: number
 *                             minutes:
 *                               type: number
 *                             seconds:
 *                               type: number
 *                             isExpired:
 *                               type: boolean
 *                         schoolsRemaining:
 *                           type: number
 *                         benefits:
 *                           type: array
 *                           items:
 *                             type: string
 *                         guarantees:
 *                           type: array
 *                           items:
 *                             type: string
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/current', getCurrentOffer);

/**
 * @swagger
 * /api/special-offers/validate:
 *   post:
 *     summary: Validar e aplicar oferta especial
 *     tags: [Special Offers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               offerId:
 *                 type: string
 *                 description: ID da oferta especial
 *               plan:
 *                 type: string
 *                 enum: [basic, premium]
 *                 description: Plano escolhido
 *             required:
 *               - offerId
 *               - plan
 *     responses:
 *       200:
 *         description: Oferta validada e preços calculados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     offer:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         couponCode:
 *                           type: string
 *                         discountPercentage:
 *                           type: number
 *                     pricing:
 *                       type: object
 *                       properties:
 *                         originalPrice:
 *                           type: number
 *                         discountedPrice:
 *                           type: number
 *                         currency:
 *                           type: string
 *                         setupFee:
 *                           type: number
 *       400:
 *         description: Oferta inválida ou expirada
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/validate', validateOffer);

export default router;