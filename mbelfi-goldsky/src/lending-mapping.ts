import {
  ethereum, BigInt, Address
} from '@graphprotocol/graph-ts'

import {
  SupplyLiquidity as SupplyLiquidityEvent,
  WithdrawLiquidity as WithdrawLiquidityEvent,
  BorrowDebtCrosschain as BorrowDebtCrosschainEvent,
  RepayWithCollateralByPosition as RepayWithCollateralByPositionEvent,
  SupplyCollateral as SupplyCollateralEvent,
  CreatePosition as CreatePositionEvent,
} from '../generated/LendingPool/LendingPool'

import {
  LendingPoolCreated as LendingPoolCreatedEvent,
} from '../generated/LendingPoolFactory/LendingPoolFactory'

import {
  LendingPool,
  LendingPoolFactory,
  User,
  LendingPoolCreated,
  SupplyLiquidity,
  WithdrawLiquidity,
  BorrowDebtCrosschain,
  RepayWithCollateralByPosition,
  SupplyCollateral,
  CreatePosition,
} from '../generated/schema'

import { LendingPool as LendingPoolTemplate } from '../generated/templates'

function createEventID(event: ethereum.Event): string {
  return event.block.number.toString().concat('-').concat(event.logIndex.toString());
}

function getOrCreateFactory(factoryAddress: Address): LendingPoolFactory {
  let factory = LendingPoolFactory.load(factoryAddress.toHexString());
  if (factory == null) {
    factory = new LendingPoolFactory(factoryAddress.toHexString());
    factory.address = factoryAddress;
    factory.totalPoolsCreated = BigInt.fromI32(0);
    factory.created = BigInt.fromI32(0);
  }
  return factory as LendingPoolFactory;
}

function getOrCreateUser(userAddress: Address): User {
  let user = User.load(userAddress.toHexString());
  if (user == null) {
    user = new User(userAddress.toHexString());
    user.address = userAddress;
    user.totalDeposited = BigInt.fromI32(0);
    user.totalWithdrawn = BigInt.fromI32(0);
    user.totalBorrowed = BigInt.fromI32(0);
    user.totalRepaid = BigInt.fromI32(0);
  }
  return user as User;
}

function getOrCreatePool(poolAddress: Address): LendingPool {
  let pool = LendingPool.load(poolAddress.toHexString());
  if (pool == null) {
    pool = new LendingPool(poolAddress.toHexString());
    pool.address = poolAddress;
    pool.totalDeposits = BigInt.fromI32(0);
    pool.totalWithdrawals = BigInt.fromI32(0);
    pool.totalBorrows = BigInt.fromI32(0);
    pool.totalRepays = BigInt.fromI32(0);
    pool.created = BigInt.fromI32(0);
  }
  return pool as LendingPool;
}

export function handlePoolCreated(event: LendingPoolCreatedEvent): void {
  let factory = getOrCreateFactory(event.address);
  let pool = getOrCreatePool(event.params.lendingPool);
  let poolCreated = new LendingPoolCreated(createEventID(event));
  
  factory.totalPoolsCreated = factory.totalPoolsCreated.plus(BigInt.fromI32(1));
  factory.save();
  
  pool.factory = factory.id;
  pool.token0 = event.params.collateralToken;
  pool.token1 = event.params.borrowToken;
  pool.created = event.block.timestamp;
  pool.save();

  poolCreated.lendingPool = event.params.lendingPool;
  poolCreated.collateralToken = event.params.collateralToken;
  poolCreated.borrowToken = event.params.borrowToken;
  poolCreated.ltv = event.params.ltv;
  poolCreated.timestamp = event.block.timestamp;
  poolCreated.blockNumber = event.block.number;
  poolCreated.transactionHash = event.transaction.hash;
  poolCreated.save();

  // Create new LendingPool template instance for dynamic pool tracking
  LendingPoolTemplate.create(event.params.lendingPool);
}

export function handleSupplyLiquidity(event: SupplyLiquidityEvent): void {
  let pool = getOrCreatePool(event.address);
  let user = getOrCreateUser(event.params.user);
  let supplyLiquidity = new SupplyLiquidity(createEventID(event));
  
  user.totalDeposited = user.totalDeposited.plus(event.params.amount);
  user.save();
  
  pool.totalDeposits = pool.totalDeposits.plus(event.params.amount);
  pool.save();

  supplyLiquidity.user = user.id;
  supplyLiquidity.pool = pool.id;
  supplyLiquidity.asset = event.address;
  supplyLiquidity.amount = event.params.amount;
  supplyLiquidity.onBehalfOf = event.params.user;
  supplyLiquidity.timestamp = event.block.timestamp;
  supplyLiquidity.blockNumber = event.block.number;
  supplyLiquidity.transactionHash = event.transaction.hash;
  supplyLiquidity.save();
}

