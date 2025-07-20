// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";

contract Helper is Script {
    address public AVAX_USDC = 0xC014F158EbADce5a8e31f634c0eb062Ce8CDaeFe;
    address public AVAX_USDT = 0x1E713E704336094585c3e8228d5A8d82684e4Fb0;
    address public AVAX_WETH = 0x63CFd5c58332c38d89B231feDB5922f5817DF180;
    address public AVAX_WBTC = 0xa7A93C5F0691a5582BAB12C0dE7081C499aECE7f;
    address public AVAX_WAVAX = 0xA61Eb0D33B5d69DC0D0CE25058785796296b1FBd;

    address public ARB_USDC = 0x902bf8CaC2222a8897d07864BEB49C291633B70E;
    address public ARB_USDT = 0x2315a799b5E50b0454fbcA7237a723df4868F606;
    address public ARB_WAVAX = 0x0a3Fc1B5194B5564987F8062d1C9EC915B5B11d9;
    address public ARB_WBTC = 0xd642a577d77DF95bADE47F6A2329BA9d280400Ea;
    address public ARB_WETH = 0x8acFd502E5D1E3747C17f8c61880be64BABAE2dF;

    address public ARB_deployer = 0x722Ca412b27f38157e94AC5332A6D90f5aB7c5EF;
    address public ARB_factory = 0xB1fa9e45fBd6668d287FcAfE7ed9f37F7F24a8Ed;
    address public ARB_lp = 0x0a97cC170B77362Fd29edC650D0BFf009B7b30eD;

    address public claimAddress = vm.envAddress("ADDRESS");

    // chain id
    uint256 public ETH_Sepolia = 11155111;
    uint256 public Avalanche_Fuji = 43113;
    uint256 public Arb_Sepolia = 421614;
    uint256 public Base_Sepolia = 84532;
}
