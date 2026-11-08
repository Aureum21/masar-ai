const GAME_NAMES = {
  'sikka-run': 'Secret Sikka Run',
  'landmark-puzzle': 'Piece by Place',
  'tourist-arcade': 'The Lost Compass',
  'ball-roll': 'Golden Roll',
};

function readable(value) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  // Never leak serialized event data, including malformed JSON, into the UI.
  return /^[{\[]/.test(text) ? '' : text;
}

function eventPayload(description) {
  if (description && typeof description === 'object' && !Array.isArray(description)) return description;
  if (typeof description !== 'string') return {};
  try {
    const parsed = JSON.parse(description);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function duration(seconds) {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remaining = String(total % 60).padStart(2, '0');
  return minutes < 60 ? `${String(minutes).padStart(2, '0')}:${remaining}`
    : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${remaining}`;
}

export function passportActivity(event, locale = 'en') {
  const payload = eventPayload(event.description);
  if (event.type === 'game_completed' || event.type === 'game_session') {
    const completed = event.type === 'game_completed';
    const metrics = [];
    if (completed && typeof payload.score === 'number' && Number.isFinite(payload.score) && payload.score >= 0) {
      metrics.push({ label: 'Score', value: new Intl.NumberFormat(locale).format(payload.score) });
    }
    if (completed && typeof payload.elapsed_seconds === 'number' && Number.isFinite(payload.elapsed_seconds) && payload.elapsed_seconds > 0) {
      metrics.push({ label: 'Time', value: duration(payload.elapsed_seconds) });
    }
    return {
      title: GAME_NAMES[payload.game_id] || 'Practice game',
      description: completed ? 'Practice only · no XP or redeemable coins.' : 'Start a run and discover a little more of the UAE.',
      status: completed ? 'Practice complete' : 'Practice started',
      kind: 'game', metrics,
    };
  }
  return {
    title: readable(event.title) || 'Passport activity',
    description: readable(event.description) || readable(payload.message) || readable(payload.body)
      || readable(payload.description) || 'A new moment in your Passport.',
    kind: 'collection', metrics: [], status: '',
  };
}
