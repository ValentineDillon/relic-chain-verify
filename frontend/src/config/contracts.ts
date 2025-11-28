// Contract addresses - will be set based on network
// For local testing, set VITE_CONTRACT_ADDRESS_LOCALHOST in .env file
// For Sepolia, set VITE_CONTRACT_ADDRESS_SEPOLIA in .env file

// Hardhat local network (Chain ID: 31337)
// Default address: 0x5FbDB2315678afecb367f032d93F642f64180aa3 (Hardhat deployment address)
export const CONTRACT_ADDRESS_LOCALHOST = import.meta.env.VITE_CONTRACT_ADDRESS_LOCALHOST || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// Sepolia testnet (Chain ID: 11155111)
// Deployed contract address: 0xf302Fc0892E272AF34d606040C4024fFd89803e4
export const CONTRACT_ADDRESS_SEPOLIA = import.meta.env.VITE_CONTRACT_ADDRESS_SEPOLIA || '0xf302Fc0892E272AF34d606040C4024fFd89803e4';

// Get contract address based on chain ID
export function getContractAddress(chainId?: number): string {
  if (chainId === 31337) {
    return CONTRACT_ADDRESS_LOCALHOST;
  } else if (chainId === 11155111) {
    return CONTRACT_ADDRESS_SEPOLIA;
  }
  // Default to localhost if chainId is not recognized
  return CONTRACT_ADDRESS_LOCALHOST;
}

// Legacy export for backward compatibility
export const RELIC_CHAIN_VERIFY_ADDRESS = getContractAddress();

// Contract ABI - extracted from compiled contract artifacts
// externalEuint32 is represented as bytes32 in the ABI
export const RELIC_CHAIN_VERIFY_ABI = [
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "imageUri", type: "string" },
      { internalType: "externalEuint32", name: "encryptedPrice", type: "bytes32" },
      { internalType: "externalEuint32", name: "encryptedCert", type: "bytes32" },
      { internalType: "externalEuint32", name: "encryptedSerial", type: "bytes32" },
      { internalType: "externalEuint32", name: "encryptedOrigin", type: "bytes32" },
      { internalType: "bytes", name: "inputProof", type: "bytes" }
    ],
    name: "listCollectible",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "requestPurchase",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "requestId", type: "uint256" }],
    name: "approvePurchase",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "requestId", type: "uint256" }],
    name: "rejectPurchase",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "requestId", type: "uint256" }],
    name: "getPurchaseRequest",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "requestId", type: "uint256" },
          { internalType: "uint256", name: "tokenId", type: "uint256" },
          { internalType: "address", name: "buyer", type: "address" },
          { internalType: "uint256", name: "offerAmount", type: "uint256" },
          { internalType: "bool", name: "isPending", type: "bool" },
          { internalType: "bool", name: "isApproved", type: "bool" },
          { internalType: "uint256", name: "timestamp", type: "uint256" }
        ],
        internalType: "struct RelicChainVerify.PurchaseRequest",
        name: "request",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getTokenPurchaseRequests",
    outputs: [{ internalType: "uint256[]", name: "requestIds", type: "uint256[]" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "getOwnerPendingRequests",
    outputs: [{ internalType: "uint256[]", name: "requestIds", type: "uint256[]" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "buyer", type: "address" }],
    name: "getBuyerRequests",
    outputs: [{ internalType: "uint256[]", name: "requestIds", type: "uint256[]" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getCollectibleInfo",
    outputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "imageUri", type: "string" },
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "uint256", name: "listedAt", type: "uint256" },
      { internalType: "bool", name: "exists", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getEncryptedMetadata",
    outputs: [
      { internalType: "euint32", name: "encryptedPrice", type: "bytes32" },
      { internalType: "euint32", name: "encryptedCert", type: "bytes32" },
      { internalType: "euint32", name: "encryptedSerial", type: "bytes32" },
      { internalType: "euint32", name: "encryptedOrigin", type: "bytes32" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getProvenance",
    outputs: [
      {
        components: [
          { internalType: "address", name: "from", type: "address" },
          { internalType: "address", name: "to", type: "address" },
          { internalType: "uint256", name: "timestamp", type: "uint256" },
          { internalType: "bytes32", name: "txHash", type: "bytes32" }
        ],
        internalType: "struct RelicChainVerify.TransferRecord[]",
        name: "",
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "getOwnerCollectibles",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getTotalCollectibles",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      { indexed: false, internalType: "string", name: "name", type: "string" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" }
    ],
    name: "CollectibleListed",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "requestId", type: "uint256" },
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: true, internalType: "address", name: "buyer", type: "address" },
      { indexed: false, internalType: "uint256", name: "offerAmount", type: "uint256" },
      { indexed: false, internalType: "address", name: "owner", type: "address" }
    ],
    name: "PurchaseRequested",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "requestId", type: "uint256" },
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: true, internalType: "address", name: "buyer", type: "address" },
      { indexed: false, internalType: "address", name: "seller", type: "address" },
      { indexed: false, internalType: "uint256", name: "price", type: "uint256" }
    ],
    name: "PurchaseApproved",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "requestId", type: "uint256" },
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: true, internalType: "address", name: "buyer", type: "address" }
    ],
    name: "PurchaseRejected",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      { indexed: false, internalType: "uint256", name: "price", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" }
    ],
    name: "CollectiblePurchased",
    type: "event"
  }
] as const;

