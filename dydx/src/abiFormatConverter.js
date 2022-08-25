const ethers = require('ethers')
import type {BigNumber} from 'ethers'
humanReadableAbi =  [
    "event LogDeposit(address depositorEthKey, uint256 starkKey, uint256 vaultId, uint256 assetType, uint256 nonQuantizedAmount, uint256 quantizedAmount)",
    "event LogWithdrawalPerformed(uint256 ownerKey, uint256 assetType, uint256 nonQuantizedAmount, uint256 quantizedAmount, address recipient)",
    "event LogMintWithdrawalPerformed(uint256 ownerKey, uint256 assetType, uint256 nonQuantizedAmount, uint256 quantizedAmount, uint256 assetId)",
  ]
const iface = new ethers.utils.Interface(humanReadableAbi);
jsonAbi = iface.format(ethers.utils.FormatTypes.json);

console.log(JSON.stringify(JSON.parse(jsonAbi), null, 2))
