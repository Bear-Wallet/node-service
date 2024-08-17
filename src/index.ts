import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import Web3, { FMT_BYTES, FMT_NUMBER, HexString, Transaction } from "web3";
import * as dotenv from "dotenv";
import { NFT } from "./interface";
import { readFileSync } from "fs";

import sdkRouter from "./sdk-routes";
import { RegisteredSubscription } from "web3/lib/commonjs/eth.exports";

dotenv.config();

const app = express();

const port = process.env.PORT;

app.use(bodyParser.json());
app.use(cors());

const providerUrls = {
  mainnet: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
  sepolia: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
  arbitrum_mainnet: `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
  arbitrum_sepolia: `https://arbitrum-sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
};

const providers: {
  [key: string]: Web3<RegisteredSubscription>;
} = {
  mainnet: new Web3(new Web3.providers.HttpProvider(providerUrls.mainnet)),
  sepolia: new Web3(new Web3.providers.HttpProvider(providerUrls.sepolia)),
  arbitrum_mainnet: new Web3(
    new Web3.providers.HttpProvider(providerUrls.arbitrum_mainnet)
  ),
  arbitrum_sepolia: new Web3(
    new Web3.providers.HttpProvider(providerUrls.arbitrum_sepolia)
  ),
  default: new Web3(
    new Web3.providers.HttpProvider(providerUrls.arbitrum_sepolia)
  ),
};

let TOKENS_SEPOLIA = [
  {
    id: 1,
    name: "USDC",
    contract_address: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
    abi_path: "src/abi/sepolia/usdc.json",
  },
];

let TOKENS_MAINNET = [
  {
    id: 1,
    name: "USDC",
    contract_address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    abi_path: "src/abi/mainnet/usdc.json",
  },
];

const getNFTs = async (address: string, chain: string): Promise<NFT[]> => {
  let opensea_base = "";

  if (chain === "mainnet") {
    chain = "ethereum";
    opensea_base = "api.opensea.io";
  } else {
    chain = "sepolia";
    opensea_base = "testnets-api.opensea.io";
  }

  const resp = await fetch(
    `https://${opensea_base}/api/v2/chain/sepolia/account/${address}/nfts`,
    {
      headers: {
        "X-API-KEY": `${process.env.OPEN_SEA_API_KEY}`,
      },
    }
  );

  const jsn = await resp.json();
  const nfts: NFT[] = jsn.nfts;

  return nfts;
};

const getTokens = async (
  web3: Web3,
  chain: string,
  address: string
): Promise<any> => {
  let tokens = [];

  if (chain === "sepolia") tokens = TOKENS_SEPOLIA;
  else tokens = TOKENS_MAINNET;

  let token_balances = await Promise.all(
    tokens.map(async (token) => {
      // get token balance for given address
      const erc20ABI = JSON.parse(readFileSync(token.abi_path, "utf8"));
      const contract = new web3.eth.Contract(erc20ABI, token.contract_address);
      const balance: any = await contract.methods.balanceOf(address).call();
      const decimals: any = await contract.methods.decimals().call();

      const fbalance = parseFloat(balance);
      const fdecimals = parseFloat(decimals);
      const formattedBalance = fbalance / 10 ** fdecimals;

      // get token price and price change from coinmarket cap
      const resp = await fetch(
        `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${token.name}&convert=USD`,
        {
          headers: {
            "X-CMC_PRO_API_KEY": `${process.env.COIN_MARKET_CAP_API}`,
          },
        }
      );
      const jsn = await resp.json();
      const quote = jsn.data[token.name].quote;

      const price = quote.USD.price;
      const percent_change = quote.USD.percent_change_24h;

      return {
        id: token.id,
        name: token.name,
        contract_address: token.contract_address,
        balance: formattedBalance,
        price: price,
        percent_change: percent_change,
      };
    })
  );

  return token_balances;
};

app.get("/get-wallet", async (req: Request, res: Response) => {
  const walletAddress = req.query.address?.toString();
  const chainType = req.query.chain?.toString() ?? "default";

  try {
    const web3 = providers[chainType] ?? providers.default;

    let balance = await web3.eth.getBalance(walletAddress!);
    const balanceEth = web3.utils.fromWei(balance, "ether");

    const nfts = await getNFTs(walletAddress!, chainType);
    const tokens = await getTokens(web3, chainType, walletAddress!);

    const resp = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=ETH&convert=USD`,
      {
        headers: {
          "X-CMC_PRO_API_KEY": `${process.env.COIN_MARKET_CAP_API}`,
        },
      }
    );
    const jsn = await resp.json();
    const quote = jsn.data.ETH.quote;
    const price = quote.USD.price;
    const percent_change = quote.USD.percent_change_24h;

    res.send({
      balance: parseFloat(balanceEth),
      price: price,
      percent_change: percent_change,
      nfts: nfts,
      tokens: tokens,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      error: "invalid address or chain",
    });
  }
});

app.get(
  "/get-gas-price",
  async (
    req: Request<{}, {}, {}, { chain: string; walletAddress?: HexString }>,
    res: Response
  ) => {
    const chainType = req.query.chain?.toString() ?? "default";

    const web3 = providers[chainType] ?? providers.default;

    try {
      // Get the current gas price in wei
      const gasPriceWei = await web3.eth.getGasPrice();

      // Convert gas price to gwei (1 gwei = 1e9 wei)
      const gasPriceGwei = web3.utils.fromWei(gasPriceWei, "gwei");

      // Assume a typical gas limit for a simple transaction
      const gasLimit = BigInt(21000);

      // Calculate the estimated fee in wei
      const estimatedFeeWei = gasPriceWei * gasLimit;

      const data: any = {
        gasPricWei: gasPriceWei.toString(),
        gasPriceGwei: gasPriceGwei.toString(),
        estimatedFeeWei: estimatedFeeWei.toString(),
      };

      if (req.query.walletAddress) {
        const walletAddress = req.query.walletAddress;

        const nonce = await web3.eth.getTransactionCount(
          walletAddress,
          undefined,
          {
            number: FMT_NUMBER.NUMBER,
            bytes: FMT_BYTES.HEX,
          }
        );

        data.nonce = nonce;
      }

      res.status(200).json(data);
    } catch (error: any) {
      console.error(`Error fetching gas price: ${error.message}`);
      res.status(400).send({
        error: "Error while fetching gas price",
      });
    }
  }
);

app.post(
  "/send-transaction",
  async (
    req: Request<
      {},
      {},
      {
        chain: string;
        signedTxn: HexString;
      }
    >,
    res: Response
  ) => {
    const { chain, signedTxn } = req.body;

    const web3 = providers[chain] ?? providers.default;

    try {
      const txResult = await web3.eth.sendSignedTransaction(signedTxn);

      // const txData: any = { ...txResult };
      // delete txData?.logsBloom;

      res.status(200).send({ transactionHash: txResult.transactionHash });
    } catch (error: any) {
      console.error(`Error sending transaction: ${error}`);

      console.log(error);

      res.status(400).send({
        error: error?.message ?? "Error while sending transaction",
      });
    }
  }
);

app.use("/sdk", sdkRouter);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
