import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRelicChainVerify, usePurchaseRequest, useOwnerPendingRequests, useCollectibleInfo } from "@/hooks/useContract";
import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { formatEther } from "viem";
import { Check, X, Clock } from "lucide-react";

interface OwnerRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OwnerRequestsDialog = ({ open, onOpenChange }: OwnerRequestsDialogProps) => {
  const { address } = useAccount();
  const { approvePurchase, rejectPurchase, isPending, isSuccess } = useRelicChainVerify();
  const { data: requestIds, refetch: refetchRequests } = useOwnerPendingRequests(address);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isSuccess) {
      // Refresh requests after approval/rejection
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['readContract'] });
        refetchRequests();
      }, 2000);
    }
  }, [isSuccess, queryClient, refetchRequests]);

  const handleApprove = async (requestId: bigint) => {
    try {
      await approvePurchase(requestId);
      toast.info("Approving purchase request... Please confirm in your wallet.");
    } catch (error: any) {
      console.error("Failed to approve:", error);
      toast.error(error?.message || "Failed to approve purchase request");
    }
  };

  const handleReject = async (requestId: bigint) => {
    try {
      await rejectPurchase(requestId);
      toast.info("Rejecting purchase request... Please confirm in your wallet.");
    } catch (error: any) {
      console.error("Failed to reject:", error);
      toast.error(error?.message || "Failed to reject purchase request");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pending Purchase Requests</DialogTitle>
          <DialogDescription>
            Review and respond to purchase requests for your collectibles
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!requestIds && (
            <div className="text-center text-muted-foreground py-8">
              Loading requests...
            </div>
          )}
          {requestIds && requestIds.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No pending purchase requests
            </div>
          )}
          {requestIds && requestIds.length > 0 && (
            <div className="space-y-3">
              {requestIds.map((requestId) => (
                <PurchaseRequestItem
                  key={requestId.toString()}
                  requestId={requestId}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isPending={isPending}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface PurchaseRequestItemProps {
  requestId: bigint;
  onApprove: (requestId: bigint) => void;
  onReject: (requestId: bigint) => void;
  isPending: boolean;
}

const PurchaseRequestItem = ({ requestId, onApprove, onReject, isPending }: PurchaseRequestItemProps) => {
  const { data: requestData, isLoading, isError } = usePurchaseRequest(requestId);
  
  // Handle different data formats: could be array (tuple) or object (struct)
  let reqId: bigint | undefined;
  let tokId: bigint | undefined;
  let buyer: string | undefined;
  let offerAmount: bigint | undefined;
  let isPendingReq: boolean | undefined;
  let isApproved: boolean | undefined;
  let timestamp: bigint | undefined;

  if (requestData) {
    // Check if it's an array (tuple format from contract)
    if (Array.isArray(requestData)) {
      [reqId, tokId, buyer, offerAmount, isPendingReq, isApproved, timestamp] = requestData as any[];
    } 
    // Check if it's an object (struct format)
    else if (typeof requestData === 'object' && requestData !== null) {
      const data = requestData as any;
      // Handle nested struct (requestData.request)
      const struct = data.request || data;
      reqId = struct.requestId;
      tokId = struct.tokenId;
      buyer = struct.buyer;
      offerAmount = struct.offerAmount;
      isPendingReq = struct.isPending;
      isApproved = struct.isApproved;
      timestamp = struct.timestamp;
    }
  }

  const tokenId = tokId || BigInt(0);
  const { data: collectibleInfo } = useCollectibleInfo(tokenId);

  if (isLoading || !requestData) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="text-sm text-muted-foreground">Loading request #{requestId.toString()}...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 border rounded-lg border-red-500">
        <div className="text-sm text-red-500">Error loading request #{requestId.toString()}</div>
      </div>
    );
  }

  // Skip if not pending
  if (!isPendingReq) {
    return null;
  }

  const collectibleName = (Array.isArray(collectibleInfo) ? collectibleInfo[0] : collectibleInfo?.name) || `Token #${tokId?.toString() || 'N/A'}`;
  const offerAmountEth = offerAmount ? formatEther(offerAmount as bigint) : '0';

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">Request #{reqId?.toString()}</Badge>
            <Badge className="bg-yellow-500">
              <Clock className="h-3 w-3 mr-1" />
              Pending
            </Badge>
          </div>
          <h4 className="font-semibold">{collectibleName}</h4>
          <p className="text-sm text-muted-foreground">
            Token ID: {tokId?.toString()}
          </p>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Buyer:</span>
          <span className="font-mono text-xs">
            {buyer ? `${buyer.slice(0, 6)}...${buyer.slice(-4)}` : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Offer Amount:</span>
          <span className="font-semibold text-cyan-500">{offerAmountEth} ETH</span>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          className="flex-1 bg-green-600 hover:bg-green-700"
          onClick={() => onApprove(requestId)}
          disabled={isPending}
        >
          <Check className="h-4 w-4 mr-2" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="flex-1"
          onClick={() => onReject(requestId)}
          disabled={isPending}
        >
          <X className="h-4 w-4 mr-2" />
          Reject
        </Button>
      </div>
    </div>
  );
};

export default OwnerRequestsDialog;

