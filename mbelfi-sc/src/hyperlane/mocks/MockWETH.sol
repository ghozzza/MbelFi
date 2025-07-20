// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {BurnMintERC677} from "@chainlink-evm/contracts/src/v0.8/shared/token/ERC677/BurnMintERC677.sol";
import {IGetCCIPAdmin} from "@chainlink-ccip/chains/evm/contracts/interfaces/IGetCCIPAdmin.sol";
import {IMbelfiBridgeTokenSender} from "../interfaces/IMbelfiBridgeTokenSender.sol";

contract MockWETH is BurnMintERC677, IGetCCIPAdmin {
    error InvalidChainId();

    address public helperTestnet;
    mapping(uint256 => address[]) public bridgeTokenSenders;

    event BridgeTokenSenderAdded(address indexed bridgeTokenSender, uint256 indexed chainId);

    constructor(address _helperTestnet) BurnMintERC677("Wrapped Ethereum", "WETH", 18, 0) {
        helperTestnet = _helperTestnet;
    }

    // this function for hackathon purposes
    function mintMock(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function burnMock(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    function getCCIPAdmin() external view override returns (address) {
        return owner();
    }

    function addBridgeTokenSender(address _bridgeTokenSender) public onlyOwner {
        uint256 _chainId = IMbelfiBridgeTokenSender(_bridgeTokenSender).chainId();
        if (_chainId == 0) revert InvalidChainId();
        bridgeTokenSenders[_chainId].push(_bridgeTokenSender);
        emit BridgeTokenSenderAdded(_bridgeTokenSender, _chainId);
    }

    function getBridgeTokenSendersLength(uint256 _chainId) external view returns (uint256) {
        return bridgeTokenSenders[_chainId].length;
    }
}
