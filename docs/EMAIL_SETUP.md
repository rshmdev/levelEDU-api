# 📧 Configuração SMTP para LevelEdu

## Configuração Gmail SMTP (Gratuita)

### Passo 1: Configurar App Password no Gmail

1. Acesse sua conta Google: https://myaccount.google.com/
2. Vá em **Segurança** → **Verificação em 2 etapas** (ative se não estiver ativo)
3. Vá em **Segurança** → **Senhas de app**
4. Selecione "Mail" e "Outro dispositivo personalizado"
5. Nomeie como "LevelEdu API" e clique em "Gerar"
6. Copie a senha gerada (16 caracteres)

### Passo 2: Configurar variáveis de ambiente

Adicione no seu arquivo `.env`:

```bash
# SMTP Configuration
SMTP_EMAIL=seu-email@gmail.com
SMTP_PASSWORD=sua-app-password-de-16-caracteres
SUPPORT_EMAIL=suporte@leveledu.com
```

### Passo 3: Testar configuração

Use a rota `/api/admin/test-email` para verificar se está funcionando.

## Templates de Email Disponíveis

### 1. Email de Boas-vindas
- **Quando:** Novo usuário criado (webhook Stripe ou criação manual)
- **Inclui:** 
  - Senha temporária
  - Link para login
  - Recursos disponíveis
  - Informações da escola

### 2. Email de Redefinição de Senha
- **Quando:** Usuário solicita nova senha
- **Inclui:**
  - Nova senha temporária
  - Instruções de segurança
  - Link para login

## Customização

### Cores e Branding
Os emails usam as cores configuradas no tenant:
- **Primary Color:** Cor principal da escola
- **School Name:** Nome da escola no header
- **Logo:** Primeira letra do nome da escola

### Provedor Alternativo
Se quiser usar outro provedor SMTP:

```javascript
// Em emailService.js, modifique:
this.transporter = nodemailer.createTransporter({
  host: 'smtp.seu-provedor.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
});
```

## Segurança

- ✅ Senhas temporárias geradas automaticamente
- ✅ Recomendação para alterar senha no primeiro acesso
- ✅ Fallback se email falhar (usuário ainda é criado)
- ✅ Logs detalhados para debugging

## Monitoramento

Para monitorar emails enviados:
- Logs no console mostram status de envio
- Webhook continua funcionando mesmo se email falhar
- Usuário é criado independentemente do status do email