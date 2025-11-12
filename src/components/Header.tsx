import { ConnectButton } from '@rainbow-me/rainbowkit';
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
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            mounted,
          }) => {
            const ready = mounted;
            const connected = ready && account && chain;

            return (
              <div
                {...(!ready && {
                  'aria-hidden': true,
                  style: {
                    opacity: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <button
                        onClick={openConnectModal}
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-gradient-to-r from-primary to-encryption text-primary-foreground hover:opacity-90 transition-opacity h-10 px-4 py-2"
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Connect Rainbow Wallet
                      </button>
                    );
                  }

                  if (chain.unsupported) {
                    return (
                      <button
                        onClick={openChainModal}
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 px-4 py-2"
                      >
                        Wrong network
                      </button>
                    );
                  }

                  return (
                    <div className="flex gap-3">
                      <button
                        onClick={openChainModal}
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-border bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                      >
                        {chain.hasIcon && (
                          <div
                            className="w-4 h-4 rounded-full overflow-hidden"
                            style={{ background: chain.iconBackground }}
                          >
                            {chain.iconUrl && (
                              <img
                                alt={chain.name ?? 'Chain icon'}
                                src={chain.iconUrl}
                                className="w-4 h-4"
                              />
                            )}
                          </div>
                        )}
                        {chain.name}
                      </button>

                      <button
                        onClick={openAccountModal}
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-gradient-to-r from-primary to-encryption text-primary-foreground hover:opacity-90 transition-opacity h-10 px-4 py-2"
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        {account.displayName}
                      </button>
                    </div>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </header>
  );
};

export default Header;
