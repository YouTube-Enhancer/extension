import { type Nullable } from "@/src/types";
import { type editor, monaco } from "@/src/utils/monaco";
import { cn, debounce } from "@/src/utils/utilities";
import { Editor, type Monaco } from "@monaco-editor/react";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import EditorProblems from "./EditorProblems";
import ExpandButton from "./ExpandButton";
import { editorOptions } from "./editorOptions";
import "./editorWorkerConfig";

export type CSSEditorProps = {
	className?: string;
	id: string;
	onChange: (value: string) => void;
	value: string;
};
type ScrollPosition = {
	x: number;
	y: number;
};

// TODO: add share custom css button with integration with yt-enhancer.dev

const CSSEditor: React.FC<CSSEditorProps> = ({ className, id, onChange, value }) => {
	const editorRef = useRef<Nullable<editor.IStandaloneCodeEditor>>(null);
	const monacoRef = useRef<Nullable<Monaco>>(null);
	const editorProblemsRef = useRef<Nullable<HTMLDivElement>>(null);
	const expandButtonRef = useRef<Nullable<HTMLInputElement>>(null);

	const [isEditorExpanded, setEditorExpanded] = useState(false);
	const [pageScrollPosition, setPageScrollPosition] = useState<ScrollPosition>({ x: 0, y: 0 });
	const [problems, setProblems] = useState<editor.IMarker[]>([]);
	const [windowResized, setWindowResized] = useState(0);

	const editorHeight = useMemo<number>(() => {
		const {
			documentElement: { clientHeight: documentHeight }
		} = document;
		const expandButtonHeight = expandButtonRef.current?.clientHeight ?? 0;
		const editorProblemsHeight = editorProblemsRef.current?.clientHeight ?? 0;
		const editorHeight = documentHeight - (expandButtonHeight + editorProblemsHeight + 12);
		return editorHeight;
	}, [problems, windowResized, editorProblemsRef.current?.clientHeight, expandButtonRef.current?.clientHeight]);

	const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
		editorRef.current = editor;
		monacoRef.current = monaco;
	}, []);

	const handleEditorChange = useCallback(
		(value: string | undefined, ev: editor.IModelContentChangedEvent) => debounce(onChange, 250)(value, ev),
		[onChange]
	);

	const expandEditor = () => {
		const currentScrollPosition = { x: window.scrollX, y: window.scrollY };
		setPageScrollPosition(currentScrollPosition);
		setEditorExpanded(true);

		editorRef.current?.focus();
	};
	const collapseEditor = () => {
		setEditorExpanded(false);
		editorRef.current?.focus();
	};

	useLayoutEffect(() => {
		if (!isEditorExpanded) {
			window.scrollTo(pageScrollPosition.x, pageScrollPosition.y);
		}
	}, [isEditorExpanded, pageScrollPosition]);

	useEffect(() => {
		// Trigger any effect that depends on window size
		const onResize = () => setWindowResized(Math.random());

		window.addEventListener("resize", onResize);
		// Clean up the event listener when the component unmounts
		return () => {
			window.removeEventListener("resize", onResize);
		};
	}, []);

	return (
		<div
			className={cn(className, {
				"fixed top-0 left-0 z-[1000] w-screen h-screen bg-[#23272a] flex flex-col": isEditorExpanded,
				"w-full flex flex-col": !isEditorExpanded
			})}
			id={id}
		>
			<ExpandButton
				isExpanded={isEditorExpanded}
				onToggle={() => {
					if (!isEditorExpanded) return expandEditor();
					collapseEditor();
				}}
				ref={expandButtonRef}
			/>
			<Editor
				className={"size-full grow"}
				height={isEditorExpanded ? editorHeight : 700}
				language="css"
				onChange={handleEditorChange}
				onMount={handleEditorDidMount}
				onValidate={setProblems}
				options={editorOptions}
				theme="vs-dark"
				value={value}
				width={isEditorExpanded ? window.document.documentElement.clientWidth : 500}
			/>
			<EditorProblems
				className={cn("max-h-32 w-[500px] overflow-y-auto", {
					"fixed bottom-0 left-0 w-full": isEditorExpanded
				})}
				editor={editorRef.current}
				problems={problems}
				ref={editorProblemsRef}
			/>
		</div>
	);
};
export default CSSEditor;
