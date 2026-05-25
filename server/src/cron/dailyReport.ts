import cron from 'node-cron';
import { sendDailyBalanceReports } from '../services/email.service';

/** Schedule daily balance report at 08:00 server time every day. */
export function startDailyReportCron(): void {
  cron.schedule('0 8 * * *', async () => {
    console.log('[cron] Running daily balance report…');
    try {
      const result = await sendDailyBalanceReports();
      console.log(`[cron] Done: ${result.sent} sent, ${result.errors} errors`);
    } catch (err) {
      console.error('[cron] Daily report error:', err);
    }
  });
  console.log('[cron] Daily balance report scheduled (08:00 daily)');
}
