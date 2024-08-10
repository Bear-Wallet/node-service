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

    const walletAddress = req.params.address;
    const chainType = req.params.chain;
    try {

        console.log(walletAddress)
        let network = "mainnet";
        let web3 = null;
    
        if (chainType === "mainnet") {
            web3 = web3Mainnet;
        } else {
            web3 = web3Sepolia;
            network = "sepolia"
        }
    
        let balance = await web3.eth.getBalance(walletAddress);
        const balanceEth = web3.utils.fromWei(balance, "ether");
    
        // const resp = await fetch(`https://api.opensea.io/api/v1/assets?owner=${walletAddress}&order_direction=desc&offset=0&limit=50&network=${network}`, {
        //     headers: {
        //         'X-API-KEY': `${process.env.OPEN_SEA_API}`
        //     }
        // })
    
        // const jsn = await resp.json();
        // console.log(jsn);
    
        res.send({
            balance: balanceEth
        });
    } catch (err) {
        res.status(400).send({
            "error": "invalid address or chain"
        })
    }
});


app.post('/data', (req: Request, res: Response) => {
    const { name, age } = req.body;
    res.send(`Received data - Name: ${name}, Age: ${age}`);
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
