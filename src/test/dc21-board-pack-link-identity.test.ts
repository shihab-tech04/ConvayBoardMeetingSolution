import { describe, expect, it } from 'vitest';
import { resolveBoardPackVersion, resolveDraftPack, exactBoardPackLink } from '../app/components/documents/boardPackLinkPersistence';
import type { BoardDocument, BoardPack, DocumentVersion } from '../app/data/boardMeetingData';
import type { BoardPackDocumentLink } from '../app/data/documentWorkspaceData';
const doc = {id:'record',doc_id:'doc',version:'1.0',current_version_id:'ver1'} as BoardDocument;
const v = {id:'row1',document_id:'doc',version_id:'ver1',version_number:'1.0'} as DocumentVersion;
const pack = {id:'record-pack',pack_id:'PACK-1',approval_status:'Draft'} as BoardPack;
const link = {id:'link',document_id:'doc',board_pack_id:'PACK-1',linked_version_id:'ver1',link_status:'active'} as BoardPackDocumentLink;
describe('DC-21 exact board pack membership',()=>{
  it('resolves explicit immutable ID instead of the display version',()=>expect(resolveBoardPackVersion(doc,[v])?.version_id).toBe('ver1'));
  it('denies a missing, duplicated, mutable or foreign version',()=>{
    for(const rows of [[],[v,v],[{...v,document_id:'foreign'}],[{...v,version_id:'latest'}]]) expect(resolveBoardPackVersion(doc,rows)).toBeUndefined();
  });
  it('can resolve one exact legacy display label but never persists that label',()=>{
    const legacy={...doc,current_version_id:undefined};
    expect(resolveBoardPackVersion(legacy,[v])?.version_id).toBe('ver1');
    expect(resolveBoardPackVersion(legacy,[v,{...v,version_id:'ver2'}])).toBeUndefined();
  });
  it('rejects non-draft or ambiguous pack identity',()=>{
    expect(resolveDraftPack('PACK-1',[pack])).toBe(pack);
    expect(resolveDraftPack('PACK-1',[{...pack,approval_status:'Published'}])).toBeUndefined();
    expect(resolveDraftPack('PACK-1',[pack,{...pack,id:'other'}])).toBeUndefined();
  });
  it('requires exact saved link identity and immutable pin',()=>{
    expect(exactBoardPackLink([link],link)).toBe(true);
    expect(exactBoardPackLink([link,link],link)).toBe(false);
    expect(exactBoardPackLink([{...link,linked_version_id:'1.0'}],link)).toBe(false);
  });
});
