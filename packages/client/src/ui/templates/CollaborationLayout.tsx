import { useCollaborativeEditor } from "@/hooks/useCollaborativeEditor";
import { EditorView } from "@/ui/EditorView";
import { UserPresenceBar } from "@/ui/components";

/**
 * Template layout for a collaborative editing session.
 *
 * Owns the collaboration hook and renders collaboration-specific chrome
 * (presence bar, connection indicator) around a pure {@link EditorView}.
 * The editor itself has no knowledge of the surrounding layout.
 *
 * This separation supports future scenarios such as split-editor views —
 * multiple {@link EditorView} instances can be rendered inside a single
 * layout without any changes to the editor component itself.
 */
export function CollaborationLayout() {
  const { viewModel, status, users } = useCollaborativeEditor();

  if (!viewModel) {
    return (
      <div className="flex flex-col h-full">
        <UserPresenceBar users={users} connectionStatus={status} />
        <div className="flex-1 flex items-center justify-center text-neutral-500 font-mono text-sm">
          Connecting…
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <UserPresenceBar users={users} connectionStatus={status} />
      <div className="flex-1 min-h-0">
        <EditorView viewModel={viewModel} />
      </div>
    </div>
  );
}
