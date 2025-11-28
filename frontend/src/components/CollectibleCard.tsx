import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Eye, ShoppingCart, Bell } from "lucide-react";
import { useAccount } from 'wagmi';
import { useCollectibleInfo } from "@/hooks/useContract";
import { useState, useEffect } from "react";
import PurchaseDialog from "./PurchaseDialog";
import DecryptDialog from "./DecryptDialog";
import OwnerRequestsDialog from "./OwnerRequestsDialog";

interface CollectibleCardProps {
  tokenId: bigint;
}

const CollectibleCard = ({ tokenId }: CollectibleCardProps) => {
  const { address, isConnected } = useAccount();
  const { data: info, isLoading, error } = useCollectibleInfo(tokenId);
  const [showPurchase, setShowPurchase] = useState(false);
  const [showDecrypt, setShowDecrypt] = useState(false);
  const [showOwnerRequests, setShowOwnerRequests] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log(`CollectibleCard tokenId ${tokenId}:`, {
      info,
      isLoading,
      error,
      exists: info?.[4], // exists is the 5th element in the tuple
    });
  }, [tokenId, info, isLoading, error]);

  // Show loading state
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading...</div>
      </Card>
    );
  }

  // Show error state
  if (error) {
    console.error(`Error loading collectible ${tokenId}:`, error);
    return null;
  }

  // Check if collectible exists
  // getCollectibleInfo returns: (string name, string imageUri, address owner, uint256 listedAt, bool exists)
  if (!info || !info[4]) { // exists is the 5th element (index 4)
    return null;
  }

  // Destructure the tuple
  const [name, imageUri, owner, listedAt, exists] = info;

  const isOwner = address?.toLowerCase() === owner.toLowerCase();

  return (
    <>
      <Card className="group relative overflow-hidden bg-card border-border hover:border-cyan-500 transition-all duration-500 flex flex-col h-full">
        <div className="relative aspect-square overflow-hidden bg-muted flex-shrink-0">
          {imageUri ? (
            <img
              src={imageUri}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}
          <div className="absolute inset-0 bg-cyan-500/10 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="relative">
              <Lock className="h-16 w-16 text-cyan-500 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-3 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg sm:text-xl font-semibold truncate flex-1">{name}</h3>
            <Badge className="bg-purple-500 text-white flex-shrink-0">
              #{tokenId.toString()}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <span>Owned by</span>
            <span className="text-cyan-500 font-medium truncate">
              {owner.slice(0, 6)}...{owner.slice(-4)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-cyan-500">
            <Lock className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">Encrypted Metadata</span>
          </div>
          <div className="flex gap-2 pt-2 mt-auto">
            {isOwner ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-w-0 !whitespace-normal text-xs sm:text-sm px-2 sm:px-3"
                  onClick={() => setShowDecrypt(true)}
                >
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 flex-shrink-0" />
                  <span>Decrypt</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-w-0 !whitespace-normal text-xs sm:text-sm px-2 sm:px-3"
                  onClick={() => setShowOwnerRequests(true)}
                >
                  <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 flex-shrink-0" />
                  <span>Requests</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 min-w-0 !whitespace-normal text-xs sm:text-sm px-2 sm:px-3"
                  onClick={() => setShowDecrypt(true)}
                >
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 flex-shrink-0" />
                  <span>Details</span>
                </Button>
                <Button
                  size="sm"
                  className="flex-1 min-w-0 !whitespace-normal text-xs sm:text-sm px-2 sm:px-3 bg-gradient-to-r from-primary to-cyan-500 hover:opacity-90"
                  onClick={() => setShowPurchase(true)}
                  disabled={!isConnected}
                >
                  <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 flex-shrink-0" />
                  <span>Offer</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
      <PurchaseDialog
        open={showPurchase}
        onOpenChange={setShowPurchase}
        tokenId={tokenId}
        collectibleName={name}
      />
      <DecryptDialog
        open={showDecrypt}
        onOpenChange={setShowDecrypt}
        tokenId={tokenId}
        isOwner={isOwner || false}
      />
      {isOwner && (
        <OwnerRequestsDialog
          open={showOwnerRequests}
          onOpenChange={setShowOwnerRequests}
        />
      )}
    </>
  );
};

export default CollectibleCard;

