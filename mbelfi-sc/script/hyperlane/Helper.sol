// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";

contract Helper is Script {
    address public AVAX_USDC = 0xC014F158EbADce5a8e31f634c0eb062Ce8CDaeFe;
    address public AVAX_USDT = 0x1E713E704336094585c3e8228d5A8d82684e4Fb0;
    address public AVAX_WETH = 0x63CFd5c58332c38d89B231feDB5922f5817DF180;
    address public AVAX_WBTC = 0xa7A93C5F0691a5582BAB12C0dE7081C499aECE7f;
    address public AVAX_WXTZ = 0xA61Eb0D33B5d69DC0D0CE25058785796296b1FBd;

    address public ARB_USDC = 0x902bf8CaC2222a8897d07864BEB49C291633B70E;
    address public ARB_USDT = 0x2315a799b5E50b0454fbcA7237a723df4868F606;
    address public ARB_WXTZ = 0x0a3Fc1B5194B5564987F8062d1C9EC915B5B11d9;
    address public ARB_WBTC = 0xd642a577d77DF95bADE47F6A2329BA9d280400Ea;
    address public ARB_WETH = 0x8acFd502E5D1E3747C17f8c61880be64BABAE2dF;

    address public ETHERLINK_USDC = 0x5410E294CBF68B0C1B8e6B65C908E3e0cC79292B;
    address public ETHERLINK_USDT = 0xf31c4694B4a643151aaF8487bE1aC542E19b1d0f;
    address public ETHERLINK_WXTZ = 0xC5d0A0e61A64CeF4e466239c0c8237308D2a47A8;
    address public ETHERLINK_WBTC = 0x757346A8e145045189aC4AD0F4D73776E5eD3324;
    address public ETHERLINK_WETH = 0xd23bB8F4A3541DaC762b139Cd7328376A0cd8288;

    address public ORIGIN_USDC = ETHERLINK_USDC;
    address public ORIGIN_USDT = ETHERLINK_USDT;
    address public ORIGIN_WXTZ = ETHERLINK_WXTZ;
    address public ORIGIN_WBTC = ETHERLINK_WBTC;
    address public ORIGIN_WETH = ETHERLINK_WETH;

    address public ORIGIN_lendingPoolDeployer = 0xB5AB59B6B50f70532F59C5df4E9Eaadd365c38C9;
    address public ORIGIN_lendingPoolFactory = 0xD64eb4435076Ac37f3C43e777D7D7C6B7551f908;
    address public ORIGIN_lendingPool = 0xF8F2AD5d20be131DC75aFf22aa5c7bfECc2742aE;

    address public claimAddress = vm.envAddress("ADDRESS");

    // chain id
    uint256 public ETH_Sepolia = 11155111;
    uint256 public Avalanche_Fuji = 43113;
    uint256 public Arb_Sepolia = 421614;
    uint256 public Base_Sepolia = 84532;
    uint256 public Etherlink_Testnet = 128123;
}
