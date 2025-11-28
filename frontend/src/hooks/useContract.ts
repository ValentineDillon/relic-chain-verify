import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { useAccount } from 'wagmi';
import { getContractAddress, RELIC_CHAIN_VERIFY_ABI } from '../config/contracts';
import { parseEther } from 'viem';

export function useRelicChainVerify() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({ hash });

  const contractAddress = getContractAddress(chainId) as `0x${string}`;

  const listCollectible = async (
    name: string,
    imageUri: string,
    encryptedPrice: Uint8Array,
    encryptedCert: Uint8Array,
    encryptedSerial: Uint8Array,
    encryptedOrigin: Uint8Array,
    inputProof: string
  ) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    if (!writeContractAsync) {
      throw new Error('writeContractAsync is not available');
    }

    try {
      // Log raw types for debugging
      console.log('Raw encrypted data types:', {
        encryptedPrice: { type: typeof encryptedPrice, isArray: Array.isArray(encryptedPrice), constructor: encryptedPrice?.constructor?.name },
        encryptedCert: { type: typeof encryptedCert, isArray: Array.isArray(encryptedCert), constructor: encryptedCert?.constructor?.name },
        inputProof: { type: typeof inputProof, value: inputProof?.substring?.(0, 20) },
      });

      // Convert to hex string (bytes32 format for externalEuint32)
      // externalEuint32 is represented as bytes32 in the ABI
      const toBytes32 = (arr: Uint8Array | string | any): `0x${string}` => {
        // If already a string (hex), ensure it starts with 0x and pad to 32 bytes
        if (typeof arr === 'string') {
          const clean = arr.startsWith('0x') ? arr.slice(2) : arr;
          // Pad to 64 hex chars (32 bytes) or truncate if longer
          const padded = clean.padEnd(64, '0').slice(0, 64);
          return `0x${padded}` as `0x${string}`;
        }
        // If it's a Uint8Array or similar
        if (arr instanceof Uint8Array || (Array.isArray(arr) && typeof arr[0] === 'number')) {
          const bytes = arr instanceof Uint8Array ? arr : new Uint8Array(arr);
          const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
          // Pad to 64 hex chars (32 bytes)
          const padded = hex.padEnd(64, '0').slice(0, 64);
          return `0x${padded}` as `0x${string}`;
        }
        // Try to convert to string and handle
        const str = String(arr);
        if (str.startsWith('0x')) {
          const clean = str.slice(2);
          return `0x${clean.padEnd(64, '0').slice(0, 64)}` as `0x${string}`;
        }
        throw new Error(`Cannot convert to bytes32: ${typeof arr}`);
      };

      // Ensure inputProof is a hex string
      const formatInputProof = (proof: string | Uint8Array | any): `0x${string}` => {
        if (typeof proof === 'string') {
          return proof.startsWith('0x') ? (proof as `0x${string}`) : (`0x${proof}` as `0x${string}`);
        }
        // If it's a Uint8Array
        if (proof instanceof Uint8Array || (Array.isArray(proof) && typeof proof[0] === 'number')) {
          const bytes = proof instanceof Uint8Array ? proof : new Uint8Array(proof);
          const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
          return `0x${hex}` as `0x${string}`;
        }
        // Try to convert to string
        const str = String(proof);
        return str.startsWith('0x') ? (str as `0x${string}`) : (`0x${str}` as `0x${string}`);
      };

      const formattedPrice = toBytes32(encryptedPrice);
      const formattedCert = toBytes32(encryptedCert);
      const formattedSerial = toBytes32(encryptedSerial);
      const formattedOrigin = toBytes32(encryptedOrigin);
      const formattedProof = formatInputProof(inputProof);

      console.log('Formatted encrypted data:', {
        formattedPrice,
        formattedCert,
        formattedSerial,
        formattedOrigin,
        formattedProof: formattedProof.substring(0, 50) + '...',
      });
      
      // Use writeContractAsync which will trigger MetaMask popup and wait for user confirmation
      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: RELIC_CHAIN_VERIFY_ABI,
        functionName: 'listCollectible',
        args: [
          name,
          imageUri,
          formattedPrice,  // externalEuint32 is bytes32
          formattedCert,
          formattedSerial,
          formattedOrigin,
          formattedProof  // bytes calldata
        ],
      });
      
      console.log('Transaction hash received:', txHash);
      return txHash;
    } catch (error: any) {
      console.error('Failed to list collectible:', error);
      // Check if user rejected the transaction
      if (error?.code === 4001 || error?.message?.includes('User rejected') || error?.message?.includes('user rejected')) {
        throw new Error('Transaction rejected by user');
      }
      if (error?.message) {
        throw new Error(error.message);
      }
      throw error;
    }
  };

  const requestPurchase = async (tokenId: bigint, offerAmount: string) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    if (!writeContractAsync) {
      throw new Error('writeContractAsync is not available');
    }

    try {
      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: RELIC_CHAIN_VERIFY_ABI,
        functionName: 'requestPurchase',
        args: [tokenId],
        value: parseEther(offerAmount),
      });
      console.log('Purchase request transaction hash:', txHash);
      return txHash;
    } catch (error: any) {
      console.error('Failed to request purchase:', error);
      if (error?.code === 4001 || error?.message?.includes('User rejected') || error?.message?.includes('user rejected')) {
        throw new Error('Transaction rejected by user');
      }
      throw error;
    }
  };

  const approvePurchase = async (requestId: bigint) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    if (!writeContractAsync) {
      throw new Error('writeContractAsync is not available');
    }

    try {
      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: RELIC_CHAIN_VERIFY_ABI,
        functionName: 'approvePurchase',
        args: [requestId],
      });
      console.log('Approve purchase transaction hash:', txHash);
      return txHash;
    } catch (error: any) {
      console.error('Failed to approve purchase:', error);
      if (error?.code === 4001 || error?.message?.includes('User rejected') || error?.message?.includes('user rejected')) {
        throw new Error('Transaction rejected by user');
      }
      throw error;
    }
  };

  const rejectPurchase = async (requestId: bigint) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    if (!writeContractAsync) {
      throw new Error('writeContractAsync is not available');
    }

    try {
      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: RELIC_CHAIN_VERIFY_ABI,
        functionName: 'rejectPurchase',
        args: [requestId],
      });
      console.log('Reject purchase transaction hash:', txHash);
      return txHash;
    } catch (error: any) {
      console.error('Failed to reject purchase:', error);
      if (error?.code === 4001 || error?.message?.includes('User rejected') || error?.message?.includes('user rejected')) {
        throw new Error('Transaction rejected by user');
      }
      throw error;
    }
  };

  return {
    listCollectible,
    requestPurchase,
    approvePurchase,
    rejectPurchase,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    writeError,
    receiptError
  };
}

