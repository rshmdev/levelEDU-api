import Product from '../Models/productModel.js';
import User from '../Models/userModel.js';
import Purchase from '../Models/purchaseModel.js';

// Comprar Produto
export const purchaseProduct = async (req, res) => {
  try {
    const { userId, productId, tenantId } = req.body;

    if (!tenantId) {
      return res.status(400).json({ message: 'tenantId é obrigatório!' });
    }

    const product = await Product.findOne({ _id: productId, tenantId: tenantId });
    if (!product)
      return res.status(404).json({ message: 'Produto não encontrado neste tenant!' });

    if (product.stock <= 0) {
      return res.status(400).json({ message: 'Produto esgotado!' });
    }

    const user = await User.findOne({ _id: userId, tenantId: tenantId });
    if (!user)
      return res.status(404).json({ message: 'Usuário não encontrado neste tenant!' });

    if (user.coins < product.price) {
      return res.status(400).json({ message: 'Moedas insuficientes!' });
    }

    const userPurchases = await Purchase.find({ userId, productId, tenantId: tenantId });
    if (userPurchases.length >= product.maxPerUser) {
      return res
        .status(400)
        .json({ message: 'Limite de compras deste produto atingido!' });
    }

    // Cria a compra
    const purchase = new Purchase({ 
      userId, 
      productId,
      tenantId: tenantId  // Adicionar tenantId
    });
    await purchase.save();

    const populatedPurchase = await Purchase.findById(purchase._id)
      .populate('userId', 'name email coins') // Popula o campo userId com os dados relevantes
      .populate('productId', 'name description price'); // Popula o campo productId com os dados relevantes

    user.coins -= product.price;
    product.stock -= 1;

    await user.save();
    await product.save();

    res.status(201).json({
      message: 'Produto comprado com sucesso!',
      purchase: populatedPurchase,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: 'Erro ao comprar produto', error: error.message });
  }
};

export const getProducts = async (req, res) => {
  try {
    const { userId } = req.params;
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      return res.status(400).json({ message: 'Header x-tenant-id é obrigatório!' });
    }

    // Buscar o usuário pelo ID com filtro de tenant
    const user = await User.findOne({ _id: userId, tenantId: tenantId }).populate('class');

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado neste tenant!' });
    }

    if (!user.class || !user.class._id) {
      return res.status(400).json({ message: 'Usuário não possui uma classe associada!' });
    }

    const userClassId = user.class._id;

    // Filtrar produtos pela classe do usuário e tenant
    const products = await Product.find({ 
      classId: userClassId,
      tenantId: tenantId 
    });

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar produtos', error: error.message });
  }
};
