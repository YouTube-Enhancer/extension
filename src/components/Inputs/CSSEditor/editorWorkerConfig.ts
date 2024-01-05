import { monaco } from "@/src/utils/monaco";
import { loader } from "@monaco-editor/react";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
self.MonacoEnvironment = {
	getWorker(_, label) {
		const castLabel = label as "css" | "html" | "javascript" | "typescript";
		switch (castLabel) {
			case "css": {
				return new cssWorker();
			}
			default: {
				return new editorWorker();
			}
		}
	}
};
loader.config({ monaco });