export function handleWithdrawLiquidity(event: WithdrawLiquidityEvent): void {
  let pool = getOrCreatePool(event.address);
  let user = getOrCreateUser(event.params.user);
  let withdrawLiquidity = new WithdrawLiquidity(createEventID(event));
  
  user.totalWithdrawn = user.totalWithdrawn.plus(event.params.amount);
  user.save();
  
  pool.totalWithdrawals = pool.totalWithdrawals.plus(event.params.amount);
  pool.save();

  withdrawLiquidity.user = user.id;
  withdrawLiquidity.pool = pool.id;
  withdrawLiquidity.asset = event.address;
  withdrawLiquidity.amount = event.params.amount;
  withdrawLiquidity.to = event.params.user;
  withdrawLiquidity.timestamp = event.block.timestamp;
  withdrawLiquidity.blockNumber = event.block.number;
  withdrawLiquidity.transactionHash = event.transaction.hash;
  withdrawLiquidity.save();
}

export function handleBorrowDebtCrosschain(event: BorrowDebtCrosschainEvent): void {
  let pool = getOrCreatePool(event.address);
  let user = getOrCreateUser(event.params.user);
  let borrowDebtCrosschain = new BorrowDebtCrosschain(createEventID(event));
  
  user.totalBorrowed = user.totalBorrowed.plus(event.params.amount);
  user.save();
  
  pool.totalBorrows = pool.totalBorrows.plus(event.params.amount);
  pool.save();

  borrowDebtCrosschain.user = user.id;
  borrowDebtCrosschain.pool = pool.id;
  borrowDebtCrosschain.asset = event.address;
  borrowDebtCrosschain.amount = event.params.amount;
  borrowDebtCrosschain.borrowRateMode = BigInt.fromI32(1);
  borrowDebtCrosschain.borrowRate = BigInt.fromI32(0);
  borrowDebtCrosschain.onBehalfOf = event.params.user;
  borrowDebtCrosschain.timestamp = event.block.timestamp;
  borrowDebtCrosschain.blockNumber = event.block.number;
  borrowDebtCrosschain.transactionHash = event.transaction.hash;
  borrowDebtCrosschain.save();
}

export function handleRepayWithCollateralByPosition(event: RepayWithCollateralByPositionEvent): void {
  let pool = getOrCreatePool(event.address);
  let user = getOrCreateUser(event.params.user);
  let repayWithCollateralByPosition = new RepayWithCollateralByPosition(createEventID(event));
  
  user.totalRepaid = user.totalRepaid.plus(event.params.amount);
  user.save();
  
  pool.totalRepays = pool.totalRepays.plus(event.params.amount);
  pool.save();

  repayWithCollateralByPosition.user = user.id;
  repayWithCollateralByPosition.pool = pool.id;
  repayWithCollateralByPosition.asset = event.address;
  repayWithCollateralByPosition.amount = event.params.amount;
  repayWithCollateralByPosition.repayer = event.params.user;
  repayWithCollateralByPosition.timestamp = event.block.timestamp;
  repayWithCollateralByPosition.blockNumber = event.block.number;
  repayWithCollateralByPosition.transactionHash = event.transaction.hash;
  repayWithCollateralByPosition.save();
}

export function handleSupplyCollateral(event: SupplyCollateralEvent): void {
  let pool = getOrCreatePool(event.address);
  let user = getOrCreateUser(event.params.user);
  let supplyCollateral = new SupplyCollateral(createEventID(event));
  
  user.totalDeposited = user.totalDeposited.plus(event.params.amount);
  user.save();
  
  pool.totalDeposits = pool.totalDeposits.plus(event.params.amount);
  pool.save();

  supplyCollateral.user = user.id;
  supplyCollateral.pool = pool.id;
  supplyCollateral.asset = event.address;
  supplyCollateral.amount = event.params.amount;
  supplyCollateral.onBehalfOf = event.params.user;
  supplyCollateral.timestamp = event.block.timestamp;
  supplyCollateral.blockNumber = event.block.number;
  supplyCollateral.transactionHash = event.transaction.hash;
  supplyCollateral.save();
}

export function handleCreatePosition(event: CreatePositionEvent): void {
  let pool = getOrCreatePool(event.address);
  let user = getOrCreateUser(event.params.user);
  let createPosition = new CreatePosition(createEventID(event));
  
  user.save();
  pool.save();

  createPosition.user = user.id;
  createPosition.pool = pool.id;
  createPosition.timestamp = event.block.timestamp;
  createPosition.blockNumber = event.block.number;
  createPosition.transactionHash = event.transaction.hash;
  createPosition.save();
}
