import Stripe from 'stripe';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config();

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

// Definir os planos a serem criados
const PLANS_TO_CREATE = [
  {
    id: 'trial',
    name: 'Trial',
    description: 'Período de avaliação gratuita de 30 dias com acesso completo aos recursos essenciais',
    priceMonthly: 0,
    priceYearly: 0,
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'Solução completa para escolas que buscam modernizar sua gestão educacional com tecnologia avançada',
    priceMonthly: 29900, // R$ 299,00
    priceYearly: 299000, // R$ 2.990,00 (10 meses)
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Plataforma robusta para instituições em crescimento que necessitam de recursos avançados de gestão',
    priceMonthly: 69900, // R$ 699,00
    priceYearly: 699000, // R$ 6.990,00 (10 meses)
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Solução premium com personalização da marca, análises avançadas e integrações corporativas',
    priceMonthly: 99900, // R$ 999,00
    priceYearly: 999000, // R$ 9.990,00 (10 meses)
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Solução empresarial customizada com suporte dedicado, API completa e implementação personalizada',
    priceMonthly: 199900, // R$ 1.999,00 (preço inicial, será negociado)
    priceYearly: 1999000, // R$ 19.990,00 (preço inicial, será negociado)
  }
];

// Função para criar produtos e preços no Stripe
async function createStripeProducts() {
  console.log('🚀 Iniciando criação de produtos no Stripe...\n');
  
  const envUpdates = [];
  
  try {
    for (const plan of PLANS_TO_CREATE) {
      console.log(`📦 Criando produto: ${plan.name}...`);
      
      // Criar produto no Stripe
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          planId: plan.id,
          levelEduPlan: 'true'
        }
      });
      
      console.log(`✅ Produto criado: ${product.id}`);
      
      // Criar preço mensal (se não for 0)
      let monthlyPriceId = null;
      if (plan.priceMonthly > 0) {
        const monthlyPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: plan.priceMonthly,
          currency: 'brl',
          recurring: {
            interval: 'month'
          },
          metadata: {
            planId: plan.id,
            billing: 'monthly'
          }
        });
        
        monthlyPriceId = monthlyPrice.id;
        console.log(`💰 Preço mensal criado: ${monthlyPriceId} (R$ ${(plan.priceMonthly / 100).toFixed(2)})`);
      }
      
      // Criar preço anual (se não for 0)
      let yearlyPriceId = null;
      if (plan.priceYearly > 0) {
        const yearlyPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: plan.priceYearly,
          currency: 'brl',
          recurring: {
            interval: 'year'
          },
          metadata: {
            planId: plan.id,
            billing: 'yearly'
          }
        });
        
        yearlyPriceId = yearlyPrice.id;
        console.log(`💰 Preço anual criado: ${yearlyPriceId} (R$ ${(plan.priceYearly / 100).toFixed(2)})`);
      }
      
      // Adicionar às atualizações do .env
      const planUpperCase = plan.id.toUpperCase();
      if (monthlyPriceId) {
        envUpdates.push(`STRIPE_${planUpperCase}_PRICE_MONTHLY=${monthlyPriceId}`);
      }
      if (yearlyPriceId) {
        envUpdates.push(`STRIPE_${planUpperCase}_PRICE_YEARLY=${yearlyPriceId}`);
      }
      
      console.log(`✅ ${plan.name} configurado com sucesso!\n`);
    }
    
    // Atualizar arquivo .env
    await updateEnvFile(envUpdates);
    
    console.log('🎉 Todos os produtos foram criados com sucesso!');
    console.log('📝 Arquivo .env atualizado com os IDs dos preços');
    console.log('\n💡 Próximos passos:');
    console.log('1. Verifique os produtos criados no dashboard do Stripe');
    console.log('2. Reinicie sua aplicação para usar os novos IDs');
    console.log('3. Teste o fluxo de checkout');
    
  } catch (error) {
    console.error('❌ Erro ao criar produtos:', error);
    process.exit(1);
  }
}

// Função para atualizar o arquivo .env
async function updateEnvFile(updates) {
  const envPath = path.join(process.cwd(), '.env');
  
  try {
    let envContent = '';
    
    // Ler arquivo .env existente se existir
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Adicionar ou atualizar as variáveis
    for (const update of updates) {
      const [key, value] = update.split('=');
      const regex = new RegExp(`^${key}=.*$`, 'm');
      
      if (regex.test(envContent)) {
        // Atualizar linha existente
        envContent = envContent.replace(regex, update);
      } else {
        // Adicionar nova linha
        envContent += `\n${update}`;
      }
    }
    
    // Escrever arquivo atualizado
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Arquivo .env atualizado');
    
  } catch (error) {
    console.error('❌ Erro ao atualizar .env:', error);
    throw error;
  }
}

// Função para verificar configuração
function validateConfig() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY não encontrada no .env');
    console.log('💡 Adicione sua chave secreta do Stripe no arquivo .env');
    process.exit(1);
  }
  
  if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') && !process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
    console.error('❌ STRIPE_SECRET_KEY parece ser inválida');
    process.exit(1);
  }
  
  console.log('✅ Configuração validada');
}

// Função principal
async function main() {
  console.log('🎯 Setup de Produtos LevelEdu no Stripe\n');
  
  // Validar configuração
  validateConfig();
  
  // Perguntar confirmação
  console.log('📋 Os seguintes produtos serão criados:');
  PLANS_TO_CREATE.forEach(plan => {
    console.log(`  • ${plan.name}: R$ ${(plan.priceMonthly / 100).toFixed(2)}/mês | R$ ${(plan.priceYearly / 100).toFixed(2)}/ano`);
  });
  
  console.log('\n⚠️  IMPORTANTE:');
  console.log('  • Este script criará produtos REAIS no seu Stripe');
  console.log('  • Certifique-se que está usando a chave correta (test ou live)');
  console.log('  • Os IDs serão salvos automaticamente no .env\n');
  
  // Em um ambiente real, você pode adicionar confirmação manual
  // Para automação, vamos prosseguir diretamente
  console.log('🚀 Prosseguindo com a criação...\n');
  
  await createStripeProducts();
}

// Executar script
main().catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});