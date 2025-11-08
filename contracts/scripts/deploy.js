const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying Tokenized Subscription contracts...");
  
  // Get deployer/signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);
  
  // Deploy SubscriptionToken
  console.log("Deploying SubscriptionToken...");
  const SubscriptionToken = await hre.ethers.getContractFactory("SubscriptionToken");
  const token = await SubscriptionToken.deploy(
    "Tokenized Subscription", // name
    "TSUB",                   // symbol
    "https://api.tokensub.io/tokens/" // base URI
  );
  await token.waitForDeployment();
  console.log(`SubscriptionToken deployed to: ${await token.getAddress()}`);
  
  // Deploy LendingEscrow
  console.log("Deploying LendingEscrow...");
  const LendingEscrow = await hre.ethers.getContractFactory("LendingEscrow");
  const lendingEscrow = await LendingEscrow.deploy(
    await token.getAddress(), // subscription token address
    deployer.address,         // platform wallet
    500                       // 5% platform fee (500 basis points)
  );
  await lendingEscrow.waitForDeployment();
  console.log(`LendingEscrow deployed to: ${await lendingEscrow.getAddress()}`);
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    subscriptionToken: await token.getAddress(),
    lendingEscrow: await lendingEscrow.getAddress(),
    timestamp: new Date().toISOString()
  };
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Save deployment info to file
  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("Deployment info saved to:", deploymentFile);
  
  // Verify contracts on block explorer (if not localhost)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations before verification...");
    await token.deploymentTransaction().wait(6);
    await lendingEscrow.deploymentTransaction().wait(6);
    
    console.log("Verifying SubscriptionToken...");
    await hre.run("verify:verify", {
      address: await token.getAddress(),
      constructorArguments: [
        "Tokenized Subscription",
        "TSUB",
        "https://api.tokensub.io/tokens/"
      ]
    });
    
    console.log("Verifying LendingEscrow...");
    await hre.run("verify:verify", {
      address: await lendingEscrow.getAddress(),
      constructorArguments: [
        await token.getAddress(),
        deployer.address,
        500
      ]
    });
  }
  
  return deploymentInfo;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
