import * as Y from "yjs";
import type { Position } from "@/core/position/position";
import type { IDocument } from "@/core/document/idocument";

/** Identity info displayed alongside a remote user's cursor. */
export interface UserInfo {
  name: string;
  color: string;
}

/** A cursor's anchor/head stored as Yjs relative positions (survives concurrent edits). */
export interface CursorState {
  anchor: Y.RelativePosition;
  head: Y.RelativePosition;
}

/** Shape of the local state each client publishes via the Yjs awareness protocol. */
export interface AwarenessUserState {
  user?: UserInfo;
  cursor?: CursorState | null;
}

/** A remote cursor expressed as absolute character offsets. */
export interface RemoteCursor {
  clientID: number;
  user: UserInfo;
  anchorOffset: number;
  headOffset: number;
}

/** A remote cursor expressed as absolute line/column positions. */
export interface RemoteCursorAbsolute {
  clientID: number;
  user: UserInfo;
  anchor: Position;
  head: Position;
}

/** A remote cursor with positions relative to the current viewport (ready for rendering). */
export interface RemoteCursorView {
  clientID: number;
  user: UserInfo;
  anchor: Position;
  head: Position;
}

/**
 * Publish the local cursor position to all peers via the Yjs awareness protocol.
 *
 * Converts the anchor and head document positions to `Y.RelativePosition`s so
 * they remain valid even after concurrent edits change the document length.
 */
export function broadcastCursor(
  awareness: any,
  ytext: Y.Text,
  document: IDocument,
  anchorPos: Position,
  headPos: Position
) {
  const anchorOffset = document.getOffsetAt(anchorPos);
  const headOffset = document.getOffsetAt(headPos);

  awareness.setLocalStateField("cursor", {
    anchor: Y.createRelativePositionFromTypeIndex(ytext, anchorOffset),
    head: Y.createRelativePositionFromTypeIndex(ytext, headOffset),
  });
}
