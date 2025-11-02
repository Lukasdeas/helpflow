function getOffsetForTimeZone(date: Date, timeZone: string): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
  return (utcDate.getTime() - tzDate.getTime()) / 60000;
}

export function getBrazilTimestamp(): string {
  const now = new Date();
  
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now);

  const partsMap: Record<string, string> = {};
  parts.forEach(({ type, value }) => {
    partsMap[type] = value;
  });

  const year = parseInt(partsMap.year);
  const month = parseInt(partsMap.month) - 1;
  const day = parseInt(partsMap.day);
  const hour = parseInt(partsMap.hour);
  const minute = parseInt(partsMap.minute);
  const second = parseInt(partsMap.second);

  const offset = getOffsetForTimeZone(now, 'America/Sao_Paulo');
  const offsetHours = Math.floor(offset / 60);
  const offsetMinutes = offset % 60;

  const utcDate = new Date(Date.UTC(year, month, day, hour, minute, second, 0));
  const adjustedDate = new Date(utcDate.getTime() + offset * 60000);
  
  return adjustedDate.toISOString();
}

export function formatDateForSQL(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);

  const partsMap: Record<string, string> = {};
  parts.forEach(({ type, value }) => {
    partsMap[type] = value;
  });

  const year = parseInt(partsMap.year);
  const month = parseInt(partsMap.month) - 1;
  const day = parseInt(partsMap.day);
  const hour = parseInt(partsMap.hour);
  const minute = parseInt(partsMap.minute);
  const second = parseInt(partsMap.second);

  const offset = getOffsetForTimeZone(date, 'America/Sao_Paulo');

  const utcDate = new Date(Date.UTC(year, month, day, hour, minute, second, 0));
  const adjustedDate = new Date(utcDate.getTime() + offset * 60000);
  
  return adjustedDate.toISOString();
}

export function getCurrentBrazilDate(): Date {
  return new Date(getBrazilTimestamp());
}
