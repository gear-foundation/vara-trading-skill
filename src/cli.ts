#!/usr/bin/env node

import { Command } from "commander";
import { printError } from "./json.js";
import { routes } from "./commands/routes.js";
import { balance } from "./commands/balance.js";
import { checkMarket } from "./commands/checkMarket.js";
import { initConfig } from "./commands/initConfig.js";
import { installSkills } from "./commands/installSkills.js";
import { registerOnboardingCommand } from "./commands/onboarding.js";
import { orderbook } from "./commands/orderbook.js";
import { ticker } from "./commands/ticker.js";
import { buySpot } from "./commands/buy.js";
import { cancelOrder } from "./commands/cancelOrder.js";
import { limitBuySpot } from "./commands/limitBuy.js";
import { limitSellSpot } from "./commands/limitSell.js";
import { openOrders, orders } from "./commands/orders.js";
import { sellSpot } from "./commands/sell.js";
import { withdrawAsset, withdrawalCheck, withdrawalGuide } from "./commands/withdrawal.js";
import type { CexProvider, ExecutionMode, TradeSide } from "./types.js";

const program = new Command();

program
  .name("vara-agent")
  .description("Local spot trading execution CLI")
  .version("0.1.1");

registerOnboardingCommand(program);

program
  .command("init-config")
  .description("Create the local ~/.vara-trading-agent/.env template")
  .option("--overwrite", "Overwrite an existing local config file")
  .action(async (options) => {
    try {
      await initConfig(options.overwrite === true);
    } catch (error) {
      printError(error);
      process.exitCode = 1;
    }
  });

program
  .command("install-skills")
  .description("Install packaged skills into local agent skill directories")
  .option("--target <target>", "codex | agents | both", "both")
  .option("--overwrite", "Replace an existing installed vara-trading-skill directory")
  .action(async (options) => {
    try {
      await installSkills(options.target, options.overwrite === true);
    } catch (error) {
      printError(error);
      process.exitCode = 1;
    }
  });

program
  .command("routes")
  .requiredOption("--side <side>", "buy or sell")
  .option("--asset <asset>", "base asset, e.g. VARA or USDC", "VARA")
  .requiredOption("--quote <quote>", "quote currency, e.g. USDT")
  .requiredOption("--amount <amount>", "quote amount")
  .action(async (options) => {
    try {
      routes(options.side as TradeSide, options.quote, options.amount, options.asset);
    } catch (error) {
      printError(error);
      process.exitCode = 1;
    }
  });

program
  .command("check-market")
  .requiredOption("--provider <provider>", "mexc | gateio")
  .requiredOption("--symbol <symbol>", "market symbol, e.g. VARA/USDT or USDC/USDT")
  .action(async (options) => {
    try {
      await checkMarket(options.provider as CexProvider, options.symbol);
    } catch (error) {
      printError(error);
      process.exitCode = 1;
    }
  });

program
  .command("balance")
  .requiredOption("--provider <provider>", "mexc | gateio")
  .action(async (options) => {
    try {
      await balance(options.provider as CexProvider);
    } catch (error) {
      printError(error);
      process.exitCode = 1;
    }
  });

program
  .command("ticker")
  .requiredOption("--provider <provider>", "mexc | gateio")
  .requiredOption("--symbol <symbol>", "market symbol, e.g. VARA/USDT or USDC/USDT")
  .action(async (options) => {
    try {
      await ticker(options.provider as CexProvider, options.symbol);
    } catch (error) {
      printError(error);
      process.exitCode = 1;
    }
  });

program
  .command("orderbook")
  .requiredOption("--provider <provider>", "mexc | gateio")
  .requiredOption("--symbol <symbol>", "market symbol, e.g. VARA/USDT or USDC/USDT")
  .option("--limit <limit>", "number of price levels to return", "10")
  .action(async (options) => {
    try {
      await orderbook(options.provider as CexProvider, options.symbol, options.limit);
    } catch (error) {
      printError(error);
      process.exitCode = 1;
    }
  });

program
  .command("orders")
  .requiredOption("--provider <provider>", "mexc | gateio")
  .option("--symbols <symbols>", "comma-separated market symbols, e.g. VARA/USDT,USDC/USDT")
  .option("--limit <limit>", "maximum orders per symbol", "50")
  .action(async (options) => {
    try {
      await orders(options.provider as CexProvider, options.symbols, options.limit);
    } catch (error) {
      printError(error);
      process.exitCode = 1;
    }
  });

program
  .command("open-orders")
  .requiredOption("--provider <provider>", "mexc | gateio")
  .option("--symbols <symbols>", "comma-separated market symbols, e.g. VARA/USDT,USDC/USDT")
  .option("--limit <limit>", "maximum open orders per symbol", "50")
  .action(async (options) => {
    try {
      await openOrders(options.provider as CexProvider, options.symbols, options.limit);
    } catch (error) {
      printError(error);
      process.exitCode = 1;
    }
  });

program
  .command("cancel-order")
  .requiredOption("--provider <provider>", "mexc | gateio")
  .requiredOption("--symbol <symbol>", "market symbol, e.g. VARA/USDT")
  .requiredOption("--order-id <id>", "exchange order id")
  .requiredOption("--confirm", "Confirm cancelling this exact order id")
  .action(async (options) => {
    try {
      await cancelOrder(
        options.provider as CexProvider,
        options.symbol,
        options.orderId,
        options.confirm === true,
      );
    } catch (error) {
      printError(error);
      process.exitCode = 1;
    }
  });

