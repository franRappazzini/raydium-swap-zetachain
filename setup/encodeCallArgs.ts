import * as anchor from "@coral-xyz/anchor";

import { AccountMeta, PublicKey } from "@solana/web3.js";
import {
  ApiV3PoolInfoConcentratedItem,
  ClmmKeys,
  ComputeClmmPoolInfo,
  PoolUtils,
  Raydium,
  ReturnTypeFetchMultiplePoolTickArrays,
} from "@raydium-io/raydium-sdk-v2";
import { getPoolAddress, getPoolVaultAddress } from "./utils/pda";

import { SwapTokens } from "../target/types/swap_tokens";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { ethers } from "ethers";

const provider = anchor.AnchorProvider.env();
const connection = provider.connection;
const wallet = provider.wallet;

anchor.setProvider(provider);

const program = anchor.workspace.swapTokens as anchor.Program<SwapTokens>;

const GATEWAY_PROGRAM_ID = new PublicKey("ZETAjseVjuFsxdRxo6MmTCvqFwb3ZHUx56Co3vCmGis");
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

// CLMM
const CLMM_PROGRAM_ID = new PublicKey("devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH");
const AMM_CONFIG = new PublicKey("CQYbhr6amxUER4p5SC44C63R4qw4NFc9Z4Db9vF4tZwG");

const [gatewayPda, _bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("meta")],
  GATEWAY_PROGRAM_ID
);

async function encode() {
  const otherAmountThreshold = bn(1); // 0.000001 USDC - for slippage check - min amount out (for devnet)

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

  const { remainingAccounts } = PoolUtils.computeAmountIn({
    poolInfo: clmmPoolInfo,
    tickArrayCache: tickCache[poolAddress.toBase58()],
    amountOut: otherAmountThreshold,
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

  // const ix = await program.methods
  //   .onCall(
  //     amount,
  //     sender,
  //     data,
  //     otherAmountThreshold, // [?] raydium params
  //     sqrtPriceLimitX64, // [?] raydium params
  //     isBaseInput // [?] raydium params
  //   )
  //   .accounts({
  //     ammConfig: AMM_CONFIG,
  //     poolState: poolAddress,
  //     inputVault,
  //     outputVault,
  //     inputVaultMint: inputToken,
  //     outputVaultMint: outputToken,
  //     observationState: clmmPoolInfo.observationId,
  //     gatewayPda,
  //     tokenProgram: TOKEN_PROGRAM_ID,
  //   })
  //   .remainingAccounts(convertedAccountMetas)
  //   .instruction();

  const accounts = [
    {
      isWritable: true,
      publicKey: ethers.hexlify(AMM_CONFIG.toBytes()),
    },
    {
      isWritable: true,
      publicKey: ethers.hexlify(poolAddress.toBytes()),
    },
    {
      isWritable: false,
      publicKey: ethers.hexlify(inputVault.toBytes()),
    },
    {
      isWritable: false,
      publicKey: ethers.hexlify(outputVault.toBytes()),
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
      isWritable: false,
      publicKey: ethers.hexlify(clmmPoolInfo.observationId.toBytes()),
    },
    {
      isWritable: false,
      publicKey: ethers.hexlify(gatewayPda.toBytes()),
    },
    {
      isWritable: false,
      publicKey: ethers.hexlify(TOKEN_PROGRAM_ID.toBytes()),
    },
    {
      isWritable: false,
      publicKey: ethers.hexlify(program.programId.toBytes()),
    },
  ];

  const obj = {
    otherAmountThreshold: 1,
    sqrtPriceLimitX64: 0,
    isBaseInput: true,
  };
  const message = JSON.stringify(obj);
  const data = ethers.hexlify(ethers.toUtf8Bytes(message));

  // accounts and data are abi encoded
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(tuple(bytes32 publicKey, bool isWritable)[] accounts, bytes data)"],
    [[accounts, data]]
  );

  console.log(encoded);
}

function bn(n: number) {
  return new anchor.BN(n);
}

encode().catch((err) => console.error("Encode args for solana examples error:", err));
