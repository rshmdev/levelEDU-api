import Purchase from '../Models/purchaseModel.js';

export const getPendingPurchases = async (req, res) => {
  try {
    const pendingPurchases = await Purchase.find({ isDelivered: false })
      .populate({
        path: 'userId',
        select: 'name class', 
        populate: {
          path: 'class', 
          model: 'Class', 
        },
      })
      .populate('productId', 'name description price category'); 

    res.status(200).json(pendingPurchases);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar compras pendentes', error: error.message });
  }
};
  
  export const deliverPurchase = async (req, res) => {
    try {
      const { purchaseId } = req.params;

      // Verificar se tenantId está disponível
      if (!req.tenant || !req.tenant.id) {
        return res.status(400).json({ 
          message: 'Informações de tenant não encontradas. Verifique os headers x-tenant-id ou x-tenant-subdomain.' 
        });
      }
  
      const purchase = await Purchase.findById(purchaseId);
      if (!purchase) return res.status(404).json({ message: 'Compra não encontrada!' });
  
      purchase.isDelivered = true;
      // Garantir que tenantId esteja presente
      purchase.tenantId = req.tenant.id;
      await purchase.save();
  
      res.status(200).json({ message: 'Compra marcada como entregue!', purchase });
    } catch (error) {
      res.status(500).json({ message: 'Erro ao entregar compra', error: error.message });
    }
  };