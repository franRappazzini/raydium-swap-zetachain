CONTRACT_SOL="/path/to/your/contract.sol"
GATEWAY_ZETACHAIN="ZETAjseVjuFsxdRxo6MmTCvqFwb3ZHUx56Co3vCmGis"
ZRC20_SOL="0xD10932EB3616a937bd4a2652c87E9FeBbAce53e5"
ENCODED_ACCOUNTS_AND_DATA=$(npx ts-node setup/encodeCallArgs.ts)

npx hardhat zetachain-withdraw-and-call \
  --receiver "$CONTRACT_SOL" \
  --gateway-zeta-chain "$GATEWAY_ZETACHAIN" \
  --zrc20 "$ZRC20_SOL" \
  --amount 1 \
  --network devnet \
  --types '["bytes"]' $ENCODED_ACCOUNTS_AND_DATA