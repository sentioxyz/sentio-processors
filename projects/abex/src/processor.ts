import { market } from './types/sui/0xceab84acf6bf70f503c3b0627acaff6b3f84cee0f2d7ed53d00fa6c2a168d14f.js'
import { ABEX_PACKAGE_ID, AbexEventType, PositionEventType } from './constants.js'
import { SuiContext, SuiNetwork, SuiObjectProcessor } from '@sentio/sdk/sui'
import { ALP_TOKEN_DECIMALS, getConsts, suiSymbolToSymbol } from './consts/index.js';


const consts = getConsts('mainnet');


class ABExParser {
  public parseEventType(typeRaw: string) {
    for (const abexEventType in AbexEventType) {
      if (typeRaw.includes(abexEventType)) {
        return abexEventType;
      }
    }
    return 'Unknown'
  }

  public parsePositionType(typeRaw: string) {
    for (const positionEventType in PositionEventType) {
      if (typeRaw.includes(positionEventType)) {
        return positionEventType;
      }
    }
    return 'Unknown';
  }

  public parseOrder(typeRaw: string, content: any, abexEventType: AbexEventType, network: string) {
    let result = {
      parsedDetail: {
        collateralToken: '',
        indexToken: '',
        direction: '',
        feeToken: '',
      },
      volume: 0,
      eventName: '',
      fee: 0,
    };

    // Split the input on '<' and '>', to isolate the relevant section.
    let relevantPart = typeRaw.split('<')[2].split('>')[0];

    // Split the relevant part on ', ' to get the individual components.
    let components = relevantPart.split(', ');

    const consts = getConsts(network);

    // For each component, split on '::' to get the actual value.
    for (let i = 0; i < components.length; i++) {
      let componentParts = components[i].split('::');
      let value = componentParts[componentParts.length - 1];

      switch (i) {
        case 0:
          result.parsedDetail.collateralToken = suiSymbolToSymbol(components[i], consts);
          break;
        case 1:
          result.parsedDetail.indexToken = suiSymbolToSymbol(components[i], consts);
          break;
        case 2:
          result.parsedDetail.direction = value;
          break;
        case 3:
          result.parsedDetail.feeToken = suiSymbolToSymbol(components[i], consts);
          break;
      }
    }

    result.eventName = abexEventType;

    return result;
  }

  public parsePool(typeRaw: string, content: any, abexEventType: AbexEventType, network: string) {
    let result = {
      parsedDetail: {
        fromToken: '',
        toToken: '',
      },
      volume: 0,
      eventName: '',
      fee: 0,
    };

    // Split the input on '<' and '>', to isolate the relevant section.
    let relevantPart = typeRaw.split('<')[1].split('>')[0];

    // Split the relevant part on ', ' to get the individual components.
    let components = relevantPart.split(', ');

    const consts = getConsts(network);

    switch (abexEventType) {
      case AbexEventType.Deposited:
        result.eventName = 'Deposited';
        result.parsedDetail.fromToken = suiSymbolToSymbol(components[0], consts)
        result.volume = content.mint_amount / (10 ** ALP_TOKEN_DECIMALS) * content.price.value / 1e18;
        result.fee = content.fee_value.value / 1e18;
        break;
      case AbexEventType.Withdrawn:
        result.eventName = 'Withdrawn';
        result.parsedDetail.toToken = suiSymbolToSymbol(components[0], consts)
        result.volume = content.burn_amount / (10 ** ALP_TOKEN_DECIMALS) * content.price.value / 1e18;
        result.fee = content.fee_value.value / 1e18;
        break;
      case AbexEventType.Swapped:
        result.eventName = 'Swapped';
        result.parsedDetail.fromToken = suiSymbolToSymbol(components[0], consts)
        result.parsedDetail.toToken = suiSymbolToSymbol(components[1], consts)
        result.volume = content.dest_amount / (10 ** consts.coins[result.parsedDetail.toToken].decimals) * content.dest_price.value / 1e18;
        result.fee = content.fee_value.value / 1e18;
        break;
    }

    return result;
  }

  public parsePosition(typeRaw: string, content: any, network: string) {
    let result = {
      parsedDetail: {
        collateralToken: '',
        indexToken: '',
        direction: '',
      },
      volume: 0,
      eventName: '',
      fee: 0,
    };

    // Split the input on '<' and '>', to isolate the relevant section.
    let relevantPart = typeRaw.split('<')[2].split('>')[0];

    // Split the relevant part on ', ' to get the individual components.
    let components = relevantPart.split(', ');

    const consts = getConsts(network);

    // For each component, split on '::' to get the actual value.
    for (let i = 0; i < components.length; i++) {
      let componentParts = components[i].split('::');
      let value = componentParts[componentParts.length - 1];

      switch (i) {
        case 0:
          result.parsedDetail.collateralToken = suiSymbolToSymbol(components[i], consts);
          break;
        case 1:
          result.parsedDetail.indexToken = suiSymbolToSymbol(components[i], consts);
          break;
        case 2:
          result.parsedDetail.direction = value;
          break;
      }
    }

    result.eventName = this.parsePositionType(typeRaw);
    let event: any;
    switch (result.eventName) {
      case PositionEventType.OpenPositionSuccessEvent:
        if (content.event) {
          event = content.event;
        } else if (content.claim.event) {
          event = content.claim.event;
        } else {
          event = {}
        }
        result.volume = event.open_amount / (10 ** consts.coins[result.parsedDetail.indexToken].decimals) * event.index_price.value / 1e18;
        result.fee = event.open_fee_amount / (10 ** consts.coins[result.parsedDetail.collateralToken].decimals) * event.collateral_price.value / 1e18;
        break;
      case PositionEventType.DecreasePositionSuccessEvent:
        if (content.event) {
          event = content.event;
        } else if (content.claim.event) {
          event = content.claim.event;
        } else {
          event = {}
        }
        result.volume = event.decrease_amount / (10 ** consts.coins[result.parsedDetail.indexToken].decimals) * event.index_price.value / 1e18;
        result.fee = event.decrease_fee_value.value / 1e18 + event.reserving_fee_value.value / 1e18 + (event.funding_fee_value.is_positive ? (event.funding_fee_value.value.value / 1e18) : (-event.funding_fee_value.value.value / 1e18));
        break;
      case PositionEventType.DecreaseReservedFromPositionEvent:
        result.volume = 0;
        break;
      case PositionEventType.PledgeInPositionEvent:
        result.volume = 0;
        break;
      case PositionEventType.RedeemFromPositionEvent:
        result.volume = 0;
        break;
      case PositionEventType.LiquidatePositionEvent:
        // FIXME: This is not correct
        result.volume = 0;
        result.fee = content.event.reserving_fee_value.value / 1e18 + (content.event.funding_fee_value.is_positive ? (content.event.funding_fee_value.value.value) / 1e18 : (-content.event.funding_fee_value.value.value / 1e18));
        break;
    }
    return result;
  }

