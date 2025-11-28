import type { FhevmInstance } from "@zama-fhe/relayer-sdk/bundle";
import { JsonRpcProvider } from 'ethers';

let fhevmInstance: FhevmInstance | null = null;
let isSDKInitialized = false;

// Fetch FHEVM metadata from Hardhat node
async function fetchFHEVMMetadata(rpcUrl: string) {
  try {
    console.log('Fetching FHEVM metadata from:', rpcUrl);
    const provider = new JsonRpcProvider(rpcUrl);
    
    // Try the correct RPC method name
    const metadata = await provider.send('fhevm_relayer_metadata', []);
    
    console.log('FHEVM metadata received:', metadata);
    
    // Validate metadata format and extract addresses
    if (metadata && typeof metadata === 'object') {
      const aclAddress = metadata.ACLAddress || metadata.aclAddress || metadata.ACL;
      const inputVerifierAddress = metadata.InputVerifierAddress || metadata.inputVerifierAddress || metadata.InputVerifier || metadata.inputVerifier;
      const kmsVerifierAddress = metadata.KMSVerifierAddress || metadata.kmsVerifierAddress || metadata.KMSVerifier || metadata.kmsVerifier;
      
      if (
        aclAddress &&
        inputVerifierAddress &&
        kmsVerifierAddress &&
        typeof aclAddress === 'string' &&
        typeof inputVerifierAddress === 'string' &&
        typeof kmsVerifierAddress === 'string'
      ) {
        return {
          ACLAddress: aclAddress as `0x${string}`,
          InputVerifierAddress: inputVerifierAddress as `0x${string}`,
          KMSVerifierAddress: kmsVerifierAddress as `0x${string}`,
        };
      } else {
        console.warn('Metadata missing some addresses, using defaults for missing ones');
        return {
          ACLAddress: (aclAddress || '0x50157CFfD6bBFA2DECe204a89ec419c23ef5755D') as `0x${string}`,
          InputVerifierAddress: (inputVerifierAddress || '0x901F8942346f7AB3a01F6D7613119Bca447Bb030') as `0x${string}`,
          KMSVerifierAddress: (kmsVerifierAddress || '0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC') as `0x${string}`,
        };
      }
    }
    
    console.warn('Invalid metadata format, using default addresses');
    return null;
  } catch (error) {
    console.error('Failed to fetch FHEVM metadata:', error);
    // Try fallback method name
    try {
      console.log('Trying fallback method: fhevm_getRelayerMetadata');
      const provider = new JsonRpcProvider(rpcUrl);
      const metadata = await provider.send('fhevm_getRelayerMetadata', []);
      if (metadata && typeof metadata === 'object') {
        return {
          ACLAddress: (metadata.ACLAddress || metadata.aclAddress || '0x50157CFfD6bBFA2DECe204a89ec419c23ef5755D') as `0x${string}`,
          InputVerifierAddress: (metadata.InputVerifierAddress || metadata.inputVerifierAddress || '0x901F8942346f7AB3a01F6D7613119Bca447Bb030') as `0x${string}`,
          KMSVerifierAddress: (metadata.KMSVerifierAddress || metadata.kmsVerifierAddress || '0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC') as `0x${string}`,
        };
      }
    } catch (fallbackError) {
      console.error('Fallback method also failed:', fallbackError);
    }
    return null;
  }
}

