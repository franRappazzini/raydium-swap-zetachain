use anchor_lang::prelude::*;
use anchor_spl::{
    memo::Memo,
    token_interface::{Mint, Token2022, TokenAccount, TokenInterface},
};
use raydium_clmm_cpi::{
    program::RaydiumClmm,
    states::{AmmConfig, ObservationState, PoolState},
};
use serde::Deserialize;

use crate::{
    constants::{ANCHOR_DISCRIMINATOR, SEED_VAULT},
    gateway,
    instructions::utils,
    states::Vault,
};

#[derive(Accounts)]
#[instruction(amount: u64, sender: [u8; 20])]
pub struct OnCall<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    // -- zetachain accounts --

    // nothing to deposit
    // [x] The mint account of the SPL token being deposited.
    // #[account()]
    // pub token_mint: Box<InterfaceAccount<'info, Mint>>,

    // [x]
    // #[account(mut/* , seeds = [b"meta"], bump */)]
    // pub gateway_pda: Account<'info, gateway::accounts::Pda>,
    /// CHECK: zetachain gateway PDA account
    pub gateway_pda: UncheckedAccount<'info>,

    // [x] The destination token account owned by the gateway PDA.
    // #[account(mut)]
    // pub to: InterfaceAccount<'info, TokenAccount>,

    // [x] The whitelist entry account for the SPL token.
    // #[account(/* seeds = [b"whitelist", mint_account.key().as_ref()], bump */)]
    // pub whitelist_entry: Account<'info, gateway::accounts::WhitelistEntry>,

    // -- swap accounts --

    // [x] The factory state to read protocol fees
    #[account(address = pool_state.load()?.amm_config)]
    pub amm_config: Box<Account<'info, AmmConfig>>,

    // [x] The program account of the pool in which the swap will be performed
    #[account(mut)]
    pub pool_state: AccountLoader<'info, PoolState>,

    // [x] The vault token account for input token
    #[account(mut)]
    pub input_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    // [x] The vault token account for output token
    #[account(mut)]
    pub output_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    // [x] The program account for the most recent oracle observation
    #[account(mut, address = pool_state.load()?.observation_key)]
    pub observation_state: AccountLoader<'info, ObservationState>,

    // [x] The mint of token vault 0
    #[account(
        address = input_vault.mint
    )]
    pub input_vault_mint: Box<InterfaceAccount<'info, Mint>>,

    // [x] The mint of token vault 1
    #[account(
        address = output_vault.mint
    )]
    pub output_vault_mint: Box<InterfaceAccount<'info, Mint>>,
    // [x] remaining accounts..

    // -- program accounts --
    /// CHECK: PDA that hold SOL
    #[account(
        mut,
        seeds = [SEED_VAULT], 
        bump,
    )]
    pub vault_pda: SystemAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,

    // eth sender output vault
    #[account(
        init_if_needed,
        payer = signer,
        space = Vault::INIT_SPACE + ANCHOR_DISCRIMINATOR,
        seeds = [SEED_VAULT, output_vault_mint.key().as_ref(), sender.as_ref()],
        bump
    )]
    pub sender_vault: Account<'info, Vault>,

    // eth sender output ata
    #[account(
        init_if_needed,
        payer = signer,
        seeds = [SEED_VAULT, output_vault_mint.key().as_ref(), sender_vault.key().as_ref()],
        bump,
        token::mint = output_vault_mint,
        token::authority = sender_vault,
        token::token_program = token_program,
    )]
    pub sender_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    // necessary to swap to usdc (ata)
    #[account(
        init_if_needed,
        payer = signer,
        seeds = [SEED_VAULT, input_vault_mint.key().as_ref(), vault_pda.key().as_ref()],
        bump,
        token::mint = input_vault_mint,
        token::authority = vault_pda,
        token::token_program = token_program,
    )]
    pub wsol_gateway_account: Box<InterfaceAccount<'info, TokenAccount>>,

    // SPL program 2022 for token transfers
    pub token_program_2022: Program<'info, Token2022>,
    // memo program
    pub memo_program: Program<'info, Memo>,
    pub gateway_program: Program<'info, gateway::program::Gateway>,
    pub clmm_program: Program<'info, RaydiumClmm>,
}

pub fn process_on_call<'a, 'b, 'c: 'info, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, OnCall<'info>>,
    amount: u64,
    sender: [u8; 20],
    _data: Vec<u8>,
) -> Result<()> {
    // initialize sender pda
    if !ctx.accounts.sender_vault.initialized {
        ctx.accounts.sender_vault.set_inner(Vault {
            evm_owner: sender,
            token_mint: ctx.accounts.output_vault_mint.key(),
            token_account: ctx.accounts.sender_token_account.key(),
            initialized: true,
            bump: ctx.bumps.sender_vault,
        });
    }

    let acc = &ctx.accounts;

    msg!("Sender vault initialized: {}", acc.sender_vault.key());
    msg!("Sender token account: {}", acc.sender_token_account.key());

    // Deserialize the data
    // let binding = data.to_vec();
    // let json_str = std::str::from_utf8(&binding).unwrap();
    // let data: Data = serde_json::from_str(json_str).unwrap();

    // msg!("Data deserialized: {:?}", data);

    // swap sol -> wsol
    utils::wrap_sol(
        &acc.vault_pda,
        &acc.wsol_gateway_account,
        amount,
        &acc.token_program,
        &acc.system_program,
        ctx.bumps.vault_pda,
    )?;

    msg!("SOL wrapped!");

    // swap wsol -> usdc
    utils::swap_tokens(
        amount,
        1,    // data.otherAmountThreshold,
        0,    // data.sqrtPriceLimitX64,
        true, // data.isBaseInput,
        &acc.vault_pda,
        &acc.clmm_program,
        &acc.amm_config,
        &acc.pool_state,
        &acc.wsol_gateway_account, // wsol program ata
        &acc.sender_token_account, // usdc user ata
        &acc.input_vault,
        &acc.output_vault,
        &acc.observation_state,
        &acc.token_program,
        &acc.token_program_2022,
        &acc.memo_program,
        &acc.input_vault_mint,  // wsol mint
        &acc.output_vault_mint, // usdc mint
        ctx.remaining_accounts,
        ctx.bumps.vault_pda,
    )?;

    msg!("Swap successfully!");

    // alert to zetachain
    let before_output_token_balance = acc.sender_token_account.amount;
    msg!(
        "Before swap, sender token account balance: {}",
        before_output_token_balance
    );

    let refreshed_token_account = TokenAccount::try_deserialize(
        &mut &ctx
            .accounts
            .sender_token_account
            .to_account_info()
            .data
            .borrow()[..],
    )?;
    let new_output_token_balance = refreshed_token_account.amount;

    msg!(
        "After swap, sender token account balance: {}",
        new_output_token_balance
    );
    let tokens_swapped = new_output_token_balance
        .checked_sub(before_output_token_balance)
        .unwrap();

    let message = format!("{} tokens received", tokens_swapped);
    msg!("Sending message to gateway: {}", message);

    utils::call_zetachain(
        &acc.vault_pda,
        sender,
        &message,
        &acc.gateway_program,
        ctx.bumps.vault_pda,
    )
}

#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
pub struct Data {
    pub otherAmountThreshold: u64,
    pub sqrtPriceLimitX64: u128,
    pub isBaseInput: bool,
}
