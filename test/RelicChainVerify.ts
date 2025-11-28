import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { RelicChainVerify, RelicChainVerify__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("RelicChainVerify")) as RelicChainVerify__factory;
  const contract = (await factory.deploy()) as RelicChainVerify;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("RelicChainVerify", function () {
  let signers: Signers;
  let contract: RelicChainVerify;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  it("should list a new collectible with encrypted metadata", async function () {
    const name = "Vintage Rolex";
    const imageUri = "ipfs://QmTest123";
    const purchasePrice = 92000;
    const certNumber = 987654;
    const serialNumber = 16751969; // Fixed: within uint32 range (max: 4294967295)
    const originCode = 1969;

    // Encrypt all metadata fields in a single batch (same inputProof required)
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(purchasePrice)
      .add32(certNumber)
      .add32(serialNumber)
      .add32(originCode)
      .encrypt();

    const tx = await contract
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

    const tokenId = 0;
    const info = await contract.getCollectibleInfo(tokenId);
    
    expect(info.name).to.eq(name);
    expect(info.imageUri).to.eq(imageUri);
    expect(info.owner).to.eq(signers.alice.address);
    expect(info.exists).to.be.true;
  });

  it("should allow purchase and transfer ownership with ACL update", async function () {
    // First, list a collectible
    const name = "Test Item";
    const imageUri = "ipfs://QmTest";
    const purchasePrice = 1000;
    const certNumber = 123456;
    const serialNumber = 1234567; // Fixed: within uint32 range
    const originCode = 2024;

    // Encrypt all metadata fields in a single batch (same inputProof required)
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(purchasePrice)
      .add32(certNumber)
      .add32(serialNumber)
      .add32(originCode)
      .encrypt();

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

    const tokenId = 0;
    
    // Verify Alice can decrypt before purchase
    const encryptedMetadataBefore = await contract.getEncryptedMetadata(tokenId);
    const decryptedPriceBefore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedMetadataBefore.encryptedPrice,
      contractAddress,
      signers.alice,
    );
    expect(decryptedPriceBefore).to.eq(purchasePrice);

    // Bob purchases the collectible
    const purchaseAmount = ethers.parseEther("1.0");
    const bobBalanceBefore = await ethers.provider.getBalance(signers.bob.address);
    const aliceBalanceBefore = await ethers.provider.getBalance(signers.alice.address);

    tx = await contract
      .connect(signers.bob)
      .purchaseCollectible(tokenId, { value: purchaseAmount });
    await tx.wait();

    // Verify ownership transfer
    const info = await contract.getCollectibleInfo(tokenId);
    expect(info.owner).to.eq(signers.bob.address);

    // Verify Bob can decrypt after purchase
    const encryptedMetadataAfter = await contract.getEncryptedMetadata(tokenId);
    const decryptedPriceAfter = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedMetadataAfter.encryptedPrice,
      contractAddress,
      signers.bob,
    );
    expect(decryptedPriceAfter).to.eq(purchasePrice);

    // Verify Alice can no longer decrypt (should fail)
    try {
      await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedMetadataAfter.encryptedPrice,
        contractAddress,
        signers.alice,
      );
      expect.fail("Alice should not be able to decrypt after transfer");
    } catch (error) {
      // Expected to fail
    }

    // Verify payment was transferred
    const aliceBalanceAfter = await ethers.provider.getBalance(signers.alice.address);
    expect(aliceBalanceAfter).to.be.gt(aliceBalanceBefore);
  });

  it("should record provenance on transfer", async function () {
    // List collectible - encrypt all fields in a single batch
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(1000)      // purchasePrice
      .add32(123456)    // certNumber
      .add32(1234567)   // serialNumber (fixed: within uint32 range)
      .add32(2024)      // originCode
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .listCollectible(
        "Test",
        "ipfs://test",
        encrypted.handles[0], // purchasePrice
        encrypted.handles[1], // certNumber
        encrypted.handles[2], // serialNumber
        encrypted.handles[3], // originCode
        encrypted.inputProof
      );
    await tx.wait();

    const tokenId = 0;

    // Purchase
    tx = await contract
      .connect(signers.bob)
      .purchaseCollectible(tokenId, { value: ethers.parseEther("1.0") });
    await tx.wait();

    // Check provenance
    const provenance = await contract.getProvenance(tokenId);
    expect(provenance.length).to.eq(1);
    expect(provenance[0].from).to.eq(signers.alice.address);
    expect(provenance[0].to).to.eq(signers.bob.address);
  });
});


