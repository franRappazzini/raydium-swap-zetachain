use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::constants::SEED_VAULT;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_VAULT],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        init,
        payer = signer,
        seeds = [SEED_VAULT, wsol_mint.key().as_ref()],
        bump,
        token::mint = wsol_mint,
        token::authority = vault,
        token::token_program = token_program,
    )]
    pub wsol_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = signer,
        seeds = [SEED_VAULT, usdc_mint.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = vault,
        token::token_program = token_program,
    )]
    pub usdc_vault: InterfaceAccount<'info, TokenAccount>,

    pub wsol_mint: InterfaceAccount<'info, Mint>,
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn process_initialize(_ctx: Context<Initialize>) -> Result<()> {
    Ok(())
}
