import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import paymentRoutes from './routes/payments';
import inventoryRoutes from './routes/inventory';
import expenseRoutes from './routes/expenses';
import reportRoutes from './routes/reports';
import auditLogRoutes from './routes/auditLogs';
import categoryRoutes from './routes/categories';
import cron from 'node-cron';
import { autoCancelExpiredOrders } from './lib/autoCancelOrders';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', paymentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/categories', categoryRoutes);
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

cron.schedule('0 * * * *', () => {
  autoCancelExpiredOrders().catch((err) => console.error('Auto-cancel job failed:', err));
});