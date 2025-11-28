import { ConnectButton } from '@rainbow-me/rainbowkit';

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
            Relic Chain Verify
          </h1>
          <p className="text-xs text-muted-foreground">Own. Prove. Protect.</p>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
};

export default Header;

