mod constants;
mod instructions;
mod states;

use anchor_lang::prelude::*;

use instructions::*;

declare_id!("7ZvMhuVQ6xSSnPNFqnoZeBbzQjqdy9fsWuJf8sx5xYvY");

declare_program!(gateway);

#[program]
pub mod swap_tokens {
    use super::*;

    pub fn on_call<'a, 'b, 'c: 'info, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, OnCall<'info>>,
        amount: u64,
        sender: [u8; 20],
        data: Vec<u8>,
    ) -> Result<()> {
        instructions::process_on_call(ctx, amount, sender, data)
    }

    // TODO
    // pub fn send_tokens(ctx: Context<SendTokens>) -> Result<()> {
    //     instructions::process_send_tokens(ctx)
    // }
}
