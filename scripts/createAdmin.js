import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import AdminUser from '../Models/adminUserModel.js';

const createAdminUser = async () => {
  try {
    // Conectar ao banco de dados
    await mongoose.connect(process.env.DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Verifica se já existe um admin no banco
    const existingAdmin = await AdminUser.findOne({ email: 'admin@admin.com' });
    if (existingAdmin) {
      process.exit(0);
    }

    // Cria o primeiro admin
    const adminUser = new AdminUser({
      name: 'Admin',
      email: 'admin@admin.com',
      password: 'admin123',
      isAdmin: true,
    });

    await adminUser.save();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
};

createAdminUser();
