// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {BridgeTokenSender} from "../../src/hyperlane/learn-hyperlane/BridgeTokenSender.sol";

contract BridgeTokenSenderScript is Script {
    BridgeTokenSender public bridgeTokenSender;
    address public ARB_SEPOLIA_MAILBOX = 0x598facE78a4302f11E3de0bee1894Da0b2Cb71F8;
    address public ARB_SEPOLIA_TOKEN_USDC = 0xEB7262b444F450178D25A5690F49bE8E2Fe5A178;
    uint32 public ARB_SEPOLIA_DOMAIN = 421614;
    uint32 public BASE_SEPOLIA_DOMAIN = 84532;
    address public ARB_SEPOLIA_GAS_PARAM = 0xc756cFc1b7d0d4646589EDf10eD54b201237F5e8;

    //******************* Receiver Bridge *******************
    // address public BASE_SEPOLIA_RECEIVER_BRIDGE = 0xE5e77D5575c0D9BA0934825117a3AFf3f924268B;
    // address public BASE_SEPOLIA_RECEIVER_BRIDGE = 0x108D966C5a686BF9d30C00Ae93FBD07ab4500A2E;
    address public BASE_SEPOLIA_RECEIVER_BRIDGE = 0x26997865FC7963Be61B9D65e1cf1ef7e7F871320;
    //*******************************************************

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("arb_sepolia"));
    }

    function run() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);

        bridgeTokenSender = new BridgeTokenSender(
            ARB_SEPOLIA_MAILBOX,
            ARB_SEPOLIA_TOKEN_USDC,
            BASE_SEPOLIA_DOMAIN,
            BASE_SEPOLIA_RECEIVER_BRIDGE,
            ARB_SEPOLIA_GAS_PARAM
        );

        // console.log("BridgeTokenSender deployed at", address(bridgeTokenSender));

        vm.stopBroadcast();
    }

    // RUN
    // forge script BridgeTokenSenderScript --rpc-url arb_sepolia --broadcast --verify -vvvv
}
