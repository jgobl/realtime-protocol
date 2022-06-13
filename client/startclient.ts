import "dotenv/config";
import { RealTimeClient } from "./client";
import { getNumberOfMessagesToReceive } from "../utils";

const portNumber = parseInt(process.argv[2], 10);
const numberOfMessagesToReceive = getNumberOfMessagesToReceive(3);

const realTimeClient = new RealTimeClient(numberOfMessagesToReceive, portNumber);
realTimeClient.connect();
    //.then(data => console.log(`client promise success ${JSON.stringify(data)}`))
    //.catch(data => console.log(`client promise failure ${JSON.stringify(data)}`));

  
