import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  tenantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tenant', 
    required: true,
    index: true
  },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true }, // Custo em coins
  maxPerUser: { type: Number, required: true }, // Máximo que um usuário pode comprar
  stock: { type: Number, required: true }, // Quantidade disponível
  category: { 
    type: String, 
    required: true, 
    enum: ['Material', 'Experiências', 'Privilégios'], // Valores permitidos
  },
  classId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Class', 
    required: true // Agora classId é obrigatório
  }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

export default Product;
