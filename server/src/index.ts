import 'dotenv/config';
import app from './app';
import { config } from './config';
import { startDailyReportCron } from './cron/dailyReport';

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
  startDailyReportCron();
});
