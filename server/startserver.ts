import "dotenv/config";
import { RealTimeServer } from "./server";
import { InMemorySessionStateStore } from "../sessionstate/session-state-store";

const portNumber = parseInt(process.argv[2], 10);

const realTimeServer = new RealTimeServer(portNumber, new InMemorySessionStateStore());
realTimeServer.start();