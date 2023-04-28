import ethConfig from './config/main.json';
import arbConfig from './config/arbitrum-one.json';
import { Counter, Gauge } from '@sentio/sdk';
import { ERC20Processor } from '@sentio/sdk/eth/builtin';
import { PendleMarketFactoryProcessor } from './types/eth/pendlemarketfactory.js';
import { tradingVolume_handleCreateNewMarket } from './processes/trading-volume.js';

PendleMarketFactoryProcessor.bind({
  address: ethConfig.PendleMarketFactory,
  startBlock: ethConfig.PendleMarketFactory_startBlock,
}).onEventCreateNewMarket(tradingVolume_handleCreateNewMarket);

PendleMarketFactoryProcessor.bind({
  address: arbConfig.PendleMarketFactory,
  startBlock: arbConfig.PendleMarketFactory_startBlock,
  network: 42161,
}).onEventCreateNewMarket(tradingVolume_handleCreateNewMarket);
