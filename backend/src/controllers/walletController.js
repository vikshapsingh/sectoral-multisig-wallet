const blockchainService = require('../services/blockchainService');
const asyncHandler = require('../utils/asyncHandler');

const getWalletInfo = asyncHandler(async (req, res) => {
  const info = await blockchainService.getWalletInfo();
  res.json(info);
});

const getTokenInfo = asyncHandler(async (req, res) => {
  const info = await blockchainService.getTokenInfo();
  res.json(info);
});

const getBalance = asyncHandler(async (req, res) => {
  const balance = await blockchainService.getTokenBalance(req.params.address);
  res.json({ address: req.params.address, balance });
});

module.exports = { getWalletInfo, getTokenInfo, getBalance };
