/** The bordered heading field belongs in the inspector, not on the canvas or public page. */
export function headingUsesLiveEditor(
  isEditing: boolean,
  canvasEdit = false,
  toolbarSource = false,
): boolean {
  return Boolean(isEditing && (canvasEdit || toolbarSource));
}
