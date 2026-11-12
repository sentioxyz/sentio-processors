import { BigDecimal } from '@sentio/sdk'
import { GlobalContext } from '@sentio/sdk/eth'
import { cgProjectEntries, defiProjectEntries, isAddressEqual } from './dapp.js'

const projectEntries: Record<string, string[]> = {
  Biru: cgProjectEntries.Biru,
  // 'Derby Race': ['0xFCbD79F6a828045d90191959c430e6b383D03774'],
  Evermoon: cgProjectEntries.Evermoon,
  'Fractal Visions': ['0xF87f5313E830d8E2670898e231D8701532b1eB09'],
  LasMeta: cgProjectEntries.LasMeta,
  'Kyo Finance': defiProjectEntries['Kyo Finance'],
  'Posse Studios': ['0xFF4C94b6D2A89F5CA5FC46A49BE40A42f7352D18', '0x0931cD0aFef4e455209DA6f1dF73FC6771635FF0'],
  Quickswap: defiProjectEntries.Quickswap,
  'Sake Finance': defiProjectEntries['Sake Finance'],
  SoneFi: defiProjectEntries.SoneFi,
  SoneX: defiProjectEntries.SoneX,
  Sonova: [
    '0xbfe6a3023C92B040f95B8c2e8C237AAf0AFc92AB',
    '0xcD8034e208498aD691ec22a16b34a521FdCaef5D',
    '0xC361e1E7E59F2430F4e098AA614d6EF999261dB1',
    '0xC68D641700140B088D46adA58a0f62fbeCAB01BA',
    '0x0c428C5531C344877D441C6fE46317717F41cE21',
    '0xf3f8C65E983b414Aaa4D7662C5eBa81E4d27EAB4',
    '0x9078575c9a2BEC4c8aCF81aB68eA7d4942A9c32B',
    '0xfB107CB2e04238A04acCba3D6410cB8740fCD92d',
    '0x0863b7E291A27f228A52B68dba7bD474a1Af1525',
    '0x29e0BAB9343574b28D9029848fAcE1AAB31cE4Cc'
  ],
  Sonus: defiProjectEntries.Sonus,
  SuperVol: [
    '0x34834F208F149e0269394324c3f19e06dF2ca9cB',
    '0x618148f2Bb58C5c89737BB160070613d4E1b790a',
    '0xB040C32436c16807C9FDaD61cdf2af131bd91645'
  ],
  Synstation: cgProjectEntries.Synstation,
  Tiltplay: [
    '0x821797851cf30F0d5d3DEDc0259FaEf6BB29C3D5',
    '0x4e441E209982326d75F1c5C223811b508D58d238',
    '0x28C55Ccc2893aB375598eA0c261218E85e2d6f01',
    '0x0F328ED73994f41b14e2fe9892Ba3E5729cf8EB5',
    '0x049f73A5Ef191B1984CC14136FABDE70dEe37520',
    '0xbfCfCe59D753E92F19Bd77BD6175CCA89b8BD2d7',
    '0x4c07280a7ead0575ce7be5098ee12eedc8bc76cc'
  ],
  Unemeta: ['0xbb4904e033Ef5Af3fc5d3D72888f1cAd7944784D', '0xacC809386Fd5c99bFb07686818f29481bfdf6C76'],
  Yoki: ['0x80E041b16a38f4caa1d0137565B37FD71b2f1E2b'],
  'Untitled Bank': [
    // UntitledHub
    '0x2469362f63e9f593087EBbb5AC395CA607B5842F',
    // UB-USDC Bank
    '0xc675BB95D73CA7db2C09c3dC04dAaA7944CCBA41',
    // UB-ASTR Bank
    '0x85A4fB48C7f9383083864D62aBECCDf318fd8E6F',
    // UB-WETH Bank
    '0x232554B4B291A446B4829300bec133FBB07A8f2A'
  ],
  Velodrome: [
    '0x652e53C6a4FE39B6B30426d9c96376a105C89A95',
    '0x3a63171DD9BebF4D07BC782FECC7eb0b890C2A45',
    '0x991d5546C4B442B4c5fdc4c8B8b8d131DEB24702'
  ],
  VibeHit: ['0xbCB04bd589404B7229bBd24b49C9730071474F58', '0x1D98101247FB761c9aDC4e2EaD6aA6b6a00c170e'],
  WaveX: [
    '0x23d0C1AadFaAa076c409fcdcfC078B77802e4203',
    '0x1c5d80Edb12341Dca11f4500aa67B4D2238F3220',
    '0x932757a768b6497c7F50bC975D279499fb9CbA91'
  ],
  CoNFT: [
    '0x2907aD6D787Df0eAA53b6C1C8dd6948475234C3f',
    '0x3f575740B791123eC4428631A90C9B4E0de2Cd1E',
    '0x0F8e69b8B7fc55d1FA78b7199b4966aEEC276e55',
    '0xA8993503abc7D5c07ef1742EBad719dacC81d94d',
    '0xdd23adE69Fc2FE1934AA36C5aB12F6DC58a3446f',
    '0xFC79f0EaC5bEcf21fDcf037bAdb977b2b43DE497',
    '0xf105782FAbc036a249Eb397003256930E92aeF23',
    '0xAd4AEbb5D3C3e45408795729d9f11e430e954c1a',
    '0x04656c67371570C04c738514141489CdDC824cAe',
    '0xB012309Dee6204f8Af326CE704E6C6Ca6a1871C2',
    '0x1C0F98d9fE946d42f44196C439256BcfEe80B056'
  ],
  WORLD3: ['0x3Cc2486750f27567dDea1765262b582f304F59d0']
  // 'Treasure Hunt': ['0x435c4ED0647fD80CBEdB3d9a21445eCba8D5d156'],
  // ARCAS: [
  //   '0x570f09AC53b96929e3868f71864E36Ff6b1B67D7',
  //   '0x392440db3BeF15ea5E9aAdE9ddf72e923556001E',
  //   '0xDE06BE7FBd67ADAA1F7c35aFAF390431Adf3B739'
  // ],
}

const projects = Object.entries(projectEntries)

export function handleACS(
  tx: { from: string; to: string | null; gasUsed?: bigint; gasCost: BigDecimal },
  ctx: GlobalContext
) {
  for (const [project, addresses] of projects) {
    for (const address of addresses) {
      if (isAddressEqual(tx.from, address) || isAddressEqual(tx.to, address)) {
        ctx.eventLogger.emit('acs_tx', {
          distinctId: tx.from,
          ...tx,
          project
        })
        return
      }
    }
  }
}
