// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IPosition {
    function counter() external view returns (uint256);
    function tokenListsId(address _token) external view returns (uint256);
    function tokenLists(uint256 _index) external view returns (address);
    function listingTradingPosition(address _token, uint256 _price, string memory _name) external;
    function buyTradingPosition(uint256 _price, address _buyer) external;
    function withdrawCollateral(uint256 amount, address _user) external;
    function swapTokenByPosition(address _tokenIn, address _tokenOut, uint256 amountIn) external returns (uint256 amountOut);
    function repayWithSelectedToken(uint256 amount, address _token) external;
    function tokenValue(address token) external view returns (uint256);
}
