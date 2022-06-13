import { Server, Socket } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "../types";
import { getSequence } from "../utils";
import { buf } from "crc-32";
import { StreamNumbersPayload, SequenceItem } from "../types";
import { SessionStateStore, SessionStateData } from "../sessionstate/session-state-store";
import { createServer, Server as HttpServer } from "http";


export class RealTimeServer {
    private server: Server<ClientToServerEvents, ServerToClientEvents>;
    private portNumber: number;
    private ackTimeoutMs: number = 10000;
    private sessionStateStore: SessionStateStore;
    private httpServer: HttpServer;

    constructor(portNumber: number, sessionStateStore: SessionStateStore) {
        this.httpServer = createServer();
        this.server = new Server<ClientToServerEvents, ServerToClientEvents>(this.httpServer, {
            transports: ["websocket"]
        });
        this.portNumber = portNumber;
        this.sessionStateStore = sessionStateStore;
        this.server.on("connection", (socket) => this.onconnection(socket));
    }

    private onconnection(socket: Socket<ClientToServerEvents, ServerToClientEvents>) {

        const clientId = socket.handshake.query.clientId as string;
        const numberOfMessagesToReceive = socket.handshake.query.messagesToReceive as string;
        console.log(`client id is ${clientId}`);
        console.log(`numberOfMessagesToReceive is ${numberOfMessagesToReceive}`);

        socket.on("disconnect", (reason) => this.handleSocketDisconnect(reason, clientId));

        const sessionStateData = this.sessionStateStore.getSateForClient(clientId);
        if (sessionStateData) {
            console.log(`found session state for clientId ${clientId}`);
            this.handleClientReconnect(clientId, socket, sessionStateData);
        }
        else {
            console.log(`did not find session state for clientId ${clientId}`);
            this.handleNewClientConnection(clientId, numberOfMessagesToReceive, socket);
        }
    }

    private handleClientReconnect(clientId: string, socket: Socket<ClientToServerEvents, ServerToClientEvents>, sessionStateData: SessionStateData) {
        if (sessionStateData.status.currentStatus === "ForRejection") {
            console.log(`rejecting connection for clientId ${clientId} as current status is ForRejection`);
            socket.emit("connectionRejection", "client failed to reconnect within 30s so connection is rejected");
            socket.disconnect(true);
        }
        else {
            sessionStateData.status.currentStatus = "Connected";
            this.sessionStateStore.setStateForClient(sessionStateData);
            this.sendSequenceOfNumbersToClient(socket, clientId);
        }
    }

    private handleNewClientConnection(clientId: string, numberOfMessagesToReceive: string, socket: Socket<ClientToServerEvents, ServerToClientEvents>) {
        const sequence = getSequence(parseInt(numberOfMessagesToReceive, 10));
        const checksum = buf(sequence.map(x => x.value));
        console.log(`server checksum for clientId ${clientId} is ${checksum}`);
        this.sessionStateStore.setStateForClient({
            clientId: clientId,
            sequence: sequence,
            status: {
                currentStatus: "Connected",
                connectionId: socket.id
            },
            checkSum: checksum
        });
        this.sendSequenceOfNumbersToClient(socket, clientId);
    }

    private handleSocketDisconnect(reason: string, clientId: string) {
        if (reason === "ping timeout" || reason === "transport close" || reason === "transport error") {
            console.log(`handling disconnect for clientId ${clientId}`);

            const sessionStateData = this.sessionStateStore.getSateForClient(clientId);
            if (!sessionStateData) {
                console.log(`no session state found for clientId ${clientId} in handleSocketDisconnect.`);
                return;
            }

            sessionStateData.status.currentStatus = "CanReconnect";
            this.sessionStateStore.setStateForClient(sessionStateData);

            setTimeout(() => {
                this.runClientStatusCheck(clientId, sessionStateData.status.connectionId);
            }, 30000);
        }
    }

    private runClientStatusCheck(clientId: string, connectionId: string) {
        console.log(`checking if client is still disconnected and need to discard state`);
        const sessionStateData = this.sessionStateStore.getSateForClient(clientId);
        if (!sessionStateData) {
            console.log(`no session state found for clientId ${clientId} in clientStatusCheck.`);
            return;
        }

        // if current connectionId is the same as the one when the 30s timer was started then client status
        // is valid for changing to ForRejection
        if (sessionStateData.status.connectionId === connectionId && sessionStateData.status.currentStatus === "CanReconnect") {
            console.log(`setting client status to ForRejection for clientId ${clientId}`);
            sessionStateData.status.currentStatus = "ForRejection";
            sessionStateData.sequence = [];
            this.sessionStateStore.setStateForClient(sessionStateData);
        }
    }

    private sendSequenceOfNumbersToClient(socket: Socket<ClientToServerEvents, ServerToClientEvents>, clientId: string) {
        // make sure socket is still connected
        if (!socket.connected) {
            console.log(`socket is stale so exiting sending sequence`);
            return;
        }

        const sessionStateData = this.sessionStateStore.getSateForClient(clientId);
        if (!sessionStateData || sessionStateData.sequence.length === 0) {
            console.log(`something has gone badly wrong for clientId ${clientId} so closing connection`);
            socket.disconnect(true);
        }

        const sequenceItemToSend = sessionStateData!.sequence[0];
        const endOfSequenceReached = sessionStateData!.sequence.length === 1;
        const data: StreamNumbersPayload = {
            sequenceItem: sequenceItemToSend!,
            checkSum: endOfSequenceReached ? sessionStateData!.checkSum : undefined
        };

        socket
            .timeout(this.ackTimeoutMs)
            .emit("streamNumbersWithAck", data, (err, callbackValue) => this.handleSendingSequenceItemAcknowledgement(socket, clientId, sessionStateData!, endOfSequenceReached, err, callbackValue));           
    }

    private handleSendingSequenceItemAcknowledgement(
        socket: Socket<ClientToServerEvents, ServerToClientEvents>,
        clientId: string,
        sessionStateData: SessionStateData,
        endOfSequenceReached: boolean,
        err: Error | number,
        callbackValue: number | undefined
    ) {
        if (err) {
            console.log(`timeout from client ${err}`);
            // no ack from client so presume they did not receive and retry after interval
            setTimeout(() => {
                if (socket.connected) {
                    this.sendSequenceOfNumbersToClient(socket, clientId);
                }
            }, 1000);
        }
        else {
            // succesful delivery of number to client so remove first number from sequence
            sessionStateData.sequence.shift();
            console.log(`callbackValue for clientId ${clientId} is ${callbackValue}`);
            if (!endOfSequenceReached) {
                // not end of sequence so update state and schedule the next send
                this.sessionStateStore.setStateForClient(sessionStateData!);

                setTimeout(() => {
                    this.sendSequenceOfNumbersToClient(socket, clientId);
                }, 1000);
            }
            else {
                // end of sequence to clear session state and close connection
                console.log(`end of sequence of numbers for client ${clientId} so disconnecting socket`);
                this.sessionStateStore.clearStateForClient(clientId);
                socket.disconnect(true);
            }
        }
    }

    public start() {
        return new Promise(resolve => {
            this.httpServer.listen(this.portNumber, () => resolve('server started'));
        });        
    }

    public stop() {
        this.server.close();
    }
}