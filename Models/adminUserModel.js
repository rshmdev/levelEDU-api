import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const adminUserSchema = new mongoose.Schema(
  {
    tenantId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Tenant', 
      required: function() {
        return this.role !== 'super_admin'; // Super admin não precisa de tenant
      },
      index: true
    },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['tenant_admin', 'teacher', 'super_admin'], // Padronizado com admin-web
      default: 'tenant_admin',
    },
    classrooms: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class', // Certifique-se que está referenciando 'Class'
    }],
  },
  { timestamps: true }
);

// Hash da senha antes de salvar
adminUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Método para verificar a senha
adminUserSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const AdminUser = mongoose.model('AdminUser', adminUserSchema);

export default AdminUser;
