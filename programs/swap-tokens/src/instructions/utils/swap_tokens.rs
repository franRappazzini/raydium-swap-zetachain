use anchor_lang::prelude::*;
use anchor_spl::{
    memo::Memo,
    token_2022::Token2022,
    token_interface::{Mint, TokenAccount, TokenInterface},
};
use raydium_clmm_cpi::{
    cpi,
    program::RaydiumClmm,
    states::{AmmConfig, ObservationState, PoolState},
};

use crate::constants::SEED_VAULT;

pub fn swap_tokens<'a, 'b, 'c: 'info, 'info>(
    amount: u64,
    other_amount_threshold: u64,
    sqrt_price_limit_x64: u128,
    is_base_input: bool,
    payer: &SystemAccount<'info>,
    clmm_program: &Program<'info, RaydiumClmm>,
    amm_config: &Box<Account<'info, AmmConfig>>,
    pool_state: &AccountLoader<'info, PoolState>,
    input_token_account: &Box<InterfaceAccount<'info, TokenAccount>>,
    output_token_account: &Box<InterfaceAccount<'info, TokenAccount>>,
    input_vault: &Box<InterfaceAccount<'info, TokenAccount>>,
    output_vault: &Box<InterfaceAccount<'info, TokenAccount>>,
    observation_state: &AccountLoader<'info, ObservationState>,
    token_program: &Interface<'info, TokenInterface>,
    token_program_2022: &Program<'info, Token2022>,
    memo_program: &Program<'info, Memo>,
    input_vault_mint: &Box<InterfaceAccount<'info, Mint>>,
    output_vault_mint: &Box<InterfaceAccount<'info, Mint>>,
    remaining_accounts: &'c [AccountInfo<'info>],
    bump: u8,
) -> Result<()> {
    let cpi_accounts = cpi::accounts::SwapSingleV2 {
        payer: payer.to_account_info(),
        amm_config: amm_config.to_account_info(),
        pool_state: pool_state.to_account_info(),
        input_token_account: input_token_account.to_account_info(),
        output_token_account: output_token_account.to_account_info(),
        input_vault: input_vault.to_account_info(),
        output_vault: output_vault.to_account_info(),
        observation_state: observation_state.to_account_info(),
        token_program: token_program.to_account_info(),
        token_program_2022: token_program_2022.to_account_info(),
        memo_program: memo_program.to_account_info(),
        input_vault_mint: input_vault_mint.to_account_info(),
        output_vault_mint: output_vault_mint.to_account_info(),
    };

    let signer_seeds: &[&[&[u8]]] = &[&[SEED_VAULT, &[bump]]];

    let cpi_context =
        CpiContext::new_with_signer(clmm_program.to_account_info(), cpi_accounts, signer_seeds)
            .with_remaining_accounts(remaining_accounts.to_vec());

    cpi::swap_v2(
        cpi_context,
        amount,
        other_amount_threshold,
        sqrt_price_limit_x64,
        is_base_input,
    )
}
