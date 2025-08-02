// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface ITokenSwap {
    function mint(address _to, uint256 _amount) external;
    function burn(uint256 _amount) external;
    function grantMintAndBurnRoles(address _to) external;
    function mintMock(address _to, uint256 _amount) external;
    function burnMock(uint256 _amount) external;
    function bridgeTokenSenders(uint256 _chainId, uint256 _index) external view returns (address);
    function addBridgeTokenSender(address _bridgeTokenSender) external;
    function getBridgeTokenSendersLength(uint256 _chainId) external view returns (uint256);
}