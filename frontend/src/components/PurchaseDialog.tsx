import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRelicChainVerify } from "@/hooks/useContract";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokenId: bigint;
  collectibleName: string;
}

const PurchaseDialog = ({ open, onOpenChange, tokenId, collectibleName }: PurchaseDialogProps) => {
  const { requestPurchase, isPending, isSuccess, hash } = useRelicChainVerify();
  const [offerAmount, setOfferAmount] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isSuccess) {
      toast.success("Purchase request submitted! Waiting for owner approval...");
      setOfferAmount("");
      onOpenChange(false);
      // Invalidate queries to refresh data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['readContract'] });
      }, 2000);
    }
  }, [isSuccess, onOpenChange, queryClient]);

  const handleRequestPurchase = async () => {
    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      toast.error("Please enter a valid offer amount");
      return;
    }

    try {
      await requestPurchase(tokenId, offerAmount);
      toast.info("Submitting purchase request... Please confirm in your wallet.");
    } catch (error: any) {
      console.error("Failed to request purchase:", error);
      toast.error(error?.message || "Failed to submit purchase request");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request to Purchase {collectibleName}</DialogTitle>
          <DialogDescription>
            Submit an offer to purchase this collectible. The owner will need to approve your request.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="offerAmount">Offer Amount (ETH)</Label>
            <Input
              id="offerAmount"
              type="number"
              step="0.001"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="0.1"
            />
            <p className="text-xs text-muted-foreground">
              Your ETH will be held in escrow until the owner approves or rejects your request.
            </p>
          </div>
          <Button
            onClick={handleRequestPurchase}
            disabled={isPending || !offerAmount}
            className="w-full"
          >
            {isPending ? "Submitting Request..." : "Submit Purchase Request"}
          </Button>
          {hash && (
            <p className="text-xs text-muted-foreground text-center">
              Transaction: {hash.slice(0, 10)}...{hash.slice(-8)}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseDialog;


