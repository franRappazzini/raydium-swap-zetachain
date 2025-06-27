use anchor_lang::prelude::*;

use crate::{gateway, instructions::utils};

#[derive(Accounts)]
pub struct CallZetaChain<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub gateway_program: Program<'info, gateway::program::Gateway>,
}

pub fn process_call_zetachain(
    ctx: Context<CallZetaChain>,
    receiver: [u8; 20],
    message: String,
) -> Result<()> {
    let acc = ctx.accounts;

    utils::call_zetachain(
        &acc.signer,
        receiver,
        message,
        &acc.gateway_program,
        // ctx.bumps.gateway_program,
    )
}
