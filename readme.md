# Realtime Protocol

- Websocket Implementation for server and client
- Developed with node.js and Typescript. Not my first language of choice but the websocket libraries seemed to give more out of the box than my prefferred language of .net/c#.
- Uses socket.io library for client and server.

## How to build, run, test
- Pull down repo and run `yarn install` on the command line.
- Note this was developed on a windows machine so hopefully no issues if running on a Mac.
- Server can be run standalone by running `yarn startServer` on the command line and will run on port 3000.
- Clients can be run standalone by running `yarn startClient 30` on the command line and will connect on port 3000 and request a sequence of 30 messages. Change the number or leave blank to get a random allocation of the number of messages requested.
- To run the server and client together for a basic test you can run `yarn startServerAndClient` and it will run the server on port 3000 and the client will request a sequence of 20 numbers.
- There is a basic automated test which can be run by running `yarn jest` on the command line.

## Assumptions
- I assumed using ackowledgement mechanism was Ok as part of the solution

## Limits
- Due to a lack of time I have not tested with a large number of clients or large sequence size as I was concentrating on getting the basic requirements implemented

## Improvements with more time (it was a struggle to get time to work on this with 3 young kids)
- Stress testing to see how solution would scale with client connections and sequence size
- Automated tests would usually be a major piece of work I do but I concentrated on functionality first and only have a single automated test. I would try figure out how to add automated tests to cover all the different scenarios.