import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEncryptedMetadata } from "@/hooks/useContract";
import { useFHE } from "@/hooks/useFHE";
import { useAccount, useChainId, useWalletClient } from "wagmi";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getContractAddress } from "@/config/contracts";

interface DecryptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokenId: bigint;
  isOwner: boolean;
}

const DecryptDialog = ({ open, onOpenChange, tokenId, isOwner }: DecryptDialogProps) => {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { initializeFHE, isInitialized, instance } = useFHE();
  const { data: encryptedMetadata, isLoading: isLoadingMetadata } = useEncryptedMetadata(tokenId);
  const [decryptedData, setDecryptedData] = useState<{
    price: number;
    cert: number;
    serial: number;
    origin: number;
  } | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    if (open && !isInitialized) {
      initializeFHE();
    }
  }, [open, isInitialized, initializeFHE]);

  const handleDecrypt = async () => {
    if (!isInitialized || !instance || !address) {
      toast.error("FHE not initialized or wallet not connected");
      return;
    }

    if (!walletClient) {
      toast.error("Wallet client not available");
      return;
    }

    if (!isOwner) {
      toast.error("Only the owner can decrypt this data");
      return;
    }

    if (!encryptedMetadata) {
      toast.error("Encrypted metadata not available");
      return;
    }

    try {
      setIsDecrypting(true);
      toast.info("Decryption in progress... Please sign the EIP712 message in your wallet.");
      
      const contractAddress = getContractAddress(chainId);
      
      // encryptedMetadata is a tuple: [euint32 encryptedPrice, euint32 encryptedCert, euint32 encryptedSerial, euint32 encryptedOrigin]
      // Each euint32 is represented as bytes32 (hex string)
      // The tuple is returned as an array: [price, cert, serial, origin]
      const [encryptedPrice, encryptedCert, encryptedSerial, encryptedOrigin] = encryptedMetadata as any[];
      
      console.log('Encrypted metadata tuple:', {
        raw: encryptedMetadata,
        price: encryptedPrice,
        cert: encryptedCert,
        serial: encryptedSerial,
        origin: encryptedOrigin,
        priceType: typeof encryptedPrice,
        priceIsString: typeof encryptedPrice === 'string',
      });

      // Convert hex strings to Uint8Array if needed
      // Handles can be hex strings (0x...) or Uint8Array
      const hexToBytes = (hex: string | Uint8Array | any): Uint8Array => {
        if (hex instanceof Uint8Array) return hex;
        if (typeof hex === 'string') {
          const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
          if (cleanHex.length === 0) {
            throw new Error('Empty hex string');
          }
          const bytes = new Uint8Array(cleanHex.length / 2);
          for (let i = 0; i < cleanHex.length; i += 2) {
            bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
          }
          return bytes;
        }
        // Try to convert to string first
        const str = String(hex);
        if (str.startsWith('0x')) {
          return hexToBytes(str);
        }
        throw new Error(`Cannot convert to bytes: ${typeof hex}`);
      };

      // Prepare handles for decryption
      const handleContractPairs = [
        { handle: hexToBytes(encryptedPrice as string), contractAddress },
        { handle: hexToBytes(encryptedCert as string), contractAddress },
        { handle: hexToBytes(encryptedSerial as string), contractAddress },
        { handle: hexToBytes(encryptedOrigin as string), contractAddress },
      ];

      // Generate keypair for user decryption
      const keypair = instance.generateKeypair();

      // Setup decryption parameters
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "7"; // 7 days validity
      const contractAddresses = [contractAddress];

      // Create EIP712 signature for decryption
      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
      );

      console.log('EIP712 data:', eip712);

      // Sign the EIP712 message with wallet
      const signature = await walletClient.signTypedData({
        domain: eip712.domain as any,
        types: {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        primaryType: 'UserDecryptRequestVerification',
        message: eip712.message as any,
      });

      console.log('Signature received:', signature);

      // Perform user decryption through Relayer
      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays
      );

      console.log('Decryption result:', result);

      // Extract decrypted values
      // The result from userDecrypt is typically an object where keys are handle strings
      // or an array if handles are passed in order
      console.log('Decryption result structure:', {
        result,
        resultType: typeof result,
        isArray: Array.isArray(result),
        keys: result ? Object.keys(result) : [],
        values: result ? Object.values(result) : [],
      });

      // Try to extract values - result might be:
      // 1. An object with handle strings as keys
      // 2. An array in the same order as handleContractPairs
      // 3. An object with Uint8Array handles as keys (need to convert)
      
      let finalPrice = 0;
      let finalCert = 0;
      let finalSerial = 0;
      let finalOrigin = 0;

      if (Array.isArray(result)) {
        // Result is an array in the same order
        finalPrice = Number(result[0] || 0);
        finalCert = Number(result[1] || 0);
        finalSerial = Number(result[2] || 0);
        finalOrigin = Number(result[3] || 0);
      } else if (result && typeof result === 'object') {
        // Result is an object - try different key formats
        const priceKey = typeof encryptedPrice === 'string' ? encryptedPrice : 
                        (encryptedPrice instanceof Uint8Array ? Array.from(encryptedPrice).join(',') : '0');
        const certKey = typeof encryptedCert === 'string' ? encryptedCert :
                       (encryptedCert instanceof Uint8Array ? Array.from(encryptedCert).join(',') : '1');
        const serialKey = typeof encryptedSerial === 'string' ? encryptedSerial :
                         (encryptedSerial instanceof Uint8Array ? Array.from(encryptedSerial).join(',') : '2');
        const originKey = typeof encryptedOrigin === 'string' ? encryptedOrigin :
                         (encryptedOrigin instanceof Uint8Array ? Array.from(encryptedOrigin).join(',') : '3');

        // Try all possible key formats
        const allKeys = Object.keys(result);
        const values = Object.values(result);
        
        // If we have 4 values, use them in order
        if (values.length >= 4) {
          finalPrice = Number(values[0] || 0);
          finalCert = Number(values[1] || 0);
          finalSerial = Number(values[2] || 0);
          finalOrigin = Number(values[3] || 0);
        } else {
          // Try to match by key
          finalPrice = Number(result[priceKey] || result[allKeys[0]] || 0);
          finalCert = Number(result[certKey] || result[allKeys[1]] || 0);
          finalSerial = Number(result[serialKey] || result[allKeys[2]] || 0);
          finalOrigin = Number(result[originKey] || result[allKeys[3]] || 0);
        }
      }

      setDecryptedData({
        price: finalPrice,
        cert: finalCert,
        serial: finalSerial,
        origin: finalOrigin,
      });

      toast.success("Decryption successful!");
      
    } catch (error: any) {
      console.error("Failed to decrypt:", error);
      toast.error(error?.message || "Failed to decrypt data. Make sure you are the owner and have the correct permissions.");
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Collectible Details</DialogTitle>
          <DialogDescription>
            {isOwner ? "Decrypt and view encrypted metadata" : "Metadata is encrypted. Only the owner can decrypt."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!isOwner && (
            <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
              You are not the owner of this collectible. Encrypted metadata is only accessible to the current owner.
            </div>
          )}
          {isOwner && isLoadingMetadata && (
            <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground text-center">
              Loading encrypted metadata...
            </div>
          )}
          {isOwner && !isLoadingMetadata && !encryptedMetadata && (
            <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
              Encrypted metadata not available for this collectible.
            </div>
          )}
          {isOwner && !isLoadingMetadata && encryptedMetadata && !decryptedData && (
            <div className="space-y-2">
              <Button
                onClick={handleDecrypt}
                disabled={!isInitialized || isDecrypting || !walletClient}
                className="w-full"
              >
                {isDecrypting ? "Decrypting... (Please sign in wallet)" : "Decrypt Metadata"}
              </Button>
              {!walletClient && (
                <p className="text-xs text-muted-foreground text-center">
                  Wallet client not available. Please ensure your wallet is connected.
                </p>
              )}
            </div>
          )}
          {decryptedData && (
            <div className="space-y-2">
              <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-lg space-y-3 border border-cyan-500/20">
                <h4 className="font-semibold text-lg mb-3">Decrypted Metadata</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purchase Price:</span>
                    <span className="font-medium">${decryptedData.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Certificate Number:</span>
                    <span className="font-medium">{decryptedData.cert.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serial Number:</span>
                    <span className="font-medium">{decryptedData.serial.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Origin Code:</span>
                    <span className="font-medium">{decryptedData.origin.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DecryptDialog;

