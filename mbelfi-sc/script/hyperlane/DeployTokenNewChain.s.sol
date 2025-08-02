// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Helper} from "./Helper.sol";
import {HelperTestnet} from "../../src/hyperlane/HelperTestnet.sol";
import {MbelfiBridgeTokenReceiver} from "../../src/hyperlane/MbelfiBridgeTokenReceiver.sol";
import {MbelfiBridgeTokenSender} from "../../src/hyperlane/MbelfiBridgeTokenSender.sol";
import {MockWBTC} from "../../src/hyperlane/mocks/MockWBTC.sol";
import {MockWETH} from "../../src/hyperlane/mocks/MockWETH.sol";
import {MockUSDC} from "../../src/hyperlane/mocks/MockUSDC.sol";
import {MockUSDT} from "../../src/hyperlane/mocks/MockUSDT.sol";
import {MockWXTZ} from "../../src/hyperlane/mocks/MockWXTZ.sol";

contract DeployTokenNewChainScript is Script, Helper {
    HelperTestnet public helperTestnet;
    MbelfiBridgeTokenReceiver public mbelfiBridgeTokenReceiver;
    MbelfiBridgeTokenSender public mbelfiBridgeTokenSender;
    MockUSDC public mockUSDC;
    MockUSDT public mockUSDT;
    MockWXTZ public mockWXTZ;
    MockWBTC public mockWBTC;
    MockWETH public mockWETH;

    function setUp() public {
        // host chain (etherlink)
        // vm.createSelectFork(vm.rpcUrl("etherlink_testnet"));
        // receiver chain
        vm.createSelectFork(vm.rpcUrl("arb_sepolia"));
        // vm.createSelectFork(vm.rpcUrl("base_sepolia"));
    }

    function run() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);
        helperTestnet = new HelperTestnet();
        mockUSDC = new MockUSDC(address(helperTestnet));
        mbelfiBridgeTokenReceiver = new MbelfiBridgeTokenReceiver(address(helperTestnet), address(mockUSDC));
        console.log("address public UsdcBridgeTokenReceiver = ", address(mbelfiBridgeTokenReceiver), ";");
        mockUSDT = new MockUSDT(address(helperTestnet));
        mbelfiBridgeTokenReceiver = new MbelfiBridgeTokenReceiver(address(helperTestnet), address(mockUSDT));
        console.log("address public UsdtBridgeTokenReceiver = ", address(mbelfiBridgeTokenReceiver), ";");
        mockWXTZ = new MockWXTZ(address(helperTestnet));
        mbelfiBridgeTokenReceiver = new MbelfiBridgeTokenReceiver(address(helperTestnet), address(mockWXTZ));
        console.log("address public WxtzBridgeTokenReceiver = ", address(mbelfiBridgeTokenReceiver), ";");
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
        console.log("address public DESTINATION_mockWXTZ = ", address(mockWXTZ), ";");
        console.log("address public DESTINATION_mockWBTC = ", address(mockWBTC), ";");
        console.log("address public DESTINATION_mockWETH = ", address(mockWETH), ";");
        // **************** JAVASCRIPT ****************
        console.log("************ COPY DESTINATION ADDRESS **************");
        console.log("export const DESTINATION_helperTestnet = ", address(helperTestnet), ";");
        console.log("export const DESTINATION_mockWETH = ", address(mockWETH), ";");
        console.log("export const DESTINATION_mockUSDC = ", address(mockUSDC), ";");
        console.log("export const DESTINATION_mockUSDT = ", address(mockUSDT), ";");
        console.log("export const DESTINATION_mockWXTZ = ", address(mockWXTZ), ";");
        console.log("export const DESTINATION_mockWBTC = ", address(mockWBTC), ";");
        vm.stopBroadcast();
    }

    // RUN
    // forge script DeployTokenNewChainScript --verify --broadcast -vvv
}
