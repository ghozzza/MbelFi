// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {LendingPoolDeployer} from "../../src/hyperlane/LendingPoolDeployer.sol";
import {LendingPoolFactory} from "../../src/hyperlane/LendingPoolFactory.sol";
import {LendingPool} from "../../src/hyperlane/LendingPool.sol";
import {Position} from "../../src/hyperlane/Position.sol";
import {MockUSDC} from "../../src/hyperlane/mocks/MockUSDC.sol";
import {MockUSDT} from "../../src/hyperlane/mocks/MockUSDT.sol";
import {MockWBTC} from "../../src/hyperlane/mocks/MockWBTC.sol";
import {MockWETH} from "../../src/hyperlane/mocks/MockWETH.sol";
import {MockWAVAX} from "../../src/hyperlane/mocks/MockWAVAX.sol";
import {HelperTestnet} from "../../src/hyperlane/HelperTestnet.sol";
import {IsHealthy} from "../../src/hyperlane/IsHealthy.sol";
import {Protocol} from "../../src/hyperlane/Protocol.sol";

contract LendingPoolFactoryHyperlaneTest is Test {
    IsHealthy public isHealthy;
    LendingPoolDeployer public lendingPoolDeployer;
    LendingPoolFactory public lendingPoolFactory;
    LendingPool public lendingPool;
    Position public position;
    MockUSDC public usdc;
    MockWBTC public wbtc;
    MockWETH public weth;
    MockUSDT public usdt;
    MockWAVAX public wavax;
    Protocol public protocol;
    HelperTestnet public helperTestnet;

    address public owner = makeAddr("owner");

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    address public ArbBtcUsd = 0x56a43EB56Da12C0dc1D972ACb089c06a5dEF8e69;
    address public ArbEthUsd = 0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165;
    address public ArbAvaxUsd = 0xe27498c9Cc8541033F265E63c8C29A97CfF9aC6D;
    address public ArbUsdcUsd = 0x0153002d20B96532C639313c2d54c3dA09109309;
    address public ArbUsdtUsd = 0x80EDee6f667eCc9f63a0a6f55578F870651f06A4;

    uint256 public chainId = 421614;

    bool priceFeedIsActive = false;

    // RUN
    // forge test --match-contract LendingPoolFactoryHyperlaneTest

    function setUp() public {
        vm.startPrank(alice);
        // vm.createSelectFork("https://api.avax-test.network/ext/bc/C/rpc");
        vm.createSelectFork(vm.rpcUrl("arb_sepolia"));

        isHealthy = new IsHealthy();
        lendingPoolDeployer = new LendingPoolDeployer();
        protocol = new Protocol();
        helperTestnet = new HelperTestnet();

        usdc = new MockUSDC(address(helperTestnet));
        usdt = new MockUSDT(address(helperTestnet));
        wbtc = new MockWBTC(address(helperTestnet));
        weth = new MockWETH(address(helperTestnet));
        wavax = new MockWAVAX(address(helperTestnet));

        lendingPoolFactory = new LendingPoolFactory(
            address(isHealthy), address(lendingPoolDeployer), address(protocol), address(helperTestnet)
        );
        lendingPool = new LendingPool(address(weth), address(usdc), address(lendingPoolFactory), 7e17);
        position = new Position(address(weth), address(usdc), address(lendingPool), address(lendingPoolFactory));

        lendingPoolFactory.addTokenDataStream(address(wbtc), ArbBtcUsd);
        lendingPoolFactory.addTokenDataStream(address(weth), ArbEthUsd);
        lendingPoolFactory.addTokenDataStream(address(wavax), ArbAvaxUsd);
        lendingPoolFactory.addTokenDataStream(address(usdc), ArbUsdcUsd);
        lendingPoolFactory.addTokenDataStream(address(usdt), ArbUsdtUsd);

        lendingPoolDeployer.setFactory(address(lendingPoolFactory));
        vm.stopPrank();

        vm.startPrank(bob);
        lendingPool.createPosition();
        vm.stopPrank();

        usdc.mintMock(alice, 10_000e6);
        weth.mintMock(alice, 100e18);

        usdc.mintMock(bob, 2000e6);
        weth.mintMock(bob, 200e18);
    }

    function test_deployLendingPool() public {
        vm.startPrank(alice);
        lendingPoolFactory.createLendingPool(address(weth), address(usdc), 7e17);
        vm.stopPrank();
    }

    function helper_supply(address _user, address _token, uint256 _amount) public {
        vm.startPrank(_user);
        IERC20(address(_token)).approve(address(lendingPool), _amount);
        lendingPool.supplyLiquidity(_amount);
        vm.stopPrank();
    }

    function helper_supply_borrow() public {
        vm.startPrank(alice);
        IERC20(address(usdc)).approve(address(lendingPool), 1000e6);
        lendingPool.supplyLiquidity(1000e6);
        vm.stopPrank();

        vm.startPrank(bob);
        IERC20(address(weth)).approve(address(lendingPool), 150e18);
        lendingPool.supplyCollateral(150e18);
        lendingPool.borrowDebt(500e6, chainId, 0);
        vm.stopPrank();
    }

    function helper_repay() public {
        helper_supply_borrow();

        vm.startPrank(bob);
        IERC20(address(usdc)).approve(address(lendingPool), 500e6);
        lendingPool.repayWithSelectedToken(454e6, address(usdc), false); // 454 shares setara 499.4
        vm.stopPrank();

        vm.startPrank(bob);
        IERC20(address(usdc)).approve(address(lendingPool), 300e6);
        lendingPool.repayWithSelectedToken(46e6, address(usdc), false); // 46 shares setara 50.6
        vm.stopPrank();
    }

    function test_isHealthy() public {
        vm.startPrank(alice);
        IERC20(address(usdc)).approve(address(lendingPool), 10_000e6);
        lendingPool.supplyLiquidity(10_000e6);
        vm.stopPrank();

        vm.startPrank(bob);
        IERC20(address(weth)).approve(address(lendingPool), 1e18);
        lendingPool.supplyCollateral(1e18);

        vm.expectRevert(IsHealthy.InsufficientCollateral.selector);
        lendingPool.borrowDebt(3000e6, chainId, 0);

        lendingPool.borrowDebt(100e6, chainId, 0);

        assertEq(lendingPool.userBorrowShares(bob), 100e6);
        vm.stopPrank();
    }

    function test_borrow() public {
        // bob borrow 100 usdc
        uint256 borrowed = 100e6;
        uint256 lended = 1e18;

        // alice supplies 10000 usdc as liquidity
        helper_supply(alice, address(usdc), 10_000e6);

        // Record Bob's balances before
        uint256 tempBobBalanceUSDC = IERC20(address(usdc)).balanceOf(bob);
        uint256 tempBobBalanceWETH = IERC20(address(weth)).balanceOf(bob);

        // Bob supplies 1 WETH as collateral
        vm.startPrank(bob);
        IERC20(address(weth)).approve(address(lendingPool), lended);
        lendingPool.supplyCollateral(lended);

        // Expect BorrowDebtCrosschain event
        vm.expectEmit(true, true, false, true, address(lendingPool));
        emit LendingPool.BorrowDebtCrosschain(bob, borrowed, borrowed, chainId, 0);

        // Bob borrows USDC
        uint256 protocolFee = (borrowed * 1e15) / 1e18;
        lendingPool.borrowDebt(borrowed, chainId, 0);

        // Record Bob's balances after
        uint256 tempBobBalanceUSDC2 = IERC20(address(usdc)).balanceOf(bob);
        uint256 tempBobBalanceWETH2 = IERC20(address(weth)).balanceOf(bob);
        vm.stopPrank();

        // Assert Bob's balances changed as expected
        assertEq(tempBobBalanceUSDC2 - tempBobBalanceUSDC, borrowed - protocolFee, "Bob should receive borrowed USDC");
        assertEq(tempBobBalanceWETH - lended, tempBobBalanceWETH2, "Bob's WETH should decrease by lended amount");

        // Assert LendingPool state
        assertEq(lendingPool.totalBorrowAssets(), borrowed, "Total borrow assets should match borrowed amount");
        assertEq(lendingPool.totalBorrowShares(), borrowed, "Total borrow shares should match borrowed amount");
        assertEq(lendingPool.userBorrowShares(bob), borrowed, "Bob's borrow shares should match borrowed amount");

        // TODO: uncomment this when we have a way to get the price of the collateral token and position token
        // Try to borrow more than available liquidity, expect revert
        // vm.startPrank(bob);
        // IERC20(address(weth)).approve(address(lendingPool), 20e18);
        // lendingPool.supplyCollateral(20e18);
        // vm.expectRevert(LendingPool.InsufficientLiquidity.selector);
        // lendingPool.borrowDebt(20_000e6, chainId, 0);
        // vm.stopPrank();

        // Try to borrow with zero collateral (should revert if enforced)
        address charlie = makeAddr("charlie");
        usdc.mintMock(charlie, 1000e6);
        weth.mintMock(charlie, 10e18);
        vm.startPrank(charlie);
        lendingPool.createPosition();
        // No collateral supplied
        vm.expectRevert(LendingPool.InsufficientCollateral.selector); // Should revert due to insufficient collateral or similar
        lendingPool.borrowDebt(100e6, chainId, 0);
        vm.stopPrank();
    }

    function test_withdrawLiquidity() public {
        // alice supply 1000 usdc
        helper_supply(alice, address(usdc), 1000e6);
        uint256 aliceBalanceAfterSupply = IERC20(address(usdc)).balanceOf(alice);
        uint256 aliceSharesAfterSupply = lendingPool.userSupplyShares(alice);
        uint256 poolTotalAssetsBefore = lendingPool.totalSupplyAssets();
        uint256 poolTotalSharesBefore = lendingPool.totalSupplyShares();
        uint256 withdrawAmount = 400e6;

        // Check initial state
        assertEq(aliceSharesAfterSupply, 1000e6, "Alice should have 1000 shares after supply");
        assertEq(poolTotalAssetsBefore, 1000e6, "Pool should have 1000 USDC assets after supply");
        assertEq(poolTotalSharesBefore, 1000e6, "Pool should have 1000 shares after supply");

        vm.startPrank(alice);
        // zero Amount
        vm.expectRevert(LendingPool.ZeroAmount.selector);
        lendingPool.withdrawLiquidity(0);

        // insufficient shares
        vm.expectRevert(LendingPool.InsufficientShares.selector);
        lendingPool.withdrawLiquidity(10_000e6);

        // Expect WithdrawLiquidity event
        vm.expectEmit(true, true, true, true, address(lendingPool));
        emit LendingPool.WithdrawLiquidity(alice, 400e6, 400e6);
        lendingPool.withdrawLiquidity(withdrawAmount);

        // Check state after partial withdrawal
        uint256 aliceSharesAfterPartial = lendingPool.userSupplyShares(alice);
        uint256 poolTotalAssetsAfterPartial = lendingPool.totalSupplyAssets();
        uint256 poolTotalSharesAfterPartial = lendingPool.totalSupplyShares();
        assertEq(aliceSharesAfterPartial, 600e6, "Alice should have 600 shares after withdrawing 400");
        assertEq(poolTotalAssetsAfterPartial, 600e6, "Pool should have 600 USDC assets after withdrawal");
        assertEq(poolTotalSharesAfterPartial, 600e6, "Pool should have 600 shares after withdrawal");
        assertEq(
            IERC20(address(usdc)).balanceOf(alice),
            aliceBalanceAfterSupply + withdrawAmount,
            "Alice's balance should increase by withdrawn amount"
        );

        // Withdraw the rest
        vm.expectEmit(true, true, true, true, address(lendingPool));
        emit LendingPool.WithdrawLiquidity(alice, 600e6, 600e6);
        lendingPool.withdrawLiquidity(600e6);
        vm.stopPrank();

        // After full withdrawal, Alice should have 0 shares and pool should be empty
        assertEq(lendingPool.userSupplyShares(alice), 0, "Alice should have 0 shares after full withdrawal");
        assertEq(lendingPool.totalSupplyAssets(), 0, "Pool should have 0 assets after full withdrawal");
        assertEq(lendingPool.totalSupplyShares(), 0, "Pool should have 0 shares after full withdrawal");
        assertEq(
            IERC20(address(usdc)).balanceOf(alice),
            aliceBalanceAfterSupply + 1000e6,
            "Alice's balance should be restored to initial + 1000 USDC"
        );
    }

    function test_repay() public {
        helper_supply_borrow();

        // Warp 1 year to accrue interest

        vm.warp(block.timestamp + 365 days);

        // Try zero repay
        vm.startPrank(bob);
        IERC20(address(usdc)).approve(address(lendingPool), 1);
        vm.expectRevert(LendingPool.ZeroAmount.selector);
        lendingPool.repayWithSelectedToken(0, address(usdc), false);
        vm.stopPrank();

        // Try over-repay
        vm.startPrank(bob);
        IERC20(address(usdc)).approve(address(lendingPool), 1_000_000e6);
        vm.expectRevert(); // Should revert due to insufficient shares
        lendingPool.repayWithSelectedToken(1_000_000e6, address(usdc), false);
        vm.stopPrank();

        // Partial repay
        vm.startPrank(bob);
        IERC20(address(usdc)).approve(address(lendingPool), 500e6);
        vm.expectEmit(true, true, true, true, address(lendingPool));
        emit LendingPool.RepayWithCollateralByPosition(bob, 499400000, 454e6); // 454 shares = 499.4 USDC
        lendingPool.repayWithSelectedToken(454e6, address(usdc), false);
        vm.stopPrank();

        // Check state after partial repay
        assertEq(lendingPool.userBorrowShares(bob), 46e6, "Bob's borrow shares should be 46e6 after partial repay");
        assertEq(lendingPool.totalBorrowShares(), 46e6, "Total borrow shares should be 46e6 after partial repay");
        assertEq(
            lendingPool.totalBorrowAssets(), 50_600_000, "Total borrow assets should be 50.6e6 after partial repay"
        );

        // Full repay
        vm.startPrank(bob);
        IERC20(address(usdc)).approve(address(lendingPool), 51e6);
        vm.expectEmit(true, true, true, true, address(lendingPool));
        emit LendingPool.RepayWithCollateralByPosition(bob, 50_600_000, 46e6); // 46 shares = 50.6 USDC
        lendingPool.repayWithSelectedToken(46e6, address(usdc), false);
        vm.stopPrank();

        // Check state after full repay
        assertEq(lendingPool.userBorrowShares(bob), 0, "Bob's borrow shares should be 0 after full repay");
        assertEq(lendingPool.totalBorrowShares(), 0, "Total borrow shares should be 0 after full repay");
        assertEq(lendingPool.totalBorrowAssets(), 0, "Total borrow assets should be 0 after full repay");
    }

    function test_part2_repay() public {
        console.log("----- before borrow");
        console.log("balance bob usdc", IERC20(address(usdc)).balanceOf(bob));
        console.log("total borrow shares before", lendingPool.totalBorrowShares()); // 0
        console.log("total borrow assets before", lendingPool.totalBorrowAssets()); // 0
        console.log("total supply assets before", lendingPool.totalSupplyAssets()); // 0
        console.log("user borrow shares before", lendingPool.userBorrowShares(bob)); // 0
        console.log("-----");

        helper_supply_borrow();

        vm.warp(block.timestamp + 365 days);

        console.log("------ after borrow 500 USDC + warp 365 days");
        console.log("balance bob usdc", IERC20(address(usdc)).balanceOf(bob));
        console.log("total borrow shares before", lendingPool.totalBorrowShares()); // 500e6
        console.log("total borrow assets before", lendingPool.totalBorrowAssets()); // 550e6
        console.log("total supply assets before", lendingPool.totalSupplyAssets()); // 1050e6
        console.log("user borrow shares before", lendingPool.userBorrowShares(bob)); // 500e6
        console.log("-----");

        vm.startPrank(bob);
        console.log("------ check balance of position weth");
        console.log(
            "balance of position weth before swap", IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob))
        );
        console.log(
            "lending pool collaterals before swap", IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob))
        );
        console.log("-----");
        lendingPool.swapTokenByPosition(address(weth), address(usdc), 0.1e18);
        console.log("------ weth swap to usdc");
        console.log(
            "balance of position weth after swap", IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob))
        );
        console.log(
            "lending pool collaterals after swap", IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob))
        );
        console.log("position usdc IERC20 balance", IERC20(address(usdc)).balanceOf(lendingPool.addressPositions(bob)));
        console.log("-----");

        console.log("------ usdc swap to weth");
        console.log(
            "bob's collaterals on lending pool", IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob))
        );
        console.log(
            "balance of position weth before swap", IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob))
        );
        console.log(
            "balance of position usdc before swap", IERC20(address(usdc)).balanceOf(lendingPool.addressPositions(bob))
        );
        lendingPool.swapTokenByPosition(address(usdc), address(weth), 100e6);
        console.log(
            "bob's collaterals on lending pool after swap",
            IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob))
        );
        console.log(
            "balance of position weth after swap", IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob))
        );
        console.log(
            "balance of position usdc after swap", IERC20(address(usdc)).balanceOf(lendingPool.addressPositions(bob))
        );
        console.log("-----");

        console.log("------ after repay using weth");
        console.log(
            "bob's collaterals on lending pool before repay",
            IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob))
        );
        console.log(
            "bob's position before repay weth", IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob))
        );
        lendingPool.repayWithSelectedToken(50e6, address(weth), true); // 50 shares == 55 USDC
        console.log(
            "bob's collaterals on lending pool after repay",
            IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob))
        );
        console.log(
            "bob's position after repay weth", IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob))
        );

        vm.stopPrank();
    }

    function test_part3_repay() public {
        console.log("----- before borrow");
        console.log("total borrow shares before", lendingPool.totalBorrowShares()); // 0
        console.log("total borrow assets before", lendingPool.totalBorrowAssets()); // 0
        console.log("total supply assets before", lendingPool.totalSupplyAssets()); // 0
        console.log("user borrow shares before", lendingPool.userBorrowShares(bob)); // 0
        console.log("-----");

        helper_supply_borrow();
        vm.warp(block.timestamp + 365 days);

        console.log("----- after borrow 500 USDC + warp 365 days");
        console.log("balance bob usdc", IERC20(address(usdc)).balanceOf(bob));
        console.log("total borrow shares before", lendingPool.totalBorrowShares()); // 500e6
        console.log("total borrow assets before", lendingPool.totalBorrowAssets()); // 550e6
        console.log("total supply assets before", lendingPool.totalSupplyAssets()); // 1050e6
        console.log("user borrow shares before", lendingPool.userBorrowShares(bob)); // 500e6
        console.log("-----");

        vm.startPrank(bob);
        console.log(
            "lending pool collaterals before swap", IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob))
        );
        console.log(
            "position usdc balance before swap",
            IERC20(address(usdc)).balanceOf(lendingPool.addressPositions(bob)) / 1e6
        );
        lendingPool.swapTokenByPosition(address(weth), address(usdc), 15e18);
        console.log("----- weth swap to usdc");
        console.log(
            "lending pool collaterals after swap", IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob))
        );
        console.log("position usdc balance", IERC20(address(usdc)).balanceOf(lendingPool.addressPositions(bob)) / 1e6);
        console.log("-----");

        lendingPool.repayWithSelectedToken(45e6, address(weth), true);
        console.log("----- repay with weth");
        console.log("lending pool collaterals", IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob)));
        console.log("total borrow shares", lendingPool.totalBorrowShares());
        console.log("-----");

        lendingPool.repayWithSelectedToken(45e6, address(usdc), true);
        console.log("----- repay with usdc");
        console.log("total borrow shares", lendingPool.totalBorrowShares());
        console.log("position usdc balance", IERC20(address(usdc)).balanceOf(lendingPool.addressPositions(bob)) / 1e6);
        console.log("-----");
        vm.stopPrank();
    }

    function test_part4_repay() public {
        vm.startPrank(bob);
        // --------- supply collateral
        IERC20(address(weth)).approve(address(lendingPool), 1e18);
        lendingPool.supplyCollateral(1e18);

        // --------- supply liquidity
        IERC20(address(usdc)).approve(address(lendingPool), 1000e6);
        lendingPool.supplyLiquidity(1000e6);

        // --------- check balance
        console.log("bob balance weth", IERC20(address(weth)).balanceOf(bob));
        console.log("bob balance weth position", IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob)));
        console.log("bob balance usdc position", IERC20(address(usdc)).balanceOf(lendingPool.addressPositions(bob)));

        // --------- supply collateral
        IERC20(address(weth)).approve(address(lendingPool), 1e18);
        lendingPool.supplyCollateral(1e18);

        // --------- check balance
        console.log("bob balance weth", IERC20(address(weth)).balanceOf(bob));
        console.log("bob balance weth position", IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob)));
        console.log("bob balance usdc position", IERC20(address(usdc)).balanceOf(lendingPool.addressPositions(bob)));
        // ------------------------------------------------------------------------------------------
        // swap v2
        // approve weth
        address addressPosition = lendingPool.addressPositions(bob);
        console.log("--------------------------------");
        console.log("position balance weth before swap", IERC20(address(weth)).balanceOf(addressPosition));
        console.log("position balance usdc before swap", IERC20(address(usdc)).balanceOf(addressPosition));

        // IPosition(addressPosition).swapTokenByPositionV2(address(wethBaseMain), address(usdcBaseMain), 1e18, 1000);
        lendingPool.swapTokenByPosition(address(weth), address(usdc), 1e18);
        console.log("--------------------------------");
        console.log("position balance weth after swap", IERC20(address(weth)).balanceOf(addressPosition));
        console.log("position balance usdc after swap", IERC20(address(usdc)).balanceOf(addressPosition));
        console.log("--------------------------------");

        //check balance
        console.log("bob balance weth before withdraw collateral", IERC20(address(weth)).balanceOf(bob)); //108.00000000000000
        console.log("--------------------------------");

        //withdraw collateral
        lendingPool.withdrawCollateral(1e18);

        //check balance
        console.log("bob balance weth after withdraw collateral", IERC20(address(weth)).balanceOf(bob)); //109.000000000000000000
        console.log("positionbalance weth after withdraw collateral", IERC20(address(weth)).balanceOf(addressPosition));
        console.log("--------------------------------");

        console.log("bob balance usdc before borrow", IERC20(address(usdc)).balanceOf(bob));
        console.log("--------------------------------");
        lendingPool.borrowDebt(700e6, chainId, 0);
        console.log("bob balance usdc after borrow", IERC20(address(usdc)).balanceOf(bob));
        console.log("--------------------------------");

        // repay with selected token
        console.log("position balance usdc before repay", IERC20(address(usdc)).balanceOf(addressPosition));
        console.log("--------------------------------");
        lendingPool.repayWithSelectedToken(500e6, address(usdc), true);
        console.log("position balance usdc after repay", IERC20(address(usdc)).balanceOf(addressPosition));
        console.log("--------------------------------");

        vm.stopPrank();
    }

    function test_withdraw_withshares() public {
        helper_repay();

        console.log("alice balance before", IERC20(address(usdc)).balanceOf(alice));
        vm.startPrank(alice);
        // zero Amount
        vm.expectRevert(LendingPool.ZeroAmount.selector);
        lendingPool.withdrawLiquidity(0);

        // insufficient shares
        vm.expectRevert(LendingPool.InsufficientShares.selector);
        lendingPool.withdrawLiquidity(10_000e6);

        lendingPool.withdrawLiquidity(1000e6); // 1000 shares setara 1050 usdc
        vm.stopPrank();
    }

    function test_web_flow() public {
        vm.startPrank(bob);

        IERC20(address(usdc)).approve(address(lendingPool), 1000e6);
        lendingPool.supplyLiquidity(1000e6);

        console.log("----------------------------------------------------------------");
        console.log("Bob supply Shares", lendingPool.totalSupplyShares());
        console.log("Bob supply Assets", lendingPool.totalSupplyAssets());
        console.log("----------------------------------------------------------------");

        IERC20(address(weth)).approve(address(lendingPool), 5e18);
        lendingPool.supplyCollateral(5e18);

        console.log("----------------------------------------------------------------");
        console.log("Bob supply Assets 5eth", IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob)));
        console.log("----------------------------------------------------------------");

        lendingPool.borrowDebt(500e6, chainId, 0);
        console.log("----------------------------------------------------------------");
        console.log("Bob borrow shares", lendingPool.userBorrowShares(bob));
        console.log("Bob borrow assets", lendingPool.totalBorrowAssets());
        console.log("----------------------------------------------------------------");

        vm.warp(block.timestamp + 365 days);

        console.log("----------------------------------------------------------------");
        console.log("Bob supply Shares", lendingPool.totalSupplyShares());
        console.log("Bob supply Assets", lendingPool.totalSupplyAssets());
        console.log("Bob borrow shares", lendingPool.userBorrowShares(bob));
        console.log("Bob borrow assets", lendingPool.totalBorrowAssets());
        console.log("----------------------------------------------------------------");

        lendingPool.swapTokenByPosition(address(weth), address(usdc), 1e18);

        console.log("----------------------------------------------------------------");
        console.log("Bob weth", IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob)));
        console.log("Bob borrow shares", lendingPool.userBorrowShares(bob));
        console.log("Bob borrow assets", lendingPool.totalBorrowAssets());
        console.log("Bob usdc ierc 20", IERC20(address(usdc)).balanceOf(lendingPool.addressPositions(bob)));
        console.log("Bob usdc position", IERC20(address(usdc)).balanceOf(lendingPool.addressPositions(bob)));
        console.log("----------------------------------------------------------------");
        lendingPool.repayWithSelectedToken(100e6, address(usdc), true);

        console.log("----------------------------------------------------------------");
        console.log("Bob weth", IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob)));
        console.log("Bob borrow shares", lendingPool.userBorrowShares(bob));
        console.log("Bob borrow assets", lendingPool.totalBorrowAssets());
        console.log("Bob usdc ierc 20", IERC20(address(usdc)).balanceOf(lendingPool.addressPositions(bob)));
        console.log("Bob usdc position", IERC20(address(usdc)).balanceOf(lendingPool.addressPositions(bob)));
        console.log("----------------------------------------------------------------");
        vm.warp(block.timestamp + 365 days);

        lendingPool.borrowDebt(100e6, chainId, 0);
        console.log("----------------------------------------------------------------");
        console.log("Bob weth", IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob)));
        console.log("Bob borrow shares", lendingPool.userBorrowShares(bob));
        console.log("Bob borrow assets", lendingPool.totalBorrowAssets());
        console.log("Bob usdc ierc 20", IERC20(address(usdc)).balanceOf(lendingPool.addressPositions(bob)));
        console.log("Bob usdc position", IERC20(address(usdc)).balanceOf(lendingPool.addressPositions(bob)));
        console.log("----------------------------------------------------------------");

        vm.warp(block.timestamp + 365 days);

        lendingPool.repayWithSelectedToken(100e6, address(usdc), true);
        console.log("----------------------------------------------------------------");
        console.log("Bob weth", IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob)));
        console.log("Bob borrow shares", lendingPool.userBorrowShares(bob));
        console.log("Bob borrow assets", lendingPool.totalBorrowAssets());
        console.log("Bob usdc ierc 20", IERC20(address(usdc)).balanceOf(lendingPool.addressPositions(bob)));
        console.log("Bob usdc position", IERC20(address(usdc)).balanceOf(lendingPool.addressPositions(bob)));
        console.log("----------------------------------------------------------------");

        vm.stopPrank();
    }

    function test_scenarios() public {
        helper_supply(alice, address(usdc), 10_000e6);

        vm.startPrank(bob);

        IERC20(address(weth)).approve(address(lendingPool), 10e18);
        lendingPool.supplyCollateral(10e18);
        assertEq(IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob)), 10e18);
        lendingPool.borrowDebt(2000e6, chainId, 0);
        assertEq(lendingPool.userBorrowShares(bob), 2000e6);

        // vm.expectRevert(LendingPool.PositionUnavailable.selector);
        lendingPool.swapTokenByPosition(address(weth), address(wbtc), 0.1e18);
        assertEq(IERC20(address(weth)).balanceOf(lendingPool.addressPositions(bob)), 9.9e18);
        vm.stopPrank();
    }

    function test_counting_interest_rate() public {
        helper_supply_borrow();
        vm.warp(block.timestamp + 365 days);
        lendingPool.accrueInterest();
        assertEq(lendingPool.totalSupplyAssets(), 1050e6);
    }
}
