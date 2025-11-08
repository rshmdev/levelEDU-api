import mongoose from 'mongoose';

const classSchema = new mongoose.Schema({
  tenantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tenant', 
    required: true,
    index: true
  },
  name: { type: String, required: true },
  code: { type: String, required: true }, // Removemos unique global, será unique por tenant
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
}, { timestamps: true });

// Garantir que code seja único apenas dentro do tenant
classSchema.index({ tenantId: 1, code: 1 }, { unique: true });

const Class = mongoose.model('Class', classSchema);

export default Class;
