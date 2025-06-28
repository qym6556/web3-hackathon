const { SecretsManager } = require("@chainlink/functions-toolkit");
const { ethers } = require("ethers");
const dotenv = require("dotenv");
const fs = require("fs");

dotenv.config({ path: "./.env.local" });

const makeRequest = async () => {
  // get from https://dashboard.alchemy.com/apps/kch3t9k2o0bkac01/networks
  if (!process.env.ETHEREUM_PROVIDER_ETHEREUM_SEPOLIA) {
    throw new Error("ETHEREUM_PROVIDER_ETHEREUM_SEPOLIA not provided - check your environment variables");
  }
  if (!process.env.API_KEY) {
    throw new Error("API_KEY not provided - check your environment variables");
  }
  if (!process.env.EVM_PRIVATE_KEY) {
    throw new Error("EVM_PRIVATE_KEY not provided - check your environment variables");
  }

  // hardcoded for Sepolia
  const routerAddress = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
  const donId = "fun-ethereum-sepolia-1";
  const rpcUrl = process.env.ETHEREUM_PROVIDER_ETHEREUM_SEPOLIA; // fetch Sepolia RPC URL

  const gatewayUrls = [
    "https://01.functions-gateway.testnet.chain.link/",
    "https://02.functions-gateway.testnet.chain.link/"
  ];
  const slotIdNumber = 0;
  const expirationTimeMinutes = 1440;

  const secrets = { apiKey: process.env.API_KEY };

  // Initialize ethers signer and provider to interact with the contracts onchain
  const privateKey = process.env.EVM_PRIVATE_KEY; // fetch EVM_PRIVATE_KEY
  if (!privateKey) throw new Error("private key not provided - check your environment variables");

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  const wallet = new ethers.Wallet(privateKey);
  const signer = wallet.connect(provider); // create ethers signer for signing transactions

  //////// MAKE REQUEST ////////

  console.log("\nMake request...");

  // First encrypt secrets and create a gist
  const secretsManager = new SecretsManager({
    signer: signer,
    functionsRouterAddress: routerAddress,
    donId: donId
  });
  await secretsManager.initialize();

  // Encrypt secrets
  const encryptedSecretsObj = await secretsManager.encryptSecrets(secrets);

  console.log(
    `Upload encrypted secret to gateways ${gatewayUrls}. slotId ${slotIdNumber}. Expiration in minutes: ${expirationTimeMinutes}`
  );

  // Upload secrets
  const uploadResult = await secretsManager.uploadEncryptedSecretsToDON({
    encryptedSecretsHexstring: encryptedSecretsObj.encryptedSecrets,
    gatewayUrls: gatewayUrls,
    slotId: slotIdNumber,
    minutesUntilExpiration: expirationTimeMinutes
  });

  if (!uploadResult.success) throw new Error(`Encrypted secrets not uploaded to ${gatewayUrls}`);

  console.log(`\n✅ Secrets uploaded properly to gateways ${gatewayUrls}! Gateways response: `, uploadResult);

  const donHostedSecretsVersion = parseInt(uploadResult.version); // fetch the reference of the encrypted secrets

  // Save info in case we clear console
  fs.writeFileSync(
    "donSecretsInfo.txt",
    JSON.stringify(
      {
        donHostedSecretsVersion: donHostedSecretsVersion.toString(),
        slotId: slotIdNumber.toString(),
        expirationTimeMinutes: expirationTimeMinutes.toString()
      },
      null,
      2
    )
  );

  console.log(`donHostedSecretsVersion is ${donHostedSecretsVersion},  Saved info to donSecretsInfo.txt`);
};

makeRequest().catch(e => {
  console.error(e);
  process.exit(1);
});
