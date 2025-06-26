"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var anchor = require("@coral-xyz/anchor");
var web3_js_1 = require("@solana/web3.js");
var raydium_sdk_v2_1 = require("@raydium-io/raydium-sdk-v2");
var pda_1 = require("./utils/pda");
var spl_token_1 = require("@solana/spl-token");
var ethers_1 = require("ethers");
var provider = anchor.AnchorProvider.env();
var connection = provider.connection;
var wallet = provider.wallet;
anchor.setProvider(provider);
var program = anchor.workspace.swapTokens;
var GATEWAY_PROGRAM_ID = new web3_js_1.PublicKey("ZETAjseVjuFsxdRxo6MmTCvqFwb3ZHUx56Co3vCmGis");
var USDC_MINT = new web3_js_1.PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
var WSOL_MINT = new web3_js_1.PublicKey("So11111111111111111111111111111111111111112");
// CLMM
var CLMM_PROGRAM_ID = new web3_js_1.PublicKey("devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH");
var AMM_CONFIG = new web3_js_1.PublicKey("CQYbhr6amxUER4p5SC44C63R4qw4NFc9Z4Db9vF4tZwG");
var _a = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("meta")], GATEWAY_PROGRAM_ID), gatewayPda = _a[0], _bump = _a[1];
function encode() {
    return __awaiter(this, void 0, void 0, function () {
        var otherAmountThreshold, raydium, inputToken, outputToken, poolAddress, poolInfo, poolKeys, clmmPoolInfo, tickCache, rData, inputVault, outputVault, remainingAccounts, _a, _b, convertedAccountMetas, accounts, obj, message, data, encoded;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    otherAmountThreshold = bn(1);
                    return [4 /*yield*/, raydium_sdk_v2_1.Raydium.load({
                            owner: wallet.payer,
                            connection: connection,
                            cluster: "devnet",
                        })];
                case 1:
                    raydium = _d.sent();
                    inputToken = WSOL_MINT;
                    outputToken = USDC_MINT;
                    poolAddress = (0, pda_1.getPoolAddress)(AMM_CONFIG, inputToken, outputToken, CLMM_PROGRAM_ID)[0];
                    return [4 /*yield*/, raydium.clmm.getPoolInfoFromRpc(poolAddress.toBase58())];
                case 2:
                    rData = _d.sent();
                    poolInfo = rData.poolInfo;
                    poolKeys = rData.poolKeys;
                    clmmPoolInfo = rData.computePoolInfo;
                    tickCache = rData.tickData;
                    inputVault = (0, pda_1.getPoolVaultAddress)(poolAddress, inputToken, CLMM_PROGRAM_ID)[0];
                    outputVault = (0, pda_1.getPoolVaultAddress)(poolAddress, outputToken, CLMM_PROGRAM_ID)[0];
                    if (inputToken.toBase58() !== poolInfo.mintA.address &&
                        inputToken.toBase58() !== poolInfo.mintB.address) {
                        throw new Error("input mint does not match pool");
                    }
                    _b = (_a = raydium_sdk_v2_1.PoolUtils).computeAmountIn;
                    _c = {
                        poolInfo: clmmPoolInfo,
                        tickArrayCache: tickCache[poolAddress.toBase58()],
                        amountOut: otherAmountThreshold,
                        baseMint: inputToken,
                        slippage: 0.1
                    };
                    return [4 /*yield*/, raydium.fetchEpochInfo()];
                case 3:
                    remainingAccounts = _b.apply(_a, [(_c.epochInfo = _d.sent(),
                            _c)]).remainingAccounts;
                    convertedAccountMetas = remainingAccounts.map(function (account) { return ({
                        pubkey: account,
                        isSigner: false,
                        isWritable: true,
                    }); });
                    accounts = [
                        {
                            isWritable: true,
                            publicKey: ethers_1.ethers.hexlify(AMM_CONFIG.toBytes()),
                        },
                        {
                            isWritable: true,
                            publicKey: ethers_1.ethers.hexlify(poolAddress.toBytes()),
                        },
                        {
                            isWritable: false,
                            publicKey: ethers_1.ethers.hexlify(inputVault.toBytes()),
                        },
                        {
                            isWritable: false,
                            publicKey: ethers_1.ethers.hexlify(outputVault.toBytes()),
                        },
                        {
                            isWritable: false,
                            publicKey: ethers_1.ethers.hexlify(inputToken.toBytes()),
                        },
                        {
                            isWritable: false,
                            publicKey: ethers_1.ethers.hexlify(outputToken.toBytes()),
                        },
                        {
                            isWritable: false,
                            publicKey: ethers_1.ethers.hexlify(clmmPoolInfo.observationId.toBytes()),
                        },
                        {
                            isWritable: false,
                            publicKey: ethers_1.ethers.hexlify(gatewayPda.toBytes()),
                        },
                        {
                            isWritable: false,
                            publicKey: ethers_1.ethers.hexlify(spl_token_1.TOKEN_PROGRAM_ID.toBytes()),
                        },
                        {
                            isWritable: false,
                            publicKey: ethers_1.ethers.hexlify(program.programId.toBytes()),
                        },
                    ];
                    obj = {
                        otherAmountThreshold: 1,
                        sqrtPriceLimitX64: 0,
                        isBaseInput: true,
                    };
                    message = JSON.stringify(obj);
                    data = ethers_1.ethers.hexlify(ethers_1.ethers.toUtf8Bytes(message));
                    encoded = ethers_1.ethers.AbiCoder.defaultAbiCoder().encode(["tuple(tuple(bytes32 publicKey, bool isWritable)[] accounts, bytes data)"], [[accounts, data]]);
                    console.log(encoded);
                    return [2 /*return*/];
            }
        });
    });
}
function bn(n) {
    return new anchor.BN(n);
}
encode().catch(function (err) { return console.error("Encode args for solana examples error:", err); });
