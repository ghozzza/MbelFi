// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";

interface IAccountRouter {
    function enrollRemoteRouterAndIsm(uint32 _destinationDomain, bytes32 _router, bytes32 _ism) external;
}

contract ShortcutPairBridgeScript is Script {
    // ******* ETHERLINK_TESTNET
    address public ETHERLINK_TESTNET_MAILBOX = 0xDfaa17BF52afc5a12d06964555fAAFDADD53FF5e;
    uint32 public ETHERLINK_TESTNET_DOMAIN = 128123;
    address public ETHERLINK_TESTNET_ACCOUNT_ROUTER = 0xC4c34aFF9f5dE4D9623349ce8EAc8589cE796fD7;
    address public ETHERLINK_TESTNET_ISM = 0x8fe413C32a6A481f5926460E45d04D07d9Be2700;

    // ******* BASE_SEPOLIA_DOMAIN
    address public BASE_SEPOLIA_MAILBOX = 0x743Ff3d08e13aF951e4b60017Cf261BFc8457aE4;
    uint32 public BASE_SEPOLIA_DOMAIN = 84532;
    address public BASE_SEPOLIA_ACCOUNT_ROUTER = 0x677a021bdf36a7409D02A974cb6E19EE4c2F0632;
    address public BASE_SEPOLIA_ISM = 0x924fF8657070da8e038F0B5867e09aFd7c46D1A9;

    // ******* DESTINATION_CHAIN_DOMAIN
    // ** Deploy hyperlane on new chain
    address public DESTINATION_CHAIN_MAILBOX = BASE_SEPOLIA_MAILBOX;
    uint32 public DESTINATION_CHAIN_DOMAIN = BASE_SEPOLIA_DOMAIN;
    address public DESTINATION_CHAIN_ACCOUNT_ROUTER = BASE_SEPOLIA_ACCOUNT_ROUTER;
    address public DESTINATION_CHAIN_ISM = BASE_SEPOLIA_ISM;


    //**************** Fill This ****************************
    uint256 public amount = 12e6;
    //*******************************************************

    uint256 public currentChainId = 421614;

    function setUp() public {
        // source chain
        vm.createSelectFork(vm.rpcUrl("etherlink_testnet"));

        // destination chain
        // vm.createSelectFork(vm.rpcUrl("base_sepolia"));
        // vm.createSelectFork(vm.rpcUrl("arb_sepolia"));
    }

    function run() public payable {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);
        if (block.chainid == 421614) {
            IAccountRouter(ETHERLINK_TESTNET_ACCOUNT_ROUTER).enrollRemoteRouterAndIsm(
                uint32(DESTINATION_CHAIN_DOMAIN),
                bytes32(uint256(uint160(DESTINATION_CHAIN_ACCOUNT_ROUTER))),
                bytes32(uint256(uint160(DESTINATION_CHAIN_ISM)))
            );
            console.log("Enrolled remote router and ism are successfully on source chain:", block.chainid);
        } else {
            IAccountRouter(DESTINATION_CHAIN_ACCOUNT_ROUTER).enrollRemoteRouterAndIsm(
                uint32(ETHERLINK_TESTNET_DOMAIN),
                bytes32(uint256(uint160(ETHERLINK_TESTNET_ACCOUNT_ROUTER))),
                bytes32(uint256(uint160(ETHERLINK_TESTNET_ISM)))
            );
            console.log("Enrolled remote router and ism are successfully on destination chain:", block.chainid);
        }
        vm.stopBroadcast();
    }

    // Function to receive Ether. msg.data must be empty
    receive() external payable {}

    // Fallback function is called when msg.data is not empty
    fallback() external payable {}

    // RUN and verify
    // forge script ShortcutBridgeScript --verify --broadcast -vvv
    // forge script ShortcutBridgeScript --broadcast -vvv
}

// Warp Route config is valid, writing to file undefined:
