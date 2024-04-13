import { type editor, monaco } from "@/src/utils/monaco";
import { cn, debounce } from "@/src/utils/utilities";
import { Editor, type Monaco } from "@monaco-editor/react";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

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
type CursorPosition = {
	columnNumber: number;
	lineNumber: number;
};
type CSSEditorState = {
	cursorPosition: CursorPosition;
};
// TODO: add share custom css button with integration with yt-enhancer.dev
const CSSEditor: React.FC<CSSEditorProps> = ({ className, id, onChange, value }) => {
	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
	const monacoRef = useRef<Monaco | null>(null);
	const editorProblemsRef = useRef<HTMLDivElement | null>(null);
	const expandButtonRef = useRef<HTMLInputElement | null>(null);

	const [isEditorExpanded, setEditorExpanded] = useState(false);
	const [editorState, setEditorState] = useState<CSSEditorState>({
		cursorPosition: { columnNumber: 1, lineNumber: 1 }
	});
	const [pageScrollPosition, setPageScrollPosition] = useState<ScrollPosition>({ x: 0, y: 0 });
	const [problems, setProblems] = useState<editor.IMarker[]>([]);
	const [editorHeight, setEditorHeight] = useState<number>(700);

	const getEditorHeight = () => {
		const {
			documentElement: { clientHeight: documentHeight }
		} = document;
		const expandButtonHeight = expandButtonRef.current?.clientHeight ?? 0;
		const editorProblemsHeight = editorProblemsRef.current?.clientHeight ?? 0;
		const editorHeight = documentHeight - (expandButtonHeight + editorProblemsHeight + 12);
		return editorHeight;
	};
	const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
		editorRef.current = editor;
		monacoRef.current = monaco;
		setEditorHeight(getEditorHeight());
	};
	const handleEditorChange = useCallback(debounce(onChange, 250), []);

	const expandEditor = () => {
		const currentScrollPosition = { x: window.scrollX, y: window.scrollY };
		setPageScrollPosition(currentScrollPosition);
		const currentPos = editorRef.current?.getPosition();
		setEditorState({
			cursorPosition: {
				columnNumber: currentPos?.column ?? 1,
				lineNumber: currentPos?.lineNumber ?? 1
			}
		});
		setEditorExpanded(true);
		editorRef.current?.focus();
	};
	const collapseEditor = () => {
		setEditorExpanded(false);
		editorRef.current?.focus();
	};

	useEffect(() => {
		if (editorRef.current) {
			const { current: editor } = editorRef;
			const position = editor.getPosition();
			setEditorState({
				cursorPosition: {
					columnNumber: position?.column ?? 1,
					lineNumber: position?.lineNumber ?? 1
				}
			});
		}
	}, [editorRef.current?.getPosition(), editorRef.current?.getScrollTop()]);
	useLayoutEffect(() => {
		if (!isEditorExpanded) {
			window.scrollTo(pageScrollPosition.x, pageScrollPosition.y);
		}
	}, [isEditorExpanded]);
	useEffect(() => {
		if (editorRef.current) {
			const { current: editor } = editorRef;
			const {
				cursorPosition: { columnNumber, lineNumber }
			} = editorState;
			const position = new monaco.Position(lineNumber, columnNumber);
			editor.setPosition(position);
		}
	}, [value]);
	useEffect(() => {
		if (editorProblemsRef.current && expandButtonRef.current) {
			setEditorHeight(getEditorHeight());
		}
	}, [problems]);
	useEffect(() => {
		setEditorHeight(getEditorHeight());
		const handleResize = () => {
			if (editorProblemsRef.current && expandButtonRef.current) {
				setEditorHeight(getEditorHeight());
			}
		};

		window.addEventListener("resize", handleResize);

		// Clean up the event listener when the component unmounts
		return () => {
			window.removeEventListener("resize", handleResize);
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
					if (!isEditorExpanded) {
						expandEditor();
					} else {
						collapseEditor();
					}
				}}
				ref={expandButtonRef}
			/>
			<Editor
				className={"h-full w-full grow"}
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
