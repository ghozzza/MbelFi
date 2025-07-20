// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console} from "forge-std/Script.sol";
import {Helper} from "./Helper.sol";
import {ITokenSwap} from "../../src/hyperlane/interfaces/ITokenSwap.sol";

contract MockTokenGrantBurnMint is Script, Helper {
    function setUp() public {
        // host chain
        vm.createSelectFork(vm.rpcUrl("arb_sepolia"));
        // vm.createSelectFork(vm.rpcUrl("base_sepolia"));
    }

    function run() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);
        address tokenSenderUSDC = ITokenSwap(ARB_USDC).bridgeTokenSenders(84532, 0);
        ITokenSwap(ARB_USDC).grantMintAndBurnRoles(tokenSenderUSDC);
        // console.log("address Sender Usdc", tokenSenderUSDC);
        address tokenSenderUSDT = ITokenSwap(ARB_USDT).bridgeTokenSenders(84532, 0);
        ITokenSwap(ARB_USDT).grantMintAndBurnRoles(tokenSenderUSDT);
        // console.log("address Sender Usdt", tokenSenderUSDT);
        address tokenSenderWAVAX = ITokenSwap(ARB_WAVAX).bridgeTokenSenders(84532, 0);
        ITokenSwap(ARB_WAVAX).grantMintAndBurnRoles(tokenSenderWAVAX);
        // console.log("address Sender Wavax", tokenSenderWAVAX);
        address tokenSenderWBTC = ITokenSwap(ARB_WBTC).bridgeTokenSenders(84532, 0);
        ITokenSwap(ARB_WBTC).grantMintAndBurnRoles(tokenSenderWBTC);
        // console.log("address Sender Wbtc", tokenSenderWBTC);
        address tokenSenderWETH = ITokenSwap(ARB_WETH).bridgeTokenSenders(84532, 0);
        ITokenSwap(ARB_WETH).grantMintAndBurnRoles(tokenSenderWETH);
        // console.log("address Sender Weth", tokenSenderWETH);
        vm.stopBroadcast();
    }
    // RUN
    // forge script MockTokenGrantBurnMint -vvv --broadcast
}
