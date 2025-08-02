// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IHelperTestnet {
    function chains(uint256 _chainId) external view returns (address, address, uint32);
    function receiverBridge(uint256 _chainId) external view returns (address);
    function addChain(address _mailbox, address _gasMaster, uint32 _domainId, uint256 _chainId) external;
    function addReceiverBridge(uint256 _chainId, address _receiverBridge) external;
}
