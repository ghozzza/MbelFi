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

    // ****************************************************************************
    //************** DEPLOYED TOKEN ************** (ORIGIN CHAIN)
    address public ORIGIN_helperTestnet = address(0);
    address public ORIGIN_mockUSDC = 0x902bf8CaC2222a8897d07864BEB49C291633B70E;
    address public ORIGIN_mockUSDT = 0x2315a799b5E50b0454fbcA7237a723df4868F606;
    address public ORIGIN_mockWAVAX = 0x0a3Fc1B5194B5564987F8062d1C9EC915B5B11d9;
    address public ORIGIN_mockWBTC = 0xd642a577d77DF95bADE47F6A2329BA9d280400Ea;
    address public ORIGIN_mockWETH = 0x8acFd502E5D1E3747C17f8c61880be64BABAE2dF;

    //************** Price feed ************** (ORIGIN CHAIN)
    address public BtcUsd = 0x56a43EB56Da12C0dc1D972ACb089c06a5dEF8e69;
    address public EthUsd = 0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165;
    address public AvaxUsd = 0xe27498c9Cc8541033F265E63c8C29A97CfF9aC6D;
    address public UsdcUsd = 0x0153002d20B96532C639313c2d54c3dA09109309;
    address public UsdtUsd = 0x80EDee6f667eCc9f63a0a6f55578F870651f06A4;
    // ****************************************************************************

    uint32 public ORIGIN_chainId = 128123;

    // ****************************************************************************
    // ********** FILL THIS
    bool public isDeployed = false;
    uint32 public DESTINATION_chainId = 84532;

    //************** Receiver chain **************
    address public UsdcBridgeTokenReceiver = 0x754617432cb207318B8F574F473Fc26954878e29;
    address public UsdtBridgeTokenReceiver = 0x8af1CEc4b2d4ac81A7A3c7f5CaC0b7073A21867D;
    address public WavaxBridgeTokenReceiver = 0x16411d3f61Db8B88c7D594f5A9a0C5afa0714d62;
    address public BtcBridgeTokenReceiver = 0xa99Ee2aDC20A7298CA3a9331FbCc120175C6518e;
    address public EthBridgeTokenReceiver = address(0);
    // ****************************************************************************

    function setUp() public {
        // host chain (etherlink)
        vm.createSelectFork(vm.rpcUrl("etherlink_testnet"));
        // receiver chain
        // vm.createSelectFork(vm.rpcUrl("arb_sepolia"));
        vm.createSelectFork(vm.rpcUrl("base_sepolia"));
    }

    function run() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);
        if (block.chainid == DESTINATION_chainId) {
            // ** RECEIVER AND TOKEN
            helperTestnet = new HelperTestnet();
            mockUSDC = new MockUSDC(address(helperTestnet));
            mbelfiBridgeTokenReceiver = new MbelfiBridgeTokenReceiver(address(helperTestnet), address(mockUSDC));
            console.log("address public UsdcBridgeTokenReceiver = ", address(mbelfiBridgeTokenReceiver), ";");
            mockUSDT = new MockUSDT(address(helperTestnet));
            mbelfiBridgeTokenReceiver = new MbelfiBridgeTokenReceiver(address(helperTestnet), address(mockUSDT));
            console.log("address public UsdtBridgeTokenReceiver = ", address(mbelfiBridgeTokenReceiver), ";");
            mockWAVAX = new MockWAVAX(address(helperTestnet));
            mbelfiBridgeTokenReceiver = new MbelfiBridgeTokenReceiver(address(helperTestnet), address(mockWAVAX));
            console.log("address public WavaxBridgeTokenReceiver = ", address(mbelfiBridgeTokenReceiver), ";");
            mockWBTC = new MockWBTC(address(helperTestnet));
            mbelfiBridgeTokenReceiver = new MbelfiBridgeTokenReceiver(address(helperTestnet), address(mockWBTC));
            console.log("address public BtcBridgeTokenReceiver = ", address(mbelfiBridgeTokenReceiver), ";");
            mockWETH = new MockWETH(address(helperTestnet));
            mbelfiBridgeTokenReceiver = new MbelfiBridgeTokenReceiver(address(helperTestnet), address(mockWETH));
            console.log("address public EthBridgeTokenReceiver = ", address(mbelfiBridgeTokenReceiver), ";");

            // **************** SOLIDITY ****************
            console.log("************ COPY DESTINATION ADDRESS **************");
            console.log("address public DESTINATION_helperTestnet = ", address(helperTestnet), ";");
            console.log("address public DESTINATION_mockUSDC = ", address(mockUSDC), ";");
            console.log("address public DESTINATION_mockUSDT = ", address(mockUSDT), ";");
            console.log("address public DESTINATION_mockWAVAX = ", address(mockWAVAX), ";");
            console.log("address public DESTINATION_mockWBTC = ", address(mockWBTC), ";");
            console.log("address public DESTINATION_mockWETH = ", address(mockWETH), ";");
            // **************** JAVASCRIPT ****************
            console.log("************ COPY DESTINATION ADDRESS **************");
            console.log("export const DESTINATION_helperTestnet = ", address(helperTestnet), ";");
            console.log("export const DESTINATION_mockWETH = ", address(mockWETH), ";");
            console.log("export const DESTINATION_mockUSDC = ", address(mockUSDC), ";");
            console.log("export const DESTINATION_mockUSDT = ", address(mockUSDT), ";");
            console.log("export const DESTINATION_mockWAVAX = ", address(mockWAVAX), ";");
            console.log("export const DESTINATION_mockWBTC = ", address(mockWBTC), ";");
            // *************************************************
        } else if (block.chainid == ORIGIN_chainId && !isDeployed) {
            protocol = new Protocol();
            isHealthy = new IsHealthy();
            lendingPoolDeployer = new LendingPoolDeployer();
            helperTestnet = new HelperTestnet();

            // **************** DEPLOY TOKEN ******************
            deployMockToken();
            // *************************************************

            lendingPoolFactory = new LendingPoolFactory(
                address(isHealthy), address(lendingPoolDeployer), address(protocol), address(helperTestnet)
            );

            lendingPool = new LendingPool(address(mockWETH), address(mockUSDC), address(lendingPoolFactory), 7e17);
            position =
                new Position(address(mockWETH), address(mockUSDC), address(lendingPool), address(lendingPoolFactory));

            lendingPoolDeployer.setFactory(address(lendingPoolFactory));

            lendingPoolFactory.addTokenDataStream(address(mockWETH), EthUsd);
            lendingPoolFactory.addTokenDataStream(address(mockWBTC), BtcUsd);
            lendingPoolFactory.addTokenDataStream(address(mockWAVAX), AvaxUsd);
            lendingPoolFactory.addTokenDataStream(address(mockUSDC), UsdcUsd);
            lendingPoolFactory.addTokenDataStream(address(mockUSDT), UsdtUsd);
            // **************** SOLIDITY ****************
            console.log("************ COPY ORIGIN ADDRESS **************");
            console.log("address public protocol = ", address(protocol), ";");
            console.log("address public isHealthy = ", address(isHealthy), ";");
            console.log("address public lendingPoolDeployer = ", address(lendingPoolDeployer), ";");
            console.log("address public lendingPoolFactory = ", address(lendingPoolFactory), ";");
            console.log("address public lendingPool = ", address(lendingPool), ";");
            console.log("address public position = ", address(position), ";");
            // **************** JAVASCRIPT ****************
            console.log("************ COPY ORIGIN ADDRESS **************");
            console.log("export const protocol = ", address(protocol), ";");
            console.log("export const isHealthy = ", address(isHealthy), ";");
            console.log("export const lendingPoolDeployer = ", address(lendingPoolDeployer), ";");
            console.log("export const lendingPoolFactory = ", address(lendingPoolFactory), ";");
            console.log("export const lendingPool = ", address(lendingPool), ";");
            console.log("export const position = ", address(position), ";");
        } else if (block.chainid == ORIGIN_chainId && isDeployed) {
            pairBridgeToToken(ORIGIN_helperTestnet, ORIGIN_mockUSDC, UsdcBridgeTokenReceiver, DESTINATION_chainId);
            pairBridgeToToken(ORIGIN_helperTestnet, ORIGIN_mockUSDT, UsdtBridgeTokenReceiver, DESTINATION_chainId);
            pairBridgeToToken(ORIGIN_helperTestnet, ORIGIN_mockWAVAX, WavaxBridgeTokenReceiver, DESTINATION_chainId);
            pairBridgeToToken(ORIGIN_helperTestnet, ORIGIN_mockWBTC, BtcBridgeTokenReceiver, DESTINATION_chainId);
            pairBridgeToToken(ORIGIN_helperTestnet, ORIGIN_mockWETH, EthBridgeTokenReceiver, DESTINATION_chainId);
        }

        vm.stopBroadcast();
    }

    function deployMockToken() public {
        mockUSDC = new MockUSDC(address(helperTestnet));
        pairBridgeToToken(address(helperTestnet), address(mockUSDC), UsdcBridgeTokenReceiver, DESTINATION_chainId);

        mockUSDT = new MockUSDT(address(helperTestnet));
        pairBridgeToToken(address(helperTestnet), address(mockUSDT), UsdtBridgeTokenReceiver, DESTINATION_chainId);

        mockWAVAX = new MockWAVAX(address(helperTestnet));
        pairBridgeToToken(address(helperTestnet), address(mockWAVAX), WavaxBridgeTokenReceiver, DESTINATION_chainId);

        mockWBTC = new MockWBTC(address(helperTestnet));
        pairBridgeToToken(address(helperTestnet), address(mockWBTC), BtcBridgeTokenReceiver, DESTINATION_chainId);

        mockWETH = new MockWETH(address(helperTestnet));
        pairBridgeToToken(address(helperTestnet), address(mockWETH), EthBridgeTokenReceiver, DESTINATION_chainId);
        // **************** SOLIDITY ****************
        console.log("************ COPY DESTINATION ADDRESS **************");
        console.log("address public ORIGIN_helperTestnet = ", address(helperTestnet), ";");
        console.log("address public ORIGIN_mockUSDC = ", address(mockUSDC), ";");
        console.log("address public ORIGIN_mockUSDT = ", address(mockUSDT), ";");
        console.log("address public ORIGIN_mockWAVAX = ", address(mockWAVAX), ";");
        console.log("address public ORIGIN_mockWBTC = ", address(mockWBTC), ";");
        console.log("address public ORIGIN_mockWETH = ", address(mockWETH), ";");
        // **************** JAVASCRIPT ****************
        console.log("************ COPY ORIGIN ADDRESS **************");
        console.log("export const ORIGIN_helperTestnet = ", address(helperTestnet), ";");
        console.log("export const ORIGIN_mockUSDC = ", address(mockUSDC), ";");
        console.log("export const ORIGIN_mockUSDT = ", address(mockUSDT), ";");
        console.log("export const ORIGIN_mockWAVAX = ", address(mockWAVAX), ";");
        console.log("export const ORIGIN_mockWBTC = ", address(mockWBTC), ";");
        console.log("export const ORIGIN_mockWETH = ", address(mockWETH), ";");
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
    // Pair bridge oRIGIN chain
}
