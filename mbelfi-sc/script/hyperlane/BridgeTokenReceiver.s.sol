// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {BridgeTokenReceiver} from "../../src/hyperlane/learn-hyperlane/BridgeTokenReceiver.sol";
import {WrappedToken} from "../../src/hyperlane/WrappedToken.sol";
import {ITokenSwap} from "../../src/hyperlane/interfaces/ITokenSwap.sol";

contract BridgeTokenReceiverScript is Script {
    BridgeTokenReceiver public bridgeTokenReceiver;
    WrappedToken public wrappedToken;

    address public constant BASE_SEPOLIA_MAILBOX = 0x6966b0E55883d49BFB24539356a2f8A673E02039;
    address public constant BASE_SEPOLIA_TOKEN_USDC = 0x99B8B801Fb0f371d2B4D426a72bd019b00D6F2d0;
    uint32 public constant BASE_SEPOLIA_DOMAIN = 84532;

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("base_sepolia"));
    }

    function run() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);

        // Deploy Mailbox
        bridgeTokenReceiver = new BridgeTokenReceiver(BASE_SEPOLIA_MAILBOX, BASE_SEPOLIA_TOKEN_USDC);
        ITokenSwap(BASE_SEPOLIA_TOKEN_USDC).grantMintAndBurnRoles(address(bridgeTokenReceiver));

        console.log("BridgeTokenReceiver deployed at", address(bridgeTokenReceiver));

        vm.stopBroadcast();
    }

    // RUN
    // forge script BridgeTokenReceiverScript --rpc-url base_sepolia --broadcast --verify -vvvv --etherscan-api-key DG7K8I1UG76QJMKKFEQJJ8R7B7X2P81ZI7
}
