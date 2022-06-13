import { SequenceItem } from "../types";

export interface Status {
    connectionId: string,
    currentStatus: "ForRejection" | "CanReconnect" | "Connected"    
}
export interface SessionStateData {
    clientId: string;
    status: Status;
    checkSum: number;
    sequence: SequenceItem[]
}

export interface SessionStateStore {
    getSateForClient(clientId: string): SessionStateData | undefined;
    setStateForClient(sessionStateData: SessionStateData): void;
    clearStateForClient(cliendId: string): void;
}

export class InMemorySessionStateStore implements SessionStateStore {

    private sessionStateStoreMap: Map<string, SessionStateData>;

    constructor() {
        this.sessionStateStoreMap = new Map<string, SessionStateData>();
    }
    clearStateForClient(cliendId: string): void {
        this.sessionStateStoreMap.delete(cliendId);
    }

    getSateForClient(clientId: string): SessionStateData | undefined {
        return this.sessionStateStoreMap.get(clientId);
    }

    setStateForClient(sessionStateData: SessionStateData): void {
        this.sessionStateStoreMap.set(sessionStateData.clientId, sessionStateData);
    }
}