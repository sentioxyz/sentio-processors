const ethers = require('ethers')
humanReadableAbi =  [
    "event Work(uint256 indexed id, uint256 loan)"
  ]
const iface = new ethers.utils.Interface(humanReadableAbi);
jsonAbi = iface.format(ethers.utils.FormatTypes.json);

console.log(JSON.stringify(JSON.parse(jsonAbi), null, 2))
