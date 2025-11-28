import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFHE } from "@/hooks/useFHE";
import { useRelicChainVerify } from "@/hooks/useContract";
import { useAccount, useChainId } from "wagmi";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getContractAddress } from "@/config/contracts";
import { useQueryClient } from "@tanstack/react-query";

// uint32 max value: 4294967295
const UINT32_MAX = 4294967295;

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  imageUri: z.string().url("Invalid URL"),
  purchasePrice: z.string()
    .regex(/^\d+$/, "Must be a number")
    .refine((val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 0 && num <= UINT32_MAX;
    }, `Must be between 0 and ${UINT32_MAX.toLocaleString()}`),
  certNumber: z.string()
    .regex(/^\d+$/, "Must be a number")
    .refine((val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 0 && num <= UINT32_MAX;
    }, `Must be between 0 and ${UINT32_MAX.toLocaleString()}`),
  serialNumber: z.string()
    .regex(/^\d+$/, "Must be a number")
    .refine((val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 0 && num <= UINT32_MAX;
    }, `Must be between 0 and ${UINT32_MAX.toLocaleString()}`),
  originCode: z.string()
    .regex(/^\d+$/, "Must be a number")
    .refine((val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 0 && num <= UINT32_MAX;
    }, `Must be between 0 and ${UINT32_MAX.toLocaleString()}`),
});

