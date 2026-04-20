import { EditorSetup } from "@/ui/EditorSetup";
import { AppLayout } from "@/ui/templates/AppLayout";
import { CollaborationLayout } from "@/ui/templates/CollaborationLayout";

function App() {
  return (
    <AppLayout>
      <EditorSetup>
        <CollaborationLayout />
      </EditorSetup>
    </AppLayout>
  );
}

export default App;
