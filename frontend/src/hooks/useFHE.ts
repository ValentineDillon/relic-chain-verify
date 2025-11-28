import { useState, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { initFHE, getFHEInstance, encryptMultipleValues } from '../lib/fhe';
import type { FhevmInstance } from '@zama-fhe/relayer-sdk/bundle';

export function useFHE() {
  const [instance, setInstance] = useState<FhevmInstance | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const initializeFHE = useCallback(async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return false;
    }

    if (instance || isInitializing) {
      return true;
    }

    try {
      setIsInitializing(true);
      setError(null);

      console.log('Initializing FHE for chainId:', chainId);
      const fheInstance = await initFHE(chainId);
      setInstance(fheInstance);
      setIsInitialized(true);
      console.log('FHE initialized successfully');
      return true;
    } catch (err) {
      console.error('Failed to initialize FHE:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize FHE');
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, [instance, isInitializing, isConnected, address, chainId]);

  const encryptCollectibleData = useCallback(async (
    contractAddress: string,
    purchasePrice: number,
    certNumber: number,
    serialNumber: number,
    originCode: number
  ) => {
    if (!instance || !address) {
      throw new Error('FHE not initialized or wallet not connected');
    }

    try {
      const encrypted = await encryptMultipleValues(
        contractAddress,
        address,
        [purchasePrice, certNumber, serialNumber, originCode]
      );

      return {
        encryptedPrice: encrypted.handles[0],
        encryptedCert: encrypted.handles[1],
        encryptedSerial: encrypted.handles[2],
        encryptedOrigin: encrypted.handles[3],
        inputProof: encrypted.inputProof
      };
    } catch (err) {
      console.error('Encryption failed:', err);
      throw err;
    }
  }, [instance, address]);

  return {
    instance,
    isInitialized,
    isInitializing,
    error,
    initializeFHE,
    encryptCollectibleData
  };
}

