// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IBridgeTokenSender} from "../../src/hyperlane/interfaces/IBridgeTokenSender.sol";
import {IERC20} from "@openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IInterchainGasPaymaster} from "@hyperlane-xyz/interfaces/IInterchainGasPaymaster.sol";
import {BridgeTokenReceiver} from "../../src/hyperlane/learn-hyperlane/BridgeTokenReceiver.sol";
import {BridgeTokenSender} from "../../src/hyperlane/learn-hyperlane/BridgeTokenSender.sol";
import {MockUSDC} from "../../src/hyperlane/mocks/MockUSDC.sol";
import {ITokenSwap} from "../../src/hyperlane/interfaces/ITokenSwap.sol";

contract ShortcutBridgeScript is Script {
    MockUSDC public mockUSDC;
    BridgeTokenReceiver public bridgeTokenReceiver;
    BridgeTokenSender public bridgeTokenSender;

    // ******* ETHERLINK_TESTNET
    address public ETHERLINK_TESTNET_MAILBOX = 0x6F5c23Ba450BcFe1Ae7A1b5816aefF88F3CDA9b0;
    address public ETHERLINK_TESTNET_GAS_PARAM = 0x884523a72A455B533A9c1A07E49a088E34E2AB33;
    uint32 public ETHERLINK_TESTNET_DOMAIN = 128123;

    // ******* BASE_SEPOLIA_DOMAIN
    address public BASE_SEPOLIA_MAILBOX = 0x6966b0E55883d49BFB24539356a2f8A673E02039;
    address public BASE_SEPOLIA_TOKEN_USDC = 0x99B8B801Fb0f371d2B4D426a72bd019b00D6F2d0;
    uint32 public BASE_SEPOLIA_DOMAIN = 84532;

    //******************* Sender Bridge *******************
    //*******************************************************

    //**************** Fill This ****************************
    uint256 public amount = 12e6;
    //*******************************************************

    uint256 public currentChainId = 84532;

    function setUp() public {
        // source chain
        vm.createSelectFork(vm.rpcUrl("etherlink_testnet"));
        // destination chain
        // vm.createSelectFork(vm.rpcUrl("base_sepolia"));
    }

    function run() public payable {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);
        if (block.chainid == currentChainId) {
            bridgeTokenReceiver = new BridgeTokenReceiver(BASE_SEPOLIA_MAILBOX, BASE_SEPOLIA_TOKEN_USDC);
            ITokenSwap(BASE_SEPOLIA_TOKEN_USDC).grantMintAndBurnRoles(address(bridgeTokenReceiver));

            console.log("BridgeTokenReceiver deployed at", address(bridgeTokenReceiver));
        } else {
            mockUSDC = new MockUSDC(address(0));
            console.log("MockUSDC deployed at", address(mockUSDC));
            ITokenSwap(address(mockUSDC)).grantMintAndBurnRoles(vm.envAddress("ADDRESS"));
            mockUSDC.mint(vm.envAddress("ADDRESS"), 100e6);
            console.log("Balance USDC before burn", IERC20(address(mockUSDC)).balanceOf(vm.envAddress("ADDRESS")));
            mockUSDC.burn(1e6);
            console.log("Balance USDC after burn", IERC20(address(mockUSDC)).balanceOf(vm.envAddress("ADDRESS")));
            bridgeTokenSender = new BridgeTokenSender(
                ETHERLINK_TESTNET_MAILBOX,
                address(mockUSDC),
                uint32(84532),
                address(0x545965D649837Ff644f9D819F66057F2777Da37d),
                ETHERLINK_TESTNET_GAS_PARAM
            );
            ITokenSwap(address(mockUSDC)).grantMintAndBurnRoles(address(bridgeTokenSender));
            console.log("BridgeTokenSender deployed at", address(bridgeTokenSender));
            bridge();
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

    // RUN
    // forge script ShortcutBridgeScript --broadcast -vvv
}
