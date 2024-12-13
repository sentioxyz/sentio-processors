import {TypedActionProcessor, T} from '@sentio/action'
import {
    getAllUserLoanBalances,
    getAllCoinTypes,
    getAllCoinInfo,
    getAllUserBalances,
    getAllCurrentRate
} from "./navi.js";


TypedActionProcessor.bind()
    .onGet('/getAllUserLoanBalances/:naviStorageId/:account', {
            params: T.object({
                account: T.string(),
                naviStorageId: T.string(),
            }),
            query: T.object({
                naviAssetIds: T.number()
            })
        },
        async (request) => {
            const {naviAssetIds} = request.query!
            const {account, naviStorageId} = request.params!
            return await getAllUserLoanBalances(naviStorageId, naviAssetIds, account)
        })
    .onGet('/getAllCoinTypes/:naviStorageId', {
            params: T.object({
                naviStorageId: T.string()
            }),
            query: T.object({
                naviAssetIds: T.number(),
            })
        },
        async (request) => {
            const {naviStorageId} = request.params!
            const {naviAssetIds} = request.query!
            return await getAllCoinTypes(naviStorageId, naviAssetIds)
        })
    .onGet('/getAllCoinInfo', {
        query: T.object({
            allCoinTypes: T.array(T.string())
        }),
    }, async (request) => {
        const {allCoinTypes} = request.query!
        return await getAllCoinInfo(allCoinTypes)
    })
    .onGet('/getAllUserBalances/:naviStorageId/:account', {
            params: T.object({
                account: T.string(),
                naviStorageId: T.string()
            }),
            query: T.object({
                naviAssetIds: T.number()
            })
        },
        async (request) => {
            const {naviAssetIds} = request.query!
            const {account, naviStorageId} = request.params!
            return await getAllUserBalances(naviStorageId, naviAssetIds, account)
        })
    .onGet('/getAllCurrentRate/:naviStorageId/', {
            params: T.object({
                naviStorageId: T.string(),
            }),
            query: T.object({
                naviAssetIds: T.number()
            })
        },
        async (request) => {
            const {naviStorageId} = request.params!
            const {naviAssetIds} = request.query!
            return await getAllCurrentRate(naviStorageId, naviAssetIds)
        })

