use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub evm_owner: [u8; 20],
    pub token_mint: Pubkey,
    pub token_account: Pubkey,
    pub bump: u8,
}
