import { app } from './app';
import { config } from './shared/config';
import { connectMongo } from './providers/mongo';


(async () => {
  await connectMongo();
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
})();
