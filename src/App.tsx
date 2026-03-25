import { Document } from "@/core/document/document";
import { Position } from "@/core/position/position";
import { Cursor } from "@/editor/cursor/cursor";
import { EditorState } from "@/editor/editorState";
import { ViewModel } from "@/view/viewModel";
import { EditorView } from "@/ui/EditorView";
import React from "react";

const INITIAL_TEXT = `1Lorem ipsum dolor sit amet, consectetuer adipiscing elit.
2Aenean commodo ligula eget dolor.
3Aenean massa.
4Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.
5Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem.
6Nulla consequat massa quis enim.
7Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu.
8In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo.
9Nullam dictum felis eu pede mollis pretium.
10Integer tincidunt. Cras dapibus.
11Vivamus elementum semper nisi.
12Aenean vulputate eleifend tellus.
13Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim.
14Aliquam lorem ante, dapibus in, viverra quis, feugiat a,`;

const VISIBLE_LINE_COUNT = 10;

function App() {
  const viewModelRef = React.useRef<ViewModel | null>(null);

  if (!viewModelRef.current) {
    const doc = new Document(INITIAL_TEXT);
    const cursor = new Cursor(new Position(0, 0));
    const editorState = new EditorState(doc, cursor);
    viewModelRef.current = new ViewModel(editorState, 0, VISIBLE_LINE_COUNT);
  }

  return <EditorView viewModel={viewModelRef.current} />;
}

export default App;
