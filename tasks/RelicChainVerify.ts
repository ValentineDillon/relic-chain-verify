import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Example:
 *   - npx hardhat --network localhost task:address
 *   - npx hardhat --network sepolia task:address
 */
task("task:address", "Prints the RelicChainVerify address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const relicChainVerify = await deployments.get("RelicChainVerify");

  console.log("RelicChainVerify address is " + relicChainVerify.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost task:list --name "Vintage Watch" --image "ipfs://..." --price 92000 --cert 987654 --serial 16751969001 --origin 1969
 */
task("task:list", "List a new collectible")
  .addParam("name", "The name of the collectible")
  .addParam("image", "The image URI")
  .addParam("price", "The purchase price (will be encrypted)")
  .addParam("cert", "The certificate number (will be encrypted)")
  .addParam("serial", "The serial number (will be encrypted)")
  .addParam("origin", "The origin code (will be encrypted)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const RelicChainVerifyDeployment = await deployments.get("RelicChainVerify");
    console.log(`RelicChainVerify: ${RelicChainVerifyDeployment.address}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("RelicChainVerify", RelicChainVerifyDeployment.address);

    const price = parseInt(taskArguments.price);
    const cert = parseInt(taskArguments.cert);
    const serial = parseInt(taskArguments.serial);
    const origin = parseInt(taskArguments.origin);

    // Encrypt all values
    const encryptedPrice = await fhevm
      .createEncryptedInput(RelicChainVerifyDeployment.address, signers[0].address)
      .add32(price)
      .encrypt();

    const encryptedCert = await fhevm
      .createEncryptedInput(RelicChainVerifyDeployment.address, signers[0].address)
      .add32(cert)
      .encrypt();

    const encryptedSerial = await fhevm
      .createEncryptedInput(RelicChainVerifyDeployment.address, signers[0].address)
      .add32(serial)
      .encrypt();

    const encryptedOrigin = await fhevm
      .createEncryptedInput(RelicChainVerifyDeployment.address, signers[0].address)
      .add32(origin)
      .encrypt();

    // Use the same proof for all (in production, you might need separate proofs)
    const tx = await contract
      .connect(signers[0])
      .listCollectible(
        taskArguments.name,
        taskArguments.image,
        encryptedPrice.handles[0],
        encryptedCert.handles[0],
        encryptedSerial.handles[0],
        encryptedOrigin.handles[0],
        encryptedPrice.inputProof
      );
    
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const totalCollectibles = await contract.getTotalCollectibles();
    console.log(`Total collectibles: ${totalCollectibles}`);
    console.log(`Collectible listed successfully!`);
  });


