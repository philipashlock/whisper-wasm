/**
 * Преобразует строку времени в миллисекунды.
 * Поддержка: HH:MM:SS.mmm, MM:SS.mmm, запятая/точка.
 */
function timeToMs(t: string) {
  const s = String(t).trim().replace(',', '.');
  const parts = s.split(':').map(Number);
  if (parts.some(Number.isNaN)) throw new Error(`Bad time: "${t}"`);

  let h = 0,
    m = 0,
    secMs = 0;
  if (parts.length === 3) {
    [h, m] = parts;
    secMs = parseFloat(s.split(':').pop() || '0');
  } else if (parts.length === 2) {
    [m] = parts;
    secMs = parseFloat(s.split(':').pop() || '0');
  } else {
    throw new Error(`Bad time format: "${t}"`);
  }
  const ms = Math.floor(((h * 60 + m) * 60 + secMs) * 1000);
  return ms;
}

/**
 * Парсит одну строку вида:
 * "[00:00:07.900 --> 00:00:10.900]   текст"
 * Возвращает объект с миллисекундами и исходными строками времени.
 */
export function parseCueLine(line: string) {
  const re =
    /^\s*\[?\s*([0-9]{1,2}:[0-9]{2}:(?:[0-9]{2}[.,][0-9]{1,3})|[0-9]{1,2}:[0-9]{2}[.,][0-9]{1,3})\s*-->\s*([0-9]{1,2}:[0-9]{2}:(?:[0-9]{2}[.,][0-9]{1,3})|[0-9]{1,2}:[0-9]{2}[.,][0-9]{1,3})\s*\]?\s*(.*)\s*$/;
  const m = re.exec(line);
  if (!m) {
    throw new Error('Line does not match VTT-like pattern: ' + line);
  }

  const startStr = m[1];
  const endStr = m[2];
  const text = m[3] || '';

  const startMs = timeToMs(startStr);
  const endMs = timeToMs(endStr);

  if (endMs < startMs) {
    throw new Error('End time is before start time');
  }

  return {
    startMs,
    endMs,
    start: startStr,
    end: endStr,
    text,
  };
}
