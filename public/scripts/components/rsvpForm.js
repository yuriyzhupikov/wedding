import { submitRsvp } from '../api/rsvpApi.js';
import { setStatus } from './formStatus.js';

const form = document.querySelector('#rsvp-form');

const serializeForm = () => {
  const data = new FormData(form);
  const attending = data.get('attending') === 'true';
  const guestsCountRaw = data.get('guestsCount')?.trim();

  return {
    fullName: data.get('fullName')?.trim(),
    phone: data.get('phone')?.trim() || undefined,
    guestsCount: guestsCountRaw ? Number(guestsCountRaw) : undefined,
    attending,
    message: data.get('message')?.trim() || undefined,
  };
};

export function initRsvpForm() {
  if (!form) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('');

    const payload = serializeForm();
    if (!payload.fullName) {
      setStatus('Введите имя, чтобы мы знали кто вы ❤️', 'error');
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    setStatus('Отправляем ответ...', 'pending');

    try {
      await submitRsvp(payload);
      form.reset();
      setStatus('Спасибо! Мы получили ваш ответ и скоро свяжемся.', 'success');
    } catch (error) {
      setStatus(
        error.message ?? 'Произошла ошибка. Попробуйте отправить ещё раз.',
        'error',
      );
    } finally {
      submitButton.disabled = false;
    }
  });
}
