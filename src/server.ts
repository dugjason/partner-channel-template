import express from 'express';
import { randomBytes } from 'crypto';
import { env } from './env';
import ChannelRouter from './routes';
import bodyParser from 'body-parser';

export function randomString(length: number): string {
  return randomBytes(Math.floor(length / 2)).toString('hex');
}

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(ChannelRouter);

app.listen(env.SERVER_PORT, () => {
  console.log(`Express server listening on port ${env.SERVER_PORT}`);
});
