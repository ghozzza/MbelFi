// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDC} from "../../src/hyperlane/mocks/MockUSDC.sol";
import {MockUSDT} from "../../src/hyperlane/mocks/MockUSDT.sol";
import {MockWAVAX} from "../../src/hyperlane/mocks/MockWAVAX.sol";
import {HelperTestnet} from "../../src/hyperlane/HelperTestnet.sol";
import {MbelfiBridgeTokenSender} from "../../src/hyperlane/MbelfiBridgeTokenSender.sol";
import {MbelfiBridgeTokenReceiver} from "../../src/hyperlane/MbelfiBridgeTokenReceiver.sol";
import {MockWBTC} from "../../src/hyperlane/mocks/MockWBTC.sol";
import {MockWETH} from "../../src/hyperlane/mocks/MockWETH.sol";
import {ITokenSwap} from "../../src/hyperlane/interfaces/ITokenSwap.sol";
import {Protocol} from "../../src/hyperlane/Protocol.sol";
import {IsHealthy} from "../../src/hyperlane/IsHealthy.sol";
import {LendingPoolDeployer} from "../../src/hyperlane/LendingPoolDeployer.sol";
import {LendingPoolFactory} from "../../src/hyperlane/LendingPoolFactory.sol";
import {LendingPool} from "../../src/hyperlane/LendingPool.sol";
import {Position} from "../../src/hyperlane/Position.sol";

