import { type Monaco } from "@monaco-editor/react";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from "react";

import useDebounceFn from "@/src/hooks/useDebounce";
import { type Nullable } from "@/src/types";
import { type editor } from "@/src/utils/monaco";
import { cn } from "@/src/utils/utilities";

import { editorOptions } from "./editorOptions";
import EditorProblems from "./EditorProblems";
import "./editorWorkerConfig";
import ExpandButton from "./ExpandButton";

export type CSSEditorProps = {
	className?: string;
	disabled: boolean;
	onChange: (value: string) => void;
	value: string;
};
type ScrollPosition = {
	x: number;
	y: number;
};

// TODO: add share custom css button with integration with yt-enhancer.dev
const Editor = React.lazy(() => import("@monaco-editor/react").then((module) => ({ default: module.Editor })));
const CSSEditor: React.FC<CSSEditorProps> = ({ className, disabled, onChange, value }) => {
	const editorRef = useRef<Nullable<editor.IStandaloneCodeEditor>>(null);
	const monacoRef = useRef<Nullable<Monaco>>(null);
	const editorProblemsRef = useRef<Nullable<HTMLDivElement>>(null);
	const expandButtonRef = useRef<Nullable<HTMLInputElement>>(null);
	const [state, dispatch] = useReducer(reducer, {
		editorValue: value,
		initialBodyOverflow: "",
		isExpanded: false,
		pageScroll: { x: 0, y: 0 },
		problems: [],
		viewportHeight: document.documentElement.clientHeight
	});
	if (value !== state.editorValue) dispatch({ payload: value, type: "SET_EDITOR_VALUE" });
	const debouncedOnChange = useDebounceFn((val: string) => {
		onChange(val);
	}, 500);
	const expandedEditorHeight = useMemo(() => {
		const expandButtonHeight = expandButtonRef.current?.clientHeight ?? 0;
		const editorProblemsHeight = editorProblemsRef.current?.clientHeight ?? 0;
		return state.viewportHeight - (expandButtonHeight + editorProblemsHeight + 12);
	}, [state.viewportHeight, state.problems]);
	const flushSave = useCallback(() => {
		const currentValue = editorRef.current?.getValue() ?? "";
		onChange(currentValue);
	}, [onChange]);
	const handleEditorDidMount = useCallback(
		(editorInstance: editor.IStandaloneCodeEditor, monaco: Monaco) => {
			editorRef.current = editorInstance;
			monacoRef.current = monaco;
			editorInstance.onDidBlurEditorText(() => {
				flushSave();
			});
		},
		[flushSave]
	);
	const handleEditorChange = useCallback(
		(val: string = "") => {
			dispatch({ payload: val, type: "SET_EDITOR_VALUE" });
			debouncedOnChange(val);
		},
		[debouncedOnChange]
	);
	const expandEditor = () => {
		dispatch({ payload: { x: window.scrollX, y: window.scrollY }, type: "SET_SCROLL" });
		dispatch({ payload: true, type: "SET_EXPANDED" });
		dispatch({ payload: document.body.style.overflow, type: "SET_BODY_OVERFLOW" });
		document.body.style.overflow = "hidden";
		editorRef.current?.focus();
	};
	const collapseEditor = () => {
		const { initialBodyOverflow } = state;
		document.body.style.overflow = initialBodyOverflow;
		dispatch({ payload: false, type: "SET_EXPANDED" });
		editorRef.current?.focus();
	};
	useLayoutEffect(() => {
		if (!state.isExpanded) window.scrollTo(state.pageScroll.x, state.pageScroll.y);
	}, [state.isExpanded, state.pageScroll]);
	useEffect(() => {
		const onResize = () => dispatch({ payload: document.documentElement.clientHeight, type: "SET_VIEWPORT_HEIGHT" });
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);
	return (
		<div
			className={cn(className, {
				"fixed top-0 left-0 z-[1000] w-screen h-screen bg-[#23272a] flex flex-col": state.isExpanded,
				"w-full flex flex-col": !state.isExpanded
			})}
		>
			<ExpandButton isExpanded={state.isExpanded} onToggle={() => (state.isExpanded ? collapseEditor() : expandEditor())} ref={expandButtonRef} />
			<Editor
				className={cn("size-full grow", { "cursor-not-allowed pointer-events-none": disabled })}
				height={state.isExpanded ? expandedEditorHeight : 400}
				language="css"
				onChange={disabled ? () => {} : handleEditorChange}
				onMount={handleEditorDidMount}
				onValidate={(newProblems) => dispatch({ payload: newProblems, type: "SET_PROBLEMS" })}
				options={editorOptions}
				theme="vs-dark"
				value={state.editorValue}
				width={state.isExpanded ? document.documentElement.clientWidth : 500}
				wrapperProps={{ className: cn({ "cursor-not-allowed": disabled }) }}
			/>
			<EditorProblems
				className={cn("max-h-32 w-[500px] overflow-y-auto", {
					"cursor-not-allowed": disabled,
					"fixed bottom-0 left-0 w-full": state.isExpanded
				})}
				editor={editorRef.current}
				problems={state.problems}
				ref={editorProblemsRef}
			/>
		</div>
	);
};
export default CSSEditor;
type EditorAction =
	| { payload: boolean; type: "SET_EXPANDED" }
	| { payload: editor.IMarker[]; type: "SET_PROBLEMS" }
	| { payload: number; type: "SET_VIEWPORT_HEIGHT" }
	| { payload: ScrollPosition; type: "SET_SCROLL" }
	| { payload: string; type: "SET_BODY_OVERFLOW" }
	| { payload: string; type: "SET_EDITOR_VALUE" };

type EditorState = {
	editorValue: string;
	initialBodyOverflow: string;
	isExpanded: boolean;
	pageScroll: ScrollPosition;
	problems: editor.IMarker[];
	viewportHeight: number;
};

function reducer(state: EditorState, action: EditorAction): EditorState {
	switch (action.type) {
		case "SET_BODY_OVERFLOW":
			return { ...state, initialBodyOverflow: action.payload };
		case "SET_EDITOR_VALUE":
			return { ...state, editorValue: action.payload };
		case "SET_EXPANDED":
			return { ...state, isExpanded: action.payload };
		case "SET_PROBLEMS":
			return { ...state, problems: action.payload };
		case "SET_SCROLL":
			return { ...state, pageScroll: action.payload };
		case "SET_VIEWPORT_HEIGHT":
			return { ...state, viewportHeight: action.payload };
		default:
			return state;
	}
}
