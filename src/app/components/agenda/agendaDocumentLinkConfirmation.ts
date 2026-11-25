/** Only confirm an Agenda document attachment after the SQL registry
 * acknowledges the exact link. A saved document does not imply an attached
 * document: they are independent server writes with separate recovery. */
export async function requireAgendaDocumentLinkAck(
  documentId: string,
  agendaId: string | null | undefined,
  saveLink: (documentId: string, agendaId: string) => Promise<boolean>,
): Promise<void> {
  if (!documentId?.trim() || !agendaId?.trim()) {
    throw new Error("Document saved, but the Agenda destination is no longer available.");
  }
  const saved = await saveLink(documentId, agendaId);
  if (saved !== true) {
    throw new Error("Document was saved, but its Agenda link was not confirmed in SQL.");
  }
}
