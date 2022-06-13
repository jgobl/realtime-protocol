import { RealTimeServer } from "../server/server";
import { RealTimeClient } from "../client/client";
import { InMemorySessionStateStore } from "../sessionstate/session-state-store";

describe("test realtime protocol", () => {

    let realTimeServer: RealTimeServer;

    beforeAll(async () => {
        realTimeServer = new RealTimeServer(3001, new InMemorySessionStateStore());
        await realTimeServer.start();
    });

    it('test sequence is received by client and checksums match', async () => {
        expect.assertions(1);
        
        // arrange
        const realTimeClient = new RealTimeClient(15, 3001);

        // act
        const result = await realTimeClient.connect() as any;
        
        // assert
        expect(result.checkSumMatch).toBe(true);
    });

    afterAll(() => {
        realTimeServer.stop();
    });

});