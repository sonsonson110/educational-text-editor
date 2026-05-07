package com.collab.api.room.entity;

/**
 * Permission level of a {@link RoomMember} within a {@link Room}.
 *
 * <ul>
 *   <li>{@code OWNER} — full control, can delete the room and manage members.</li>
 *   <li>{@code EDITOR} — can read and write document content.</li>
 *   <li>{@code VIEWER} — read-only access; the Yjs connection is opened in read-only mode.</li>
 * </ul>
 */
public enum RoomRole {
    OWNER,
    EDITOR,
    VIEWER
}
