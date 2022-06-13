import { SequenceItem } from "./types";
import { v4 as uuidv4 } from "uuid";

export function getRandomIntInRange(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

export function getSequence(numberOfElements: number) {
    const sequence: SequenceItem[] = [];
    for (let i = 0; i < numberOfElements; i++) {
        const sequenceItem: SequenceItem = {
            id: uuidv4(),
            value: getRandomIntInRange(0, 4294967295)
        }
        sequence.push(sequenceItem);
    }

    return sequence;
}

export function getNumberOfMessagesToReceive(arguementIndex: number) {
    let numberOfMessagesToReceive = 0;
    
    if (process.argv.length > 2) {
      numberOfMessagesToReceive = parseInt(process.argv[arguementIndex], 10);    
    }
  
    if (isNaN(numberOfMessagesToReceive) || numberOfMessagesToReceive < 1 || numberOfMessagesToReceive > 65535) {    
      numberOfMessagesToReceive = getRandomIntInRange(1, 65535);
      console.log(`A valid number Of Messages ToReceive in the range expected was not supplied so ${numberOfMessagesToReceive} was chosen.`);
    }
  
    return numberOfMessagesToReceive;
  }