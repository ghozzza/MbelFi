# Goldsky API Integration Setup

This guide explains how to set up and use the Goldsky API for transaction history in your DeFi application.

## 🚀 Overview

The history page uses Goldsky's GraphQL API to fetch and display transaction history from your subgraph. This provides real-time, indexed blockchain data for better user experience.

## 📋 Prerequisites

1. **Goldsky Account**: Sign up at [goldsky.com](https://goldsky.com)
2. **Subgraph**: Deploy your subgraph to Goldsky
3. **API Key**: Get your Goldsky API key from the dashboard

## 🔧 Environment Setup

### 1. Environment Variables

Add these to your `.env.local` file:

```bash
# Goldsky API Configuration
NEXT_PUBLIC_GOLDSKY_API_KEY=your_goldsky_api_key_here
NEXT_PUBLIC_GOLDSKY_ENDPOINT=https://api.goldsky.com/api/public/project_YOUR_PROJECT_ID/subgraphs/name/YOUR_SUBGRAPH_NAME/gn
```

### 2. Get Your API Key

1. Go to [Goldsky Dashboard](https://app.goldsky.com)
2. Navigate to your project
3. Go to "API Keys" section
4. Copy your API key

### 3. Get Your Endpoint URL

1. In your Goldsky dashboard, go to your subgraph
2. Copy the GraphQL endpoint URL
3. Replace `YOUR_PROJECT_ID` and `YOUR_SUBGRAPH_NAME` in the endpoint

## 📊 Subgraph Schema

Your subgraph should include these entities for the history page to work properly:

```graphql
type Transaction @entity {
  id: ID!
  hash: String!
  blockNumber: BigInt!
  timestamp: BigInt!
  from: String!
  to: String!
  value: BigInt!
  gasUsed: BigInt!
  gasPrice: BigInt!
  status: String!
  methodName: String!
  tokenSymbol: String
  tokenName: String
  chainId: BigInt!
  contractAddress: String
  functionName: String
  functionSignature: String
  inputData: String
  outputData: String
  logs: [Log!]! @derivedFrom(field: "transaction")
  events: [Event!]! @derivedFrom(field: "transaction")
}

type Log @entity {
  id: ID!
  logIndex: BigInt!
  transactionHash: String!
  transaction: Transaction!
  address: String!
  data: String!
  topics: [String!]!
  blockNumber: BigInt!
  blockHash: String!
}

type Event @entity {
  id: ID!
  name: String!
  signature: String!
  topic0: String!
  topic1: String
  topic2: String
  topic3: String
  data: String!
  transaction: Transaction!
}
```

## 🎯 Features

### 1. Transaction History
- **Real-time Data**: Fetches latest transactions from your subgraph
- **Pagination**: Load more transactions as needed
- **Filtering**: Filter by status, type, and search terms
- **Sorting**: Sort by timestamp, value, or block number

### 2. Statistics Dashboard
- **Total Transactions**: Count of all transactions
- **Success Rate**: Percentage of successful transactions
- **Successful/Failed Counts**: Breakdown of transaction status
- **Total Value**: Sum of all transaction values

### 3. Transaction Cards
- **Visual Indicators**: Icons for different transaction types
- **Status Badges**: Success/failed status with colors
- **Detailed Information**: Hash, block, time, value, gas cost
- **Block Explorer Links**: Direct links to Etherscan/Arbiscan

## 🔍 Usage

### 1. Basic Usage

```typescript
import { useGoldskyHistory } from "@/hooks/useGoldskyHistory";

const MyComponent = () => {
  const {
    transactions,
    loading,
    error,
    hasMore,
    fetchTransactions,
    refreshTransactions,
  } = useGoldskyHistory();

  // Use the data...
};
```

### 2. Custom Configuration

```typescript
const {
  transactions,
  loading,
  error,
  hasMore,
  fetchTransactions,
  refreshTransactions,
} = useGoldskyHistory({
  pageSize: 50, // Custom page size
  autoFetch: false, // Disable auto-fetch
});
```

### 3. Transaction Card Component

```typescript
import { TransactionCard } from "@/components/transaction/TransactionCard";

const MyComponent = () => {
  const handleViewDetails = (transaction) => {
    // Handle transaction details view
  };

  return (
    <TransactionCard
      transaction={transaction}
      onViewDetails={handleViewDetails}
    />
  );
};
```

## 🛠️ Customization

### 1. Custom GraphQL Query

Modify the query in `useGoldskyHistory.ts`:

```typescript
const query = `
  query GetTransactions($address: String!, $first: Int!, $skip: Int!) {
    transactions(
      where: { 
        OR: [
          { from: $address },
          { to: $address }
        ]
      }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      # Your custom fields here
    }
  }
`;
```

### 2. Custom Transaction Types

Add new transaction types in `TransactionCard.tsx`:

```typescript
const getTransactionIcon = (methodName: string) => {
  const method = methodName.toLowerCase();
  if (method.includes("swap")) return <Swap className="w-4 h-4 text-orange-400" />;
  // Add more types...
};
```

### 3. Custom Block Explorer URLs

Update the `openBlockExplorer` function:

```typescript
const openBlockExplorer = (hash: string, chainId: number) => {
  const explorerUrl = chainId === 421614 ? 
    `https://sepolia.arbiscan.io/tx/${hash}` : 
    chainId === 11155111 ?
    `https://sepolia.etherscan.io/tx/${hash}` :
    `https://etherscan.io/tx/${hash}`;
  window.open(explorerUrl, '_blank');
};
```

## 🚨 Error Handling

The integration includes comprehensive error handling:

1. **API Errors**: Displays user-friendly error messages
2. **Network Errors**: Handles connection issues gracefully
3. **Missing Data**: Shows appropriate empty states
4. **Loading States**: Provides visual feedback during data fetching

## 📈 Performance Optimization

1. **Pagination**: Loads data in chunks to improve performance
2. **Memoization**: Uses `useMemo` for expensive calculations
3. **Debounced Search**: Prevents excessive API calls during typing
4. **Caching**: Leverages Goldsky's built-in caching

## 🔐 Security

1. **API Key**: Store securely in environment variables
2. **Rate Limiting**: Respect Goldsky's rate limits
3. **Input Validation**: Validate all user inputs
4. **Error Logging**: Log errors for debugging without exposing sensitive data

## 🧪 Testing

### 1. Test Environment Variables

```bash
# Test your API key
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"query":"{ transactions(first: 1) { id hash } }"}' \
  YOUR_ENDPOINT_URL
```

### 2. Test GraphQL Query

Use GraphQL Playground or tools like Insomnia to test your queries:

```graphql
query TestQuery($address: String!) {
  transactions(
    where: { from: $address }
    first: 5
  ) {
    id
    hash
    methodName
    status
  }
}
```

## 📞 Support

If you encounter issues:

1. **Check API Key**: Verify your API key is correct
2. **Check Endpoint**: Ensure the endpoint URL is correct
3. **Check Subgraph**: Verify your subgraph is deployed and syncing
4. **Check Network**: Ensure your network requests are reaching Goldsky

## 🔄 Updates

Keep your integration updated:

1. **Monitor Goldsky Updates**: Check for API changes
2. **Update Dependencies**: Keep your packages updated
3. **Test Regularly**: Test your integration after updates
4. **Backup Data**: Keep backups of your subgraph data

---

For more information, visit the [Goldsky Documentation](https://docs.goldsky.com). 