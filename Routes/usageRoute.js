import express from 'express';
import { authenticateUser, checkRole } from '../Middlewares/auth.js';
import { tenantIsolation } from '../Middlewares/tenantAuth.js';
import { getTenantUsageAndLimits } from '../Middlewares/planLimits.js';

const router = express.Router();

/**
 * @swagger
 * /usage:
 *   get:
 *     summary: "Obter informações de uso e limites do tenant"
 *     description: "Retorna informações detalhadas sobre o uso atual e limites do plano."
 *     responses:
 *       200:
 *         description: "Informações de uso retornadas com sucesso."
 *       403:
 *         description: "Assinatura não encontrada."
 *       500:
 *         description: "Erro ao buscar informações."
 */
router.get('/usage', authenticateUser, tenantIsolation, checkRole(['tenant_admin', 'teacher']), async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    
    const usageData = await getTenantUsageAndLimits(tenantId);
    
    res.status(200).json({
      success: true,
      message: 'Informações de uso obtidas com sucesso',
      data: usageData
    });
  } catch (error) {
    console.error('Error getting usage data:', error);
    
    if (error.message === 'Assinatura não encontrada') {
      return res.status(403).json({
        success: false,
        message: 'Assinatura não encontrada',
        errorCode: 'SUBSCRIPTION_REQUIRED'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar informações de uso'
    });
  }
});

export default router;