# Relic Chain Verify

A blockchain-based collectibles marketplace with FHE-encrypted metadata. Register rare items with fully encrypted sensitive data. Ownership proofs automatically decrypt during transfer.

🌐 **Live Demo**: [https://relic-chain-verify.vercel.app/](https://relic-chain-verify.vercel.app/)

## Features

- **FHE Encryption**: All sensitive metadata (purchase price, certificate number, serial number, origin) is encrypted using Fully Homomorphic Encryption
- **Request-Approval Purchase Model**: Buyers submit offers, owners approve/reject requests
- **Automatic ACL Management**: Decryption permissions automatically transfer to new owner upon purchase approval
- **Auto-Reject Mechanism**: When ownership changes, all other pending offers are automatically rejected and refunded
- **Provenance Tracking**: Complete transfer history recorded on-chain
- **Zero Entry Barrier**: Anyone can list and purchase collectibles
- **Privacy First**: Encrypted data remains encrypted until ownership transfer

## 📹 Demo Video

Watch the complete flow demonstration: [relic-chain-verify.mp4](./relic-chain-verify.mp4)

## Project Structure

```
relic-chain-verify/
├── contracts/              # Smart contracts
│   └── RelicChainVerify.sol
├── deploy/                # Deployment scripts
│   └── deploy.ts
├── test/                  # Test files
│   ├── RelicChainVerify.ts
│   └── RelicChainVerifySepolia.ts
├── tasks/                 # Hardhat tasks
│   └── RelicChainVerify.ts
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilities (FHE encryption/decryption)
│   │   └── config/        # Configuration
│   └── package.json
└── hardhat.config.ts
```

## Smart Contract Architecture

### Core Data Structures

```solidity
struct Collectible {
    uint256 tokenId;
    address owner;
    string name;
    string imageUri;
    euint32 encryptedPurchasePrice;      // FHE-encrypted purchase price
    euint32 encryptedCertificateNumber;  // FHE-encrypted certificate number
    euint32 encryptedSerialNumber;       // FHE-encrypted serial number
    euint32 encryptedOriginCode;         // FHE-encrypted origin code
    uint256 listedAt;
    bool exists;
}

struct PurchaseRequest {
    uint256 requestId;
    uint256 tokenId;
    address buyer;
    uint256 offerAmount;
    bool isPending;
    bool isApproved;
    uint256 timestamp;
}
```

### Key Contract Functions

#### Listing Collectibles

```solidity
function listCollectible(
    string memory name,
    string memory imageUri,
    externalEuint32 encryptedPrice,
    externalEuint32 encryptedCert,
    externalEuint32 encryptedSerial,
    externalEuint32 encryptedOrigin,
    bytes calldata inputProof
) external returns (uint256)
```

**Process:**
1. Validates input parameters
2. Converts external ciphertexts to internal `euint32` types using `FHE.fromExternal()`
3. Sets up ACL (Access Control List) for all encrypted fields:
   - `FHE.allowThis()` - allows contract to access
   - `FHE.allow(encryptedData, owner)` - allows owner to decrypt
4. Stores collectible in mapping
5. Emits `CollectibleListed` event

#### Purchase Flow (Request-Approval Model)

**Step 1: Request Purchase**
```solidity
function requestPurchase(uint256 tokenId) external payable
```

- Buyer submits an offer with ETH payment
- Creates a `PurchaseRequest` with `isPending = true`
- Payment is held in contract until approval/rejection
- Emits `PurchaseRequested` event

**Step 2: Approve/Reject Purchase**
```solidity
function approvePurchase(uint256 requestId) external
function rejectPurchase(uint256 requestId) external
```

**On Approval:**
1. Transfers payment to previous owner
2. Updates ownership to buyer
3. Grants decryption permissions to new owner via `FHE.allow()`
4. **Auto-rejects all other pending requests** for the same token
5. Refunds all other buyers automatically
6. Updates owner collectibles mappings
7. Records provenance
8. Emits `PurchaseApproved` and `CollectiblePurchased` events

**On Rejection:**
1. Marks request as rejected
2. Refunds buyer
3. Emits `PurchaseRejected` event

### Deployed Contracts

- **Sepolia Testnet**: `0xf302Fc0892E272AF34d606040C4024fFd89803e4`
- **Hardhat Local**: `0x5FbDB2315678afecb367f032d93F642f64180aa3` (default)

## FHE Encryption & Decryption Logic

### Encryption Flow (Frontend)

The encryption process happens client-side before submitting to the contract:

```typescript
// 1. Initialize FHE SDK
const fheInstance = await initFHE(chainId);

// 2. Create encrypted input for all values at once
const encryptedInput = fheInstance
  .createEncryptedInput(contractAddress, userAddress)
  .add32(purchasePrice)    // Add purchase price
  .add32(certNumber)       // Add certificate number
  .add32(serialNumber)     // Add serial number
  .add32(originCode);      // Add origin code

// 3. Encrypt all values together (shares same inputProof)
const encrypted = await encryptedInput.encrypt();

// Returns:
// - handles: Array of Uint8Array (one per encrypted value)
// - inputProof: Single proof for all values (required by contract)
```

**Key Points:**
- All 4 values are encrypted in a single batch operation
- This ensures they share the same `inputProof`, which is required by the contract
- Each value must be within `uint32` range (0 to 4,294,967,295)
- The `inputProof` is used by the contract to verify the encrypted inputs

### Decryption Flow (Frontend)

Only the current owner can decrypt the metadata:

```typescript
// 1. Get encrypted metadata from contract
const encryptedMetadata = await contract.getEncryptedMetadata(tokenId);
// Returns: [encryptedPrice, encryptedCert, encryptedSerial, encryptedOrigin]

// 2. Generate keypair for decryption
const keypair = fheInstance.generateKeypair();

// 3. Create EIP712 signature request
const eip712 = fheInstance.createEIP712(
  keypair.publicKey,
  [contractAddress],
  startTimestamp,
  durationDays
);

// 4. Sign with wallet (user must approve)
const signature = await walletClient.signTypedData({
  account: userAddress,
  domain: eip712.domain,
  types: eip712.types,
  primaryType: eip712.primaryType,
  message: eip712.message,
});

// 5. Decrypt all values
const decryptedResult = await fheInstance.userDecrypt(
  handleContractPairs,  // Array of {handle, contractAddress}
  keypair.privateKey,
  keypair.publicKey,
  signature,
  [contractAddress],
  userAddress,
  startTimestamp,
  durationDays
);

// 6. Extract decrypted values
const [price, cert, serial, origin] = decryptedValues;
```

**Key Points:**
- Decryption requires EIP712 signature from the owner
- The signature proves ownership and grants temporary decryption permission
- All 4 values are decrypted in a single operation
- Decryption happens client-side, data never leaves the user's browser

### ACL (Access Control List) Management

The contract manages decryption permissions through FHE's ACL system:

**On Listing:**
```solidity
FHE.allowThis(encryptedPrice);           // Contract can access
FHE.allow(encryptedPrice, msg.sender);  // Owner can decrypt
```

**On Ownership Transfer:**
```solidity
// Grant permissions to new owner
FHE.allow(collectible.encryptedPurchasePrice, buyer);
FHE.allow(collectible.encryptedCertificateNumber, buyer);
FHE.allow(collectible.encryptedSerialNumber, buyer);
FHE.allow(collectible.encryptedOriginCode, buyer);
```

**Important:** The FHE library does not support `revoke()`. Access control is enforced by:
1. The `owner` field in the `Collectible` struct
2. Contract functions checking `msg.sender == collectible.owner`
3. Only granting permissions to the current owner

## Complete User Flow

### 5-Step Open Flow

1. **List New Collectible**
   - Connect wallet → Click "List New Collectible"
   - Fill in: name, image URI, purchase price, certificate number, serial number, origin code
   - Click "Encrypt and List"
   - All 4 sensitive data points are FHE encrypted client-side
   - Public info + ciphertext are listed on-chain
   - Immediately appears on the market wall as "#023 Vintage Rolex – Metadata Fully Encrypted"

2. **Browse Market**
   - Any passerby browses the market
   - Sees all listed collectibles
   - Can only see: image + name + Token ID + lock icon
   - Real price, certificate, serial number are completely invisible

3. **Make Purchase Offer**
   - Interested buyer clicks "Make Offer"
   - Enters bid amount (e.g., 8 ETH)
   - Confirms transaction
   - Payment is held in contract
   - Owner receives notification of pending request

4. **Owner Approves/Rejects**
   - Owner reviews pending requests
   - Can approve (transfers ownership + payment) or reject (refunds buyer)
   - **On approval:**
     - Ownership transfers to new buyer
     - Decryption permissions automatically granted to new buyer
     - All other pending offers automatically rejected and refunded
     - Old owner loses access

5. **Decrypt Real Data**
   - New owner refreshes page
   - Clicks "Decrypt Real Data"
   - Signs EIP712 message in wallet
   - Real-time decryption reveals:
     - Original purchase price: $92,000
     - Certificate number: GIA987654
     - Factory serial number: 1675-1969-001 (globally unique)
     - Origin: 1969 Swiss factory original
   - Old seller, other buyers, passersby see "Access Revoked" if they try to decrypt

## Quick Start

### Prerequisites

- Node.js >= 20
- npm >= 7.0.0
- MetaMask or compatible Web3 wallet

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/ValentineDillon/relic-chain-verify.git
   cd relic-chain-verify
   ```

2. **Install dependencies**

   ```bash
   npm install
   cd frontend && npm install
   ```

3. **Set up environment variables**

   ```bash
   # For Hardhat (optional, defaults provided)
   npx hardhat vars set MNEMONIC
   npx hardhat vars set INFURA_API_KEY
   ```

4. **Compile contracts**

   ```bash
   npm run compile
   ```

5. **Run tests**

   ```bash
   npm run test
   ```

6. **Deploy to local network**

   ```bash
   # Terminal 1: Start local node
   npx hardhat node

   # Terminal 2: Deploy contracts
   npx hardhat deploy --network localhost
   ```

7. **Start frontend**

   ```bash
   cd frontend
   npm run dev
   ```

## Testing

### Local Testing

```bash
npm run test
```

### Sepolia Testnet Testing

```bash
# Deploy to Sepolia (requires PRIVATE_KEY and INFURA_API_KEY env vars)
PRIVATE_KEY=your_private_key INFURA_API_KEY=your_api_key npx hardhat deploy --network sepolia

# Run tests
npm run test:sepolia
```

**Note:** The contract is already deployed on Sepolia at `0xf302Fc0892E272AF34d606040C4024fFd89803e4`

## Frontend Development

The frontend is built with:
- **React + TypeScript**: Modern UI framework
- **Vite**: Fast build tool
- **Wagmi + RainbowKit**: Web3 wallet integration
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: High-quality component library
- **@zama-fhe/relayer-sdk**: FHE encryption/decryption
- **@fhevm/mock-utils**: Mock FHE for local development

### Environment Variables

Create a `.env` file in the frontend directory (optional):

```env
# WalletConnect Project ID (get from https://cloud.walletconnect.com)
VITE_WALLETCONNECT_PROJECT_ID=YOUR_PROJECT_ID

# Contract addresses (optional, defaults are already set)
# Hardhat local network (Chain ID: 31337)
VITE_CONTRACT_ADDRESS_LOCALHOST=0x5FbDB2315678afecb367f032d93F642f64180aa3

# Sepolia testnet (Chain ID: 11155111)
VITE_CONTRACT_ADDRESS_SEPOLIA=0xf302Fc0892E272AF34d606040C4024fFd89803e4
```

**Note:** Default addresses are already configured, so you only need to set environment variables if you want to override them.

### Network Support

The frontend automatically detects the connected network and uses the appropriate contract address:
- **Hardhat (Chain ID: 31337)**: Uses local contract address
- **Sepolia (Chain ID: 11155111)**: Uses Sepolia contract address

## Security Features

1. **FHE Encryption**: All sensitive data encrypted on-chain
2. **ACL Management**: Automatic permission transfer on ownership change
3. **Auto-Reject**: Prevents multiple simultaneous purchases
4. **Provenance Tracking**: Immutable transfer history
5. **Owner Verification**: Contract-level ownership checks
6. **EIP712 Signatures**: Secure decryption authorization

## Technical Details

### Gas Optimization

- Uses `viaIR: true` to avoid "Stack too deep" errors
- Batch encryption reduces gas costs
- Efficient array operations for request management

### FHE Limitations

- **Gas Consumption**: FHE operations are gas-intensive. On Sepolia, `listCollectible` may exceed block gas limit with large `inputProof`
- **Network Support**: Currently optimized for Hardhat (mock mode) and Sepolia (real FHE)
- **Value Range**: All encrypted values must be within `uint32` range (0 to 4,294,967,295)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Links

- **Live Demo**: [https://relic-chain-verify.vercel.app/](https://relic-chain-verify.vercel.app/)
- **GitHub Repository**: [https://github.com/ValentineDillon/relic-chain-verify](https://github.com/ValentineDillon/relic-chain-verify)
- **Sepolia Contract**: [0xf302Fc0892E272AF34d606040C4024fFd89803e4](https://sepolia.etherscan.io/address/0xf302Fc0892E272AF34d606040C4024fFd89803e4)
