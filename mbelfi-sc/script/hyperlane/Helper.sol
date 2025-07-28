// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";

contract Helper is Script {
    address public AVAX_USDC = 0xC014F158EbADce5a8e31f634c0eb062Ce8CDaeFe;
    address public AVAX_USDT = 0x1E713E704336094585c3e8228d5A8d82684e4Fb0;
    address public AVAX_WETH = 0x63CFd5c58332c38d89B231feDB5922f5817DF180;
    address public AVAX_WBTC = 0xa7A93C5F0691a5582BAB12C0dE7081C499aECE7f;
    address public AVAX_WXTZ = 0xA61Eb0D33B5d69DC0D0CE25058785796296b1FBd;

    address public ARB_USDC = 0x93Abc28490836C3f50eF44ee7B300E62f4bda8ab;
    address public ARB_USDT = 0x8B34f890d496Ff9FCdcDb113d3d464Ee54c35623;
    address public ARB_WXTZ = 0x64D3ee701c5d649a8a1582f19812416c132c9700;
    address public ARB_WBTC = 0xa998cBD0798F827a5Ed40A5c461E5052c06ff7C6;
    address public ARB_WETH = 0x9eCee5E6a7D23703Ae46bEA8c293Fa63954E8525;

    address public ETHERLINK_USDC = 0xB8DB4FcdD486a031a3B2CA27B588C015CB99F5F0;
    address public ETHERLINK_USDT = 0x2761372682FE39A53A5b1576467a66b258C3fec2;
    address public ETHERLINK_WXTZ = 0x0320aC8A299b3da6469bE3Da9ED6c84D09309418;
    address public ETHERLINK_WBTC = 0x50df5e25AB60e150f753B9444D160a80f0279559;
    address public ETHERLINK_WETH = 0x0355360B7F943974404277936a5C7536B51B9A77;

    address public ORIGIN_USDC = ETHERLINK_USDC;
    address public ORIGIN_USDT = ETHERLINK_USDT;
    address public ORIGIN_WXTZ = ETHERLINK_WXTZ;
    address public ORIGIN_WBTC = ETHERLINK_WBTC;
    address public ORIGIN_WETH = ETHERLINK_WETH;

    address public protocol = 0x0AF08ff73ED8C3666f54b9B8C7044De90Ef2b7cb;
    address public isHealthy = 0x7234365A362e33C93C8E9eeAd107266368C57f0d;
    address public ORIGIN_lendingPoolDeployer = 0xFaE7aC9665bd0F22A3b01C8C4F22B83581Ea4Ba9;
    address public ORIGIN_lendingPoolFactory = 0x6361193Eb93685c0218AD2c698809c99CF6d7e38;
    address public ORIGIN_lendingPool = 0xcE05d498fED4B72620b8D42954002bdEbe65Fb0e;
    address public ORIGIN_position = 0x4aF0b3462411a18934318e7F17E905C77F078b5b;

    address public claimAddress = vm.envAddress("ADDRESS");

    // chain id
    uint256 public ETH_Sepolia = 11155111;
    uint256 public Avalanche_Fuji = 43113;
    uint256 public Arb_Sepolia = 421614;
    uint256 public Base_Sepolia = 84532;
    uint256 public Etherlink_Testnet = 128123;
}
