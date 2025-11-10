import Product from '../Models/productModel.js';
import Class from '../Models/classModel.js';
import mongoose from 'mongoose';

// Criar Produto
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, maxPerUser, stock, category, classId } = req.body;

    // Verificar se tenantId está disponível
    if (!req.tenant || !req.tenant.id) {
      return res.status(400).json({ 
        message: 'Informações de tenant não encontradas. Verifique os headers x-tenant-id ou x-tenant-subdomain.' 
      });
    }

    // Verifica se a categoria é válida
    if (!['Material', 'Experiências', 'Privilégios'].includes(category)) {
      return res.status(400).json({ message: 'Categoria inválida!' });
    }

    // Valida se classId é um ObjectId válido e se a classe existe
    if (!mongoose.Types.ObjectId.isValid(classId) || !(await Class.findById(classId))) {
      return res.status(400).json({ message: 'classId inválido ou classe não encontrada!' });
    }

    const product = new Product({ 
      name, 
      description, 
      price, 
      maxPerUser, 
      stock, 
      category, 
      classId,
      tenantId: req.tenant.id  // Adicionar tenantId do middleware
    });
    await product.save();

    res.status(201).json({ message: 'Produto criado com sucesso!', product });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar produto', error: error.message });
  }
};

// Atualizar Produto
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, maxPerUser, stock, category, classId } = req.body;

    // Verificar se tenantId está disponível
    if (!req.tenant || !req.tenant.id) {
      return res.status(400).json({ 
        message: 'Informações de tenant não encontradas. Verifique os headers x-tenant-id ou x-tenant-subdomain.' 
      });
    }

    // Verifica se a categoria é válida
    if (category && !['Material', 'Experiências', 'Privilégios'].includes(category)) {
      return res.status(400).json({ message: 'Categoria inválida!' });
    }

    // Se classId for enviado, valida se ele existe
    if (classId && (!mongoose.Types.ObjectId.isValid(classId) || !(await Class.findById(classId)))) {
      return res.status(400).json({ message: 'classId inválido ou classe não encontrada!' });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { name, description, price, maxPerUser, stock, category, classId, tenantId: req.tenant.id },
      { new: true }
    );

    if (!product) return res.status(404).json({ message: 'Produto não encontrado!' });

    res.status(200).json({ message: 'Produto atualizado com sucesso!', product });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar produto', error: error.message });
  }
};

// Deletar Produto
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ message: 'Produto não encontrado!' });

    res.status(200).json({ message: 'Produto deletado com sucesso!' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar produto', error: error.message });
  }
};

// Obter Produtos
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find().populate('classId'); // Expande a classe vinculada
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar produtos', error: error.message });
  }
};
