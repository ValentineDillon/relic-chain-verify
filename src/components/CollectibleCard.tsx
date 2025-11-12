import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Eye, ShoppingCart } from "lucide-react";
import { useAccount } from 'wagmi';
import { toast } from "@/hooks/use-toast";

interface CollectibleCardProps {
  title: string;
  image: string;
  owner: string;
  verified: boolean;
  encrypted: boolean;
}

const CollectibleCard = ({ title, image, owner, verified, encrypted }: CollectibleCardProps) => {
  const { address, isConnected } = useAccount();

  const handleViewDetails = () => {
    toast({
      title: "Item Details",
      description: `Viewing encrypted metadata for ${title}`,
    });
  };

  const handlePurchase = () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to purchase items",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Purchase Initiated",
      description: `Starting secure transfer process for ${title}`,
    });
  };

  return (
    <Card className="group relative overflow-hidden bg-card border-border hover:border-encryption transition-all duration-500">
      <div className="relative aspect-square overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {encrypted && (
          <div className="absolute inset-0 bg-encryption/10 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="relative">
              <Lock className="h-16 w-16 text-encryption animate-pulse-glow" />
              <div className="absolute inset-0 border-2 border-encryption rounded-full animate-encryption-rotate" 
                   style={{ width: '120px', height: '120px', left: '-32px', top: '-32px' }} />
            </div>
          </div>
        )}
      </div>
      <div className="p-6 space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold">{title}</h3>
          {verified && (
            <Badge className="bg-luxury text-accent-foreground">
              Verified
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Owned by</span>
          <span className="text-encryption font-medium">{owner}</span>
        </div>
        {encrypted && (
          <div className="flex items-center gap-2 text-xs text-encryption">
            <Lock className="h-3 w-3" />
            <span>Encrypted Metadata</span>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={handleViewDetails}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          <Button 
            size="sm" 
            className="flex-1 bg-gradient-to-r from-primary to-luxury hover:opacity-90"
            onClick={handlePurchase}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Purchase
          </Button>
        </div>
      </div>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
           style={{ boxShadow: 'inset 0 0 60px rgba(6, 182, 212, 0.2)' }} />
    </Card>
  );
};

export default CollectibleCard;
