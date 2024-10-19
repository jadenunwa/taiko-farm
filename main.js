const { ethers } = require("ethers");
const colors = require('colors');
const fs = require('fs');
require('dotenv').config();
const moment = require('moment-timezone'); 

const WETH_ABI_URL = "https://raw.githubusercontent.com/mobonchain/TaikoTrailblazers/refs/heads/main/abi/abi_eth.js";
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8')).config;
const provider = new ethers.JsonRpcProvider("https://rpc.taiko.xyz");
const WETH_ADDRESS = "0xa51894664a773981c6c112c43ce576f315d5b1b6";

console.clear();
async function fetchWETHABI() {
  try {
    const response = await fetch(WETH_ABI_URL);
    const abiText = await response.text();
    const WETH_ABI = eval(abiText);
    return WETH_ABI;
  } catch (error) {
    console.error(`[ERROR] Error fetching WETH ABI: ${error.message}`.bold.red);
    throw error;
  }
}

async function getBalances(wallet) {
  try {
    const ethBalance = await provider.getBalance(wallet.address);
    const wethContract = new ethers.Contract(WETH_ADDRESS, await fetchWETHABI(), wallet);
    const wethBalance = await wethContract.balanceOf(wallet.address);
    return {
      ethBalance: ethers.formatEther(ethBalance),
      wethBalance: ethers.formatEther(wethBalance),
    };
  } catch (error) {
    console.error(`[ERROR] Error getting balances: ${error.message}`.bold.red);
    throw error;
  }
}

async function wrapETH(contract, amount) {
  try {
    const tx = await contract.deposit({ value: amount });
    console.log('|[-]| Đã gửi lệnh Wrap'.bold.green);
  } catch (error) {
    console.error(`[ERROR] Error wrapping ETH: ${error.message}`.bold.red);
  }
}

async function unwrapETH(contract, amount) {
  try {
    const tx = await contract.withdraw(amount);
    console.log('|[-]| Đã gửi lệnh UnWrap'.bold.green);
  } catch (error) {
    console.error(`[ERROR] Error unwrapping ETH: ${error.message}`.bold.red);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function performOperations(wallet, minWraps, maxWraps, minUnwraps, maxUnwraps, numRepeats, accountNumber) {
  const walletInstance = new ethers.Wallet(wallet.privateKey, provider);
  const wethContract = new ethers.Contract(WETH_ADDRESS, await fetchWETHABI(), walletInstance);

  console.log(`================= [ Đọc cấu hình cho Tài khoản ${accountNumber} ] =================`.bold.bold);
  console.log(`- Số vòng lặp [ ${numRepeats} ] - Chỉnh sửa thêm trong tệp [ config.json ]`.green.bold);
  const balances = await getBalances(walletInstance);
  console.log(`- Địa chỉ: ${walletInstance.address}`);
  for (let round = 1; round <= numRepeats; round++) {

    const ethBalance = parseFloat(balances.ethBalance);
    const wethBalance = parseFloat(balances.wethBalance);

    const numWraps = Math.floor(Math.random() * (maxWraps - minWraps + 1)) + minWraps;
    if (ethBalance < config.MaxETHForWrap) {
      console.log(`|[-]| Bỏ qua Wrap vì số dư ETH nhỏ hơn ${config.MaxETHForWrap} ETH`.bold.red);
      continue;
    }
    console.log(`|[-]| Thực hiện Wrap : ${numWraps} lần`.bold.blue);

    for (let i = 1; i <= numWraps; i++) {
      const randomAmount = Math.random() * (config.MaxETHForWrap - config.MinETHForWrap) + config.MinETHForWrap;
      const amountToWrap = ethers.parseEther(randomAmount.toFixed(8));
      console.log(`|[-]| Thực hiện Wrap lần ${i} với ${ethers.formatEther(amountToWrap)} ETH`.bold.blue);
      await wrapETH(wethContract, amountToWrap);
      await delay(15000); 
    }
    const numUnwraps = Math.floor(Math.random() * (maxUnwraps - minUnwraps + 1)) + minUnwraps;
    if (wethBalance < config.MaxWETHForUnWrap) {
      console.log(`|[-]| Bỏ qua UnWrap vì số dư WETH nhỏ hơn ${config.MaxWETHForUnWrap} WETH`.bold.red);
      continue;
    }
    console.log(`|[-]| Thực hiện UnWrap : ${numUnwraps} lần`.bold.yellow);

    for (let i = 1; i <= numUnwraps; i++) {
      const randomAmount = Math.random() * (config.MaxWETHForUnWrap - config.MinWETHForUnWrap) + config.MinWETHForUnWrap;
      const amountToUnwrap = ethers.parseEther(randomAmount.toFixed(8));
      console.log(`|[-]| Thực hiện UnWrap lần ${i} với ${ethers.formatEther(amountToUnwrap)} WETH`.bold.yellow);
      await unwrapETH(wethContract, amountToUnwrap);
      await delay(15000);
    }
    console.log();
  }
}

async function runAllWallets(wallets) {
  let accountNumber = 1;
  for (const wallet of wallets) {
    await performOperations(wallet, config.MinWrap, config.MaxWrap, config.MinUnWrap, config.MaxUnWrap, config.Loop, accountNumber);
    accountNumber++;
  }
}

async function main() {
  const wallets = fs.readFileSync('.env', 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map(privateKey => ({ privateKey: privateKey.trim() }));

  while (true) {
    await runAllWallets(wallets);

    function getNextRunTime() {
      const now = moment().tz("Asia/Ho_Chi_Minh");
      let nextRun = now.clone().hour(8).minute(0).second(0).millisecond(0); // Ví dụ Mob đặt 8 giờ sáng mỗi ngày sẽ tự động chạy
      if (now.isAfter(nextRun)) {
          nextRun.add(1, 'day');
      }
      return nextRun;
    }

    const nextRun = getNextRunTime();

    while (true) {
      const now = moment().tz("Asia/Ho_Chi_Minh");
      const diffMs = nextRun.diff(now);
      
      if (diffMs <= 0) break; 
      console.clear();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      console.log(`\n|[-]| Chờ ${diffHours}:${diffMinutes}:${diffSeconds} để tiếp tục...`.bold.grey);
      
      await delay(1000);
    }

    console.clear();
  }
}

main();
