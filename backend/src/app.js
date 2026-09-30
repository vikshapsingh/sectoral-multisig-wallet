const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const walletRoutes = require('./routes/walletRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: env.nodeEnv });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/audit', auditRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
