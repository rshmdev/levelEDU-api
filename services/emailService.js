import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD // Use App Password, not regular password
      }
    });
  }

  // Template de boas-vindas para novo usuário
  getWelcomeTemplate(data) {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bem-vindo ao ${data.schoolName}!</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 20px;
            }
            
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            }
            
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }
            
            .logo {
                width: 60px;
                height: 60px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                font-weight: bold;
            }
            
            .header h1 {
                font-size: 28px;
                margin-bottom: 10px;
            }
            
            .header p {
                font-size: 16px;
                opacity: 0.9;
            }
            
            .content {
                padding: 40px 30px;
            }
            
            .welcome-message {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .welcome-message h2 {
                color: #333;
                font-size: 24px;
                margin-bottom: 15px;
            }
            
            .welcome-message p {
                color: #666;
                font-size: 16px;
            }
            
            .credentials-box {
                background: #f8f9ff;
                border: 2px solid #e6e9ff;
                border-radius: 10px;
                padding: 25px;
                margin: 30px 0;
                text-align: center;
            }
            
            .credentials-box h3 {
                color: #667eea;
                margin-bottom: 20px;
                font-size: 18px;
            }
            
            .credential-item {
                background: white;
                padding: 15px;
                border-radius: 8px;
                margin: 10px 0;
                border-left: 4px solid #667eea;
            }
            
            .credential-label {
                font-weight: bold;
                color: #333;
                margin-bottom: 5px;
            }
            
            .credential-value {
                font-family: 'Courier New', monospace;
                background: #f0f0f0;
                padding: 8px 12px;
                border-radius: 5px;
                color: #444;
                font-size: 14px;
            }
            
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin: 20px 0;
                transition: transform 0.3s ease;
            }
            
            .cta-button:hover {
                transform: translateY(-2px);
            }
            
            .features {
                margin: 30px 0;
            }
            
            .feature-item {
                display: flex;
                align-items: center;
                margin: 15px 0;
                padding: 15px;
                background: #f9f9f9;
                border-radius: 8px;
            }
            
            .feature-icon {
                width: 40px;
                height: 40px;
                background: #667eea;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 15px;
                color: white;
                font-weight: bold;
            }
            
            .footer {
                background: #f8f9fa;
                padding: 30px;
                text-align: center;
                color: #666;
                font-size: 14px;
            }
            
            .footer a {
                color: #667eea;
                text-decoration: none;
            }
            
            @media (max-width: 600px) {
                .container {
                    margin: 10px;
                    border-radius: 10px;
                }
                
                .header {
                    padding: 30px 20px;
                }
                
                .content {
                    padding: 30px 20px;
                }
                
                .header h1 {
                    font-size: 24px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">
                    ${data.schoolName.charAt(0).toUpperCase()}
                </div>
                <h1>Bem-vindo ao ${data.schoolName}!</h1>
                <p>Sua conta foi criada com sucesso</p>
            </div>
            
            <div class="content">
                <div class="welcome-message">
                    <h2>Olá, ${data.userName}! 👋</h2>
                    <p>Estamos muito felizes em ter você conosco. Sua conta foi criada e você já pode começar a explorar nossa plataforma educacional.</p>
                </div>
                
                <div class="credentials-box">
                    <h3>🔐 Suas credenciais de acesso</h3>
                    
                    <div class="credential-item">
                        <div class="credential-label">Email:</div>
                        <div class="credential-value">${data.email}</div>
                    </div>
                    
                    <div class="credential-item">
                        <div class="credential-label">Senha temporária:</div>
                        <div class="credential-value">${data.temporaryPassword}</div>
                    </div>
                    
                    <p style="margin-top: 15px; color: #e74c3c; font-size: 14px;">
                        ⚠️ <strong>Importante:</strong> Recomendamos que você altere sua senha no primeiro acesso.
                    </p>
                </div>
                
                <div style="text-align: center;">
                    <a href="${data.loginUrl}" class="cta-button">
                        🚀 Acessar Plataforma
                    </a>
                </div>
                
                <div class="features">
                    <h3 style="margin-bottom: 20px; color: #333;">O que você pode fazer:</h3>
                    
                    <div class="feature-item">
                        <div class="feature-icon">📚</div>
                        <div>
                            <strong>Acompanhar Missões</strong><br>
                            <span style="color: #666;">Visualize e complete missões educacionais</span>
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon">📊</div>
                        <div>
                            <strong>Monitorar Progresso</strong><br>
                            <span style="color: #666;">Acompanhe seu desenvolvimento e notas</span>
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon">🎯</div>
                        <div>
                            <strong>Definir Metas</strong><br>
                            <span style="color: #666;">Estabeleça objetivos e alcance seus sonhos</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="footer">
                <p>
                    Este email foi enviado automaticamente pelo sistema ${data.schoolName}.<br>
                    Precisa de ajuda? Entre em contato: <a href="mailto:${data.supportEmail}">${data.supportEmail}</a>
                </p>
                <p style="margin-top: 15px;">
                    © 2024 ${data.schoolName} - Todos os direitos reservados
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Template para redefinição de senha
  getPasswordResetTemplate(data) {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redefinir Senha - ${data.schoolName}</title>
        <style>
            /* Usando os mesmos estilos do template de boas-vindas */
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                background: linear-gradient(135deg, #ff7b7b 0%, #667eea 100%);
                padding: 20px;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            }
            .header {
                background: linear-gradient(135deg, #ff7b7b 0%, #667eea 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }
            .logo {
                width: 60px; height: 60px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                font-weight: bold;
            }
            .header h1 { font-size: 28px; margin-bottom: 10px; }
            .header p { font-size: 16px; opacity: 0.9; }
            .content { padding: 40px 30px; }
            .message-box {
                background: #fff5f5;
                border: 2px solid #fed7d7;
                border-radius: 10px;
                padding: 25px;
                margin: 30px 0;
                text-align: center;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #ff7b7b 0%, #667eea 100%);
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin: 20px 0;
            }
            .footer {
                background: #f8f9fa;
                padding: 30px;
                text-align: center;
                color: #666;
                font-size: 14px;
            }
            .footer a { color: #667eea; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🔒</div>
                <h1>Redefinir Senha</h1>
                <p>${data.schoolName}</p>
            </div>
            
            <div class="content">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="color: #333; margin-bottom: 15px;">Solicitação de Nova Senha</h2>
                    <p style="color: #666;">Olá, ${data.userName}! Recebemos uma solicitação para redefinir sua senha.</p>
                </div>
                
                <div class="message-box">
                    <h3 style="color: #e53e3e; margin-bottom: 15px;">🔑 Nova Senha Temporária</h3>
                    <p style="margin-bottom: 15px;">Sua nova senha temporária é:</p>
                    <div style="font-family: 'Courier New', monospace; background: #f0f0f0; padding: 15px; border-radius: 5px; font-size: 18px; font-weight: bold; color: #333;">
                        ${data.newPassword}
                    </div>
                    <p style="margin-top: 15px; color: #e74c3c; font-size: 14px;">
                        ⚠️ <strong>Importante:</strong> Altere esta senha após o primeiro acesso.
                    </p>
                </div>
                
                <div style="text-align: center;">
                    <a href="${data.loginUrl}" class="cta-button">
                        🚀 Fazer Login
                    </a>
                </div>
                
                <div style="background: #f8f9ff; padding: 20px; border-radius: 8px; margin-top: 30px;">
                    <p style="font-size: 14px; color: #666;">
                        <strong>Não solicitou esta alteração?</strong><br>
                        Se você não solicitou a redefinição de senha, entre em contato conosco imediatamente em 
                        <a href="mailto:${data.supportEmail}" style="color: #667eea;">${data.supportEmail}</a>
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p>
                    Este email foi enviado automaticamente pelo sistema ${data.schoolName}.<br>
                    © 2024 ${data.schoolName} - Todos os direitos reservados
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Método para gerar senha aleatória
  generateRandomPassword(length = 8) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // Enviar email de boas-vindas
  async sendWelcomeEmail(userData) {
    try {
      const temporaryPassword = this.generateRandomPassword();
      
      const emailData = {
        userName: userData.name,
        email: userData.email,
        schoolName: userData.schoolName || 'LevelEdu',
        temporaryPassword: temporaryPassword,
        loginUrl: userData.loginUrl || process.env.FRONTEND_URL,
        supportEmail: userData.supportEmail || process.env.SUPPORT_EMAIL || 'suporte@leveledu.com'
      };

      const mailOptions = {
        from: `"${emailData.schoolName}" <${process.env.SMTP_EMAIL}>`,
        to: userData.email,
        subject: `🎉 Bem-vindo ao ${emailData.schoolName}!`,
        html: this.getWelcomeTemplate(emailData)
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        temporaryPassword: temporaryPassword,
        messageId: result.messageId
      };
    } catch (error) {
      console.error('Erro ao enviar email de boas-vindas:', error);
      throw error;
    }
  }

  // Enviar email de redefinição de senha
  async sendPasswordResetEmail(userData) {
    try {
      const newPassword = this.generateRandomPassword();
      
      const emailData = {
        userName: userData.name,
        email: userData.email,
        schoolName: userData.schoolName || 'LevelEdu',
        newPassword: newPassword,
        loginUrl: userData.loginUrl || process.env.FRONTEND_URL,
        supportEmail: userData.supportEmail || process.env.SUPPORT_EMAIL || 'suporte@leveledu.com'
      };

      const mailOptions = {
        from: `"${emailData.schoolName}" <${process.env.SMTP_EMAIL}>`,
        to: userData.email,
        subject: `🔒 Nova Senha - ${emailData.schoolName}`,
        html: this.getPasswordResetTemplate(emailData)
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        newPassword: newPassword,
        messageId: result.messageId
      };
    } catch (error) {
      console.error('Erro ao enviar email de redefinição:', error);
      throw error;
    }
  }

  // Testar configuração SMTP
  async testConnection() {
    try {
      await this.transporter.verify();
      return { success: true, message: 'Conexão SMTP estabelecida com sucesso' };
    } catch (error) {
      return { success: false, message: 'Erro na conexão SMTP', error: error.message };
    }
  }
}

export default new EmailService();