  public async parse(event: any, ctx: SuiContext) {
    const abexEventType = this.parseEventType(event.type);
    let result: any = {}
    switch (abexEventType) {
      case AbexEventType.PositionClaimed:
        result = await this.parsePosition(event.type, event.parsedJson, 'mainnet');
        ctx.meter.Counter('Volume').add(result.volume, {
          event_name: result.eventName,
          collateral_token: result.parsedDetail.collateralToken,
          index_token: result.parsedDetail.indexToken,
          direction: result.parsedDetail.direction,
          type: 'Position',
        })
        ctx.meter.Counter('Fee').add(result.fee, {
          event_name: result.eventName,
          collateral_token: result.parsedDetail.collateralToken,
          index_token: result.parsedDetail.indexToken,
          direction: result.parsedDetail.direction,
          type: 'Position',
        })
        break;
      case AbexEventType.OrderCreated:
        result = await this.parseOrder(event.type, event.parsedJson, abexEventType, 'mainnet');
        break;
      case AbexEventType.OrderExecuted:
        result = await this.parseOrder(event.type, event.parsedJson, abexEventType, 'mainnet');
        break;
      case AbexEventType.OrderCleared:
        result = await this.parseOrder(event.type, event.parsedJson, abexEventType, 'mainnet');
        break;
      case AbexEventType.Deposited:
        result = await this.parsePool(event.type, event.parsedJson, abexEventType, 'mainnet');
        ctx.meter.Counter('Volume').add(result.volume, {
          event_name: result.eventName,
          from_token: result.parsedDetail.fromToken,
          type: 'Pool',
        })
        ctx.meter.Counter('Fee').add(result.fee, {
          event_name: result.eventName,
          from_token: result.parsedDetail.fromToken,
          type: 'Pool',
        })
        break;
      case AbexEventType.Withdrawn:
        result = await this.parsePool(event.type, event.parsedJson, abexEventType, 'mainnet');
        ctx.meter.Counter('Volume').add(result.volume, {
          event_name: result.eventName,
          to_token: result.parsedDetail.toToken,
          type: 'Pool',
        })
        ctx.meter.Counter('Fee').add(result.fee, {
          event_name: result.eventName,
          to_token: result.parsedDetail.toToken,
          type: 'Pool',
        })
        break;
      case AbexEventType.Swapped:
        result = await this.parsePool(event.type, event.parsedJson, abexEventType, 'mainnet');
        ctx.meter.Counter('Volume').add(result.volume, {
          event_name: result.eventName,
          from_token: result.parsedDetail.fromToken,
          to_token: result.parsedDetail.toToken,
          type: 'Swap',
        })
        ctx.meter.Counter('Fee').add(result.fee, {
          event_name: result.eventName,
          from_token: result.parsedDetail.fromToken,
          to_token: result.parsedDetail.toToken,
          type: 'Swap',
        })
        break;
    }
    const body = event.data_decoded
    const owner = body?.position_name?.fields?.owner || body?.order_name?.owner || event.sender;
    ctx.eventLogger.emit('UserInteraction', {
      distinctId: owner,
      ...result,
    })
  }
}

const abexParser = new ABExParser();

market.bind({
  address: ABEX_PACKAGE_ID,
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: 9724618n,
})
  .onEventPositionClaimed(abexParser.parse)
  .onEventOrderCreated(abexParser.parse)
  .onEventOrderExecuted(abexParser.parse)
  .onEventOrderCleared(abexParser.parse)
  .onEventDeposited(abexParser.parse)
  .onEventWithdrawn(abexParser.parse)
  .onEventSwapped(abexParser.parse)

for (const vault of Object.keys(consts.abexCore.vaults)) {
  console.log(consts.coins[vault].module)
  SuiObjectProcessor.bind({
    objectId: consts.coins[vault].module,
    network: SuiNetwork.MAIN_NET,
    startCheckpoint: 9724618n,
  })
}

console.log(consts.abexCore.vaultsParent)

SuiObjectProcessor.bind({
  objectId: consts.abexCore.vaultsParent,
  network: SuiNetwork.MAIN_NET,
  startCheckpoint: 9724618n,
}).onTimeInterval(async (self, dynamicFieldObjects, ctx) => {
  console.log('dynamicFieldObjects:', dynamicFieldObjects)
})