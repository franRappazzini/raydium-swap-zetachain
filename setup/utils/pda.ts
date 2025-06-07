import * as anchor from "@coral-xyz/anchor";

import { POOL_TICK_ARRAY_BITMAP_SEED } from "@raydium-io/raydium-sdk-v2";
import { PublicKey } from "@solana/web3.js";

export const POOL_SEED = Buffer.from(anchor.utils.bytes.utf8.encode("pool"));
export const POOL_VAULT_SEED = Buffer.from(anchor.utils.bytes.utf8.encode("pool_vault"));
export const ORACLE_SEED = Buffer.from(anchor.utils.bytes.utf8.encode("observation"));
export const POOL_AUTH_SEED = Buffer.from(
  anchor.utils.bytes.utf8.encode("vault_and_lp_mint_auth_seed")
);

export function getAuthAddress(programId: PublicKey): [PublicKey, number] {
  const [address, bump] = PublicKey.findProgramAddressSync([POOL_AUTH_SEED], programId);
  return [address, bump];
}

export function getPoolAddress(
  ammConfig: PublicKey,
  tokenMint0: PublicKey,
  tokenMint1: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [POOL_SEED, ammConfig.toBuffer(), tokenMint0.toBuffer(), tokenMint1.toBuffer()],
    programId
  );
  return [address, bump];
}

export function getPoolVaultAddress(
  pool: PublicKey,
  vaultTokenMint: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [POOL_VAULT_SEED, pool.toBuffer(), vaultTokenMint.toBuffer()],
    programId
  );
  return [address, bump];
}

export function getOracleAccountAddress(
  pool: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [ORACLE_SEED, pool.toBuffer()],
    programId
  );
  return [address, bump];
}

export function getTickArrayBitmapAddress(
  pool: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [POOL_TICK_ARRAY_BITMAP_SEED, pool.toBuffer()],
    programId
  );
  return [address, bump];
}
