import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { bcs } from "@mysten/bcs";
import { ServiceClientConstructor, ServiceError } from "@grpc/grpc-js";
import path from 'path';


const pairIndexes: number[] = [19, 48, 89, 90, 93, 158, 159, 408]; //ETH, USDT, USDC, Sui, CETUS, haSui, vSui, NAVX
const assetDictionary: { [index: number]: string } = {
  19: "ETH",
  48: "USDT",
  89: "USDC",
  90: "Sui",
  93: "CETUS",
  158: "haSui",
  159: "vSui",
  408: "NAVX"
};

interface PriceData {
  asset_id: number;
  asset_name: string;
  price: string;
  timestamp: string;
}
// Define an interface for what you expect from the loaded package
interface PullServiceClientProto {
  PullService: new (address: string, credentials: grpc.ChannelCredentials) => {
    getProof: (request: { pair_indexes: number[], chain_type: string }, callback: (err: ServiceError | null, response: any) => void) => void;
  };
}

class PullServiceClient {
  private client: {
    getProof: (request: { pair_indexes: number[], chain_type: string }, callback: (err: ServiceError | null, response: any) => void) => void;
  };

  constructor(address: string) {
    const PROTO_PATH = path.join(__dirname, '/client.proto');
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    // Load the package definition and assert the correct type
    const pullProto = grpc.loadPackageDefinition(packageDefinition) as unknown as { pull_service: PullServiceClientProto };
    this.client = new pullProto.pull_service.PullService(address, grpc.credentials.createSsl());
  }

  getProof(request: { pair_indexes: number[], chain_type: string }, callback: (err: ServiceError | null, response: any) => void): void {
    this.client.getProof(request, callback);
  }
}

export default PullServiceClient;

export async function getSupraPrice(): Promise<PriceData[]> {
  const address = "mainnet-dora.supraoracles.com";
  const chainType = "sui";
  const client = new PullServiceClient(address);

  const request = {
    pair_indexes: pairIndexes,
    chain_type: chainType,
  };

  return new Promise((resolve, reject) => {
    client.getProof(request, (err, response) => {
      if (err) {
        console.error("Error:", err.details);
        reject(err);
        return;
      }
      console.log("Calling contract to verify the proofs...");
      decodeLocal(response.sui).then(resolve).catch(reject);
    });
  });
}

async function decodeLocal(response: any): Promise<PriceData[]> {
  const scc_prices = bcs.vector(bcs.vector(bcs.u128())).parse(Uint8Array.from(response.scc_prices || []));
  const scc_decimals = bcs.vector(bcs.vector(bcs.u16())).parse(Uint8Array.from(response.scc_decimals || []));
  const scc_timestamp = bcs.vector(bcs.vector(bcs.u128())).parse(Uint8Array.from(response.scc_timestamp || []));
  const pair_mask = bcs.vector(bcs.vector(bcs.bool())).parse(Uint8Array.from(response.pair_mask || []));
  const scc_pairs = bcs.vector(bcs.vector(bcs.u32())).parse(Uint8Array.from(response.scc_pair || []));

  const result: PriceData[] = [];
  
  for (let i = 0; i < pairIndexes.length; ++i) {

    const indexPairs = scc_pairs[i] || [];
    const indexMask = pair_mask[i] || [];
    const prices = scc_prices[i] || [];
    const decimals = scc_decimals[i] || [];
    const timestamps = scc_timestamp[i] || [];
    
    for (let j = 0; j < indexPairs.length; ++j) {
      if (!indexMask[j]) continue;
  
      if (prices[j] !== undefined && decimals[j] !== undefined && timestamps[j] !== undefined) {
        const price = Number(prices[j]);  // Handle large integers safely
        const decimal = decimals[j];
        const formattedPrice = Number((price / Number(Math.pow(10, decimal))).toString()).toFixed(6);
        const timestamp = timestamps[j];
        result.push({
          asset_id: indexPairs[j],
          asset_name: assetDictionary[indexPairs[j]], // Use the mapped name from the dictionary
          price: formattedPrice,
          timestamp: timestamp
        });
      }
    }
  }

  return result;
}



getSupraPrice().then((prices) => {
  console.log(prices);
});
