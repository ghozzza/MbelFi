// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {IInterchainGasPaymaster} from "@hyperlane-xyz/interfaces/IInterchainGasPaymaster.sol";
import {Position} from "./Position.sol";
import {IFactory} from "./interfaces/IFactory.sol";
import {IPosition} from "./interfaces/IPosition.sol";
import {IIsHealthy} from "./interfaces/IIsHealthy.sol";
import {ITokenSwap} from "./interfaces/ITokenSwap.sol";
import {IMbelfiBridgeTokenSender} from "./interfaces/IMbelfiBridgeTokenSender.sol";
import {IHelperTestnet} from "./interfaces/IHelperTestnet.sol";

contract LendingPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    error InsufficientCollateral();
    error InsufficientLiquidity();
    error InsufficientShares();
    error LTVExceedMaxAmount();
    error PositionAlreadyCreated();
    error TokenNotAvailable();
    error ZeroAmount();
    error InsufficientBorrowShares();
    error amountSharesInvalid();

    event SupplyLiquidity(address user, uint256 amount, uint256 shares);
    event WithdrawLiquidity(address user, uint256 amount, uint256 shares);
    event SupplyCollateral(address user, uint256 amount);
    event RepayWithCollateralByPosition(address user, uint256 amount, uint256 shares);
    event CreatePosition(address user, address positionAddress);
    event BorrowDebtCrosschain(
        address user, uint256 amount, uint256 shares, uint256 chainId, uint256 bridgeTokenSender
    );

    uint256 public totalSupplyAssets;
    uint256 public totalSupplyShares;
    uint256 public totalBorrowAssets;
    uint256 public totalBorrowShares;

    mapping(address => uint256) public userSupplyShares;
    mapping(address => uint256) public userBorrowShares;
    mapping(address => address) public addressPositions;

    address public collateralToken;
    address public borrowToken;
    address public factory;

    uint256 public lastAccrued;
    uint256 public ltv;

    constructor(address _collateralToken, address _borrowToken, address _factory, uint256 _ltv) {
        collateralToken = _collateralToken;
        borrowToken = _borrowToken;
        factory = _factory;
        ltv = _ltv;
    }

    modifier positionRequired() {
        _positionRequired();
        _;
    }

    function _positionRequired() internal {
        if (addressPositions[msg.sender] == address(0)) {
            createPosition();
        }
    }

    /**
     * @notice Creates a new Position contract for the caller if one does not already exist.
     * @dev Each user can have only one Position contract. The Position contract manages collateral and borrowed assets for the user.
     * @custom:throws PositionAlreadyCreated if the caller already has a Position contract.
     * @custom:emits CreatePosition when a new Position is created.
     */
    function createPosition() public {
        if (addressPositions[msg.sender] != address(0)) revert PositionAlreadyCreated();
        Position position = new Position(collateralToken, borrowToken, address(this), factory);
        addressPositions[msg.sender] = address(position);
        emit CreatePosition(msg.sender, address(position));
    }

    /**
     * @notice Supply liquidity to the lending pool by depositing borrow tokens.
     * @dev Users receive shares proportional to their deposit. Shares represent ownership in the pool. Accrues interest before deposit.
     * @param amount The amount of borrow tokens to supply as liquidity.
     * @custom:throws ZeroAmount if amount is 0.
     * @custom:emits SupplyLiquidity when liquidity is supplied.
     */
    function supplyLiquidity(uint256 amount) public nonReentrant {
        if (amount == 0) revert ZeroAmount();
        accrueInterest();
        uint256 shares = 0;
        if (totalSupplyAssets == 0) {
            shares = amount;
        } else {
            shares = (amount * totalSupplyShares) / totalSupplyAssets;
        }

        userSupplyShares[msg.sender] += shares;
        totalSupplyShares += shares;
        totalSupplyAssets += amount;

        IERC20(borrowToken).safeTransferFrom(msg.sender, address(this), amount);

        emit SupplyLiquidity(msg.sender, amount, shares);
    }

    /**
     * @notice Withdraw supplied liquidity by redeeming shares for underlying tokens.
     * @dev Calculates the corresponding asset amount based on the proportion of total shares. Accrues interest before withdrawal.
     * @param _shares The number of supply shares to redeem for underlying tokens.
     * @custom:throws ZeroAmount if _shares is 0.
     * @custom:throws InsufficientShares if user does not have enough shares.
     * @custom:throws InsufficientLiquidity if protocol lacks liquidity after withdrawal.
     * @custom:emits WithdrawLiquidity when liquidity is withdrawn.
     */
    function withdrawLiquidity(uint256 _shares) public nonReentrant {
        if (_shares == 0) revert ZeroAmount();
        if (_shares > userSupplyShares[msg.sender]) revert InsufficientShares();

        accrueInterest();

        uint256 amount = ((_shares * totalSupplyAssets) / totalSupplyShares);

        userSupplyShares[msg.sender] -= _shares;
        totalSupplyShares -= _shares;
        totalSupplyAssets -= amount;

        if (totalSupplyAssets < totalBorrowAssets) {
            revert InsufficientLiquidity();
        }

        IERC20(borrowToken).safeTransfer(msg.sender, amount);

        emit WithdrawLiquidity(msg.sender, amount, _shares);
    }

    /**
     * @notice Internal function to calculate and apply accrued interest to the protocol.
     * @dev Uses a fixed borrow rate of 10% per year. Updates total supply and borrow assets and last accrued timestamp.
     */
    function accrueInterest() public {
        uint256 borrowRate = 10;
        uint256 interestPerYear = (totalBorrowAssets * borrowRate) / 100;
        uint256 elapsedTime = block.timestamp - lastAccrued;
        uint256 interest = (interestPerYear * elapsedTime) / 365 days;
        totalSupplyAssets += interest;
        totalBorrowAssets += interest;
        lastAccrued = block.timestamp;
    }

    /**
     * @notice Supply collateral tokens to the user's position in the lending pool.
     * @dev Transfers collateral tokens from user to their Position contract. Accrues interest before deposit.
     * @param amount The amount of collateral tokens to supply.
     * @custom:throws ZeroAmount if amount is 0.
     * @custom:emits SupplyCollateral when collateral is supplied.
     */
    function supplyCollateral(uint256 amount) public positionRequired nonReentrant {
        if (amount == 0) revert ZeroAmount();
        accrueInterest();
        IERC20(collateralToken).safeTransferFrom(msg.sender, addressPositions[msg.sender], amount);

        emit SupplyCollateral(msg.sender, amount);
    }

    /**
     * @notice Withdraw supplied collateral from the user's position.
     * @dev Transfers collateral tokens from Position contract back to user. Accrues interest before withdrawal.
     * @param amount The amount of collateral tokens to withdraw.
     * @custom:throws ZeroAmount if amount is 0.
     * @custom:throws InsufficientCollateral if user has insufficient collateral balance.
     */
    function withdrawCollateral(uint256 amount) public positionRequired nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (amount > IERC20(collateralToken).balanceOf(addressPositions[msg.sender])) revert InsufficientCollateral();
        accrueInterest();
        address isHealthy = IFactory(factory).isHealthy();
        IPosition(addressPositions[msg.sender]).withdrawCollateral(amount, msg.sender);
        if (userBorrowShares[msg.sender] > 0) {
            IIsHealthy(isHealthy)._isHealthy(
                borrowToken,
                factory,
                addressPositions[msg.sender],
                ltv,
                totalBorrowAssets,
                totalBorrowShares,
                userBorrowShares[msg.sender]
            );
        }
    }

    /**
     * @notice Borrow assets using supplied collateral and optionally send them to a different network.
     * @dev Calculates shares, checks liquidity, and handles cross-chain or local transfers. Accrues interest before borrowing.
     * @param amount The amount of tokens to borrow.
     * @param _chainId The chain id of the destination network.
     * @custom:throws InsufficientLiquidity if protocol lacks liquidity.
     * @custom:emits BorrowDebtCrosschain when borrow is successful.
     */
    function borrowDebt(uint256 amount, uint256 _chainId, uint256 _bridgeTokenSender) public payable nonReentrant {
        accrueInterest();
        uint256 shares = 0;
        if (totalBorrowShares == 0) {
            shares = amount;
        } else {
            shares = ((amount * totalBorrowShares) / totalBorrowAssets);
        }
        userBorrowShares[msg.sender] += shares;
        totalBorrowShares += shares;
        totalBorrowAssets += amount;

        uint256 protocolFee = (amount * 1e15) / 1e18; // 0.1%
        uint256 userAmount = amount - protocolFee;
        address protocol = IFactory(factory).protocol();

        if (totalBorrowAssets > totalSupplyAssets) {
            revert InsufficientLiquidity();
        }
        address isHealthy = IFactory(factory).isHealthy();
        IIsHealthy(isHealthy)._isHealthy(
            borrowToken,
            factory,
            addressPositions[msg.sender],
            ltv,
            totalBorrowAssets,
            totalBorrowShares,
            userBorrowShares[msg.sender]
        );
        if (_chainId != block.chainid) {
            address helperTestnet = IFactory(factory).helper();
            (,, uint32 destinationDomain) = IHelperTestnet(helperTestnet).chains(_chainId);
            (, address interchainGasPaymaster,) = IHelperTestnet(helperTestnet).chains(block.chainid);

            address bridgeTokenSenders = ITokenSwap(borrowToken).bridgeTokenSenders(_chainId, _bridgeTokenSender);
            uint256 gasAmount = IInterchainGasPaymaster(interchainGasPaymaster).quoteGasPayment(destinationDomain, userAmount); // TODO: BURN

            IERC20(borrowToken).approve(bridgeTokenSenders, userAmount);
            IMbelfiBridgeTokenSender(bridgeTokenSenders).bridge{value: gasAmount}(
                userAmount, msg.sender, borrowToken
            );
            IERC20(borrowToken).safeTransfer(protocol, protocolFee);
        } else {
            IERC20(borrowToken).safeTransfer(msg.sender, userAmount);
            IERC20(borrowToken).safeTransfer(protocol, protocolFee);
        }
        emit BorrowDebtCrosschain(msg.sender, amount, shares, _chainId, _bridgeTokenSender);
    }

    /**
     * @notice Repay borrowed assets using a selected token from the user's position.
     * @dev Swaps selected token to borrow token if needed via position contract. Accrues interest before repayment.
     * @param shares The number of borrow shares to repay.
     * @param _token The address of the token to use for repayment.
     * @param _fromPosition Whether to use tokens from the position contract (true) or from the user's wallet (false).
     * @custom:throws ZeroAmount if shares is 0.
     * @custom:throws amountSharesInvalid if shares exceed user's borrow shares.
     * @custom:emits RepayWithCollateralByPosition when repayment is successful.
     */
    function repayWithSelectedToken(uint256 shares, address _token, bool _fromPosition)
        public
        positionRequired
        nonReentrant
    {
        if (shares == 0) revert ZeroAmount();
        if (shares > userBorrowShares[msg.sender]) revert amountSharesInvalid();

        accrueInterest();
        uint256 borrowAmount = ((shares * totalBorrowAssets) / totalBorrowShares);
        userBorrowShares[msg.sender] -= shares;
        totalBorrowShares -= shares;
        totalBorrowAssets -= borrowAmount;
        if (_token == borrowToken && !_fromPosition) {
            IERC20(borrowToken).safeTransferFrom(msg.sender, address(this), borrowAmount);
        } else {
            IPosition(addressPositions[msg.sender]).repayWithSelectedToken(borrowAmount, _token);
        }

        emit RepayWithCollateralByPosition(msg.sender, borrowAmount, shares);
    }

    /**
     * @notice Swap tokens within a user's position.
     * @dev Executes a token swap via the user's Position contract. Accrues interest before swap.
     * @param _tokenFrom The address of the token to swap from.
     * @param _tokenTo The address of the token to receive.
     * @param amountIn The amount of _tokenFrom to swap.
     * @return amountOut The amount of _tokenTo received from the swap.
     * @custom:throws ZeroAmount if amountIn is 0.
     * @custom:throws TokenNotAvailable if _tokenFrom is not available in position.
     */
    function swapTokenByPosition(address _tokenFrom, address _tokenTo, uint256 amountIn)
        public
        positionRequired
        returns (uint256 amountOut)
    {
        if (amountIn == 0) revert ZeroAmount();
        if (_tokenFrom != collateralToken && IPosition(addressPositions[msg.sender]).tokenListsId(_tokenFrom) == 0) {
            revert TokenNotAvailable();
        }
        accrueInterest();
        amountOut = IPosition(addressPositions[msg.sender]).swapTokenByPosition(_tokenFrom, _tokenTo, amountIn);
    }
}
