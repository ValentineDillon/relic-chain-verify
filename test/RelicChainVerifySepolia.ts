import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { RelicChainVerify } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

describe("RelicChainVerifySepolia", function () {
  let signers: Signers;
  let contract: RelicChainVerify;
  let contractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const RelicChainVerifyDeployment = await deployments.get("RelicChainVerify");
      contractAddress = RelicChainVerifyDeployment.address;
      contract = await ethers.getContractAt("RelicChainVerify", RelicChainVerifyDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0], bob: ethSigners[1] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("should list and purchase a collectible on Sepolia", async function () {
    steps = 15;

    this.timeout(4 * 40000);

    const name = "Vintage Rolex";
    const imageUri = "ipfs://QmTest123";
    const purchasePrice = 92000;
    const certNumber = 987654;
    const serialNumber = 16751969; // Fixed: within uint32 range (max: 4294967295)
    const originCode = 1969;

    progress("Encrypting all metadata fields in a single batch...");
    // Encrypt all metadata fields in a single batch (same inputProof required)
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(purchasePrice)
      .add32(certNumber)
      .add32(serialNumber)
      .add32(originCode)
      .encrypt();

    progress(`Listing collectible: ${name}...`);
    let tx = await contract
      .connect(signers.alice)
      .listCollectible(
        name,
        imageUri,
        encrypted.handles[0], // purchasePrice
        encrypted.handles[1], // certNumber
        encrypted.handles[2], // serialNumber
        encrypted.handles[3], // originCode
        encrypted.inputProof
      );
    await tx.wait();

    progress("Getting collectible info...");
    const tokenId = 0;
    const info = await contract.getCollectibleInfo(tokenId);
    expect(info.name).to.eq(name);
    expect(info.owner).to.eq(signers.alice.address);

    progress("Decrypting encrypted price (Alice should be able to)...");
    const encryptedMetadata = await contract.getEncryptedMetadata(tokenId);
    const decryptedPrice = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedMetadata.encryptedPrice,
      contractAddress,
      signers.alice,
    );
    progress(`Decrypted price: ${decryptedPrice}`);
    expect(decryptedPrice).to.eq(purchasePrice);

    progress("Bob purchasing collectible...");
    const purchaseAmount = ethers.parseEther("0.1");
    tx = await contract
      .connect(signers.bob)
      .purchaseCollectible(tokenId, { value: purchaseAmount });
    await tx.wait();

    progress("Verifying ownership transfer...");
    const infoAfter = await contract.getCollectibleInfo(tokenId);
    expect(infoAfter.owner).to.eq(signers.bob.address);

    progress("Decrypting encrypted price (Bob should be able to now)...");
    const encryptedMetadataAfter = await contract.getEncryptedMetadata(tokenId);
    const decryptedPriceAfter = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedMetadataAfter.encryptedPrice,
      contractAddress,
      signers.bob,
    );
    progress(`Decrypted price: ${decryptedPriceAfter}`);
    expect(decryptedPriceAfter).to.eq(purchasePrice);

    progress("Checking provenance...");
    const provenance = await contract.getProvenance(tokenId);
    expect(provenance.length).to.eq(1);
    expect(provenance[0].from).to.eq(signers.alice.address);
    expect(provenance[0].to).to.eq(signers.bob.address);

    progress("Test completed successfully!");
  });
});


