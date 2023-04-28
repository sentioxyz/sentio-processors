import { BigDecimal } from '@sentio/sdk';

// Please make sure all the addresses are in lowercase

export const namingOverride: Record<string, string> = {
    '0x30e0dc9a1d33eac83211a1113de238b3ce826950': 'Stargate USDT Ethereum',
    '0x0a21291a184cf36ad3b0a0def4a17c12cbd66a14': 'Stargate USDT Arbitrum',
};

export const whitelistedMarkets = [
    '0x9a76925dd91a7561b58d8353f0bce4df1e517abb',
    '0xbeef0acd30d146f8ac4ca6665d672727b943f105',
    '0x5546d0f27bed4075ea03a22c58f7016e24c94ea7',
    '0xfcbae4635ca89866f83add208ecceec742678746',
    '0x7b246b8dbc2a640bf2d8221890cee8327fc23917',
    '0x44474d98d1484c26e8d296a43a721998731cf775',
    '0x30e0dc9a1d33eac83211a1113de238b3ce826950',
    '0xd0354d4e7bcf345fb117cabe41acadb724eccca2',
    '0x9ec4c502d989f04ffa9312c9d6e3f872ec91a0f9',
    '0x54e28e62ea9e8d755dc6e74674eabe2abfdb004e',
    '0xa0192f6567f8f5dc38c53323235fd08b318d2dca',
    '0x7d49e5adc0eaad9c027857767638613253ef125f',
    '0x0a21291a184cf36ad3b0a0def4a17c12cbd66a14',
    '0xc374f7ec85f8c7de3207a10bb1978ba104bda3b2',
    '0xfb8f489df4e04609f4f4e54f586f960818b70041',
    '0xd1434df1e2ad0cb7b3701a751d01981c7cf2dd62',
    '0x2ec8c498ec997ad963969a2c93bf7150a1f5b213',
    '0xabc8ae339e3f560bf700a3f6ee85ee719979762b'
]

export const TREASURY_ETHEREUM = '0x8270400d528c34e1596ef367eedec99080a1b592';
export const TREASURY_ARBITRUM = '0xcbcb48e22622a3778b6f14c2f5d258ba026b05e6';
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const ONE_YEAR = new BigDecimal(86400 * 365);
export const TIME_INTERVAL = 30;