import { Editor, type Monaco } from "@monaco-editor/react";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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

const CSSEditor: React.FC<CSSEditorProps> = ({ className, disabled, onChange, value }) => {
	const editorRef = useRef<Nullable<editor.IStandaloneCodeEditor>>(null);
	const monacoRef = useRef<Nullable<Monaco>>(null);
	const editorProblemsRef = useRef<Nullable<HTMLDivElement>>(null);
	const expandButtonRef = useRef<Nullable<HTMLInputElement>>(null);
	const [editorValue, setEditorValue] = useState(value);
	const [isEditorExpanded, setEditorExpanded] = useState(false);
	const [initialBodyOverflowValue, setInitialBodyOverflowValue] = useState("");
	const [pageScrollPosition, setPageScrollPosition] = useState<ScrollPosition>({ x: 0, y: 0 });
	const [problems, setProblems] = useState<editor.IMarker[]>([]);
	const [viewportHeight, setViewportHeight] = useState(() => document.documentElement.clientHeight);
	const debouncedOnChange = useDebounceFn((val: string) => {
		onChange(val);
	}, 500);
	useEffect(() => {
		setEditorValue(value);
	}, [value]);
	const expandedEditorHeight = useMemo(() => {
		const expandButtonHeight = expandButtonRef.current?.clientHeight ?? 0;
		const editorProblemsHeight = editorProblemsRef.current?.clientHeight ?? 0;
		return viewportHeight - (expandButtonHeight + editorProblemsHeight + 12);
	}, [viewportHeight, problems]);
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
			setEditorValue(val);
			debouncedOnChange(val);
		},
		[debouncedOnChange]
	);
	const expandEditor = () => {
		setPageScrollPosition({ x: window.scrollX, y: window.scrollY });
		setEditorExpanded(true);
		setInitialBodyOverflowValue(document.body.style.overflow);
		document.body.style.overflow = "hidden";
		editorRef.current?.focus();
	};
	const collapseEditor = () => {
		document.body.style.overflow = initialBodyOverflowValue;
		setEditorExpanded(false);
		editorRef.current?.focus();
	};
	useLayoutEffect(() => {
		if (!isEditorExpanded) window.scrollTo(pageScrollPosition.x, pageScrollPosition.y);
	}, [isEditorExpanded, pageScrollPosition]);
	useEffect(() => {
		const onResize = () => setViewportHeight(document.documentElement.clientHeight);
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);
	return (
		<div
			className={cn(className, {
				"fixed top-0 left-0 z-[1000] w-screen h-screen bg-[#23272a] flex flex-col": isEditorExpanded,
				"w-full flex flex-col": !isEditorExpanded
			})}
		>
			<ExpandButton isExpanded={isEditorExpanded} onToggle={() => (isEditorExpanded ? collapseEditor() : expandEditor())} ref={expandButtonRef} />
			<Editor
				className={cn("size-full grow", { "cursor-not-allowed pointer-events-none": disabled })}
				height={isEditorExpanded ? expandedEditorHeight : 400}
				language="css"
				onChange={disabled ? () => {} : handleEditorChange}
				onMount={handleEditorDidMount}
				onValidate={setProblems}
				options={editorOptions}
				theme="vs-dark"
				value={editorValue}
				width={isEditorExpanded ? document.documentElement.clientWidth : 500}
				wrapperProps={{ className: cn({ "cursor-not-allowed": disabled }) }}
			/>
			<EditorProblems
				className={cn("max-h-32 w-[500px] overflow-y-auto", {
					"cursor-not-allowed": disabled,
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
