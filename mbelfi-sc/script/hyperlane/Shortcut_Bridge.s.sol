// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IBridgeTokenSender} from "../../src/hyperlane/interfaces/IBridgeTokenSender.sol";
import {IERC20} from "@openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IInterchainGasPaymaster} from "@hyperlane-xyz/interfaces/IInterchainGasPaymaster.sol";

contract ShortcutBridgeScript is Script {
    //******************* Sender Bridge *******************
    // address public ARB_SEPOLIA_SENDER_BRIDGE = 0xd23bB8F4A3541DaC762b139Cd7328376A0cd8288;
    // address public ARB_SEPOLIA_SENDER_BRIDGE =  0xD64eb4435076Ac37f3C43e777D7D7C6B7551f908;
    // address public ARB_SEPOLIA_SENDER_BRIDGE =  0x5454F732917D71984Cb32e192CAD1F3d1f392A62;
    // address public ARB_SEPOLIA_SENDER_BRIDGE =  0x146b1ED5140E08f0FC23D9fB2Dd5b6Ba8A0d573b;
    // address public ARB_SEPOLIA_SENDER_BRIDGE = 0xce5A20045d83FcEBb009A6FF6D620E6Ef209177E; // bisa
    address public ARB_SEPOLIA_SENDER_BRIDGE = 0xC1362c253Ee19ed3289eBE6903002257b3F2c40D;
    //*******************************************************

    //**************** Fill This ****************************
    address public ARB_SEPOLIA_TOKEN_USDC = 0xEB7262b444F450178D25A5690F49bE8E2Fe5A178;
    uint256 public amount = 12e6;
    //*******************************************************

    uint32 public BASE_SEPOLIA_DOMAIN = 84532;
    address public ARB_SEPOLIA_GAS_PARAM = 0xc756cFc1b7d0d4646589EDf10eD54b201237F5e8;

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("arb_sepolia"));
    }

    function run() public payable {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);

        uint256 gasAmount = IInterchainGasPaymaster(ARB_SEPOLIA_GAS_PARAM).quoteGasPayment(BASE_SEPOLIA_DOMAIN, amount);
        console.log("Gas amount", gasAmount);
        console.log("address", vm.envAddress("ADDRESS"));

        uint256 balanceUSDCbefore = IERC20(ARB_SEPOLIA_TOKEN_USDC).balanceOf(vm.envAddress("ADDRESS"));
        console.log("Balance USDC before", balanceUSDCbefore);
        // ******************* Bridge *******************
        IERC20(ARB_SEPOLIA_TOKEN_USDC).approve(ARB_SEPOLIA_SENDER_BRIDGE, amount);
        IBridgeTokenSender(ARB_SEPOLIA_SENDER_BRIDGE).bridge{value: gasAmount}(amount, vm.envAddress("ADDRESS"));
        // **********************************************
        uint256 balanceUSDCafter = IERC20(ARB_SEPOLIA_TOKEN_USDC).balanceOf(vm.envAddress("ADDRESS"));
        console.log("Balance USDC after", balanceUSDCafter);

        vm.stopBroadcast();
    }

    // Function to receive Ether. msg.data must be empty
    receive() external payable {}

    // Fallback function is called when msg.data is not empty
    fallback() external payable {}

    // RUN
    // forge script ShortcutBridgeScript --rpc-url arb_sepolia --broadcast -vvv
}
