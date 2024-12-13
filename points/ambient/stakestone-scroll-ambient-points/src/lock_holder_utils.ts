import { AbiCoder, JsonRpcProvider } from "ethers";
import { EthContext } from "@sentio/sdk/eth";

interface PartialCallTrace {
  type: string;
  from: string;
  to?: string;
  input?: string;
  output?: string;
  calls?: PartialCallTrace[];
}

const SIG_USER_CMD = "0xa15112f9";
const SIG_USER_CMD_ROUTER = "0x90b33ce5";
const SIG_USER_CMD_RELAYER = "0x08719070";
const SIG_SWAP = "0x3d719cd9";
const SIG_PROTOCOL_CMD = "0x13fd34f4";

const ENTRY_USER_CMD = "userCmd";
const ENTRY_USER_CMD_ROUTER = "userCmdRouter";
const ENTRY_USER_CMD_RELAYER = "userCmdRelayer";
const ENTRY_SWAP = "swap";

const VALID_ENTRY_SIGS = [
  SIG_USER_CMD,
  SIG_SWAP,
  SIG_USER_CMD_ROUTER,
  SIG_USER_CMD_RELAYER,
];

const CrocSwapDexAddress = "0xaaaaaaaacb71bf2c8cae522ea5fa455571a74106";

const abiCoder = new AbiCoder();

const provider = new JsonRpcProvider(process.env.SCROLL_ENDPOINT);

export async function getLockHolder(
  ctx: EthContext
): Promise<[string, string]> {
  if (ctx.transaction) {
    const sig = ctx.transaction.data.slice(0, 10);
    if (sig == SIG_USER_CMD) {
      return [ctx.transaction.from, ENTRY_USER_CMD];
    }
    if (sig == SIG_SWAP) {
      return [ctx.transaction.from, ENTRY_SWAP];
    }
    if (sig == SIG_USER_CMD_ROUTER) {
      const [callpath, cmd, client] = abiCoder.decode(
        ["uint16", "bytes", "address"],
        ctx.transaction.data.slice(10)
      );
      return [client, ENTRY_USER_CMD_ROUTER];
    }
    // UserCmdRouter need info from call trace
  }

  const callTrace = (await provider.send("debug_traceTransaction", [
    ctx.transactionHash,
    { tracer: "callTracer" },
  ])) as PartialCallTrace;
  const call = getAmbientEntryCall(callTrace);
  if (!call) {
    // maybe a protocolCmd or something else
    throw new Error("no entry call found");
  }

  const sig = call.input!.slice(0, 10);
  if (sig == SIG_USER_CMD) {
    return [call.from, ENTRY_USER_CMD];
  }
  if (sig == SIG_SWAP) {
    return [call.from, ENTRY_SWAP];
  }
  if (sig == SIG_USER_CMD_ROUTER) {
    const [callpath, cmd, client] = abiCoder.decode(
      ["uint16", "bytes", "address"],
      call.input!.slice(10)
    );
    return [client, ENTRY_USER_CMD_ROUTER];
  }
  if (sig == SIG_USER_CMD_RELAYER) {
    const ret = getEcRecoverResult(call);
    if (!ret) {
      throw new Error("no ecrecover found");
    }
    return [ret.slice(-40), ENTRY_USER_CMD_RELAYER];
  }
  throw new Error("unknown entry call");
}

function getAmbientEntryCall(
  callTrace: PartialCallTrace
): PartialCallTrace | undefined {
  if (
    callTrace.type != "STATICCALL" &&
    callTrace.to?.toLowerCase() == CrocSwapDexAddress.toLowerCase() &&
    VALID_ENTRY_SIGS.includes(callTrace?.input?.slice(0, 10) ?? "")
  ) {
    return callTrace;
  }
  for (const call of callTrace.calls || []) {
    const ret = getAmbientEntryCall(call);
    if (ret) {
      return ret;
    }
  }
  return undefined;
}

function getEcRecoverResult(callTrace: PartialCallTrace): string | undefined {
  if (
    callTrace.type == "STATICCALL" &&
    callTrace.to == "0x0000000000000000000000000000000000000001"
  ) {
    return callTrace.output;
  }
  for (const call of callTrace.calls || []) {
    const ret = getEcRecoverResult(call);
    if (ret) {
      return ret;
    }
  }
  return undefined;
}
