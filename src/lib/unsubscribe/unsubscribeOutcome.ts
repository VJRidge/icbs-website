export type UnsubscribeList = 'kit' | 'contacts';
export type UnsubscribeErrorReason = 'invalid' | 'failed';

export function unsubscribeSuccessPath(list: UnsubscribeList): string {
  return `/unsubscribed?list=${list}`;
}

export function unsubscribeErrorPath(reason: UnsubscribeErrorReason): string {
  return `/unsubscribe-error?reason=${reason}`;
}

export function unsubscribeGetLocation(input: {
  ok: boolean;
  invalid?: boolean;
  list: UnsubscribeList;
}): string {
  if (input.ok) return unsubscribeSuccessPath(input.list);
  if (input.invalid) return unsubscribeErrorPath('invalid');
  return unsubscribeErrorPath('failed');
}
