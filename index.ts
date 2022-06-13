import "dotenv/config";
import { RealTimeServer } from "./server/server";
import { RealTimeClient } from "./client/client";
import { getNumberOfMessagesToReceive } from "./utils";
import { InMemorySessionStateStore } from "./sessionstate/session-state-store";

const portNumber = parseInt(process.argv[2], 10);
let numberOfMessagesToReceive = getNumberOfMessagesToReceive(3);

const realTimeServer = new RealTimeServer(portNumber, new InMemorySessionStateStore());
realTimeServer.start();

const realTimeClient = new RealTimeClient(numberOfMessagesToReceive, portNumber);
realTimeClient.connect();

console.log("started client and server");