export async function initFHE(chainId?: number): Promise<FhevmInstance> {
  if (fhevmInstance) {
    return fhevmInstance;
  }

  try {
    // Ensure we're in browser environment
    if (typeof window === 'undefined') {
      throw new Error('FHE SDK can only be initialized in browser environment');
    }

    // For local Hardhat network (chainId 31337), use mock instance
    if (chainId === 31337) {
      console.log('Initializing FHEVM for Hardhat network (Mock Mode)...');
      const rpcUrl = 'http://127.0.0.1:8545';
      
      // Fetch metadata from Hardhat node
      const metadata = await fetchFHEVMMetadata(rpcUrl);
      
      if (!metadata) {
        console.warn('FHEVM metadata not available, using basic mock instance with default addresses');
        // Fallback: create basic mock instance with default addresses
        const { MockFhevmInstance } = await import('@fhevm/mock-utils');
        const ethersProvider = new JsonRpcProvider(rpcUrl);
        const instance = await MockFhevmInstance.create(ethersProvider, ethersProvider, {
          aclContractAddress: '0x50157CFfD6bBFA2DECe204a89ec419c23ef5755D',
          chainId: 31337,
          gatewayChainId: 55815,
          inputVerifierContractAddress: '0x901F8942346f7AB3a01F6D7613119Bca447Bb030',
          kmsContractAddress: '0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC',
          verifyingContractAddressDecryption: '0x5ffdaAB0373E62E2ea2944776209aEf29E631A64',
          verifyingContractAddressInputVerification: '0x812b06e1CDCE800494b79fFE4f925A504a9A9810',
        });
        fhevmInstance = instance as any;
        console.log('FHEVM Mock instance created for Hardhat (with defaults)');
        return fhevmInstance;
      }
      
      // Create mock instance with metadata
      const { MockFhevmInstance } = await import('@fhevm/mock-utils');
      const ethersProvider = new JsonRpcProvider(rpcUrl);
      const instance = await MockFhevmInstance.create(ethersProvider, ethersProvider, {
        aclContractAddress: metadata.ACLAddress,
        chainId: 31337,
        gatewayChainId: 55815,
        inputVerifierContractAddress: metadata.InputVerifierAddress,
        kmsContractAddress: metadata.KMSVerifierAddress,
        verifyingContractAddressDecryption: '0x5ffdaAB0373E62E2ea2944776209aEf29E631A64',
        verifyingContractAddressInputVerification: '0x812b06e1CDCE800494b79fFE4f925A504a9A9810',
      });
      fhevmInstance = instance as any;
      console.log('FHEVM Mock instance created for Hardhat');
      return fhevmInstance;
    }

    // For Sepolia network (chainId 11155111) or default, use relayer SDK
    console.log('Initializing FHEVM for Sepolia network...');
    
    // Use dynamic import to avoid bundling issues
    const { createInstance, initSDK, SepoliaConfig } = await import('@zama-fhe/relayer-sdk/bundle');
    console.log('Relayer SDK loaded from bundle');

    if (!isSDKInitialized) {
      console.log('Initializing FHE SDK (loading WASM)...');
      await initSDK();
      isSDKInitialized = true;
      console.log('FHE SDK initialized');
    }

    // Configure based on network
    const config = {
      ...SepoliaConfig,
      network: (window as any).ethereum
    };

    console.log('Creating FHE instance with config:', config);
    fhevmInstance = await createInstance(config);

    console.log('FHE instance created successfully');
    return fhevmInstance;
  } catch (error) {
    console.error('Failed to initialize FHE SDK:', error);
    console.error('Error details:', error);
    throw new Error(`FHE initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getFHEInstance(): FhevmInstance | null {
  return fhevmInstance;
}

export async function encryptValue(
  contractAddress: string,
  userAddress: string,
  value: number
): Promise<{ handle: Uint8Array; inputProof: string }> {
  const instance = await initFHE();
  const encryptedInput = instance
    .createEncryptedInput(contractAddress, userAddress)
    .add32(value);
  
  const encrypted = await encryptedInput.encrypt();
  
  return {
    handle: encrypted.handles[0],
    inputProof: encrypted.inputProof
  };
}

// uint32 max value: 4294967295
const UINT32_MAX = 4294967295;

export async function encryptMultipleValues(
  contractAddress: string,
  userAddress: string,
  values: number[]
): Promise<{ handles: Uint8Array[]; inputProof: string }> {
  // Validate all values are within uint32 range
  for (const value of values) {
    if (value < 0 || value > UINT32_MAX) {
      throw new Error(`Value ${value} is out of uint32 range (0-${UINT32_MAX.toLocaleString()})`);
    }
  }
  
  const instance = await initFHE();
  let encryptedInput = instance.createEncryptedInput(contractAddress, userAddress);
  
  values.forEach(value => {
    encryptedInput = encryptedInput.add32(value);
  });
  
  const encrypted = await encryptedInput.encrypt();
  
  return {
    handles: encrypted.handles,
    inputProof: encrypted.inputProof
  };
}

export async function decryptValue(
  contractAddress: string,
  handle: Uint8Array,
  userAddress: string
): Promise<number> {
  const instance = await initFHE();
  
  // Generate keypair for decryption
  const keypair = instance.generateKeypair();
  
  // Create EIP712 signature for user decryption
  const startTimestamp = Math.floor(Date.now() / 1000).toString();
  const durationDays = "7";
  
  const eip712 = instance.createEIP712(
    keypair.publicKey,
    [contractAddress],
    startTimestamp,
    durationDays
  );
  
  // Sign the decryption request (this would normally be done with wallet)
  // For now, we'll use the instance's internal signing
  const signature = await (window as any).ethereum.request({
    method: 'eth_signTypedData_v4',
    params: [userAddress, JSON.stringify({
      domain: eip712.domain,
      types: eip712.types,
      primaryType: eip712.primaryType,
      message: eip712.message
    })]
  });
  
  // Decrypt the value
  const decrypted = await instance.userDecrypt(
    [{ handle, contractAddress }],
    keypair.publicKey,
    signature
  );
  
  return Number(decrypted[0]);
}

