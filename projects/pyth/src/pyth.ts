const PRICE_ID_LIST = [
  {
    "Symbol": "Crypto.AAVE/USD",
    "PriceID": "0x2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445"
  },
  {
    "Symbol": "Crypto.ACM/USD",
    "PriceID": "0xbd640cddb72063e2ede34c6a0baf6699759b9837fcb06aa0e2fbcecb9b65fde7"
  },
  {
    "Symbol": "Crypto.ADA/USD",
    "PriceID": "0x2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d"
  },
  {
    "Symbol": "Crypto.ALGO/USD",
    "PriceID": "0xfa17ceaf30d19ba51112fdcc750cc83454776f47fb0112e4af07f15f4bb1ebc0"
  },
  {
    "Symbol": "Crypto.ALPACA/USD",
    "PriceID": "0x9095653620547ece988ec51486dc7a6eb2efddbce8ea5bedbd53bf00cca84cf6"
  },
  {
    "Symbol": "Crypto.ALPINE/USD",
    "PriceID": "0x97d7d4c20e5a06fdb60f7a448a9e9a779f2b31c3f21121180010a4a470844aae"
  },
  {
    "Symbol": "Crypto.ANC/USD",
    "PriceID": "0x6d0af467543fc7daedf7abed96423877560c8d03725f3e5c87516774982a679c"
  },
  {
    "Symbol": "Crypto.APE/USD",
    "PriceID": "0x15add95022ae13563a11992e727c91bdb6b55bc183d9d747436c80a483d8c864"
  },
  {
    "Symbol": "Crypto.APT/USD",
    "PriceID": "0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5"
  },
  {
    "Symbol": "Crypto.ASR/USD",
    "PriceID": "0xb881c6dad5dd3dc9a83222f8032fb439859288119afc742d43adc305cef151cc"
  },
  {
    "Symbol": "Crypto.ATLAS/USD",
    "PriceID": "0x681e0eb7acf9a2a3384927684d932560fb6f67c6beb21baa0f110e993b265386"
  },
  {
    "Symbol": "Crypto.ATM/USD",
    "PriceID": "0x8ff1200345393bb25be4f4eeb2d97234e91f7e6213f3745a694b1436e700f271"
  },
  {
    "Symbol": "Crypto.ATOM/USD",
    "PriceID": "0xb00b60f88b03a6a625a8d1c048c3f66653edf217439983d037e7222c4e612819"
  },
  {
    "Symbol": "Crypto.AURORA/USD",
    "PriceID": "0x2f7c4f738d498585065a4b87b637069ec99474597da7f0ca349ba8ac3ba9cac5"
  },
  {
    "Symbol": "Crypto.AUST/UST",
    "PriceID": "0x4cbd623d7aa47003fff1cd75c3f96cb24a660014b697d91cfb7adcd204b95202"
  },
  {
    "Symbol": "Crypto.AUTO/USD",
    "PriceID": "0xc7c60099c12805bea1ae4df2243d6fe72b63be3adeb2208195e844734219967b"
  },
  {
    "Symbol": "Crypto.AVAX/USD",
    "PriceID": "0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7"
  },
  {
    "Symbol": "Crypto.AXS/USD",
    "PriceID": "0xb7e3904c08ddd9c0c10c6d207d390fd19e87eb6aab96304f571ed94caebdefa0"
  },
  {
    "Symbol": "Crypto.BANANA/USD",
    "PriceID": "0x909062e999977099a38fe13f6b691cc541d5378e49ca31880add229570506be2"
  },
  {
    "Symbol": "Crypto.BAR/USD",
    "PriceID": "0x9d23a47f843f5c9284832ae6e76e4aa067dc6072a58f151d39a65a4cc792ef9f"
  },
  {
    "Symbol": "Crypto.BCH/USD",
    "PriceID": "0x3dd2b63686a450ec7290df3a1e0b583c0481f651351edfa7636f39aed55cf8a3"
  },
  {
    "Symbol": "Crypto.BETH/USD",
    "PriceID": "0x7f981f906d7cfe93f618804f1de89e0199ead306edc022d3230b3e8305f391b0"
  },
  {
    "Symbol": "Crypto.BIFI/USD",
    "PriceID": "0x70cd05521e3bdeaee2cadc1360f0d95397f03275f273199be35a029114f53a3b"
  },
  {
    "Symbol": "Crypto.BNB/USD",
    "PriceID": "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f"
  },
  {
    "Symbol": "Crypto.BNX/USD",
    "PriceID": "0x59671f59d12dc81bae078754b7469c7434528a66d3fa91193cf204460c198f9b"
  },
  {
    "Symbol": "Crypto.BRZ/USD",
    "PriceID": "0x1ce9069708fb49e2f1b062fa4f1be0bb151475ca506939d6d8c14386d49f43dc"
  },
  {
    "Symbol": "Crypto.BSW/USD",
    "PriceID": "0x48ce0cf436bac22dad33551dfe2eb7bf9991e419a05f25aed4e90c29c3a1cdbe"
  },
  {
    "Symbol": "Crypto.BTC/USD",
    "PriceID": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"
  },
  {
    "Symbol": "Crypto.BTT/USD",
    "PriceID": "0x097d687437374051c75160d648800f021086bc8edf469f11284491fda8192315"
  },
  {
    "Symbol": "Crypto.BUSD/USD",
    "PriceID": "0x5bc91f13e412c07599167bae86f07543f076a638962b8d6017ec19dab4a82814"
  },
  {
    "Symbol": "Crypto.C98/USD",
    "PriceID": "0x2dd14c7c38aa7066c7a508aac299ebcde5165b07d5d9f2d94dfbfe41f0bc5f2e"
  },
  {
    "Symbol": "Crypto.CAKE/USD",
    "PriceID": "0x2356af9529a1064d41e32d617e2ce1dca5733afa901daba9e2b68dee5d53ecf9"
  },
  {
    "Symbol": "Crypto.CBETH/USD",
    "PriceID": "0x15ecddd26d49e1a8f1de9376ebebc03916ede873447c1255d2d5891b92ce5717"
  },
  {
    "Symbol": "Crypto.CHR/USD",
    "PriceID": "0xbd4dbcbfd90e6bc6c583e07ffcb5cb6d09a0c7b1221805211ace08c837859627"
  },
  {
    "Symbol": "Crypto.CHZ/USD",
    "PriceID": "0xe799f456b358a2534aa1b45141d454ac04b444ed23b1440b778549bb758f2b5c"
  },
  {
    "Symbol": "Crypto.CITY/USD",
    "PriceID": "0x9c479b12a2b2c1051715d4d462dd7a6abbb6dccabf3af31a53f6130a1cd88efc"
  },
  {
    "Symbol": "Crypto.COPE/USD",
    "PriceID": "0x8517b35589b5f1f6ad626da2379ff592d5101b63aa661d75b7a883fdbda023f0"
  },
  {
    "Symbol": "Crypto.COW/USD",
    "PriceID": "0x4e53c6ef1f2f9952facdcf64551edb6d2a550985484ccce6a0477cae4c1bca3e"
  },
  {
    "Symbol": "Crypto.CUSD/USD",
    "PriceID": "0x8f218655050a1476b780185e89f19d2b1e1f49e9bd629efad6ac547a946bf6ab"
  },
  {
    "Symbol": "Crypto.DAI/USD",
    "PriceID": "0xb0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e833f70dabfd"
  },
  {
    "Symbol": "Crypto.DAR/USD",
    "PriceID": "0xd57d90cd8554ea0cf8268de30d5ad67fed9a8f11cce5132a49eb687aed832ea6"
  },
  {
    "Symbol": "Crypto.DOGE/USD",
    "PriceID": "0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c"
  },
  {
    "Symbol": "Crypto.DOT/USD",
    "PriceID": "0xca3eed9b267293f6595901c734c7525ce8ef49adafe8284606ceb307afa2ca5b"
  },
  {
    "Symbol": "Crypto.ETH/USD",
    "PriceID": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"
  },
  {
    "Symbol": "Crypto.FET/USD",
    "PriceID": "0xb98e7ae8af2d298d2651eb21ab5b8b5738212e13efb43bd0dfbce7a74ba4b5d0"
  },
  {
    "Symbol": "Crypto.FIDA/USD",
    "PriceID": "0xc80657b7f6f3eac27218d09d5a4e54e47b25768d9f5e10ac15fe2cf900881400"
  },
  {
    "Symbol": "Crypto.FLOKI/USD",
    "PriceID": "0x6b1381ce7e874dc5410b197ac8348162c0dd6c0d4c9cd6322672d6c2b1d58293"
  },
  {
    "Symbol": "Crypto.FLOW/USD",
    "PriceID": "0x2fb245b9a84554a0f15aa123cbb5f64cd263b59e9a87d80148cbffab50c69f30"
  },
  {
    "Symbol": "Crypto.FTM/USD",
    "PriceID": "0x5c6c0d2386e3352356c3ab84434fafb5ea067ac2678a38a338c4a69ddc4bdb0c"
  },
  {
    "Symbol": "Crypto.FTT/USD",
    "PriceID": "0x6c75e52531ec5fd3ef253f6062956a8508a2f03fa0a209fb7fbc51efd9d35f88"
  },
  {
    "Symbol": "Crypto.GAL/USD",
    "PriceID": "0x301377b122716cee1a498e7930a1836c0b1db84667cc78bbbcbad6c330ea6afb"
  },
  {
    "Symbol": "Crypto.GALA/USD",
    "PriceID": "0x0781209c28fda797616212b7f94d77af3a01f3e94a5d421760aef020cf2bcb51"
  },
  {
    "Symbol": "Crypto.GMT/USD",
    "PriceID": "0xbaa284eaf23edf975b371ba2818772f93dbae72836bbdea28b07d40f3cf8b485"
  },
  {
    "Symbol": "Crypto.GOFX/USD",
    "PriceID": "0x6034b1f68b9363dff2cf9d53b1a88fb4d0929c65f34d532db53738853efc00ad"
  },
  {
    "Symbol": "Crypto.HAY/USD",
    "PriceID": "0x4176cd17d4a1fb517b6535e70084ce85e1bcbe707c66b960c8bd5256accc1b2d"
  },
  {
    "Symbol": "Crypto.HXRO/USD",
    "PriceID": "0x95609d32c98a467a72ac419f2e64bb2b8dbd5b00b74f3a0fd72f42343af1743d"
  },
  {
    "Symbol": "Crypto.INJ/USD",
    "PriceID": "0x7a5bc1d2b56ad029048cd63964b3ad2776eadf812edc1a43a31406cb54bff592"
  },
  {
    "Symbol": "Crypto.INTER/USD",
    "PriceID": "0xa4702f0f5818258783a1e47f453cb20b0fbec32ca67260e1d19dfcdd6a4d0ebb"
  },
  {
    "Symbol": "Crypto.JET/USD",
    "PriceID": "0x81a21b01c15b8d01f6cdfed65e00987cc4c901858c821b2089344987de3102e9"
  },
  {
    "Symbol": "Crypto.JST/USD",
    "PriceID": "0xee42016c303126bd9263724e00f83a8114e84518c6e8ffc9738c001cc301daff"
  },
  {
    "Symbol": "Crypto.JUV/USD",
    "PriceID": "0xabe4f2b264560a397f38eec024369356e5c1ea4f7aab94729369f144b3d97779"
  },
  {
    "Symbol": "Crypto.LAZIO/USD",
    "PriceID": "0xd1d95644ffc11ca502f21e067a7814144c56b37018515ced4335a886a827a305"
  },
  {
    "Symbol": "Crypto.LTC/USD",
    "PriceID": "0x6e3f3fa8253588df9326580180233eb791e03b443a3ba7a1d892e73874e19a54"
  },
  {
    "Symbol": "Crypto.LUNA/USD",
    "PriceID": "0xe6ccd3f878cf338e6732bf59f60943e8ca2c28402fc4d9c258503b2edbe74a31"
  },
  {
    "Symbol": "Crypto.LUNC/USD",
    "PriceID": "0x4456d442a152fd1f972b18459263ef467d3c29fb9d667e30c463b086691fbc79"
  },
  {
    "Symbol": "Crypto.MATIC/USD",
    "PriceID": "0x5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52"
  },
  {
    "Symbol": "Crypto.MBOX/USD",
    "PriceID": "0x1888f463c27997174f97d2a36af29bf4648b61a5f69e67c45505a80f826bb785"
  },
  {
    "Symbol": "Crypto.MDX/USD",
    "PriceID": "0x3b4656b0d92f0e995024c3dacfc28c47d11af83b374a56c26e514e9a7e46a240"
  },
  {
    "Symbol": "Crypto.MEAN/USD",
    "PriceID": "0x27d108eb764c912f49d3453a21dd95516619b1c45d0b607ee58a137ac8a6f32d"
  },
  {
    "Symbol": "Crypto.MER/USD",
    "PriceID": "0xdfaeafde7f8ad3cb9ddbcc85ed7ae7e53910e7ab377fd75921920f97c80a8edc"
  },
  {
    "Symbol": "Crypto.MIR/USD",
    "PriceID": "0x0b46c1c04e9c914037cc4e0561a7e6787f6db0b89b7b65281f0f6fea1ce45a74"
  },
  {
    "Symbol": "Crypto.MNGO/USD",
    "PriceID": "0x5b70af49d639eefe11f20df47a0c0760123291bb5bc55053faf797d1ff905983"
  },
  {
    "Symbol": "Crypto.MSOL/USD",
    "PriceID": "0xc2289a6a43d2ce91c6f55caec370f4acc38a2ed477f58813334c6d03749ff2a4"
  },
  {
    "Symbol": "Crypto.NEAR/USD",
    "PriceID": "0xc415de8d2eba7db216527dff4b60e8f3a5311c740dadb233e13e12547e226750"
  },
  {
    "Symbol": "Crypto.OG/USD",
    "PriceID": "0x05934526b94a9fbe4c4ce0c3792213032f086ee4bf58f2168a7085361af9bdc1"
  },
  {
    "Symbol": "Crypto.OMI/USD",
    "PriceID": "0x06d9fa501fd2bef47265361ca0eaf6e0a97c3b226cea5ab760240f70818581ad"
  },
  {
    "Symbol": "Crypto.ONE/USD",
    "PriceID": "0xc572690504b42b57a3f7aed6bd4aae08cbeeebdadcf130646a692fe73ec1e009"
  },
  {
    "Symbol": "Crypto.ORCA/USD",
    "PriceID": "0x37505261e557e251290b8c8899453064e8d760ed5c65a779726f2490980da74c"
  },
  {
    "Symbol": "Crypto.PINKSALE/USD",
    "PriceID": "0x5f1b1a2920f29635157c1733163f832e35ea5ebaf27552e5106b2f5596f5dd26"
  },
  {
    "Symbol": "Crypto.PORT/USD",
    "PriceID": "0x0afa3199e0899270a74ddcf5cc960d3c6c4414b4ca71024af1a62786dd24f52a"
  },
  {
    "Symbol": "Crypto.PORTO/USD",
    "PriceID": "0x88e2d5cbd2474766abffb2a67a58755a2cc19beb3b309e1ded1e357253aa3623"
  },
  {
    "Symbol": "Crypto.PSG/USD",
    "PriceID": "0x3d253019d38099c0fe918291bd08c9b887f4306a44d7d472c8031529141f275a"
  },
  {
    "Symbol": "Crypto.RACA/USD",
    "PriceID": "0xfd0690232b0fae5efdc402c1b9aac74176383ff7daf87d021554bda24a38e0ec"
  },
  {
    "Symbol": "Crypto.RAY/USD",
    "PriceID": "0x91568baa8beb53db23eb3fb7f22c6e8bd303d103919e19733f2bb642d3e7987a"
  },
  {
    "Symbol": "Crypto.RETH/USD",
    "PriceID": "0xa0255134973f4fdf2f8f7808354274a3b1ebc6ee438be898d045e8b56ba1fe13"
  },
  {
    "Symbol": "Crypto.SBR/USD",
    "PriceID": "0x6ed3c7c4427ae2f91707495fc5a891b30795d93dbb3931782ddd77a5d8cb6db7"
  },
  {
    "Symbol": "Crypto.SCNSOL/USD",
    "PriceID": "0x1021a42d623ab4fe0bf8c47fd21cc10636e39e07f91e9b2478551e137d512aaa"
  },
  {
    "Symbol": "Crypto.SFP/USD",
    "PriceID": "0xc9e9d228f565c226dfb8ed5f5c9c4f57ab32b7ade7226c3239ff20911a9c3a7b"
  },
  {
    "Symbol": "Crypto.SLND/USD",
    "PriceID": "0xf8d030e4ef460b91ad23eabbbb27aec463e3c30ecc8d5c4b71e92f54a36ccdbd"
  },
  {
    "Symbol": "Crypto.SNY/USD",
    "PriceID": "0x9fb0bd29fe51481b61df41e650346cc374b13c2bab2e3610364cd834a592025a"
  },
  {
    "Symbol": "Crypto.SOL/USD",
    "PriceID": "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d"
  },
  {
    "Symbol": "Crypto.SRM/USD",
    "PriceID": "0x23245bb74254e65a98cc3ff4a37443d79f527e44e449750ad304538b006f21bc"
  },
  {
    "Symbol": "Crypto.STETH/USD",
    "PriceID": "0x846ae1bdb6300b817cee5fdee2a6da192775030db5615b94a465f53bd40850b5"
  },
  {
    "Symbol": "Crypto.STNEAR/USD",
    "PriceID": "0x956740a4e169e90bb141abfe93652ae3434693bc7ca43cbcea6471408f19ab90"
  },
  {
    "Symbol": "Crypto.STSOL/USD",
    "PriceID": "0xa1a6465f4c2ebf244c31d80bc95c27345a3424e428c2def33eced9e90d3f701b"
  },
  {
    "Symbol": "Crypto.SWEAT/USD",
    "PriceID": "0x432a52bde005a010dc32c47733e4595fea0ea04df3b5aaa1c45153a527d646f0"
  },
  {
    "Symbol": "Crypto.TAPT/USD",
    "PriceID": "0x5c2416ad4b5fe25c38ea2078927d59dad6a1d4110480c0c96c9b4421744f7507"
  },
  {
    "Symbol": "Crypto.THETA/USD",
    "PriceID": "0xee70804471fe22d029ac2d2b00ea18bbf4fb062958d425e5830fd25bed430345"
  },
  {
    "Symbol": "Crypto.THG/USD",
    "PriceID": "0xa639c04942ebfdeabf25bf1b88d6608ef387219748d77ea130bc2fa486b9614f"
  },
  {
    "Symbol": "Crypto.TLM/USD",
    "PriceID": "0x4457960559b812558bb0f8cb7912f8bcb843eb801a3133ef45be998630ff8c05"
  },
  {
    "Symbol": "Crypto.TUSD/USD",
    "PriceID": "0x433faaa801ecdb6618e3897177a118b273a8e18cc3ff545aadfc207d58d028f7"
  },
  {
    "Symbol": "Crypto.TWT/USD",
    "PriceID": "0x35f1e0d9248599d276111821c0fd636b43eef18737c3bb61c7c5c47059787a32"
  },
  {
    "Symbol": "Crypto.USDC/USD",
    "PriceID": "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"
  },
  {
    "Symbol": "Crypto.USDT/USD",
    "PriceID": "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b"
  },
  {
    "Symbol": "Crypto.USTC/USD",
    "PriceID": "0xef94acc2fb09eb976c6eb3000bab898cab891d5b800702cd1dc88e61d7c3c5e6"
  },
  {
    "Symbol": "Crypto.VAI/USD",
    "PriceID": "0x7507a4629ad0143550666bce2e7cae0b961a0f624f821feaab642fe1be632f5c"
  },
  {
    "Symbol": "Crypto.WIN/USD",
    "PriceID": "0xb216f7ca372b318985903866e0b6dc44a14564828c49f36d0d363805aa76335c"
  },
  {
    "Symbol": "Crypto.WOM/USD",
    "PriceID": "0x43cddc3e1d0b17fec1cf2a230f46e9319887a037dcee56e053af44d8259fb042"
  },
  {
    "Symbol": "Crypto.WOO/USD",
    "PriceID": "0xb82449fd728133488d2d41131cffe763f9c1693b73c544d9ef6aaa371060dd25"
  },
  {
    "Symbol": "Crypto.XVS/USD",
    "PriceID": "0x831624f51c7bd4499fe5e0f16dfa2fd22584ae4bdc496bbbbe9ba831b2d9bce9"
  },
  {
    "Symbol": "Crypto.XWG/USD",
    "PriceID": "0x83a6de4ec10bce1c0515d1aac082fd193f268f0c3b62da0c8ed1286319272415"
  },
  {
    "Symbol": "Crypto.ZBC/USD",
    "PriceID": "0x26852e2d0696e25e6adaad2d7ca3a1f2f15aab68d317ace14d41b4128a7e780f"
  },
  {
    "Symbol": "Equity.US.AAPL/USD",
    "PriceID": "0x49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688"
  },
  {
    "Symbol": "Equity.US.AMC/USD",
    "PriceID": "0x5b1703d7eb9dc8662a61556a2ca2f9861747c3fc803e01ba5a8ce35cb50a13a1"
  },
  {
    "Symbol": "Equity.US.AMGN/USD",
    "PriceID": "0x10946973bfcc936b423d52ee2c5a538d96427626fe6d1a7dae14b1c401d1e794"
  },
  {
    "Symbol": "Equity.US.AMZN/USD",
    "PriceID": "0xb5d0e0fa58a1f8b81498ae670ce93c872d14434b72c364885d4fa1b257cbb07a"
  },
  {
    "Symbol": "Equity.US.AXP/USD",
    "PriceID": "0x9ff7b9a93df40f6d7edc8184173c50f4ae72152c6142f001e8202a26f951d710"
  },
  {
    "Symbol": "Equity.US.BA/USD",
    "PriceID": "0x8419416ba640c8bbbcf2d464561ed7dd860db1e38e51cec9baf1e34c4be839ae"
  },
  {
    "Symbol": "Equity.US.CAT/USD",
    "PriceID": "0xad04597ba688c350a97265fcb60585d6a80ebd37e147b817c94f101a32e58b4c"
  },
  {
    "Symbol": "Equity.US.CRM/USD",
    "PriceID": "0xfeff234600320f4d6bb5a01d02570a9725c1e424977f2b823f7231e6857bdae8"
  },
  {
    "Symbol": "Equity.US.CSCO/USD",
    "PriceID": "0x3f4b77dd904e849f70e1e812b7811de57202b49bc47c56391275c0f45f2ec481"
  },
  {
    "Symbol": "Equity.US.CVX/USD",
    "PriceID": "0xf464e36fd4ef2f1c3dc30801a9ab470dcdaaa0af14dd3cf6ae17a7fca9e051c5"
  },
  {
    "Symbol": "Equity.US.DIS/USD",
    "PriceID": "0x703e36203020ae6761e6298975764e266fb869210db9b35dd4e4225fa68217d0"
  },
  {
    "Symbol": "Equity.US.DOW/USD",
    "PriceID": "0xf3b50961ff387a3d68217e2715637d0add6013e7ecb83c36ae8062f97c46929e"
  },
  {
    "Symbol": "Equity.US.GE/USD",
    "PriceID": "0xe1d3115c6e7ac649faca875b3102f1000ab5e06b03f6903e0d699f0f5315ba86"
  },
  {
    "Symbol": "Equity.US.GME/USD",
    "PriceID": "0x6f9cd89ef1b7fd39f667101a91ad578b6c6ace4579d5f7f285a4b06aa4504be6"
  },
  {
    "Symbol": "Equity.US.GOOG/USD",
    "PriceID": "0xe65ff435be42630439c96396653a342829e877e2aafaeaf1a10d0ee5fd2cf3f2"
  },
  {
    "Symbol": "Equity.US.GS/USD",
    "PriceID": "0x9c68c0c6999765cf6e27adf75ed551b34403126d3b0d5b686a2addb147ed4554"
  },
  {
    "Symbol": "Equity.US.HD/USD",
    "PriceID": "0xb3a83dbe70b62241b0f916212e097465a1b31085fa30da3342dd35468ca17ca5"
  },
  {
    "Symbol": "Equity.US.HON/USD",
    "PriceID": "0x107918baaaafb79cd9df1c8369e44ac21136d95f3ca33f2373b78f24ba1e3e6a"
  },
  {
    "Symbol": "Equity.US.IBM/USD",
    "PriceID": "0xcfd44471407f4da89d469242546bb56f5c626d5bef9bd8b9327783065b43c3ef"
  },
  {
    "Symbol": "Equity.US.INTC/USD",
    "PriceID": "0xc1751e085ee292b8b3b9dd122a135614485a201c35dfc653553f0e28c1baf3ff"
  },
  {
    "Symbol": "Equity.US.JNJ/USD",
    "PriceID": "0x12848738d5db3aef52f51d78d98fc8b8b8450ffb19fb3aeeb67d38f8c147ff63"
  },
  {
    "Symbol": "Equity.US.JPM/USD",
    "PriceID": "0x7f4f157e57bfcccd934c566df536f34933e74338fe241a5425ce561acdab164e"
  },
  {
    "Symbol": "Equity.US.KO/USD",
    "PriceID": "0x9aa471dccea36b90703325225ac76189baf7e0cc286b8843de1de4f31f9caa7d"
  },
  {
    "Symbol": "Equity.US.MCD/USD",
    "PriceID": "0xd3178156b7c0f6ce10d6da7d347952a672467b51708baaf1a57ffe1fb005824a"
  },
  {
    "Symbol": "Equity.US.MMM/USD",
    "PriceID": "0xfd05a384ba19863cbdfc6575bed584f041ef50554bab3ab482eabe4ea58d9f81"
  },
  {
    "Symbol": "Equity.US.MRK/USD",
    "PriceID": "0xc81114e16ec3cbcdf20197ac974aed5a254b941773971260ce09e7caebd6af46"
  },
  {
    "Symbol": "Equity.US.MSFT/USD",
    "PriceID": "0xd0ca23c1cc005e004ccf1db5bf76aeb6a49218f43dac3d4b275e92de12ded4d1"
  },
  {
    "Symbol": "Equity.US.NFLX/USD",
    "PriceID": "0x8376cfd7ca8bcdf372ced05307b24dced1f15b1afafdeff715664598f15a3dd2"
  },
  {
    "Symbol": "Equity.US.NKE/USD",
    "PriceID": "0x67649450b4ca4bfff97cbaf96d2fd9e40f6db148cb65999140154415e4378e14"
  },
  {
    "Symbol": "Equity.US.PG/USD",
    "PriceID": "0xad2fda41998f4e7be99a2a7b27273bd16f183d9adfc014a4f5e5d3d6cd519bf4"
  },
  {
    "Symbol": "Equity.US.QQQ/USD",
    "PriceID": "0x9695e2b96ea7b3859da9ed25b7a46a920a776e2fdae19a7bcfdf2b219230452d"
  },
  {
    "Symbol": "Equity.US.SPY/USD",
    "PriceID": "0x19e09bb805456ada3979a7d1cbb4b6d63babc3a0f8e8a9509f68afa5c4c11cd5"
  },
  {
    "Symbol": "Equity.US.TRV/USD",
    "PriceID": "0xd45392f678a1287b8412ed2aaa326def204a5c234df7cb5552d756c332283d81"
  },
  {
    "Symbol": "Equity.US.TSLA/USD",
    "PriceID": "0x16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1"
  },
  {
    "Symbol": "Equity.US.UNH/USD",
    "PriceID": "0x05380f8817eb1316c0b35ac19c3caa92c9aa9ea6be1555986c46dce97fed6afd"
  },
  {
    "Symbol": "Equity.US.V/USD",
    "PriceID": "0xc719eb7bab9b2bc060167f1d1680eb34a29c490919072513b545b9785b73ee90"
  },
  {
    "Symbol": "Equity.US.VZ/USD",
    "PriceID": "0x6672325a220c0ee1166add709d5ba2e51c185888360c01edc76293257ef68b58"
  },
  {
    "Symbol": "Equity.US.WBA/USD",
    "PriceID": "0xed5c2a2711e2a638573add9a8aded37028aea4ac69f1431a1ced9d9db61b2225"
  },
  {
    "Symbol": "Equity.US.WMT/USD",
    "PriceID": "0x327ae981719058e6fb44e132fb4adbf1bd5978b43db0661bfdaefd9bea0c82dc"
  },
  {
    "Symbol": "FX.AUD/USD",
    "PriceID": "0x67a6f93030420c1c9e3fe37c1ab6b77966af82f995944a9fefce357a22854a80"
  },
  {
    "Symbol": "FX.EUR/USD",
    "PriceID": "0xa995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b"
  },
  {
    "Symbol": "FX.GBP/USD",
    "PriceID": "0x84c2dde9633d93d1bcad84e7dc41c9d56578b7ec52fabedc1f335d673df0a7c1"
  },
  {
    "Symbol": "FX.NZD/USD",
    "PriceID": "0x92eea8ba1b00078cdc2ef6f64f091f262e8c7d0576ee4677572f314ebfafa4c7"
  },
  {
    "Symbol": "FX.USD/CAD",
    "PriceID": "0x3112b03a41c910ed446852aacf67118cb1bec67b2cd0b9a214c58cc0eaa2ecca"
  },
  {
    "Symbol": "FX.USD/CHF",
    "PriceID": "0x0b1e3297e69f162877b577b0d6a47a0d63b2392bc8499e6540da4187a63e28f8"
  },
  {
    "Symbol": "FX.USD/CNH",
    "PriceID": "0xeef52e09c878ad41f6a81803e3640fe04dceea727de894edd4ea117e2e332e66"
  },
  {
    "Symbol": "FX.USD/HKD",
    "PriceID": "0x19d75fde7fee50fe67753fdc825e583594eb2f51ae84e114a5246c4ab23aff4c"
  },
  {
    "Symbol": "FX.USD/JPY",
    "PriceID": "0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52"
  },
  {
    "Symbol": "FX.USD/MXN",
    "PriceID": "0xe13b1c1ffb32f34e1be9545583f01ef385fde7f42ee66049d30570dc866b77ca"
  },
  {
    "Symbol": "FX.USD/RUB",
    "PriceID": "0x2f6144bae52851efb91082911cb6b83f9d8d08cb6ace5625eaac26f638af710b"
  },
  {
    "Symbol": "FX.USD/SGD",
    "PriceID": "0x396a969a9c1480fa15ed50bc59149e2c0075a72fe8f458ed941ddec48bdb4918"
  },
  {
    "Symbol": "FX.USD/ZAR",
    "PriceID": "0x389d889017db82bf42141f23b61b8de938a4e2d156e36312175bebf797f493f1"
  },
  {
    "Symbol": "Metal.XAG/USD",
    "PriceID": "0xf2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e"
  },
  {
    "Symbol": "Metal.XAU/USD",
    "PriceID": "0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2"
  }
]

export const PRICE_MAP = new Map<string, string>()

for (const pair of PRICE_ID_LIST) {
  PRICE_MAP.set(pair.PriceID, pair.Symbol)
}