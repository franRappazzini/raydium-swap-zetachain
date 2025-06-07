# Swap Tokens Anchor Program

This project is an Anchor program for Solana that interacts with ZetaChain and performs token swaps using Raydium's CLMM CPI.

## Features

- **Receives and sends calls and tokens** to and from ZetaChain.
- **Token swaps** using Raydium's Concentrated Liquidity Market Maker (CLMM) via CPI.

## Requirements

- [Anchor](https://book.anchor-lang.com/)
- [Solana CLI](https://docs.solana.com/cli)
- Access to ZetaChain and Raydium

## Installation

```bash
git clone https://github.com/franRappazzini/raydium-swap-zetachain.git
cd raydium-swap-zetachain
anchor build
```

## Usage

1. **Build with `devnet` feature:**
   ```bash
   anchor build -- --features devnet
   ```
2. **Deploy on Solana Devnet**:
   ```bash
   anchor deploy --provider.cluster devnet
   ```
   Ensure you have sufficient SOL in your wallet for deployment costs.
3. **Run tests**:
   ```bash
   anchor test --skip-deploy --skip-build
   ```

## Structure

- `programs/swap-tokens`: Anchor program source code.
- `tests/`: Automated tests.
- `idls/`: Interface Definition Language files for the program.

## License

MIT
