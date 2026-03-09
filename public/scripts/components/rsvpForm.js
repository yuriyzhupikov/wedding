import { submitRsvp } from '../api/rsvpApi.js';
import { setStatus } from './formStatus.js';

const form = document.querySelector('#rsvp-form');
const NO_ALCOHOL_VALUE = 'Не буду пить алкоголь';

const isPhoneValid = (value) => {
  if (!value) return true;
  const digits = (value.match(/\d/g) || []).length;
  const pattern = /^\+?[0-9\s\-()]{7,20}$/;
  return digits >= 7 && digits <= 15 && pattern.test(value);
};

const normalizeDrinks = (drinks) => {
  if (!drinks.length) return drinks;
  if (drinks.includes(NO_ALCOHOL_VALUE)) {
    return [NO_ALCOHOL_VALUE];
  }
  return drinks;
};

const buildSubmissionData = () => {
  const data = new FormData(form);
  const attending = data.get('attending') === 'true';
  const plusOne = attending && data.get('plusOne') === 'on';
  const partnerName = plusOne ? data.get('partnerName')?.trim() || undefined : undefined;
  const withChildren = attending && data.get('withChildren') === 'true';
  const childrenDetails = withChildren
    ? data.get('childrenDetails')?.trim() || undefined
    : undefined;
  const selectedDrinks = attending
    ? normalizeDrinks(data.getAll('drinks').map((item) => String(item)))
    : [];
  const allergyDetails = attending
    ? data.get('allergyDetails')?.trim() || undefined
    : undefined;

  return {
    payload: {
      fullName: data.get('fullName')?.trim(),
      phone: data.get('phone')?.trim() || undefined,
      attending,
      guestsCount: attending ? (plusOne ? 2 : 1) : undefined,
      plusOne: attending ? plusOne : undefined,
      partnerName,
      withChildren: attending ? withChildren : undefined,
      childrenDetails,
      drinks: selectedDrinks.length ? selectedDrinks : undefined,
      allergyDetails,
      message: data.get('message')?.trim() || undefined,
    },
    meta: {
      plusOne,
      partnerName,
      withChildren,
      childrenDetails,
    },
  };
};

export function initRsvpForm() {
  if (!form) {
    return;
  }

  const guestsWrapper = form.querySelector('#guests-wrapper');
  const partnerWrapper = form.querySelector('#partner-wrapper');
  const partnerInput = form.querySelector('#partnerName');
  const childrenWrapper = form.querySelector('#children-wrapper');
  const childrenDetailsWrapper = form.querySelector('#children-details-wrapper');
  const childrenDetailsInput = form.querySelector('#childrenDetails');
  const allergyWrapper = form.querySelector('#allergy-wrapper');
  const allergyInput = form.querySelector('#allergyDetails');
  const drinksWrapper = form.querySelector('#drinks-wrapper');

  const plusOneInput = form.querySelector('#plusOne');
  const attendingInputs = form.querySelectorAll('input[name="attending"]');
  const childrenInputs = form.querySelectorAll('input[name="withChildren"]');
  const drinksInputs = form.querySelectorAll('input[name="drinks"]');
  const noAlcoholInput = form.querySelector(
    `input[name="drinks"][value="${NO_ALCOHOL_VALUE}"]`,
  );

  const isAttending = () =>
    form.querySelector('input[name="attending"]:checked')?.value === 'true';

  const togglePartnerField = () => {
    const visible = isAttending() && plusOneInput?.checked;

    if (partnerWrapper) {
      partnerWrapper.classList.toggle('is-hidden', !visible);
    }

    if (!visible && partnerInput) {
      partnerInput.value = '';
    }
  };

  const toggleChildrenDetails = () => {
    const withChildren =
      form.querySelector('input[name="withChildren"]:checked')?.value === 'true';
    const visible = isAttending() && withChildren;

    if (childrenDetailsWrapper) {
      childrenDetailsWrapper.classList.toggle('is-hidden', !visible);
    }

    if (!visible && childrenDetailsInput) {
      childrenDetailsInput.value = '';
    }
  };

  const toggleAttendanceDependentFields = () => {
    const attending = isAttending();

    [guestsWrapper, childrenWrapper, drinksWrapper, allergyWrapper].forEach((element) => {
      if (!element) return;
      element.classList.toggle('is-hidden', !attending);
    });

    if (!attending) {
      if (plusOneInput) plusOneInput.checked = false;
      if (partnerInput) partnerInput.value = '';
      if (childrenDetailsInput) childrenDetailsInput.value = '';
      if (allergyInput) allergyInput.value = '';

      const noChildrenInput = form.querySelector(
        'input[name="withChildren"][value="false"]',
      );
      if (noChildrenInput) {
        noChildrenInput.checked = true;
      }

      drinksInputs.forEach((input) => {
        input.checked = false;
      });
    }

    togglePartnerField();
    toggleChildrenDetails();
  };

  drinksInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (!noAlcoholInput) return;

      if (input === noAlcoholInput && noAlcoholInput.checked) {
        drinksInputs.forEach((item) => {
          if (item !== noAlcoholInput) item.checked = false;
        });
        return;
      }

      if (input !== noAlcoholInput && input.checked) {
        noAlcoholInput.checked = false;
      }
    });
  });

  plusOneInput?.addEventListener('change', togglePartnerField);

  childrenInputs.forEach((input) => {
    input.addEventListener('change', toggleChildrenDetails);
  });

  attendingInputs.forEach((input) => {
    input.addEventListener('change', toggleAttendanceDependentFields);
  });

  toggleAttendanceDependentFields();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('');

    const { payload, meta } = buildSubmissionData();

    if (!payload.fullName) {
      setStatus('Введите имя, чтобы мы знали кто вы ❤️', 'error');
      return;
    }

    if (payload.phone && !isPhoneValid(payload.phone)) {
      setStatus('Проверьте номер телефона: от 7 до 15 цифр, можно с + и пробелами.', 'error');
      return;
    }

    if (payload.attending && meta.plusOne && !meta.partnerName) {
      setStatus('Укажите фамилию партнера, если будете с парой.', 'error');
      return;
    }

    if (payload.attending && meta.withChildren && !meta.childrenDetails) {
      setStatus('Если дети будут с вами, укажите их имена и возраст.', 'error');
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    setStatus('Отправляем ответ...', 'pending');

    try {
      await submitRsvp(payload);
      form.reset();
      const noChildrenInput = form.querySelector('input[name="withChildren"][value="false"]');
      if (noChildrenInput) {
        noChildrenInput.checked = true;
      }
      toggleAttendanceDependentFields();
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
