const ethers = require('ethers')

let ABI = [
    "function joinPool(address owner) view returns (uint)"
];
let iface = new ethers.utils.Interface(ABI);
let data = iface.encodeFunctionData("joinPool", [ "0x6A29C3E7DC05B2888243644DB079ff8Edf890665"])
console.log(data)




// curl https://solitary-long-shape.ropsten.discover.quiknode.pro/67cda192afee17b254ba2534db7d0fbddb453301/ \
//   -X POST \
//   -H "Content-Type: application/json" \
//   --data '{"method":"eth_call","params":[{"from":null,"to":"0x39e68dd41af6fd870f27a6b77cbcffa64626b0f3","data":"0x70a082310000000000000000000000006a29c3e7dc05b2888243644db079ff8edf890665"}, "latest"],"id":1,"jsonrpc":"2.0"}'
