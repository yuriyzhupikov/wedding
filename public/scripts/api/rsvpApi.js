const API_URL = '/api/rsvp';

export async function submitRsvp(payload) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(details?.message ?? 'Не удалось отправить ответ');
  }
}
