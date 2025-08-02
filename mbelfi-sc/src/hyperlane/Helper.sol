// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Helper {
    // Supported Networks
    enum SupportedNetworks {
        ETHEREUM_SEPOLIA, // 0
        AVALANCHE_FUJI, // 1
        ARBITRUM_SEPOLIA, // 2
        BASE_SEPOLIA // 6
    }

    mapping(SupportedNetworks enumValue => string humanReadableName) public networks;

    enum PayFeesIn {
        Native,
        LINK
    }

    // Chain IDs
    uint64 constant CHAIN_ID_ETHEREUM_SEPOLIA = 16015286601757825753;
    uint64 constant CHAIN_ID_AVALANCHE_FUJI = 14767482510784806043;
    uint64 constant CHAIN_ID_ARBITRUM_SEPOLIA = 3478487238524512106;
    uint64 constant CHAIN_ID_BASE_SEPOLIA = 10344971235874465080;

    // Router addresses
    address constant ROUTER_ETHEREUM_SEPOLIA = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59;
    address constant ROUTER_AVALANCHE_FUJI = 0xF694E193200268f9a4868e4Aa017A0118C9a8177;
    address constant ROUTER_ARBITRUM_SEPOLIA = 0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165;
    address constant ROUTER_BASE_SEPOLIA = 0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93;

    // Link addresses (can be used as fee)
    address constant LINK_ETHEREUM_SEPOLIA = 0x779877A7B0D9E8603169DdbD7836e478b4624789;
    address constant LINK_AVALANCHE_FUJI = 0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846;
    address constant LINK_ARBITRUM_SEPOLIA = 0xb1D4538B4571d411F07960EF2838Ce337FE1E80E;
    address constant LINK_BASE_SEPOLIA = 0xE4aB69C077896252FAFBD49EFD26B5D171A32410;

    constructor() {
        networks[SupportedNetworks.ETHEREUM_SEPOLIA] = "Ethereum Sepolia";
        networks[SupportedNetworks.AVALANCHE_FUJI] = "Avalanche Fuji";
        networks[SupportedNetworks.ARBITRUM_SEPOLIA] = "Arbitrum Sepolia";
        networks[SupportedNetworks.BASE_SEPOLIA] = "Base Sepolia";
    }

    function getConfigFromNetwork(SupportedNetworks network)
        internal
        pure
        returns (address router, address linkToken, address wrappedNative, uint64 chainId)
    {
        if (network == SupportedNetworks.ETHEREUM_SEPOLIA) {
            return (ROUTER_ETHEREUM_SEPOLIA, LINK_ETHEREUM_SEPOLIA, address(0), CHAIN_ID_ETHEREUM_SEPOLIA);
        } else if (network == SupportedNetworks.ARBITRUM_SEPOLIA) {
            return (ROUTER_ARBITRUM_SEPOLIA, LINK_ARBITRUM_SEPOLIA, address(0), CHAIN_ID_ARBITRUM_SEPOLIA);
        } else if (network == SupportedNetworks.AVALANCHE_FUJI) {
            return (ROUTER_AVALANCHE_FUJI, LINK_AVALANCHE_FUJI, address(0), CHAIN_ID_AVALANCHE_FUJI);
        } else if (network == SupportedNetworks.BASE_SEPOLIA) {
            return (ROUTER_BASE_SEPOLIA, LINK_BASE_SEPOLIA, address(0), CHAIN_ID_BASE_SEPOLIA);
        }
    }
}
