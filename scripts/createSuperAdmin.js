import dotenv from 'dotenv';
import mongoose from 'mongoose';
import AdminUser from '../Models/adminUserModel.js';
import chalk from 'chalk';

dotenv.config();

const { green, red, yellow, cyan } = chalk;

async function createSuperAdmin() {
  try {
    // Conectar ao banco
    const mongoUri = process.env.MONGO_URI || process.env.DB_URI;
    
    if (!mongoUri) {
      console.log(red('❌ MONGO_URI não está definida no arquivo .env'));
      console.log(yellow('Defina MONGO_URI=mongodb://localhost:27017/leveledu no seu .env'));
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log(cyan('Conectado ao MongoDB'));

    // Verificar se já existe um super admin
    const existingSuperAdmin = await AdminUser.findOne({ role: 'super_admin' });
    
    if (existingSuperAdmin) {
      console.log(yellow('Super admin já existe:'));
      console.log(yellow(`Email: ${existingSuperAdmin.email}`));
      console.log(yellow(`Nome: ${existingSuperAdmin.name}`));
      process.exit(0);
    }

    // Dados do super admin
    const superAdminData = {
      name: 'Super Admin',
      email: 'superadmin@leveledw.com',
      password: 'SuperAdmin123!', // Será hasheado automaticamente pelo middleware
      role: 'super_admin'
      // Não definimos tenantId para super admin
    };

    // Criar super admin
    const superAdmin = new AdminUser(superAdminData);
    await superAdmin.save();

    console.log(green('\n✅ Super Admin criado com sucesso!'));
    console.log(green(`Email: ${superAdmin.email}`));
    console.log(green(`Nome: ${superAdmin.name}`));
    console.log(green(`ID: ${superAdmin._id}`));
    
    console.log(yellow('\n⚠️  IMPORTANTE: Altere a senha padrão após o primeiro login!'));
    console.log(yellow('Senha padrão: SuperAdmin123!'));

  } catch (error) {
    console.error(red('Erro ao criar super admin:'), error.message);
    
    if (error.code === 11000) {
      console.error(red('Email já está em uso'));
    }
  } finally {
    await mongoose.disconnect();
    console.log(cyan('Conexão com MongoDB encerrada'));
  }
}

// Função para criar tenant de demonstração
async function createDemoTenant() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.DB_URI;
    
    if (!mongoUri) {
      console.log(red('❌ MONGO_URI não está definida no arquivo .env'));
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log(cyan('Conectado ao MongoDB para criar tenant demo'));

    const Tenant = (await import('../Models/tenantModel.js')).default;

    // Verificar se o tenant demo já existe
    const existingDemo = await Tenant.findOne({ subdomain: 'demo' });
    
    if (existingDemo) {
      console.log(yellow('Tenant demo já existe'));
      return;
    }

    // Criar tenant demo
    const demoTenant = new Tenant({
      name: 'LevelEdu Demo',
      subdomain: 'demo',
      contact: {
        adminEmail: 'admin@demo.com',
        adminName: 'Admin Demo',
        phone: '(11) 99999-9999'
      },
      plan: {
        type: 'professional',
        limits: {
          maxUsers: 100,
          maxClasses: 10,
          maxMissions: 100,
          maxStorage: 1000,
          customBranding: true,
          apiAccess: true,
          customDomain: false,
        }
      },
      branding: {
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        accentColor: '#F59E0B'
      },
      settings: {
        timezone: 'America/Sao_Paulo',
        language: 'pt-BR',
        currency: 'BRL'
      }
    });

    await demoTenant.save();

    console.log(green('\n✅ Tenant demo criado com sucesso!'));
    console.log(green(`Subdomínio: ${demoTenant.subdomain}`));
    console.log(green(`Nome: ${demoTenant.name}`));
    console.log(green(`ID: ${demoTenant._id}`));

    // Criar admin para o tenant demo
    const tenantAdmin = new AdminUser({
      tenantId: demoTenant._id,
      name: 'Admin Demo',
      email: 'admin@demo.com',
      password: 'Demo123!',
      role: 'admin'
    });

    await tenantAdmin.save();

    console.log(green('\n✅ Admin do tenant demo criado!'));
    console.log(green(`Email: ${tenantAdmin.email}`));
    console.log(green('Senha: Demo123!'));

  } catch (error) {
    console.error(red('Erro ao criar tenant demo:'), error.message);
  }
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);

if (args.includes('--demo') || args.includes('-d')) {
  console.log(cyan('Criando tenant demo...\n'));
  createDemoTenant().then(() => process.exit(0));
} else {
  console.log(cyan('Criando Super Admin...\n'));
  createSuperAdmin().then(() => {
    if (args.includes('--with-demo')) {
      console.log(cyan('\nCriando tenant demo...\n'));
      createDemoTenant().then(() => process.exit(0));
    } else {
      process.exit(0);
    }
  });
}

// Adicionar informações de uso
if (args.includes('--help') || args.includes('-h')) {
  console.log(cyan('\n📖 Uso do script:'));
  console.log('node createSuperAdmin.js              - Criar apenas super admin');
  console.log('node createSuperAdmin.js --demo       - Criar apenas tenant demo');
  console.log('node createSuperAdmin.js --with-demo  - Criar super admin + tenant demo');
  console.log('node createSuperAdmin.js --help       - Mostrar esta ajuda\n');
  process.exit(0);
}