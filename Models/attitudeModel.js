import mongoose from 'mongoose';

const attitudeSchema = new mongoose.Schema(
  {
    tenantId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Tenant', 
      required: true,
      index: true
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    // userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Aluno
    isPositive: { type: Boolean, required: true }, // Positiva ou negativa
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    coins: { type: Number, default: 0 }, // Recompensa de coins
    xp: { type: Number, default: 0 }, // Recompensa de XP
  },
  { timestamps: true }
);

const Attitude = mongoose.model('Attitude', attitudeSchema);

export default Attitude;
