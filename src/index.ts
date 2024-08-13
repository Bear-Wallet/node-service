import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import Web3 from 'web3';
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(bodyParser.json());
app.use(cors());

const web3Mainnet = new Web3(new Web3.providers.HttpProvider(
    `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
));

const web3Sepolia = new Web3(new Web3.providers.HttpProvider(
    `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
));




app.get('/get-wallet-balance', async (req: Request, res: Response) => {

    const walletAddress = req.query.address?.toString();
    const chainType = req.query.chain?.toString();
    try {

        let network = "mainnet";
        let web3 = null;
    
        if (chainType === "mainnet") {
            web3 = web3Mainnet;
        } else {
            web3 = web3Sepolia;
            network = "sepolia"
        }
    
        let balance = await web3.eth.getBalance(walletAddress!);
        const balanceEth = web3.utils.fromWei(balance, "ether");
    
        // const resp = await fetch(`https://api.opensea.io/api/v1/assets?owner=${walletAddress}&order_direction=desc&offset=0&limit=50&network=${network}`, {
        //     headers: {
        //         'X-API-KEY': `${process.env.OPEN_SEA_API_KEY}`
        //     }
        // })
    
        // const jsn = await resp.json();
        // console.log(jsn);
    
        res.send({
            balance: balanceEth
        });
    } catch (err) {
        console.log(err)
        res.status(400).send({
            "error": "invalid address or chain"
        })
    }
});


app.get("/get-gas-price", async (req: Request, res: Response) => {

    const chainType = req.query.chain?.toString();

    let network = "mainnet";
    let web3 = null;

    if (chainType === "mainnet") {
        web3 = web3Mainnet;
    } else {
        web3 = web3Sepolia;
        network = "sepolia"
    }

    try {
        // Get the current gas price in wei
        const gasPriceWei = await web3.eth.getGasPrice();
    
        // Convert gas price to gwei (1 gwei = 1e9 wei)
        const gasPriceGwei = web3.utils.fromWei(gasPriceWei, 'gwei');
    
        // Assume a typical gas limit for a simple transaction
        const gasLimit = BigInt(21000);
    
        // Calculate the estimated fee in wei
        const estimatedFeeWei = gasPriceWei * gasLimit;

        res.send({
            gasPriceGwei: gasPriceGwei.toString(), 
            estimatedFeeWei: estimatedFeeWei.toString()
        });

      } catch (error: any) {
        console.error(`Error fetching gas price: ${error.message}`);
        res.status(400).send({
            "error": "Error while fetching gas price"
        })
      }
})


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