interface ListCollectibleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ListCollectibleDialog = ({ open, onOpenChange }: ListCollectibleDialogProps) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { initializeFHE, isInitialized, isInitializing, encryptCollectibleData } = useFHE();
  const { listCollectible, isPending, isConfirming, isSuccess, hash, writeError, receiptError } = useRelicChainVerify();
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  const contractAddress = getContractAddress(chainId);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      imageUri: "",
      purchasePrice: "",
      certNumber: "",
      serialNumber: "",
      originCode: "",
    },
  });

  // Auto-initialize FHE when dialog opens and wallet is connected
  useEffect(() => {
    if (open && isConnected && !isInitialized && !isInitializing) {
      console.log('Auto-initializing FHE...');
      initializeFHE();
    }
  }, [open, isConnected, isInitialized, isInitializing, initializeFHE]);

  // Track transaction hash
  useEffect(() => {
    if (hash) {
      console.log('Transaction hash received:', hash);
      setTxHash(hash);
    }
  }, [hash]);

  // Track write errors
  useEffect(() => {
    if (writeError) {
      console.error('Write error:', writeError);
      toast.error(`Transaction failed: ${writeError.message || 'Unknown error'}`);
    }
  }, [writeError]);

  // Track receipt errors
  useEffect(() => {
    if (receiptError) {
      console.error('Receipt error:', receiptError);
      toast.error(`Transaction confirmation failed: ${receiptError.message || 'Unknown error'}`);
    }
  }, [receiptError]);

  // Track confirmation status
  useEffect(() => {
    if (isConfirming && txHash) {
      console.log('Waiting for transaction confirmation...', txHash);
      toast.info("Waiting for transaction confirmation...");
    }
  }, [isConfirming, txHash]);

  // Handle successful transaction
  useEffect(() => {
    if (isSuccess && txHash) {
      console.log('Transaction confirmed! Refreshing data...', txHash);
      toast.success("Collectible listed successfully!");
      form.reset();
      setTxHash(null);
      onOpenChange(false);
      // Invalidate all wagmi queries to force refresh
      setTimeout(() => {
        queryClient.invalidateQueries();
        // Force a page refresh to ensure data is updated
        window.location.reload();
      }, 2000);
    }
  }, [isSuccess, txHash, form, onOpenChange, queryClient]);

  const handleInitializeFHE = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    const success = await initializeFHE();
    if (success) {
      toast.success("FHE initialized successfully");
    } else {
      toast.error("Failed to initialize FHE");
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!isInitialized) {
      toast.error("Please initialize FHE first");
      return;
    }

    try {
      setIsEncrypting(true);
      
      // Validate values are within uint32 range before encryption
      const purchasePrice = parseInt(data.purchasePrice);
      const certNumber = parseInt(data.certNumber);
      const serialNumber = parseInt(data.serialNumber);
      const originCode = parseInt(data.originCode);
      
      if (purchasePrice < 0 || purchasePrice > UINT32_MAX ||
          certNumber < 0 || certNumber > UINT32_MAX ||
          serialNumber < 0 || serialNumber > UINT32_MAX ||
          originCode < 0 || originCode > UINT32_MAX) {
        toast.error(`All values must be between 0 and ${UINT32_MAX.toLocaleString()}`);
        return;
      }
      
      const encrypted = await encryptCollectibleData(
        contractAddress,
        purchasePrice,
        certNumber,
        serialNumber,
        originCode
      );

      console.log('Submitting transaction...');
      const txHash = await listCollectible(
        data.name,
        data.imageUri,
        encrypted.encryptedPrice,
        encrypted.encryptedCert,
        encrypted.encryptedSerial,
        encrypted.encryptedOrigin,
        encrypted.inputProof
      );

      console.log('Transaction submitted, hash:', txHash);
      toast.info(`Transaction submitted! Hash: ${txHash.slice(0, 10)}...`);
    } catch (error: any) {
      console.error("Failed to list collectible:", error);
      const errorMessage = error?.message || "Failed to list collectible";
      toast.error(errorMessage);
      // Don't reset form on error so user can retry
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>List New Collectible</DialogTitle>
          <DialogDescription>
            Register a new collectible with encrypted metadata
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="imageUri">Image URI</Label>
            <Input id="imageUri" {...form.register("imageUri")} placeholder="ipfs://..." />
            {form.formState.errors.imageUri && (
              <p className="text-sm text-destructive">{form.formState.errors.imageUri.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Purchase Price</Label>
            <Input 
              id="purchasePrice" 
              type="number"
              min="0"
              max={UINT32_MAX}
              {...form.register("purchasePrice")} 
            />
            <p className="text-xs text-muted-foreground">Max: {UINT32_MAX.toLocaleString()}</p>
            {form.formState.errors.purchasePrice && (
              <p className="text-sm text-destructive">{form.formState.errors.purchasePrice.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="certNumber">Certificate Number</Label>
            <Input 
              id="certNumber" 
              type="number"
              min="0"
              max={UINT32_MAX}
              {...form.register("certNumber")} 
            />
            <p className="text-xs text-muted-foreground">Max: {UINT32_MAX.toLocaleString()}</p>
            {form.formState.errors.certNumber && (
              <p className="text-sm text-destructive">{form.formState.errors.certNumber.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="serialNumber">Serial Number</Label>
            <Input 
              id="serialNumber" 
              type="number"
              min="0"
              max={UINT32_MAX}
              {...form.register("serialNumber")} 
            />
            <p className="text-xs text-muted-foreground">Max: {UINT32_MAX.toLocaleString()}</p>
            {form.formState.errors.serialNumber && (
              <p className="text-sm text-destructive">{form.formState.errors.serialNumber.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="originCode">Origin Code</Label>
            <Input 
              id="originCode" 
              type="number"
              min="0"
              max={UINT32_MAX}
              {...form.register("originCode")} 
            />
            <p className="text-xs text-muted-foreground">Max: {UINT32_MAX.toLocaleString()}</p>
            {form.formState.errors.originCode && (
              <p className="text-sm text-destructive">{form.formState.errors.originCode.message}</p>
            )}
          </div>
          {!isInitialized && !isInitializing && (
            <Button type="button" onClick={handleInitializeFHE} variant="outline" className="w-full">
              Initialize FHE
            </Button>
          )}
          {isInitializing && (
            <div className="text-sm text-muted-foreground text-center py-2">
              Initializing FHE...
            </div>
          )}
          <Button
            type="submit"
            disabled={!isInitialized || isPending || isConfirming || isEncrypting}
            className="w-full"
          >
            {isEncrypting ? "Encrypting..." : isPending ? "Submitting..." : isConfirming ? "Confirming..." : "List Collectible"}
          </Button>
          {isPending && (
            <p className="text-xs text-muted-foreground text-center">
              Please confirm the transaction in your wallet
            </p>
          )}
          {isConfirming && txHash && (
            <p className="text-xs text-muted-foreground text-center">
              Transaction confirmed! Waiting for block confirmation...<br />
              <span className="text-xs text-cyan-500">Hash: {txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
            </p>
          )}
          {txHash && !isPending && !isConfirming && !isSuccess && (
            <p className="text-xs text-yellow-500 text-center">
              Transaction submitted. Waiting for confirmation...
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ListCollectibleDialog;

