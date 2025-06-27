import * as anchor from "@coral-xyz/anchor";

import { AccountMeta, Keypair, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  ApiV3PoolInfoConcentratedItem,
  ClmmKeys,
  ComputeClmmPoolInfo,
  MEMO_PROGRAM_ID,
  PoolUtils,
  Raydium,
  ReturnTypeFetchMultiplePoolTickArrays,
} from "@raydium-io/raydium-sdk-v2";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { getPoolAddress, getPoolVaultAddress } from "./utils/pda";

import { SwapTokens } from "./../target/types/swap_tokens";
import { ethers } from "ethers";

/*
  [
    "0x0000000000000000000000000000000000000000",
    "false",
    "0x0000000000000000000000000000000000000000",
    "0x",
    "0"
  ]
*/

const provider = anchor.AnchorProvider.env();
const connection = provider.connection;
const wallet = provider.wallet;

anchor.setProvider(provider);

const program = anchor.workspace.SwapTokens as anchor.Program<SwapTokens>;
console.log("Program ID:", program.programId.toBase58());

const [programPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("connected")],
  program.programId
);

console.log("programPda:", programPda.toBase58());

const GATEWAY_PROGRAM_ID = new PublicKey("ZETAjseVjuFsxdRxo6MmTCvqFwb3ZHUx56Co3vCmGis");

const [gatewayPda, _bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("meta")],
  GATEWAY_PROGRAM_ID
);

const SEED_VAULT = "connected";
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

// CLMM
const CLMM_PROGRAM_ID = new PublicKey("devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH");
const AMM_CONFIG = new PublicKey("CQYbhr6amxUER4p5SC44C63R4qw4NFc9Z4Db9vF4tZwG");

