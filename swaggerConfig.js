import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description: 'Documentação da API usando Swagger',
    },
    tags: [
      {
        name: 'APP - Users',
        description: 'Endpoints para manipulação de usuários no app mobile',
      },
    ],
    servers: [
      {
        url: 'http://localhost:5000', // Altere para a URL da sua API
        description: 'Servidor local',
      },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'ID do usuário',
              example: '1234567890abcdef12345678',
            },
            name: {
              type: 'string',
              description: 'Nome do usuário',
              example: 'João Silva',
            },
            email: {
              type: 'string',
              description: 'E-mail do usuário',
              example: 'joao.silva@example.com',
            },
            coins: {
              type: 'number',
              description: 'Quantidade de moedas do usuário',
              example: 100,
            },
            xp: {
              type: 'number',
              description: 'Pontos de experiência do usuário',
              example: 500,
            },
            class: {
              type: 'string',
              description: 'Classe do usuário',
              example: 'Guerreiro',
            },
            completedMissions: {
              type: 'array',
              description: 'Missões completadas pelo usuário',
              items: {
                type: 'string',
                example: 'Missão 1',
              },
            },
          },
        },
        UserRanking: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Nome do usuário',
              example: 'João Silva',
            },
            coins: {
              type: 'number',
              description: 'Quantidade de coins do usuário',
              example: 100,
            },
            xp: {
              type: 'number',
              description: 'Pontos de experiência do usuário',
              example: 500,
            },
          },
        },
        Purchase: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'ID da compra',
              example: '1234567890abcdef12345678',
            },
            userId: {
              $ref: '#/components/schemas/User',
            },
            productId: {
              $ref: '#/components/schemas/Product',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data e hora da compra',
              example: '2023-10-01T12:00:00Z',
            },
          },
        },
        Product: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'ID do produto',
              example: '0987654321abcdef12345678',
            },
            name: {
              type: 'string',
              description: 'Nome do produto',
              example: 'Produto 1',
            },
            description: {
              type: 'string',
              description: 'Descrição do produto',
              example: 'Descrição do Produto 1',
            },
            price: {
              type: 'number',
              description: 'Preço do produto em moedas',
              example: 50,
            },
            stock: {
              type: 'number',
              description: 'Quantidade em estoque',
              example: 10,
            },
            maxPerUser: {
              type: 'number',
              description: 'Limite de compras por usuário',
              example: 2,
            },
          },
        },
        Mission: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'ID da missão',
              example: '1234567890abcdef12345678',
            },
            name: {
              type: 'string',
              description: 'Nome da missão',
              example: 'Missão 1',
            },
            description: {
              type: 'string',
              description: 'Descrição da missão',
              example: 'Complete esta missão para ganhar recompensas!',
            },
            coins: {
              type: 'number',
              description: 'Recompensa em moedas',
              example: 50,
            },
            isCompleted: {
              type: 'boolean',
              description: 'Indica se a missão foi concluída globalmente',
              example: false,
            },
            allowedUsers: {
              type: 'array',
              description: 'Lista de IDs de usuários permitidos para completar a missão',
              items: {
                type: 'string',
                example: '1234567890abcdef12345678',
              },
            },
          },
        },
        Attitude: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'ID da atitude',
              example: '1234567890abcdef12345678',
            },
            userId: {
              type: 'string',
              description: 'ID do usuário',
              example: '1234567890abcdef12345678',
            },
            isPositive: {
              type: 'boolean',
              description: 'Indica se a atitude é positiva',
              example: true,
            },
            coins: {
              type: 'number',
              description: 'Quantidade de moedas associada à atitude',
              example: 50,
            },
            xp: {
              type: 'number',
              description: 'Quantidade de XP associada à atitude',
              example: 100,
            },
            isClaimed: {
              type: 'boolean',
              description: 'Indica se a recompensa foi resgatada',
              example: false,
            },
            description: {
              type: 'string',
              description: 'Descrição da atitude',
              example: 'Atitude positiva de completar a tarefa!',
            },
            title: {
              type: 'string',
              description: 'Título da atitude',
              example: 'Missão Cumprida',
            },
          },
        },
        AdminHomeSummary: {
          type: 'object',
          properties: {
            totalUsers: {
              type: 'number',
              description: 'Quantidade total de usuários',
              example: 120,
            },
            totalMissions: {
              type: 'number',
              description: 'Quantidade total de missões',
              example: 25,
            },
            totalProducts: {
              type: 'number',
              description: 'Quantidade total de produtos disponíveis na loja',
              example: 15,
            },
            totalPendingPurchases: {
              type: 'number',
              description: 'Quantidade total de compras pendentes',
              example: 5,
            },
            topStudents: {
              type: 'array',
              description: 'Lista dos 3 alunos com mais coins',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Nome do aluno',
                    example: 'João Silva',
                  },
                  coins: {
                    type: 'number',
                    description: 'Quantidade de coins do aluno',
                    example: 1500,
                  },
                },
              },
            },
          }
        },
        Class: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'ID da turma',
              example: '1234567890abcdef12345678',
            },
            name: {
              type: 'string',
              description: 'Nome da turma',
              example: 'Turma A',
            },
            code: {
              type: 'string',
              description: 'Código único da turma',
              example: 'TURMA001',
            },
            students: {
              type: 'array',
              description: 'Lista de alunos associados à turma',
              items: {
                $ref: '#/components/schemas/User',
              },
            },
          },
        },
        AdminUser: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'ID do usuário admin',
              example: '1234567890abcdef12345678',
            },
            name: {
              type: 'string',
              description: 'Nome do usuário admin',
              example: 'João Silva',
            },
            email: {
              type: 'string',
              description: 'Email do usuário admin',
              example: 'joao.silva@example.com',
            },
            role: {
              type: 'string',
              description: 'Função do usuário admin',
              example: 'admin',
            },
          },
        },
      },
    },
  },
  apis: ['./Routes/*.js'], // Caminho para os arquivos de rotas onde você tem os comentários JSDoc
};

const specs = swaggerJsdoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};

export default setupSwagger;