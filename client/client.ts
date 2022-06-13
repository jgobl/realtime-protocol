import { Socket, io } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents, StreamNumbersPayload } from "../types";
import { v4 as uuidv4 } from "uuid";
import { buf } from "crc-32";
import { AckCallBackWithError } from "../types";

export class RealTimeClient {

    private clientUUID: string;
    private clientSocket: Socket<ServerToClientEvents, ClientToServerEvents>;
    private numberOfMessagesToReceive: number;
    private numberTotal: number = 0;
    private sequenceOfNumbersMap: Map<string, number> = new Map<string, number>();
    private promiseResolve!: (value: unknown) => void;
    private promiseReject!: (reason?: any) => void;

    constructor(numberOfMessagesToReceive: number, serverPortNumber: number, clientUUID?: string) {
        this.numberOfMessagesToReceive = numberOfMessagesToReceive;
        if (clientUUID) {
            this.clientUUID = clientUUID;
        }
        else {
            this.clientUUID = uuidv4();
        }

        this.clientSocket = io(`ws://localhost:${serverPortNumber}`, {
            transports: ["websocket"],
            query: {
                clientId: this.clientUUID,
                messagesToReceive: this.numberOfMessagesToReceive
            },
            autoConnect: false,
            reconnectionAttempts: 10,
            reconnectionDelay: 3000,
            reconnectionDelayMax: 10000
        });

        this.clientSocket.on("streamNumbersWithAck", (data, callback) => this.streamNumbersWithAck(data, callback));
        this.clientSocket.on("connect_error", (err) => this.connectError(err));
        this.clientSocket.on("connectionRejection", (reason) => this.connectionRejection(reason));
        
        // this.clientSocket.on("disconnect", (reason) => {

        //     if(reason === "io client disconnect") {
        //         console.log(`trying to recconect`);
        //         this.clientSocket.connect();
        //     }
        // });

        // setTimeout(() => {
        //     console.log(`closing socket`);
        //     this.clientSocket.close();
        // }, 10000);
    }

    private connectionRejection(reason: string) {
        console.log(`connection was rejected by server for the following reason ${reason}`);
        this.clientSocket.close();
    }

    private streamNumbersWithAck(data: StreamNumbersPayload, callback: AckCallBackWithError) {
        console.log(`value is ${data.sequenceItem.value} from server`);        
        callback(data.sequenceItem.value);
        if(!this.sequenceOfNumbersMap.has(data.sequenceItem.id))
        {
            this.numberTotal += data.sequenceItem.value;
            this.sequenceOfNumbersMap.set(data.sequenceItem.id, data.sequenceItem.value);
        }
        else {
            console.log(`already got sequenceid ${data.sequenceItem.id}`);     
        }

        this.checkForEndOfStream(data.checkSum);        
    }

    private checkForEndOfStream(checksumToCompare: number | undefined)
    {
        if(this.sequenceOfNumbersMap.size === this.numberOfMessagesToReceive)
        {
            console.log(`Final total is ${this.numberTotal}`);
            const checkSum = buf(Array.from(this.sequenceOfNumbersMap.values()));
            console.log(`client checksum is ${checkSum}`);
            console.log(`server checksum is ${checksumToCompare}`);
            if(checkSum === checksumToCompare) {
                console.log(`checksums match`);
                this.promiseResolve({
                    checkSumMatch: true,
                    checkSum: checkSum,
                    sequenceTotal: this.numberTotal
                });
            }
            else {
                console.log(`checksums DO NOT match client ${checkSum} v server ${checksumToCompare}`);
                this.promiseReject({
                    checkSumMatch: false,
                    clientCheckSum: checkSum,
                    serverCheckSum: checksumToCompare
                });
            }

            this.clientSocket.close();
        }     
    }

    private connectError(err: Error) {
        console.log(`connect_error due to ${err.message}`);
    }

    public connect() {        
        this.clientSocket.connect();
        return new Promise((resolve, reject) => {
            this.promiseResolve = resolve;
            this.promiseReject = reject;
        });
    }
}