program
  .command("withdrawal-guide")
  .requiredOption("--provider <provider>", "mexc | gateio")
  .option("--asset <asset>", "asset to withdraw, e.g. USDT or VARA")
  .option("--network <network>", "withdrawal network, e.g. TRC20, ERC20, VARA")
  .option("--amount <amount>", "amount to withdraw")
  .option("--address-confirmed", "Confirm the user will verify the destination address manually")
  .action((options) => {
    try {
      withdrawalGuide({
        provider: options.provider as CexProvider,
        asset: options.asset,
        network: options.network,
        amount: options.amount,
        addressConfirmed: options.addressConfirmed === true,
      });
    } catch (error) {
      printError(error);
      process.exitCode = 1;
    }
  });

program
  .command("withdrawal-check")
  .requiredOption("--provider <provider>", "mexc | gateio")
  .requiredOption("--asset <asset>", "asset to withdraw, e.g. USDT or VARA")
  .requiredOption("--amount <amount>", "amount to withdraw")
  .requiredOption("--address <address>", "destination address")
  .option("--network <network>", "withdrawal network, e.g. TRC20, ERC20, VARA")
  .option("--tag <tag>", "memo/tag if required by the destination")
  .option("--address-confirmed", "Confirm the user checked the destination address")
  .action(async (options) => {
    try {
      await withdrawalCheck({
        provider: options.provider as CexProvider,
        asset: options.asset,
        network: options.network,
        amount: options.amount,
        address: options.address,
        tag: options.tag,
        addressConfirmed: options.addressConfirmed === true,
      });
    } catch (error) {
      printError(error);
      process.exitCode = 1;
    }
  });

program
  .command("withdraw")
  .requiredOption("--provider <provider>", "mexc | gateio")
  .requiredOption("--asset <asset>", "asset to withdraw, e.g. USDT or VARA")
  .requiredOption("--amount <amount>", "amount to withdraw")
  .requiredOption("--address <address>", "destination address")
  .option("--network <network>", "withdrawal network, e.g. TRC20, ERC20, VARA")
  .option("--tag <tag>", "memo/tag if required by the destination")
  .option("--mode <mode>", "dry-run or live", "dry-run")
  .option("--address-confirmed", "Confirm the destination address was checked")
  .option("--confirm-withdrawal", "Confirm submitting a live withdrawal")
  .action(async (options) => {
    try {
      await withdrawAsset({
        provider: options.provider as CexProvider,
        asset: options.asset,
        network: options.network,
        amount: options.amount,
        address: options.address,
        tag: options.tag,
        mode: options.mode as ExecutionMode,
        addressConfirmed: options.addressConfirmed === true,
        confirmed: options.confirmWithdrawal === true,
      });
    } catch (error) {
      printError(error);
      process.exitCode = 1;
    }
  });

program
  .command("buy")
  .requiredOption("--provider <provider>", "mexc | gateio")
  .requiredOption("--symbol <symbol>", "market symbol, e.g. VARA/USDT or USDC/USDT")
  .requiredOption("--quote-amount <amount>", "amount of quote currency to spend")
  .option("--mode <mode>", "dry-run or live", "dry-run")
  .action(async (options) => {
    try {
      await buySpot(
        options.provider as CexProvider,
        options.symbol,
        options.quoteAmount,
        options.mode as ExecutionMode,
      );
    } catch (error) {
      printError(error);
      process.exitCode = 1;
    }
  });

program
  .command("limit-buy")
  .requiredOption("--provider <provider>", "mexc | gateio")
  .requiredOption("--symbol <symbol>", "market symbol, e.g. VARA/USDT or USDC/USDT")
  .requiredOption("--quote-amount <amount>", "amount of quote currency to spend")
  .requiredOption("--price <price>", "limit price in quote currency")
  .option("--mode <mode>", "dry-run or live", "dry-run")
  .action(async (options) => {
    try {
      await limitBuySpot(
        options.provider as CexProvider,
        options.symbol,
        options.quoteAmount,
        options.price,
        options.mode as ExecutionMode,
      );
    } catch (error) {
      printError(error);
      process.exitCode = 1;
    }
  });

program
  .command("sell")
  .requiredOption("--provider <provider>", "mexc | gateio")
  .requiredOption("--symbol <symbol>", "market symbol, e.g. VARA/USDT or USDC/USDT")
  .requiredOption("--base-amount <amount>", "amount of base asset to sell")
  .option("--mode <mode>", "dry-run or live", "dry-run")
  .action(async (options) => {
    try {
      await sellSpot(
        options.provider as CexProvider,
        options.symbol,
        options.baseAmount,
        options.mode as ExecutionMode,
      );
    } catch (error) {
      printError(error);
      process.exitCode = 1;
    }
  });

program
  .command("limit-sell")
  .requiredOption("--provider <provider>", "mexc | gateio")
  .requiredOption("--symbol <symbol>", "market symbol, e.g. VARA/USDT or USDC/USDT")
  .requiredOption("--base-amount <amount>", "amount of base asset to sell")
  .requiredOption("--price <price>", "limit price in quote currency")
  .option("--mode <mode>", "dry-run or live", "dry-run")
  .action(async (options) => {
    try {
      await limitSellSpot(
        options.provider as CexProvider,
        options.symbol,
        options.baseAmount,
        options.price,
        options.mode as ExecutionMode,
      );
    } catch (error) {
      printError(error);
      process.exitCode = 1;
    }
  });

program.parseAsync();
