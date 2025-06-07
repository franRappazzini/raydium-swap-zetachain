use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::gateway::{self};

pub fn send_spl_to_zetachain<'info>(
    signer: &Signer<'info>,
    from: &InterfaceAccount<'info, TokenAccount>,
    to: &InterfaceAccount<'info, TokenAccount>,
    amount: u64,
    receiver: [u8; 20],
    token_mint: &InterfaceAccount<'info, Mint>,
    gateway_pda: &Account<'info, gateway::accounts::Pda>,
    whitelist_entry: &Account<'info, gateway::accounts::WhitelistEntry>,
    gateway_program: &Program<'info, gateway::program::Gateway>,
    token_program: &Interface<'info, TokenInterface>,
    system_program: &Program<'info, System>,
) -> Result<()> {
    // let signer_seeds: &[&[&[u8]]] = &[&[SEED_VAULT, &[ctx.bumps.vault_pda /* [?] */]]];

    let cpi_accounts = gateway::cpi::accounts::DepositSplToken {
        signer: signer.to_account_info(), // [?]
        from: from.to_account_info(),
        to: to.to_account_info(),
        mint_account: token_mint.to_account_info(),
        pda: gateway_pda.to_account_info(),
        whitelist_entry: whitelist_entry.to_account_info(),
        token_program: token_program.to_account_info(),
        system_program: system_program.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        gateway_program.to_account_info(),
        cpi_accounts,
        // signer_seeds,
    );

    // amount = total amount
    // receiver = vault receiver
    gateway::cpi::deposit_spl_token(cpi_ctx, amount, receiver, None)
}

pub fn call_zetachain<'info>(
    signer: &Signer<'info>,
    receiver: [u8; 20],
    message: &str,
    gateway_program: &Program<'info, gateway::program::Gateway>,
) -> Result<()> {
    let cpi_ctx = CpiContext::new(
        gateway_program.to_account_info(),
        gateway::cpi::accounts::Call {
            signer: signer.to_account_info(),
        },
    );

    let message = message.as_bytes().to_vec();

    gateway::cpi::call(cpi_ctx, receiver, message, None)
}
