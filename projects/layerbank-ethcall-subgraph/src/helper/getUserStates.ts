import { LayerbankContext } from "../types/eth/layerbank.js";

export const url = "https://api.goldsky.com/api/public/project_clwadadu5rddf01xa3m0m8ep0/subgraphs/layerbank-scroll/1.0.0/gn"
export const WETH_ADDRESS = "0x5300000000000000000000000000000000000004"


export interface AccountState {
    id: string;
    account: string;
    token: string;
    lentAmount: number;
    borrowAmount: number;
}


// Define the zero address and dead address constants
const zeroAddress = "0x0000000000000000000000000000000000000000";
const deadAddress = "0x000000000000000000000000000000000000dead";


export const getAccountStatesForAddressByPoolAtBlock = async (
    ctx: LayerbankContext
): Promise<AccountState[]> => {
    const blockNumber = ctx.blockNumber

    let skip = 0
    let fetchNext = true
    const pageSize = 1000

    let states: AccountState[] = []

    while (fetchNext) {
        let query = `
      query TVLQuery {
        accountStates(
          block: {number: ${blockNumber}}
          where: {
            supplied_gt: 0, borrowed_gt: 0
          }
          orderBy: id
          first: ${pageSize}
          skip: ${skip}
        ) {
          id
          account
          token 
          supplied
          borrowed
        }
      }
      `

        let response = await fetch(url, {
            method: "POST",
            body: JSON.stringify({ query }),
            headers: { "Content-Type": "application/json" },
        });
        let data = await response.json();

        // Filter and map the account states
        const filteredAccountStates = data.data.accountStates
            .filter(
                (m: any) =>
                    m.account !== zeroAddress && m.account.toLowerCase() !== deadAddress
            )

        // Push the filtered and mapped states into the states array
        states.push(...filteredAccountStates);

        if (data.data.accountStates.length == 0) {
            fetchNext = false;
        } else {
            skip += pageSize;
        }
    }


    return states
}