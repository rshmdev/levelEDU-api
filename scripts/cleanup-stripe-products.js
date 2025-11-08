import Stripe from 'stripe';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

// Função para listar e limpar produtos do LevelEdu
async function cleanupStripeProducts() {
  console.log('🧹 Limpando produtos LevelEdu do Stripe...\n');
  
  try {
    // Listar todos os produtos
    const products = await stripe.products.list({
      limit: 100,
    });
    
    // Filtrar produtos do LevelEdu
    const levelEduProducts = products.data.filter(product => 
      product.metadata?.levelEduPlan === 'true' ||
      product.name.includes('Trial') ||
      product.name.includes('Starter') ||
      product.name.includes('Professional') ||
      product.name.includes('Enterprise')
    );
    
    if (levelEduProducts.length === 0) {
      console.log('✅ Nenhum produto LevelEdu encontrado para limpar');
      return;
    }
    
    console.log(`📦 Encontrados ${levelEduProducts.length} produtos LevelEdu:`);
    levelEduProducts.forEach(product => {
      console.log(`  • ${product.name} (${product.id})`);
    });
    
    console.log('\n🗑️  Iniciando limpeza...\n');
    
    for (const product of levelEduProducts) {
      console.log(`🗑️  Removendo produto: ${product.name}...`);
      
      // Listar preços associados ao produto
      const prices = await stripe.prices.list({
        product: product.id,
        limit: 100,
      });
      
      // Arquivar cada preço
      for (const price of prices.data) {
        await stripe.prices.update(price.id, {
          active: false
        });
        console.log(`  💰 Preço desativado: ${price.id}`);
      }
      
      // Arquivar produto
      await stripe.products.update(product.id, {
        active: false
      });
      
      console.log(`  ✅ Produto arquivado: ${product.id}\n`);
    }
    
    console.log('🎉 Limpeza concluída!');
    console.log('💡 Os produtos foram arquivados (não deletados permanentemente)');
    console.log('📝 Você pode agora executar o script de setup novamente');
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
    process.exit(1);
  }
}

// Função principal
async function main() {
  console.log('🧹 Cleanup de Produtos LevelEdu no Stripe\n');
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY não encontrada no .env');
    process.exit(1);
  }
  
  console.log('⚠️  ATENÇÃO:');
  console.log('  • Este script irá ARQUIVAR todos os produtos LevelEdu no Stripe');
  console.log('  • Os produtos não serão deletados permanentemente, apenas desativados');
  console.log('  • Use este script se precisar refazer o setup\n');
  
  await cleanupStripeProducts();
}

// Executar script
main().catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});