async function encode() {
  // raydium setup (swap)
  const raydium = await Raydium.load({
    owner: wallet.payer,
    connection,
    cluster: "devnet",
  });

  const inputToken = WSOL_MINT;
  const outputToken = USDC_MINT;

  // WSOL-USDC pool
  const [poolAddress] = getPoolAddress(AMM_CONFIG, inputToken, outputToken, CLMM_PROGRAM_ID);

  let poolInfo: ApiV3PoolInfoConcentratedItem;
  let poolKeys: ClmmKeys | undefined;
  let clmmPoolInfo: ComputeClmmPoolInfo;
  let tickCache: ReturnTypeFetchMultiplePoolTickArrays;

  const rData = await raydium.clmm.getPoolInfoFromRpc(poolAddress.toBase58());
  poolInfo = rData.poolInfo;
  poolKeys = rData.poolKeys;
  clmmPoolInfo = rData.computePoolInfo;
  tickCache = rData.tickData;

  const [inputVault] = getPoolVaultAddress(poolAddress, inputToken, CLMM_PROGRAM_ID);
  const [outputVault] = getPoolVaultAddress(poolAddress, outputToken, CLMM_PROGRAM_ID);

  if (
    inputToken.toBase58() !== poolInfo.mintA.address &&
    inputToken.toBase58() !== poolInfo.mintB.address
  ) {
    throw new Error("input mint does not match pool");
  }

  const sender = convertEthAddressToBytes("0x0080672c562ACE2e47FEDe0d7E80255f3f795a98");

  const [senderVault] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_VAULT), outputToken.toBytes(), sender],
    program.programId
  );

  const senderTokenAccount = getAssociatedTokenAddressSync(outputToken, senderVault, true);

  const wsolGatewayAccount = getAssociatedTokenAddressSync(WSOL_MINT, programPda, true);

  const { remainingAccounts } = PoolUtils.computeAmountIn({
    poolInfo: clmmPoolInfo,
    tickArrayCache: tickCache[poolAddress.toBase58()],
    amountOut: new anchor.BN(1),
    baseMint: inputToken,
    slippage: 0.1,
    epochInfo: await raydium.fetchEpochInfo(),
  });

  const convertedAccountMetas: AccountMeta[] = remainingAccounts.map((account) => ({
    pubkey: account,
    isSigner: false,
    isWritable: true,
  }));

  convertedAccountMetas.forEach((account, index) => {
    console.log(`Remaining Account ${index}:`, account.pubkey.toBase58());
  });

  console.log("ammConfig:", AMM_CONFIG.toBase58());
  console.log("Pool address:", poolAddress.toBase58());
  console.log("Input Vault:", inputVault.toBase58());
  console.log("Output Vault:", outputVault.toBase58());
  console.log("Observation State:", clmmPoolInfo.observationId.toBase58());

  // payer
  // const phantomWallet = new PublicKey("3jeS9PoCRKbfxkBzNsVskW8zcZ7XxiD5WGNVgAJkboz4");

  const keypair = Keypair.generate();

  console.log("Keypair Public Key:", keypair.publicKey.toBase58());
  // transaction from wallet to keypair
  const transaction = new anchor.web3.Transaction().add(
    anchor.web3.SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: keypair.publicKey,
      lamports: 1_000_000, // 0.001 SOL
    })
  );

  // Send the transaction
  const signature = await sendAndConfirmTransaction(connection, transaction, [wallet.payer], {
    skipPreflight: true,
  });
  console.log("Transaction signature:", signature);

  const accounts = [
    {
      isWritable: true,
      publicKey: ethers.hexlify(keypair.publicKey.toBytes()),
    },
    {
      isWritable: false,
      publicKey: ethers.hexlify(gatewayPda.toBytes()),
    },

    // raydium
    {
      isWritable: false,
      publicKey: ethers.hexlify(AMM_CONFIG.toBytes()),
    },
    {
      isWritable: true,
      publicKey: ethers.hexlify(poolAddress.toBytes()),
    },
    {
      isWritable: true,
      publicKey: ethers.hexlify(inputVault.toBytes()),
    },
    {
      isWritable: true,
      publicKey: ethers.hexlify(outputVault.toBytes()),
    },
    {
      isWritable: true,
      publicKey: ethers.hexlify(clmmPoolInfo.observationId.toBytes()),
    },
    {
      isWritable: false,
      publicKey: ethers.hexlify(inputToken.toBytes()),
    },
    {
      isWritable: false,
      publicKey: ethers.hexlify(outputToken.toBytes()),
    },
    {
      isWritable: true,
      publicKey: ethers.hexlify(programPda.toBytes()),
    },
    {
      isWritable: false,
      publicKey: ethers.hexlify(TOKEN_PROGRAM_ID.toBytes()),
    },
    {
      isWritable: false,
      publicKey: ethers.hexlify(anchor.web3.SystemProgram.programId.toBytes()),
    },

    // sender_vault
    // sender_token_account
    // wsol_gateway_account
    // token_program_2022
    // memo_program
    // gateway_program
    // clmm_program
    {
      isWritable: true,
      publicKey: ethers.hexlify(senderVault.toBytes()),
    },
    {
      isWritable: true,
      publicKey: ethers.hexlify(senderTokenAccount.toBytes()),
    },
    {
      isWritable: true,
      publicKey: ethers.hexlify(wsolGatewayAccount.toBytes()),
    },
    {
      isWritable: false,
      publicKey: ethers.hexlify(TOKEN_2022_PROGRAM_ID.toBytes()),
    },
    {
      isWritable: false,
      publicKey: ethers.hexlify(MEMO_PROGRAM_ID.toBytes()),
    },
    {
      isWritable: false,
      publicKey: ethers.hexlify(GATEWAY_PROGRAM_ID.toBytes()),
    },
    {
      isWritable: false,
      publicKey: ethers.hexlify(CLMM_PROGRAM_ID.toBytes()),
    },
    ...convertedAccountMetas.map(({ pubkey, isWritable }) => ({
      isWritable,
      publicKey: ethers.hexlify(pubkey.toBytes()),
    })),
  ];

  const message = "sol";
  const data = ethers.hexlify(ethers.toUtf8Bytes(message));

  // accounts and data are abi encoded
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(tuple(bytes32 publicKey, bool isWritable)[] accounts, bytes data)"],
    [[accounts, data]]
  );

  console.log(encoded);
}

encode();

// function decode(encoded: string) {
//   const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
//     ["tuple(tuple(bytes32 publicKey, bool isWritable)[] accounts, bytes data)"],
//     encoded
//   );

//   console.log("Decoded accounts:", decoded[0].accounts);
//   console.log("Decoded data:", ethers.toUtf8String(decoded[0].data));
// }

// decode(
//   "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000000000507632f009cc8c27a91daa4b392a1bd92f50a80b0e1be0b6742c247acfaec6512000000000000000000000000000000000000000000000000000000000000000118a14c1ff4fdcdb919aadb9fc2340cc5047960db89930154409cccdf9a65bb420000000000000000000000000000000000000000000000000000000000000000872f949c50c3f60eda612ac9b076cd8a37ba9e5afffd121424804bdf29d28c0d00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006a7d517187bd16635dad40455fdc2c0c124c68f215675a5dbbacb5f080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000568656c6c6f000000000000000000000000000000000000000000000000000000"
// );

function convertEthAddressToBytes(ethAddress: string) {
  const hexString = ethAddress.startsWith("0x") ? ethAddress.slice(2) : ethAddress;

  const buffer = Buffer.from(hexString, "hex");

  // return Buffer.from(buffer);
  return buffer;
}
