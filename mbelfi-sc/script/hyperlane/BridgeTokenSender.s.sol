// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {BridgeTokenSender} from "../../src/hyperlane/learn-hyperlane/BridgeTokenSender.sol";

contract BridgeTokenSenderScript is Script {
    BridgeTokenSender public bridgeTokenSender;
    address public ETHERLINK_TESTNET_MAILBOX = 0x58545de70CeF725c3F9623f8fAB5e53000Cd3B7D;
    address public ETHERLINK_TESTNET_TOKEN_USDC = 0xEB7262b444F450178D25A5690F49bE8E2Fe5A178;
    uint32 public ETHERLINK_TESTNET_DOMAIN = 128123;
    uint32 public BASE_SEPOLIA_DOMAIN = 84532;
    address public ETHERLINK_TESTNET_GAS_PARAM = 0x58545de70CeF725c3F9623f8fAB5e53000Cd3B7D;

    //******************* Receiver Bridge *******************
    // address public BASE_SEPOLIA_RECEIVER_BRIDGE = 0xE5e77D5575c0D9BA0934825117a3AFf3f924268B;
    // address public BASE_SEPOLIA_RECEIVER_BRIDGE = 0x108D966C5a686BF9d30C00Ae93FBD07ab4500A2E;
    address public BASE_SEPOLIA_RECEIVER_BRIDGE = 0x26997865FC7963Be61B9D65e1cf1ef7e7F871320;
    //*******************************************************

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("etherlink_testnet"));
    }

    function run() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);

        bridgeTokenSender = new BridgeTokenSender(
            ETHERLINK_TESTNET_MAILBOX,
            ETHERLINK_TESTNET_TOKEN_USDC,
            ETHERLINK_TESTNET_DOMAIN,
            BASE_SEPOLIA_RECEIVER_BRIDGE,
            ETHERLINK_TESTNET_GAS_PARAM
        );

        console.log("BridgeTokenSender deployed at", address(bridgeTokenSender));

        vm.stopBroadcast();
    }

    // RUN
    // forge script BridgeTokenSenderScript --rpc-url etherlink_testnet --broadcast --verify -vvvv
}
