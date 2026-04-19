import clsx from "clsx";
import type { ConnectedUser } from "@/collaboration/awareness";

/** WebSocket connection state exposed to UI components. */
export type ConnectionStatus = "connecting" | "connected" | "disconnected";

/** Maps each connection state to a dot colour for the presence bar. */
const STATUS_DOT_COLOR: Record<ConnectionStatus, string> = {
  connected: "#22c55e",
  connecting: "#eab308",
  disconnected: "#ef4444",
};

interface Props {
  users: ConnectedUser[];
  connectionStatus: ConnectionStatus;
}

/**
 * Horizontal bar rendered above the editor showing connection state and all
 * connected users. Each user name is coloured with their assigned cursor colour
 * and the local user is annotated with "(you)".
 */
export function UserPresenceBar({ users, connectionStatus }: Props) {
  return (
    <div
      className={clsx(
        "presence-bar",
        "flex items-center gap-2 px-3 py-1 text-xs font-mono",
        "border-b border-neutral-700 bg-neutral-900 text-neutral-400",
      )}
    >
      <span
        className="inline-block w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: STATUS_DOT_COLOR[connectionStatus] }}
      />
      {users.map((user, i) => (
        <span key={user.clientID} className="flex items-center gap-2">
          {i > 0 && <span className="text-neutral-600">·</span>}
          <span
            className="font-medium whitespace-nowrap"
            style={{ color: user.color }}
          >
            {user.name}
            {user.isLocal ? " (you)" : ""}
          </span>
        </span>
      ))}
    </div>
  );
}
