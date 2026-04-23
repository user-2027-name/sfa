const SHARED_WEBHOOK_URL = process.env.SHARED_WEBHOOK_URL;

export async function sendNotification(projectId: string, message: string, webhookUrl?: string) {
  const timestamp = new Date().toLocaleString();
  const logMessage = `[Notification] Project: ${projectId} | Message: ${message}`;
  
  console.log(logMessage);
  
  // SHARED_WEBHOOK_URL が設定されている場合はそれを優先、なければ引数の webhookUrl を使用
  const targetUrl = SHARED_WEBHOOK_URL || webhookUrl;
  
  if (targetUrl && targetUrl.startsWith('http')) {
    // 簡易的なSSRF対策: localhost やプライベートIPへのリクエストを制限
    const url = new URL(targetUrl);
    const forbiddenHostnames = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];
    if (forbiddenHostnames.includes(url.hostname)) {
      console.warn(`[Blocked Webhook] Access to local host denied: ${url.hostname}`);
      return { success: false, error: 'Forbidden webhook destination' };
    }
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          text: `【SFA通知】\n案件ID: ${projectId}\n内容: ${message}\n日時: ${timestamp}`
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Chat Webhook error: ${response.statusText}`);
      }

      console.log(`[Webhook Success] Sent to Google Chat (${targetUrl === SHARED_WEBHOOK_URL ? 'Shared' : 'Individual'})`);
      return { success: true, method: 'Google Chat' };
    } catch (err) {
      console.error('[Webhook Error]', err);
      return { success: false, error: err };
    }
  }
  
  return { success: true, method: 'Log' };
}
