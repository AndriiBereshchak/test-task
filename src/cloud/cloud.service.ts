import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { countBy, orderBy } from 'lodash';

@Injectable()
export class CloudService {
  private readonly folderPath = path.join(__dirname, '..', '..', 'textFolder');
  private readonly workerPath = path.join(__dirname, 'cloud.worker.js'); 

  async generateWordCloud() {
    if (!fs.existsSync(this.folderPath)) {
      console.error(`Directory ${this.folderPath} does not exist.`);
      return;
    }

    const fileNames = fs.readdirSync(this.folderPath).filter(file => file.endsWith('.txt'));

    if (fileNames.length === 0) {
      console.log('Folder is empty');
      return;
    }

    const wordCounts = await this.processFilesParallel(fileNames);
    const filteredWordCounts = this.filterWordCounts(wordCounts);
    const sortedWordCounts = this.sortWordCounts(filteredWordCounts);
    const maxFrequency = sortedWordCounts[0]?.count || 0;

    const wordCloudData = sortedWordCounts.map(word => ({
      word: word.word,
      count: word.count,
      size: this.calculateFontSize(word.count, maxFrequency),
    }));

    const outputPath = path.join(__dirname, '..', '..', 'word_cloud.txt');
    this.writeToFile(outputPath, wordCloudData);
    console.log('Word cloud has been generated.');
  }

  private processFilesParallel(fileNames: string[]): Promise<{ [key: string]: number }> {
    return new Promise((resolve, reject) => {
      const promises = fileNames.map(fileName => new Promise<{ [key: string]: number }>((resolve, reject) => {
        const worker = new Worker(this.workerPath, {
          workerData: { filePath: path.join(this.folderPath, fileName) },
        });
        console.log(`Thread ID: ${worker.threadId}`);
        worker.on('message', resolve);
        worker.on('error', reject);
      }));

      Promise.all(promises)
        .then(results => {
          const combinedCounts = results.reduce((acc, curr) => {
            Object.entries(curr).forEach(([word, count]) => {
              acc[word] = (acc[word] || 0) + count;
            });
            return acc;
          }, {} as { [key: string]: number });
          resolve(combinedCounts);
        })
        .catch(reject);
    });
  }

  private filterWordCounts(wordCounts: { [key: string]: number }) {
    return Object.entries(wordCounts)
      .filter(([_, count]) => count > 1)
      .map(([word, count]) => ({ word, count }));
  }

  private sortWordCounts(wordCounts: { word: string; count: number }[]) {
    return orderBy(wordCounts, ['count'], ['desc']);
  }

  private calculateFontSize(frequency: number, maxFrequency: number): string {
    if (frequency === maxFrequency) return 'Huge';
    if (frequency > 0.6 * maxFrequency) return 'Big';
    if (frequency > 0.3 * maxFrequency) return 'Normal';
    return 'Small';
  }

  private writeToFile(filePath: string, data: { word: string; count: number; size: string }[]) {
    const fileContent = data.map(d => `${d.word}: ${d.count}, ${d.size}`).join('\n');
    fs.writeFileSync(filePath, fileContent, { encoding: 'utf-8' });
  }
}
