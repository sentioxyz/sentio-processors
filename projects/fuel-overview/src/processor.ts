import { BigDecimal } from "@sentio/sdk";
import { FuelGlobalProcessor, FuelNetwork } from "@sentio/sdk/fuel";

const CHAINS = [
  // FuelNetwork.TEST_NET,
  FuelNetwork.MAIN_NET
]

CHAINS.forEach((chain) =>
  FuelGlobalProcessor
    .bind({
      chainId: chain,
      // startBlock: 300000n
    })
    .onTransaction(
      async (tx, ctx) => {
        console.log("inputsCount", tx.transaction.inputsCount, "outputCount", tx.transaction.outputsCount, "operations Count", tx.operations.length, "id", tx.id)
        if (tx.type) {
          if (tx.type != 'Mint')
            console.log("non Mint txType", tx.type, tx.id)
        }
        else {
          console.log("no type", tx.id)
        }
        try {
          const txStatus = ctx.transaction?.status!
          const gasUsed = Number(tx.gasUsed)
          const gasPrice = Number((tx.transaction.gasPrice ?? 0).toString())
          const gas = gasPrice * gasUsed
          const constractAddress = ctx.contractAddress

          const inputs = tx.transaction.inputs
          if (inputs)
            inputs.forEach(input => {
              //Coin = 0
              if (input.type == 0) {
                ctx.eventLogger.emit('txInput', {
                  distinctId: input.owner,
                  recipient: "",
                  type: input.type.toString(),
                  amount: input.amount,
                  assetId: input.assetId,
                  txID: input.txID
                })
              }
              //Contract = 1
              if (input.type == 1) {
                ctx.eventLogger.emit('txInput', {
                  distinctId: input.contractID,
                  recipient: "",
                  type: input.type.toString(),
                  amount: BigDecimal(0),
                  assetId: "",
                  txID: input.txID
                })
              }
              //Message = 2
              if (input.type == 2) {
                ctx.eventLogger.emit('txInput', {
                  distinctId: input.sender,
                  recipient: input.recipient,
                  type: input.type.toString(),
                  amount: input.amount,
                  assetId: "",
                  txID: ""
                })
              }
              ctx.meter.Counter("txInput").add(1, { type: input.type.toString() })

            })

          const outputs = tx.transaction.outputs
          if (outputs)
            outputs.forEach(output => {
              //Coin = 0 
              if (output.type == 0) {
                ctx.eventLogger.emit('txOutput', {
                  distinctId: output.to,
                  type: output.type.toString(),
                  amount: output.amount,
                  assetId: output.assetId
                })
              }
              //Contract = 1
              if (output.type == 1) {
                ctx.eventLogger.emit('txOutput', {
                  distinctId: "",
                  type: output.type.toString(),
                  amount: BigDecimal(0),
                  assetId: output.stateRoot
                })
              }
              //Change = 2
              if (output.type == 2) {
                ctx.eventLogger.emit('txOutput', {
                  distinctId: output.to,
                  type: output.type.toString(),
                  amount: output.amount,
                  assetId: output.assetId
                })
              }
              //Variable = 3
              if (output.type == 3) {
                ctx.eventLogger.emit('txOutput', {
                  distinctId: output.to,
                  type: output.type.toString(),
                  amount: output.amount,
                  assetId: output.assetId
                })
              }
              //ContractCreated = 4
              if (output.type == 4) {
                ctx.eventLogger.emit('txOutput', {
                  distinctId: output.contractId,
                  type: output.type.toString(),
                  amount: BigDecimal(0),
                  assetId: output.stateRoot
                })
              }

              ctx.meter.Counter("txOutput").add(1, { type: output.type.toString() })

            })

          const operations = tx.operations
          if (operations)
            operations.forEach(operation => {
              ctx.eventLogger.emit('txOperation', {
                distinctId: operation.from?.address || "",
                operationFromChain: operation.from?.chain,
                operationToChain: operation.from?.chain,
                name: operation.name || ""
              })

              ctx.meter.Counter("operation_counter").add(1, { name: operation.name?.toString() || "" })

            })

          ctx.eventLogger.emit('tx', {
            distinctId: tx.sender,
            txType: tx.type.toString(),
            constractAddress: constractAddress || "",
            fee: Number(tx.fee),
            tip: Number(tx.tip),
            gasUsed,
            gasPrice,
            gas: gas,
            txStatus
          })

          ctx.meter.Counter("tx_counter").add(1, { txStatus, txType: tx.type.toString() })
          ctx.meter.Counter("gas_counter").add(gasUsed, { txStatus, txType: tx.type.toString() })
          ctx.meter.Counter("tip_counter").add(Number(tx.tip), { txStatus, txType: tx.type.toString() })
          ctx.meter.Counter("fee_counter").add(Number(tx.fee), { txStatus, txType: tx.type.toString() })
        }
        catch (e) {
          console.log(`error ${e.message}`)
        }
      }
    )
)