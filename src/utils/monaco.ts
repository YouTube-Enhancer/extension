import type { editor } from "monaco-editor/esm/vs/editor/editor.api";

import "monaco-editor/esm/vs/basic-languages/css/css";
import "monaco-editor/esm/vs/basic-languages/css/css.contribution";
import "monaco-editor/esm/vs/editor/edcore.main";
import "monaco-editor/esm/vs/editor/editor.all.js";
import { MarkerSeverity } from "monaco-editor/esm/vs/editor/editor.api";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/language/css/cssMode";
import "monaco-editor/esm/vs/language/css/monaco.contribution";
export { MarkerSeverity, type editor, monaco };
