/** AG-02 builder: never expose a child as persisted until its SQL registry write ACK. */
export async function saveAgendaChildWithAck(
  childId: string,
  write: () => boolean | Promise<boolean>,
): Promise<string> {
  if (typeof childId !== "string" || !childId.trim() || childId !== childId.trim()) {
    throw new Error("Agenda item identity is missing or invalid. Refresh and try again.");
  }
  const acknowledged = await write();
  if (acknowledged !== true) {
    throw new Error("Agenda item was not saved. Check permissions or connection and retry.");
  }
  return childId;
}
