import mongoose from 'mongoose';
import QRCode from 'qrcode';

const userSchema = new mongoose.Schema({
  tenantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tenant', 
    required: true,
    index: true
  },
  name: { type: String, required: true },
  qrcode: { type: String },
  coins: { type: Number, default: 0 }, // Saldo de moedas
  xp: { type: Number, default: 0 },    // Pontos de experiência
  completedMissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Mission' }],
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' }
}, { timestamps: true });

// Função para calcular o nível com base no XP
userSchema.methods.calculateLevel = function () {
  const level = Math.floor(this.xp / 100); // Exemplo: 1 nível a cada 100 XP
  return level;
};

userSchema.pre('save', async function (next) {
  if (this.isNew) {
    const qrData = `${this._id}`;
    this.qrcode = await QRCode.toDataURL(qrData);
  }
  next();
});

const User = mongoose.model('User', userSchema);

export default User;
