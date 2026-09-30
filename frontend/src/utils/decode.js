import { ethers } from 'ethers';
import { MULTISIG_WALLET_ABI, SECTORIAL_STABLE_COIN_ABI } from '../services/contracts';

const tokenIface = new ethers.Interface(SECTORIAL_STABLE_COIN_ABI);
const walletIface = new ethers.Interface(MULTISIG_WALLET_ABI);

export function decodeTransactionData(data) {
  if (!data || data === '0x') return null;
  for (const iface of [tokenIface, walletIface]) {
    try {
      const parsed = iface.parseTransaction({ data });
      if (parsed) {
        return {
          functionName: parsed.name,
          args: parsed.args.map((a) => (typeof a === 'bigint' ? a.toString() : a)),
        };
      }
    } catch {
      // Not decodable by this ABI, try the next one.
    }
  }
  return null;
}

export { tokenIface, walletIface };
