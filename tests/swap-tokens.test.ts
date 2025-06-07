import * as anchor from "@coral-xyz/anchor";

import { AccountMeta, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  ApiV3PoolInfoConcentratedItem,
  ClmmKeys,
  ComputeClmmPoolInfo,
  PoolUtils,
  Raydium,
  ReturnTypeFetchMultiplePoolTickArrays,
} from "@raydium-io/raydium-sdk-v2";
import { getPoolAddress, getPoolVaultAddress } from "./utils/pda";

import { Program } from "@coral-xyz/anchor";
import { SwapTokens } from "../target/types/swap_tokens";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("swap-tokens", () => {
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;
  const wallet = provider.wallet;

  anchor.setProvider(provider);

  const program = anchor.workspace.swapTokens as Program<SwapTokens>;

  const SEED_VAULT = "vault";
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

  // it("Should initialize PDAs!", async () => {
  //   const tx = await program.methods
  //     .initializePda()
  //     .accounts({
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //       tokenMint: USDC_MINT,
  //       wsolMint: WSOL_MINT,
  //     })
  //     .rpc();

  //   console.log("initialize_pda tx signature:", tx);
  // });

  it("Should deposit SOL on vault_pda!", async () => {
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_VAULT)],
      program.programId
    );

    const amount = 5_000_000; // 0.005 SOL

    console.log("Vault PDA:", vaultPda.toBase58());

    const tx = await sendAndConfirmTransaction(
      connection,
      new anchor.web3.Transaction().add(
        anchor.web3.SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: vaultPda,
          lamports: amount,
        })
      ),
      [wallet.payer],
      { skipPreflight: true }
    );
    console.log("Deposit SOL tx signature:", tx);
  });

  it("Should call on_call method!", async () => {
    // method args
    const amount = bn(5_000_000); // 0.005 SOL
    // const sender = convertEthAddressToBytes("0xEab928b5aFb7C96128d4f6078C19f60b2582aFdb"); // Example Ethereum address
    const sender = convertEthAddressToBytes("0x0080672c562ACE2e47FEDe0d7E80255f3f795a98"); // Example Ethereum address
    // const data = Buffer.from("Hello from ZetaChain!");
    const otherAmountThreshold = bn(1); // 0.000001 USDC - for slippage check - min amount out (for devnet)
    const sqrtPriceLimitX64 = bn(0); // 0 = no limit (for devnet)
    const isBaseInput = true; // assuming we are providing base token (WSOL)
    const obj = {
      otherAmountThreshold: otherAmountThreshold.toNumber(),
      sqrtPriceLimitX64: sqrtPriceLimitX64.toNumber(),
      isBaseInput,
    };
    const message = JSON.stringify(obj);
    const data = Buffer.from(message);

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

    const ix = await program.methods
      .onCall(amount, sender, data)
      .accounts({
        ammConfig: AMM_CONFIG,
        poolState: poolAddress,
        inputVault,
        outputVault,
        inputVaultMint: inputToken,
        outputVaultMint: outputToken,
        observationState: clmmPoolInfo.observationId,
        gatewayPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(convertedAccountMetas)
      .instruction();

    const buildTx = new anchor.web3.Transaction().add(ix);

    const tx = await anchor.web3.sendAndConfirmTransaction(connection, buildTx, [wallet.payer], {
      skipPreflight: true,
    });

    console.log("on_call tx signature:", tx);
  });
});

function bn(n: number) {
  return new anchor.BN(n);
}

function convertEthAddressToBytes(ethAddress: string) {
  const hexString = ethAddress.startsWith("0x") ? ethAddress.slice(2) : ethAddress;

  const buffer = Buffer.from(hexString, "hex");

  return Array.from(buffer);
}
