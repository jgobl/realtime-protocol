export interface ServerToClientEvents {
    basicEmit: (a: number, b: string, c: Buffer) => void;
    streamNumbersWithAck: (data: StreamNumbersPayload, callback: AckCallBackWithError) => void;
    connectionRejection: (reason: string) => void;
}

export interface ClientToServerEvents {

}

export interface SequenceItem {
    id: string,
    value: number
}

export interface StreamNumbersPayload {
    sequenceItem: SequenceItem,
    checkSum?: number;
}

export type AckCallBackWithError = (firstParam: Error | number, value?: number) => void;

