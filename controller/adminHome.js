import User from '../Models/userModel.js';
import Mission from '../Models/missionModel.js';
import Product from '../Models/productModel.js';
import Purchase from '../Models/purchaseModel.js';
import { addTenantFilter } from '../Middlewares/tenantAuth.js';

// Dashboard Home (com filtro de tenant)
export const getAdminHomeSummary = async (req, res) => {
  try {
    // Aplicar filtro de tenant para todas as queries
    const baseFilter = addTenantFilter({}, req);

    // Quantidade de usuários do tenant
    const totalUsers = await User.countDocuments(baseFilter);

    // Quantidade de missões do tenant
    const totalMissions = await Mission.countDocuments(baseFilter);

    // Quantidade de produtos disponíveis na loja do tenant
    const totalProducts = await Product.countDocuments(addTenantFilter({ stock: { $gt: 0 } }, req));

    // Quantidade de compras pendentes do tenant
    const totalPendingPurchases = await Purchase.countDocuments(addTenantFilter({ isDelivered: false }, req));

    // Top 3 alunos com mais coins do tenant
    const topStudents = await User.find(baseFilter)
      .sort({ coins: -1 }) // Ordena pelo saldo de coins (descendente)
      .limit(3) // Pega os 3 primeiros
      .select('name coins'); // Retorna apenas o nome e o saldo de coins

    // Monta a resposta
    const summary = {
      totalUsers,
      totalMissions,
      totalProducts,
      totalPendingPurchases,
      topStudents,
    };

    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar resumo da home', error: error.message });
  }
};
