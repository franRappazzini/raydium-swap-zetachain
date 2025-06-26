"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POOL_VAULT_SEED = exports.POOL_SEED = void 0;
exports.getPoolAddress = getPoolAddress;
exports.getPoolVaultAddress = getPoolVaultAddress;
var anchor = require("@coral-xyz/anchor");
var web3_js_1 = require("@solana/web3.js");
exports.POOL_SEED = Buffer.from(anchor.utils.bytes.utf8.encode("pool"));
exports.POOL_VAULT_SEED = Buffer.from(anchor.utils.bytes.utf8.encode("pool_vault"));
function getPoolAddress(ammConfig, tokenMint0, tokenMint1, programId) {
    var _a = web3_js_1.PublicKey.findProgramAddressSync([exports.POOL_SEED, ammConfig.toBuffer(), tokenMint0.toBuffer(), tokenMint1.toBuffer()], programId), address = _a[0], bump = _a[1];
    return [address, bump];
}
function getPoolVaultAddress(pool, vaultTokenMint, programId) {
    var _a = web3_js_1.PublicKey.findProgramAddressSync([exports.POOL_VAULT_SEED, pool.toBuffer(), vaultTokenMint.toBuffer()], programId), address = _a[0], bump = _a[1];
    return [address, bump];
}
