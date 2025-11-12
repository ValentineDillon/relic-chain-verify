import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const ProvenanceFooter = () => {
  const transactions = [
    { id: "0x7f9a...3c21", from: "0x4f2a...1b89", to: "0x8e3c...4d67", time: "2 mins ago", item: "Vintage Watch" },
    { id: "0x6e8b...2d14", from: "0x3d1f...9c45", to: "0x7a2e...8f31", time: "15 mins ago", item: "Diamond Necklace" },
    { id: "0x5d7c...1e03", from: "0x2c0e...7b56", to: "0x6b1d...3a92", time: "1 hour ago", item: "Classic Car Model" },
    { id: "0x4c6a...0f92", from: "0x1b9d...6a78", to: "0x5a0c...2b84", time: "3 hours ago", item: "Vintage Wine" },
  ];

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Provenance Log</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-encryption" />
            <span>Real-time verification</span>
          </div>
        </div>
        <ScrollArea className="h-64">
          <div className="space-y-4">
            {transactions.map((tx) => (
              <Card key={tx.id} className="p-4 bg-secondary/50 border-border hover:border-encryption transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-luxury">{tx.item}</span>
                      <span className="text-xs text-muted-foreground">{tx.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">From</span>
                      <code className="px-2 py-1 bg-muted rounded text-encryption">{tx.from}</code>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">To</span>
                      <code className="px-2 py-1 bg-muted rounded text-encryption">{tx.to}</code>
                    </div>
                  </div>
                  <code className="text-xs text-muted-foreground ml-4">{tx.id}</code>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 CollectChain. Securing rare collectibles with blockchain technology.</p>
        </div>
      </div>
    </footer>
  );
};

export default ProvenanceFooter;