export function useCollectibleInfo(tokenId: bigint) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId) as `0x${string}`;
  
  const result = useReadContract({
    address: contractAddress,
    abi: RELIC_CHAIN_VERIFY_ABI,
    functionName: 'getCollectibleInfo',
    args: [tokenId],
    query: {
      enabled: !!contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  // Debug logging
  if (result.data !== undefined) {
    console.log(`CollectibleInfo for tokenId ${tokenId}:`, result.data);
  }
  if (result.error) {
    console.error(`Error fetching collectibleInfo for tokenId ${tokenId}:`, result.error);
  }

  return result;
}

export function useTotalCollectibles() {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId) as `0x${string}`;
  
  const result = useReadContract({
    address: contractAddress,
    abi: RELIC_CHAIN_VERIFY_ABI,
    functionName: 'getTotalCollectibles',
    query: {
      refetchInterval: 2000, // Refetch every 2 seconds to catch new listings
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      enabled: !!contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  // Debug logging
  console.log('useTotalCollectibles:', {
    chainId,
    contractAddress,
    data: result.data,
    dataType: typeof result.data,
    dataValue: result.data?.toString(),
    error: result.error,
    isLoading: result.isLoading,
    isError: result.isError,
  });

  return result;
}

export function useOwnerCollectibles(ownerAddress?: string) {
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId) as `0x${string}`;
  
  return useReadContract({
    address: contractAddress,
    abi: RELIC_CHAIN_VERIFY_ABI,
    functionName: 'getOwnerCollectibles',
    args: [ownerAddress || address || '0x0000000000000000000000000000000000000000'],
    enabled: !!ownerAddress || !!address,
  });
}

export function useEncryptedMetadata(tokenId: bigint) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId) as `0x${string}`;
  
  return useReadContract({
    address: contractAddress,
    abi: RELIC_CHAIN_VERIFY_ABI,
    functionName: 'getEncryptedMetadata',
    args: [tokenId],
  });
}

export function usePurchaseRequest(requestId: bigint) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId) as `0x${string}`;
  
  return useReadContract({
    address: contractAddress,
    abi: RELIC_CHAIN_VERIFY_ABI,
    functionName: 'getPurchaseRequest',
    args: [requestId],
    query: {
      enabled: !!contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000',
      select: (data: any) => {
        // Contract returns a struct, which could be an object or array
        // Return as-is and let the component handle both formats
        if (!data) return null;
        // If it's already an array (tuple), return it
        if (Array.isArray(data)) return data;
        // If it's an object with nested 'request' property, extract it
        if (typeof data === 'object' && data.request) return data.request;
        // Otherwise return the data as-is
        return data;
      },
    },
  });
}

export function useOwnerPendingRequests(ownerAddress?: string) {
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId) as `0x${string}`;
  
  return useReadContract({
    address: contractAddress,
    abi: RELIC_CHAIN_VERIFY_ABI,
    functionName: 'getOwnerPendingRequests',
    args: [ownerAddress || address || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!(ownerAddress || address) && !!contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 3000, // Refetch every 3 seconds
      select: (data: any) => {
        // Ensure we return an array
        if (!data) return [];
        if (Array.isArray(data)) return data;
        return [];
      },
    },
  });
}

export function useTokenPurchaseRequests(tokenId: bigint) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId) as `0x${string}`;
  
  return useReadContract({
    address: contractAddress,
    abi: RELIC_CHAIN_VERIFY_ABI,
    functionName: 'getTokenPurchaseRequests',
    args: [tokenId],
    query: {
      enabled: !!contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 3000,
    },
  });
}

