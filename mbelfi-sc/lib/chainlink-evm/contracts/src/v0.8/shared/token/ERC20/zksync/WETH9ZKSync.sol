// Submitted for verification at Etherscan.io on 2017-12-12

// Copyright (C) 2015, 2016, 2017 Dapphub

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
pragma solidity ^0.8.0;

/*
  This contract is a copy of WETH9 (vendor/canonical-weth) with the following change:
  - payable(msg.sender).transfer(x) isn't compatible with zkSync Era VM. We replace
    it with a low-level call msg.sender.call{value: x}("")
*/

// solhint-disable
contract WETH9ZKSync {
  string public name = "Wrapped Ether";
  string public symbol = "WETH";
  uint8 public decimals = 18;

  event Approval(address indexed src, address indexed guy, uint256 wad);
  event Transfer(address indexed src, address indexed dst, uint256 wad);
  event Deposit(address indexed dst, uint256 wad);
  event Withdrawal(address indexed src, uint256 wad);

  mapping(address => uint256) public balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;

  receive() external payable {
    _deposit();
  }

  function _deposit() internal {
    balanceOf[msg.sender] += msg.value;
    emit Deposit(msg.sender, msg.value);
  }

  function deposit() external payable {
    _deposit();
  }

  function withdraw(uint256 wad) external {
    require(balanceOf[msg.sender] >= wad);
    balanceOf[msg.sender] -= wad;
    // payable(msg.sender).transfer(wad) should be avoided
    // slither-disable-next-line low-level-calls
    (bool success, ) = msg.sender.call{value: wad}("");
    require(success, "Transfer failed");
    emit Withdrawal(msg.sender, wad);
  }

  function totalSupply() public view returns (uint256) {
    return address(this).balance;
  }

  function approve(address guy, uint256 wad) public returns (bool) {
    allowance[msg.sender][guy] = wad;
    emit Approval(msg.sender, guy, wad);
    return true;
  }

  function transfer(address dst, uint256 wad) public returns (bool) {
    return transferFrom(msg.sender, dst, wad);
  }

  function transferFrom(address src, address dst, uint256 wad) public returns (bool) {
    require(balanceOf[src] >= wad);

    if (src != msg.sender && allowance[src][msg.sender] != type(uint128).max) {
      require(allowance[src][msg.sender] >= wad);
      allowance[src][msg.sender] -= wad;
    }

    balanceOf[src] -= wad;
    balanceOf[dst] += wad;

    emit Transfer(src, dst, wad);

    return true;
  }
}
