import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { _0x834a86970ae93a73faf4fff16ae40bdb72b91c47be585fff19a2af60a19ddca3, _0xc2d49bf5e75d2258ee5563efa527feb6155de7ac6f6bf025a23ee88cd12d5a83 } from './types/sui/index.js'
import { getOrCreateCoin } from './util.js';

// latest protocol packageId
// const apiUrl = 'https://open-api.naviprotocol.io/api/package';

// Oracle package: use latest by check what tx touchs price oracle obj
// const oracleAddress = "0xc2d49bf5e75d2258ee5563efa527feb6155de7ac6f6bf025a23ee88cd12d5a83"

const client = new SuiClient({ url: getFullnodeUrl('mainnet') })



export async function getAllUserLoanBalances(naviStorageId: string, naviAssetIds: number, account: string) {
    const promises: Promise<any>[] = [];

    for (let i = 0; i <= naviAssetIds; i++) {
        promises.push(getUserLoanBalance(naviStorageId, i, account));
    }

    try {
        const results = await Promise.all(promises);
        return results; // This will be an array of resolved values
    } catch (error) {
        console.error("Error resolving promises:", error);
        return [];
    }
}


async function getUserLoanBalance(storageId: string, index: number, account: string) {
    const res = await _0x834a86970ae93a73faf4fff16ae40bdb72b91c47be585fff19a2af60a19ddca3.logic.view.userLoanBalance(
        client,
        [
            storageId,
            index,
            account
        ]
    )
    return res?.results_decoded
}


export async function getAllCoinTypes(naviStorageId: string, naviAssetIds: number) {
    const promises: Promise<any>[] = [];

    for (let i = 0; i <= naviAssetIds; i++) {
        promises.push(getCoinType(naviStorageId, i));
    }

    try {
        const results = await Promise.all(promises);
        return results; // This will be an array of resolved values
    } catch (error) {
        console.error("Error resolving promises:", error);
        return [];
    }
}


export async function getAllCoinInfo(allCoinTypes: string[]) {
    const promises: Promise<any>[] = []

    for (let i = 0; i < allCoinTypes.length; i++) {
        promises.push(getOrCreateCoin(`0x${allCoinTypes[i]}`));
    }

    try {
        const results = await Promise.all(promises);
        return results; // This will be an array of resolved values
    } catch (error) {
        console.error("Error resolving promises:", error);
        return []
    }
}


async function getCoinType(storageId: string, index: number) {
    const res = await _0x834a86970ae93a73faf4fff16ae40bdb72b91c47be585fff19a2af60a19ddca3.storage.view.getCoinType(
        client,
        [
            storageId,
            index
        ]
    )

    return res?.results_decoded
}


async function getTokenPrice(feedId: number) {
    const res = await _0xc2d49bf5e75d2258ee5563efa527feb6155de7ac6f6bf025a23ee88cd12d5a83.oracle.view.getTokenPrice(
        client,
        [
            "0x06",
            "0x1568865ed9a0b5ec414220e8f79b3d04c77acc82358f6e5ae4635687392ffbef",
            feedId
        ]
    )

    if (res && res?.results_decoded) {
        console.log(`getTokenPrice ${feedId}`, res?.results_decoded)
    }
    return res?.results_decoded
}


async function getIndex(feedId: number) {
    const res = await _0x834a86970ae93a73faf4fff16ae40bdb72b91c47be585fff19a2af60a19ddca3.storage.view.getIndex(
        client,
        [
            "0xbb4e2f4b6205c2e2a2db47aeb4f830796ec7c005f88537ee775986639bc442fe",
            feedId
        ]
    )

    if (res && res?.results_decoded) {
        console.log(`getIndex ${feedId}`, res?.results_decoded)
    }
    return res?.results_decoded
}

export async function getAllUserBalances(naviStorageId: string, naviAssetIds: number, account: string) {
    const promises: Promise<any>[] = [];

    for (let i = 0; i <= naviAssetIds; i++) {
        promises.push(getUserBalance(naviStorageId, i, account));
    }

    try {
        const results = await Promise.all(promises);
        return results; // This will be an array of resolved values
    } catch (error) {
        console.error("Error resolving promises:", error);
        return [];
    }
}

async function getUserBalance(naviStorageId: string, feedId: number, account: string) {
    const res = await _0x834a86970ae93a73faf4fff16ae40bdb72b91c47be585fff19a2af60a19ddca3.storage.view.getUserBalance(
        client,
        [
            naviStorageId,
            feedId,
            account
        ]
    )
    if (res && res?.results_decoded) {
        console.log(`getUserBalance ${account} for feed ${feedId}`, res?.results_decoded)
    }
    return res?.results_decoded ?? [0n, 0n]
}


export async function getAllCurrentRate(naviStorageId: string, naviAssetIds: number) {
    const promises: Promise<any>[] = [];

    for (let i = 0; i <= naviAssetIds; i++) {
        promises.push(getCurrentRate(naviStorageId, i));
    }

    try {
        const results = await Promise.all(promises);
        return results; // This will be an array of resolved values
    } catch (error) {
        console.error("Error resolving promises:", error);
        return [];
    }
}

async function getCurrentRate(naviStorageId: string, index: number) {
    const res = await _0x834a86970ae93a73faf4fff16ae40bdb72b91c47be585fff19a2af60a19ddca3.storage.view.getCurrentRate(
        client,
        [
            naviStorageId,
            index
        ]
    )
    return res?.results_decoded
}


async function getUserAssets(account: string) {
    console.log("reach getUserAssets", account)


    const res = await _0x834a86970ae93a73faf4fff16ae40bdb72b91c47be585fff19a2af60a19ddca3.storage.view.getUserAssets(
        client,
        [
            "0xbb4e2f4b6205c2e2a2db47aeb4f830796ec7c005f88537ee775986639bc442fe",
            account
        ]
    )

    return res?.results_decoded
}


async function getLiquidationFactors(feedId: number) {
    const res = await _0x834a86970ae93a73faf4fff16ae40bdb72b91c47be585fff19a2af60a19ddca3.storage.view.getLiquidationFactors(
        client,
        [
            "0xbb4e2f4b6205c2e2a2db47aeb4f830796ec7c005f88537ee775986639bc442fe",
            feedId
        ]
    )

    return res?.results_decoded
}


//test account
let account = "0xb55065c0f7521d2aa98dd84111aa55f8b75a55c9a1b063565f2bacede30f198c"

//navi constants
const naviAssetIds = 12
const naviStorageId = "0xbb4e2f4b6205c2e2a2db47aeb4f830796ec7c005f88537ee775986639bc442fe"

//get coin types
const allCoinTypes = await getAllCoinTypes(naviStorageId, naviAssetIds)

const allCoinInfo = await getAllCoinInfo(allCoinTypes)
console.log("allCoinInfo:", allCoinInfo)

//get borrow and supply
const allUserBalances = await getAllUserBalances(naviStorageId, naviAssetIds, account)
console.log("allUserBalances", allUserBalances)

//get rates
const allCurrentRates = await getAllCurrentRate(naviStorageId, naviAssetIds)
console.log("allCurrentRates", allCurrentRates)




