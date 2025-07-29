// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IBridgeTokenSender} from "../../src/hyperlane/interfaces/IBridgeTokenSender.sol";
import {IERC20} from "@openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IInterchainGasPaymaster} from "@hyperlane-xyz/interfaces/IInterchainGasPaymaster.sol";
import {BridgeTokenReceiver} from "../../src/hyperlane/learn-hyperlane/BridgeTokenReceiver.sol";
import {BridgeTokenSender} from "../../src/hyperlane/learn-hyperlane/BridgeTokenSender.sol";
import {MockUSDC} from "../../src/hyperlane/mocks/MockUSDC.sol";

contract ShortcutBridgeScript is Script {
    MockUSDC public mockUSDC;
    BridgeTokenReceiver public bridgeTokenReceiver;
    BridgeTokenSender public bridgeTokenSender;

    // ******* ETHERLINK_TESTNET
    address public ETHERLINK_TESTNET_MAILBOX = 0xDfaa17BF52afc5a12d06964555fAAFDADD53FF5e;
    address public ETHERLINK_TESTNET_GAS_PARAM = 0xC4c34aFF9f5dE4D9623349ce8EAc8589cE796fD7;
    uint32 public ETHERLINK_TESTNET_DOMAIN = 128123;

    // ******* BASE_SEPOLIA_DOMAIN
    address public BASE_SEPOLIA_MAILBOX = 0x743Ff3d08e13aF951e4b60017Cf261BFc8457aE4;
    // address public BASE_SEPOLIA_TOKEN_USDC = 0x99B8B801Fb0f371d2B4D426a72bd019b00D6F2d0;
    address public BASE_SEPOLIA_TOKEN_USDC = 0x2193e9b0e6609CFa42d0C48f6c2E1f8cc7b74b6B;
    uint32 public BASE_SEPOLIA_DOMAIN = 84532;

    //******************* Sender Bridge *******************
    //*******************************************************

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
            mockUSDC = new MockUSDC(address(0));
            bridgeTokenReceiver = new BridgeTokenReceiver(BASE_SEPOLIA_MAILBOX, address(mockUSDC));
            console.log("MockUSDC deployed at", address(mockUSDC));
            console.log("BridgeTokenReceiver deployed at", address(bridgeTokenReceiver));
        } else if (block.chainid == 84532) {
            mockUSDC = new MockUSDC(address(0));
            bridgeTokenReceiver = new BridgeTokenReceiver(BASE_SEPOLIA_MAILBOX, address(mockUSDC));
            console.log("MockUSDC deployed at", address(mockUSDC));
            console.log("BridgeTokenReceiver deployed at", address(bridgeTokenReceiver));
        } else if (block.chainid == 128123) {
            mockUSDC = new MockUSDC(address(0));
            console.log("MockUSDC deployed at", address(mockUSDC));
            mockUSDC.mint(vm.envAddress("ADDRESS"), 100e6);
            console.log("Balance USDC before burn", IERC20(address(mockUSDC)).balanceOf(vm.envAddress("ADDRESS")));
            mockUSDC.burn(1e6);
            console.log("Balance USDC after burn", IERC20(address(mockUSDC)).balanceOf(vm.envAddress("ADDRESS")));
            bridgeTokenSender = new BridgeTokenSender(
                ETHERLINK_TESTNET_MAILBOX,
                address(mockUSDC),
                uint32(84532),
                0x58FbE51EA849eB29df555d2F24dAceB1d1104AFd, // base receiver
                ETHERLINK_TESTNET_GAS_PARAM
            );
            console.log("BridgeTokenSender deployed at", address(bridgeTokenSender));
            bridge();
        } else {
            revert("Invalid chain id");
        }
        vm.stopBroadcast();
    }

    function bridge() public {
        uint256 gasAmount = IInterchainGasPaymaster(ETHERLINK_TESTNET_GAS_PARAM).quoteGasPayment(uint32(84532), amount);
        // uint256 gasAmount = IInterchainGasPaymaster(interchainGasPaymaster).quoteGasPayment(uint32(Base_Sepolia), 1000000000000000000);
        console.log("Gas amount", gasAmount);
        console.log("address", vm.envAddress("ADDRESS"));

        uint256 balanceUSDCbefore = IERC20(address(mockUSDC)).balanceOf(vm.envAddress("ADDRESS"));
        console.log("Balance USDC before", balanceUSDCbefore);
        // ******************* Bridge *******************
        IERC20(address(mockUSDC)).approve(address(bridgeTokenSender), amount);
        IBridgeTokenSender(address(bridgeTokenSender)).bridge{value: gasAmount}(amount, vm.envAddress("ADDRESS"));
        // **********************************************
        uint256 balanceUSDCafter = IERC20(address(mockUSDC)).balanceOf(vm.envAddress("ADDRESS"));
        console.log("Balance USDC after", balanceUSDCafter);
    }

    // Function to receive Ether. msg.data must be empty
    receive() external payable {}

    // Fallback function is called when msg.data is not empty
    fallback() external payable {}

    // RUN and verify
    // forge script ShortcutBridgeScript --verify --broadcast -vvv
    // forge script ShortcutBridgeScript --broadcast -vvv
}
