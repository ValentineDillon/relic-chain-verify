import { useEffect, useState } from "react";
import Header from "@/components/Header";
import CollectibleCard from "@/components/CollectibleCard";
import ListCollectibleDialog from "@/components/ListCollectibleDialog";
import { useTotalCollectibles } from "@/hooks/useContract";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Index = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showListDialog, setShowListDialog] = useState(false);
  const { address, isConnected } = useAccount();
  const { data: totalCollectibles } = useTotalCollectibles();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Debug: log total collectibles
  useEffect(() => {
    console.log('Total collectibles:', totalCollectibles);
  }, [totalCollectibles]);

  const collectibleIds = Array.from({ length: Number(totalCollectibles || 0) }, (_, i) => BigInt(i));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-background via-background/50 to-background" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className={`text-center max-w-4xl mx-auto transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            <h2 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-primary via-cyan-500 to-purple-500 bg-clip-text text-transparent leading-tight">
              Own. Prove. Protect.
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              Register encrypted metadata of rare items. Ownership proofs decrypt during transfer.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center gap-2 text-sm text-cyan-500">
                <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
                <span>Blockchain secured</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-purple-500">
                <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                <span>Encrypted metadata</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-primary">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span>Verified provenance</span>
              </div>
            </div>
            {isConnected && (
              <div className="mt-8">
                <Button
                  onClick={() => setShowListDialog(true)}
                  size="lg"
                  className="bg-gradient-to-r from-primary to-cyan-500 hover:opacity-90"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  List New Collectible
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Showcase Wall */}
      <section className="py-24 relative">
        <div className="container mx-auto px-6">
          <div className={`text-center mb-16 transition-all duration-1000 delay-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            <h3 className="text-4xl font-bold mb-4">Encrypted Showcase</h3>
            <p className="text-lg text-muted-foreground">
              Browse all collectibles with encrypted metadata
            </p>
          </div>
          
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 transition-all duration-1000 delay-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            {collectibleIds.map((tokenId) => (
              <div key={tokenId.toString()} className="animate-fade-in">
                <CollectibleCard tokenId={tokenId} />
              </div>
            ))}
            {collectibleIds.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-12">
                No collectibles listed yet. Be the first to list one!
              </div>
            )}
          </div>
        </div>
      </section>

      <ListCollectibleDialog open={showListDialog} onOpenChange={setShowListDialog} />
    </div>
  );
};

export default Index;

