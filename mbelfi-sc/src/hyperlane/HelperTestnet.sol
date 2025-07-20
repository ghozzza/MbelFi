// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HelperTestnet {
    error NotOwner();
    error ChainAlreadyExists();
    error TokenAlreadyExists();
    error TokenNotExists();

    struct ChainInfo {
        address mailbox;
        address gasMaster;
        uint32 domainId;
    }

    mapping(uint256 => ChainInfo) public chains;
    mapping(uint256 => address) public receiverBridge;

    address public owner;

    uint256 public chainId;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        chainId = block.chainid;
        // ABSTRACT
        chains[11124] =
            ChainInfo(0x28f448885bEaaF662f8A9A6c9aF20fAd17A5a1DC, 0xbAaE1B4e953190b05C757F69B2F6C46b9548fa4f, 11124);

        // ALEPH_ZERO
        chains[2039] =
            ChainInfo(0xDDcFEcF17586D08A5740B7D91735fcCE3dfe3eeD, 0x867f2089D09903f208AeCac84E599B90E5a4A821, 2039);

        // ALFAJORES
        chains[44787] =
            ChainInfo(0xEf9F292fcEBC3848bF4bB92a96a04F9ECBb78E59, 0x44769B0f4a6F01339e131a691Cc2eEBBB519d297, 44787);

        // ARBITRUM_SEPOLIA
        chains[421614] =
            ChainInfo(0x598facE78a4302f11E3de0bee1894Da0b2Cb71F8, 0xc756cFc1b7d0d4646589EDf10eD54b201237F5e8, 421614);

        // BASE_SEPOLIA
        chains[84532] =
            ChainInfo(0x6966b0E55883d49BFB24539356a2f8A673E02039, 0x28B02B97a850872C4D33C3E024fab6499ad96564, 84532);

        // BSC_TESTNET
        chains[97] =
            ChainInfo(0xF9F6F5646F478d5ab4e20B0F910C92F1CCC9Cc6D, 0x0dD20e410bdB95404f71c5a4e7Fa67B892A5f949, 97);

        // AVALANCHE FUJI
        chains[43113] =
            ChainInfo(0x5b6CFf85442B851A8e6eaBd2A4E4507B5135B3B0, 0x6895d3916B94b386fAA6ec9276756e16dAe7480E, 43113);

        // HOLESKY
        chains[17000] =
            ChainInfo(0x46f7C5D896bbeC89bE1B19e4485e59b4Be49e9Cc, 0x5CBf4e70448Ed46c2616b04e9ebc72D29FF0cfA9, 17000);

        // OPTIMISM_SEPOLIA
        chains[11155420] =
            ChainInfo(0x6966b0E55883d49BFB24539356a2f8A673E02039, 0x28B02B97a850872C4D33C3E024fab6499ad96564, 11155420);

        // POLYGON_AMOY
        chains[80002] =
            ChainInfo(0x54148470292C24345fb828B003461a9444414517, 0x6c13643B3927C57DB92c790E4E3E7Ee81e13f78C, 80002);

        // SCROLL_SEPOLIA
        chains[534351] =
            ChainInfo(0x3C5154a193D6e2955650f9305c8d80c18C814A68, 0x86fb9F1c124fB20ff130C41a79a432F770f67AFD, 534351);

        // SEPOLIA
        chains[11155111] =
            ChainInfo(0xfFAEF09B3cd11D9b20d1a19bECca54EEC2884766, 0x6f2756380FD49228ae25Aa7F2817993cB74Ecc56, 11155111);

        // UNICHAIN
        chains[1301] =
            ChainInfo(0xDDcFEcF17586D08A5740B7D91735fcCE3dfe3eeD, 0xa3AB7E6cE24E6293bD5320A53329Ef2f4DE73fCA, 1301);

        // SUAVE_TOLIMAN
        chains[33626250] =
            ChainInfo(0xDDcFEcF17586D08A5740B7D91735fcCE3dfe3eeD, 0xA2cf52064c921C11adCd83588CbEa08cc3bfF5d8, 33626250);

        // ODYSSEY
        chains[911867] =
            ChainInfo(0xDDcFEcF17586D08A5740B7D91735fcCE3dfe3eeD, 0xD356C996277eFb7f75Ee8bd61b31cC781A12F54f, 911867);

        // MODE
        chains[919] =
            ChainInfo(0x589C201a07c26b4725A4A829d772f24423da480B, 0xB261C52241E133f957630AeeFEd48a82963AC33e, 919);

        // MEGAETH
        chains[6342] =
            ChainInfo(0xF78deCe5Cf97e1bd61C202A5ba1af33b87454878, 0x638A831b4d11Be6a72AcB97d1aE79DA05Ae9B1D3, 6342);

        // MODE
        chains[919] =
            ChainInfo(0x589C201a07c26b4725A4A829d772f24423da480B, 0xB261C52241E133f957630AeeFEd48a82963AC33e, 919);

        // MONAD
        chains[10143] =
            ChainInfo(0x589C201a07c26b4725A4A829d772f24423da480B, 0x8584590ad637C61C7cDF72eFF3381Ee1c3D1bC8E, 10143);

        // NEURA
        chains[267] =
            ChainInfo(0x589C201a07c26b4725A4A829d772f24423da480B, 0xFb55597F07417b08195Ba674f4dd58aeC9B89FBB, 267);

        // ODYSSEY
        chains[911867] =
            ChainInfo(0xDDcFEcF17586D08A5740B7D91735fcCE3dfe3eeD, 0xD356C996277eFb7f75Ee8bd61b31cC781A12F54f, 911867);

        // OPTIMISM_SEPOLIA
        chains[11155420] =
            ChainInfo(0x6966b0E55883d49BFB24539356a2f8A673E02039, 0x28B02B97a850872C4D33C3E024fab6499ad96564, 11155420);

        // PLUME
        chains[98867] =
            ChainInfo(0xDDcFEcF17586D08A5740B7D91735fcCE3dfe3eeD, 0xD5B70f7Da85F98A5197E55114A38f3eDcDCf020e, 98867);

        // POLYGON_AMOY
        chains[80002] =
            ChainInfo(0x54148470292C24345fb828B003461a9444414517, 0x6c13643B3927C57DB92c790E4E3E7Ee81e13f78C, 80002);

        // ROME
        chains[200018] =
            ChainInfo(0x0b9A4A46f50f91f353B8Aa0F3Ca80E35E253bDd8, 0xe65785c058559bA6D133d1ba1Becac0CBc8aE248, 200018);

        // SCROLL_SEPOLIA
        chains[534351] =
            ChainInfo(0x3C5154a193D6e2955650f9305c8d80c18C814A68, 0x86fb9F1c124fB20ff130C41a79a432F770f67AFD, 534351);

        // SEPOLIA
        chains[11155111] =
            ChainInfo(0xfFAEF09B3cd11D9b20d1a19bECca54EEC2884766, 0x6f2756380FD49228ae25Aa7F2817993cB74Ecc56, 11155111);

        // SOMNIA
        chains[50312] =
            ChainInfo(0x7d498740A4572f2B5c6b0A1Ba9d1d9DbE207e89E, 0x919Af376D02751bFCaD9CBAD6bad0c3089dAE33f, 50312);

        // SONEIUM
        chains[1946] =
            ChainInfo(0xDDcFEcF17586D08A5740B7D91735fcCE3dfe3eeD, 0xA2cf52064c921C11adCd83588CbEa08cc3bfF5d8, 1946);

        // SONIC_BLAZE
        chains[57054] =
            ChainInfo(0x589C201a07c26b4725A4A829d772f24423da480B, 0x39c85C84876479694A2470c0E8075e9d68049aFc, 57054);

        // SONIC
        chains[64165] =
            ChainInfo(0xDDcFEcF17586D08A5740B7D91735fcCE3dfe3eeD, 0xa3AB7E6cE24E6293bD5320A53329Ef2f4DE73fCA, 64165);

        // SUAVE_TOLIMAN
        chains[33626250] =
            ChainInfo(0xDDcFEcF17586D08A5740B7D91735fcCE3dfe3eeD, 0xA2cf52064c921C11adCd83588CbEa08cc3bfF5d8, 33626250);

        // SUBTENSOR
        chains[945] =
            ChainInfo(0x589C201a07c26b4725A4A829d772f24423da480B, 0xB589407cf6bEA5CD81AD0946b9F1467933ede74c, 945);

        // SUPERPOSITION
        chains[98985] =
            ChainInfo(0x6966b0E55883d49BFB24539356a2f8A673E02039, 0xeC7eb4196Bd601DEa7585A744FbFB4CF11278450, 98985);

        // UNICHAIN
        chains[1301] =
            ChainInfo(0xDDcFEcF17586D08A5740B7D91735fcCE3dfe3eeD, 0xa3AB7E6cE24E6293bD5320A53329Ef2f4DE73fCA, 1301);

        // LOAD
        chains[9496] =
            ChainInfo(0x589C201a07c26b4725A4A829d772f24423da480B, 0x8584590ad637C61C7cDF72eFF3381Ee1c3D1bC8E, 9496);
    }

    function addChain(address _mailbox, address _gasMaster, uint32 _domainId, uint256 _chainId) public onlyOwner {
        if (chains[_chainId].mailbox != address(0)) revert ChainAlreadyExists();
        chains[_chainId] = ChainInfo(_mailbox, _gasMaster, _domainId);
    }

    function addReceiverBridge(uint256 _chainId, address _receiverBridge) public onlyOwner {
        receiverBridge[_chainId] = _receiverBridge;
    }
}
