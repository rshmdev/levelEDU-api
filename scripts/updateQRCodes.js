import mongoose from 'mongoose';
import User from '../Models/userModel.js';
import dotenv from 'dotenv';

dotenv.config();

async function updateAllQRCodes() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conectado ao MongoDB');

    // Buscar todos os usuários
    const users = await User.find({});
    console.log(`Encontrados ${users.length} usuários para atualizar`);

    let updatedCount = 0;

    // Atualizar QR code de cada usuário
    for (const user of users) {
      if (user.tenantId) {
        try {
          const oldQRCode = user.qrcode;
          await user.regenerateQRCode();
          await user.save();
          
          console.log(`✅ Usuário ${user.name} (${user._id}) - QR code atualizado`);
          console.log(`   Antigo: ${oldQRCode?.substring(0, 50)}...`);
          console.log(`   Novo: ${user.qrcode?.substring(0, 50)}...`);
          updatedCount++;
        } catch (error) {
          console.error(`❌ Erro ao atualizar usuário ${user._id}:`, error.message);
        }
      } else {
        console.warn(`⚠️  Usuário ${user.name} (${user._id}) não tem tenantId definido`);
      }
    }

    console.log(`\n🎉 Migração concluída! ${updatedCount} QR codes atualizados.`);
  } catch (error) {
    console.error('Erro durante a migração:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado do MongoDB');
  }
}

// Executar apenas se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  updateAllQRCodes();
}

export default updateAllQRCodes;