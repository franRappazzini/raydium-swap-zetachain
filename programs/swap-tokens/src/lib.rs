mod constants;
mod instructions;
mod states;

use anchor_lang::prelude::*;

use instructions::*;

declare_id!("BaNo3XBxy6XgGBcU8hvTqYpBPTcJBoSg89gcM4zHUCnK");

declare_program!(gateway);

#[program]
pub mod swap_tokens {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::process_initialize(ctx)
    }

    pub fn on_call<'a, 'b, 'c: 'info, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, OnCall<'info>>,
        amount: u64,
        sender: [u8; 20],
        data: Vec<u8>,
    ) -> Result<()> {
        instructions::process_on_call(ctx, amount, sender, data)
    }

    pub fn call_zetachain(
        ctx: Context<CallZetaChain>,
        receiver: [u8; 20],
        message: String,
    ) -> Result<()> {
        instructions::process_call_zetachain(ctx, receiver, message)
    }

    // TODO
    // pub fn send_tokens(ctx: Context<SendTokens>) -> Result<()> {
    //     instructions::process_send_tokens(ctx)
    // }
}
