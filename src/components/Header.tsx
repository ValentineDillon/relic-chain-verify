import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import logo from "@/assets/logo.png";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="CollectChain" className="h-12 w-12 animate-pulse-glow" />
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-encryption bg-clip-text text-transparent">
              CollectChain
            </h1>
            <p className="text-xs text-muted-foreground">Own. Prove. Protect.</p>
          </div>
        </div>
        <Button className="bg-gradient-to-r from-primary to-encryption hover:opacity-90 transition-opacity">
          <Shield className="mr-2 h-4 w-4" />
          Connect Rainbow Wallet
        </Button>
      </div>
    </header>
  );
};

export default Header;
