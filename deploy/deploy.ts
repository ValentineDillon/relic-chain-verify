import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedRelicChainVerify = await deploy("RelicChainVerify", {
    from: deployer,
    log: true,
  });

  console.log(`RelicChainVerify contract: `, deployedRelicChainVerify.address);
};
export default func;
func.id = "deploy_relicChainVerify"; // id required to prevent reexecution
func.tags = ["RelicChainVerify"];


