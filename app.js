import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import Connect from './connection/connect.js'; // Import the Connect function
import Router from './Routes/Router.js';
import setupSwagger from './swaggerConfig.js';

const app = express();
// Setup Swagger documentation
setupSwagger(app);
// Initialize MongoDB connection
Connect();

app.use(morgan('combined'));
app.use(helmet());
app.use(compression());
app.use(cors());

// Webhook routes ANTES do express.json() para preservar raw body
app.use('/api/webhooks', Router.WebhookRouter);

// JSON parsing para outras rotas
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use('/admin', Router.AdminMissionRouter); 
app.use('/app', Router.MobileMissionRouter); 

app.use('/admin', Router.AdminUserRouter); 
app.use('/app', Router.MobileUserRouter); 

app.use('/app', Router.MobileRankingRouter); 

app.use('/admin', Router.AdminAttitudeRouter); 
app.use('/app', Router.MobileAttitudeRouter); 

app.use('/admin', Router.AdminProductRouter); 

app.use('/app', Router.MobilePurchaseRouter); 

app.use('/admin', Router.AdminHomeRouter);

app.use('/admin/auth', Router.AdminAuthUserRoute);

app.use('/admin', Router.AdminClassRoute);

app.use('/admin', Router.UsageRouter);

app.use('/api/tenants', Router.TenantRouter);

app.use('/api/billing', Router.BillingRouter);

// Stripe subscription routes
app.use('/api/subscriptions', Router.SubscriptionRouter);

// Webhook routes já foram registradas acima

export default app;
