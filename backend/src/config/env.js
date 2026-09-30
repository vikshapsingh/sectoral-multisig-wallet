require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),

  mongoUri: required('MONGO_URI', 'mongodb://127.0.0.1:27017/sectorial_wallet'),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',

  blockchainRpcUrl: required('BLOCKCHAIN_RPC_URL', 'http://127.0.0.1:8545'),
  blockchainChainId: parseInt(process.env.BLOCKCHAIN_CHAIN_ID || '31337', 10),

  multisigAddress: process.env.MULTISIG_CONTRACT_ADDRESS || '',
  tokenAddress: process.env.TOKEN_CONTRACT_ADDRESS || '',

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

module.exports = env;
