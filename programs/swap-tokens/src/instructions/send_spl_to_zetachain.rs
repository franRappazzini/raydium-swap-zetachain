use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::{constants::SEED_VAULT, gateway, instructions::utils};

#[derive(Accounts)]
pub struct SendSplToZetaChain<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub spl_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        seeds = [SEED_VAULT, spl_mint.key().as_ref()],
        bump
    )]
    pub spl_vault: InterfaceAccount<'info, TokenAccount>,

    /// Gateway PDA.
    #[account(
        mut,
        seeds = [b"meta"],
        bump,
        seeds::program = gateway::ID,
    )]
    pub gateway_pda: Account<'info, gateway::accounts::Pda>,

    /// The whitelist entry account for the SPL token.
    /// [x]: fails from ZetaChain
    #[account(
        seeds = [b"whitelist", spl_mint.key().as_ref()],
        bump,
        seeds::program = gateway::ID,
    )]
    pub whitelist_entry: Account<'info, gateway::accounts::WhitelistEntry>,

    /// The destination token account owned by the PDA.
    #[account(mut)]
    pub to: InterfaceAccount<'info, TokenAccount>,

    pub gateway_program: Program<'info, gateway::program::Gateway>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn process_send_spl_to_zetachain(
    ctx: Context<SendSplToZetaChain>,
    amount: u64,
    receiver: [u8; 20],
) -> Result<()> {
    let acc = &ctx.accounts;

    utils::send_spl_to_zetachain(
        &acc.signer,
        &acc.spl_vault,
        &acc.to,
        amount,
        receiver,
        &acc.spl_mint,
        &acc.gateway_pda,
        &acc.whitelist_entry,
        &acc.gateway_program,
        &acc.token_program,
        &acc.system_program,
    )
}
