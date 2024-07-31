import * as fs from 'fs';
import { parentPort, workerData } from 'worker_threads';
import { countBy } from 'lodash';

interface WorkerData {
  filePath: string;
}

function countWords(text: string): { [key: string]: number } {
  return countBy(text.split(/\s+/));
}

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

const { filePath }: WorkerData = workerData;
const text = readFile(filePath);
const wordCounts = countWords(text);

parentPort?.postMessage(wordCounts);
