use anchor_lang::{prelude::*, system_program};
use anchor_spl::{
    token,
    token_interface::{TokenAccount, TokenInterface},
};

use crate::constants::SEED_VAULT;

pub fn wrap_sol<'info>(
    from: &SystemAccount<'info>,
    to: &InterfaceAccount<'info, TokenAccount>,
    amount: u64,
    token_program: &Interface<'info, TokenInterface>,
    system_program: &Program<'info, System>,
    bump: u8,
) -> Result<()> {
    // transfer sol to wrapped token account
    let signer_seeds: &[&[&[u8]]] = &[&[SEED_VAULT, &[bump]]];

    let cpi_accounts = system_program::Transfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
    };

    let cpi_ctx =
        CpiContext::new_with_signer(system_program.to_account_info(), cpi_accounts, signer_seeds);

    system_program::transfer(cpi_ctx, amount)?;

    // sync the native token to reflect the new SOL balance as wSOL
    let cpi_accounts = token::SyncNative {
        account: to.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(token_program.to_account_info(), cpi_accounts);

    token::sync_native(cpi_ctx)
}