contract MbelfiScript is Script {
    HelperTestnet public helperTestnet;
    MbelfiBridgeTokenReceiver public mbelfiBridgeTokenReceiver;
    MbelfiBridgeTokenSender public mbelfiBridgeTokenSender;
    MockUSDC public mockUSDC;
    MockUSDT public mockUSDT;
    MockWAVAX public mockWAVAX;
    MockWBTC public mockWBTC;
    MockWETH public mockWETH;

    Protocol public protocol;
    IsHealthy public isHealthy;
    LendingPoolDeployer public lendingPoolDeployer;
    LendingPoolFactory public lendingPoolFactory;
    LendingPool public lendingPool;
    Position public position;

    uint32 public chainId = 84532;

    address public ARB_BtcUsd = 0x56a43EB56Da12C0dc1D972ACb089c06a5dEF8e69;
    address public ARB_EthUsd = 0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165;
    address public ARB_AvaxUsd = 0xe27498c9Cc8541033F265E63c8C29A97CfF9aC6D;
    address public ARB_UsdcUsd = 0x0153002d20B96532C639313c2d54c3dA09109309;
    address public ARB_UsdtUsd = 0x80EDee6f667eCc9f63a0a6f55578F870651f06A4;

    address public baseHelper = 0xbd69Eab11C7B29c8A562b95DB1fB71544dD936d7;
    address public UsdcBridgeTokenReceiver = 0x754617432cb207318B8F574F473Fc26954878e29;
    address public UsdtBridgeTokenReceiver = 0x8af1CEc4b2d4ac81A7A3c7f5CaC0b7073A21867D;
    address public WavaxBridgeTokenReceiver = 0x16411d3f61Db8B88c7D594f5A9a0C5afa0714d62;
    address public BtcBridgeTokenReceiver = 0xa99Ee2aDC20A7298CA3a9331FbCc120175C6518e;
    address public EthBridgeTokenReceiver = 0xfD30B5EF9FE375DD4BC9c2316f4b305a29edA220;
    //   export const BASE_mockWETH =  0xaA456fa44e9DB055dbD470d7E756B6d9870f10a3 ;
    //   export const BASE_mockUSDC =  0x8825408311E71cFe36D4c8f9f9d7441f793A09c7 ;
    //   export const BASE_mockUSDT =  0x248b37ae22Bd3956919a997E17FaecA4B293e4c0 ;
    //   export const BASE_mockWAVAX =  0x1Ed238fE25137808565070CABC9713827B52636c ;
    //   export const BASE_mockWBTC =  0x3C095DB25f880380b0B52BDfE6045A4A5D66135F ;

    bool public isDeployed = false;
    address public arbHelper = isDeployed ? 0x8030dA6FBba0B33D4Ce694B19CD1e1eC50C9d916 : address(0);

    address public ARB_mockUSDC = 0x902bf8CaC2222a8897d07864BEB49C291633B70E;
    address public ARB_mockUSDT = 0x2315a799b5E50b0454fbcA7237a723df4868F606;
    address public ARB_mockWAVAX = 0x0a3Fc1B5194B5564987F8062d1C9EC915B5B11d9;
    address public ARB_mockWBTC = 0xd642a577d77DF95bADE47F6A2329BA9d280400Ea;
    address public ARB_mockWETH = 0x8acFd502E5D1E3747C17f8c61880be64BABAE2dF;

    //   address public arbHelper =  0x8030dA6FBba0B33D4Ce694B19CD1e1eC50C9d916 ;
    //   export const mockUSDC =  0x902bf8CaC2222a8897d07864BEB49C291633B70E ;
    //   export const mockUSDT =  0x2315a799b5E50b0454fbcA7237a723df4868F606 ;
    //   export const mockWAVAX =  0x0a3Fc1B5194B5564987F8062d1C9EC915B5B11d9 ;
    //   export const mockWBTC =  0xd642a577d77DF95bADE47F6A2329BA9d280400Ea ;
    //   export const mockWETH =  0x8acFd502E5D1E3747C17f8c61880be64BABAE2dF ;
    //   export const protocol =  0x0c996cBCd0b81bFC20bf54e3bcCE8Ed4A39ac0Fb ;
    //   export const isHealthy =  0x3e8915376e2afE25915BA66b45AC5df54df61F19 ;
    //   export const lendingPoolDeployer =  0x722Ca412b27f38157e94AC5332A6D90f5aB7c5EF ;
    //   export const lendingPoolFactory =  0xB1fa9e45fBd6668d287FcAfE7ed9f37F7F24a8Ed ;
    //   export const lendingPool =  0x0a97cC170B77362Fd29edC650D0BFf009B7b30eD ;
    //   export const position =  0x616ea99db493b2200b62f13a15675954C0647C8e ;

    function setUp() public {
        // host chain
        vm.createSelectFork(vm.rpcUrl("arb_sepolia"));
        // vm.createSelectFork(vm.rpcUrl("base_sepolia"));
    }

    function run() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);

        if (!isDeployed) {
            deployMockToken();
        }

        if (block.chainid == 84532) {
            console.log("export const BASE_mockWETH = ", address(mockWETH), ";");
            console.log("export const BASE_mockUSDC = ", address(mockUSDC), ";");
            console.log("export const BASE_mockUSDT = ", address(mockUSDT), ";");
            console.log("export const BASE_mockWAVAX = ", address(mockWAVAX), ";");
            console.log("export const BASE_mockWBTC = ", address(mockWBTC), ";");
        } else {
            protocol = new Protocol();
            isHealthy = new IsHealthy();
            lendingPoolDeployer = new LendingPoolDeployer();
            if (!isDeployed) {
                lendingPoolFactory = new LendingPoolFactory(
                    address(isHealthy), address(lendingPoolDeployer), address(protocol), address(helperTestnet)
                );
            } else {
                lendingPoolFactory = new LendingPoolFactory(
                    address(isHealthy), address(lendingPoolDeployer), address(protocol), arbHelper
                );
            }
            if (!isDeployed) {
                lendingPool = new LendingPool(address(mockWETH), address(mockUSDC), address(lendingPoolFactory), 7e17);
                position = new Position(
                    address(mockWETH), address(mockUSDC), address(lendingPool), address(lendingPoolFactory)
                );
            } else {
                lendingPool = new LendingPool(ARB_mockWETH, ARB_mockUSDC, address(lendingPoolFactory), 7e17);
                position = new Position(ARB_mockWETH, ARB_mockUSDC, address(lendingPool), address(lendingPoolFactory));
            }

            lendingPoolDeployer.setFactory(address(lendingPoolFactory));

            if (!isDeployed) {
                lendingPoolFactory.addTokenDataStream(address(mockWETH), ARB_EthUsd);
                lendingPoolFactory.addTokenDataStream(address(mockWBTC), ARB_BtcUsd);
                lendingPoolFactory.addTokenDataStream(address(mockWAVAX), ARB_AvaxUsd);
                lendingPoolFactory.addTokenDataStream(address(mockUSDC), ARB_UsdcUsd);
                lendingPoolFactory.addTokenDataStream(address(mockUSDT), ARB_UsdtUsd);
            } else {
                lendingPoolFactory.addTokenDataStream(ARB_mockWETH, ARB_EthUsd);
                lendingPoolFactory.addTokenDataStream(ARB_mockWBTC, ARB_BtcUsd);
                lendingPoolFactory.addTokenDataStream(ARB_mockWAVAX, ARB_AvaxUsd);
                lendingPoolFactory.addTokenDataStream(ARB_mockUSDC, ARB_UsdcUsd);
                lendingPoolFactory.addTokenDataStream(ARB_mockUSDT, ARB_UsdtUsd);
            }

            console.log("export const protocol = ", address(protocol), ";");
            console.log("export const isHealthy = ", address(isHealthy), ";");
            console.log("export const lendingPoolDeployer = ", address(lendingPoolDeployer), ";");
            console.log("export const lendingPoolFactory = ", address(lendingPoolFactory), ";");
            console.log("export const lendingPool = ", address(lendingPool), ";");
            console.log("export const position = ", address(position), ";");
        }

        vm.stopBroadcast();
    }

    function deployMockToken() public {
        if (block.chainid == 84532) {
            helperTestnet = new HelperTestnet();
            baseHelper = address(helperTestnet);
            console.log("address public baseHelper = ", baseHelper, ";");
        }

        if (block.chainid == 421614) {
            helperTestnet = new HelperTestnet();
            arbHelper = address(helperTestnet);
            console.log("address public arbHelper = ", arbHelper, ";");
        }

        if (block.chainid == 84532) {
            mockUSDC = new MockUSDC(baseHelper);
            mbelfiBridgeTokenReceiver = new MbelfiBridgeTokenReceiver(baseHelper, address(mockUSDC));
            console.log("address public UsdcBridgeTokenReceiver = ", address(mbelfiBridgeTokenReceiver), ";");
        }

        if (block.chainid == 421614) {
            mockUSDC = new MockUSDC(arbHelper);
            pairBridgeToToken(arbHelper, address(mockUSDC), UsdcBridgeTokenReceiver, chainId);
            console.log("export const mockUSDC = ", address(mockUSDC), ";");
        }

        if (block.chainid == 84532) {
            chainId = uint32(block.chainid);
            mockUSDT = new MockUSDT(baseHelper);
            mbelfiBridgeTokenReceiver = new MbelfiBridgeTokenReceiver(baseHelper, address(mockUSDT));
            console.log("address public UsdtBridgeTokenReceiver = ", address(mbelfiBridgeTokenReceiver), ";");
        }

        if (block.chainid == 421614) {
            mockUSDT = new MockUSDT(arbHelper);
            pairBridgeToToken(arbHelper, address(mockUSDT), UsdtBridgeTokenReceiver, chainId);
            console.log("export const mockUSDT = ", address(mockUSDT), ";");
        }

        if (block.chainid == 84532) {
            chainId = uint32(block.chainid);
            mockWAVAX = new MockWAVAX(address(helperTestnet));
            mbelfiBridgeTokenReceiver = new MbelfiBridgeTokenReceiver(address(helperTestnet), address(mockWAVAX));
            console.log("address public WavaxBridgeTokenReceiver = ", address(mbelfiBridgeTokenReceiver), ";");
        }

        if (block.chainid == 421614) {
            mockWAVAX = new MockWAVAX(address(helperTestnet));
            pairBridgeToToken(address(helperTestnet), address(mockWAVAX), WavaxBridgeTokenReceiver, chainId);
            console.log("export const mockWAVAX = ", address(mockWAVAX), ";");
        }

        if (block.chainid == 84532) {
            chainId = uint32(block.chainid);
            mockWBTC = new MockWBTC(baseHelper);
            mbelfiBridgeTokenReceiver = new MbelfiBridgeTokenReceiver(baseHelper, address(mockWBTC));
            console.log("address public BtcBridgeTokenReceiver = ", address(mbelfiBridgeTokenReceiver), ";");
        }
        if (block.chainid == 421614) {
            mockWBTC = new MockWBTC(arbHelper);
            pairBridgeToToken(arbHelper, address(mockWBTC), BtcBridgeTokenReceiver, chainId);
            console.log("export const mockWBTC = ", address(mockWBTC), ";");
        }

        if (block.chainid == 84532) {
            chainId = uint32(block.chainid);
            mockWETH = new MockWETH(baseHelper);
            mbelfiBridgeTokenReceiver = new MbelfiBridgeTokenReceiver(baseHelper, address(mockWETH));
            console.log("address public EthBridgeTokenReceiver = ", address(mbelfiBridgeTokenReceiver), ";");
        }

        if (block.chainid == 421614) {
            mockWETH = new MockWETH(arbHelper);
            pairBridgeToToken(arbHelper, address(mockWETH), EthBridgeTokenReceiver, chainId);
            console.log("export const mockWETH = ", address(mockWETH), ";");
        }
    }

    function pairBridgeToToken(
        address _helperTestnet,
        address _mockToken,
        address _mbelfiBridgeTokenReceiver,
        uint32 _chainId
    ) public {
        mbelfiBridgeTokenSender = new MbelfiBridgeTokenSender(
            _helperTestnet,
            _mockToken,
            _mbelfiBridgeTokenReceiver, // ** otherchain ** RECEIVER BRIDGE
            _chainId // ** otherchain ** CHAIN ID
        );
        ITokenSwap(_mockToken).addBridgeTokenSender(address(mbelfiBridgeTokenSender));
    }

    // RUN
    // forge script MbelfiScript --broadcast --verify

    // Deploy token other chain
    // deploy receiver other chain
    // Pair bridge source chain
}
