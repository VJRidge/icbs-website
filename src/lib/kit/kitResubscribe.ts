/** Kit list: a repeat signup must not silently undo unsubscribe. */

export function kitSubscribeNeedsConfirm(
  existingUnsubscribedAt: string | null | undefined,
  confirmResubscribe: boolean,
): boolean {
  return Boolean(existingUnsubscribedAt) && !confirmResubscribe;
}

/** When true, the upsert may set unsubscribed_at to null. */
export function shouldClearKitUnsubscribe(
  existingUnsubscribedAt: string | null | undefined,
  confirmResubscribe: boolean,
): boolean {
  if (!existingUnsubscribedAt) return true;
  return confirmResubscribe;
}
