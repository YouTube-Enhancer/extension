import { forwardRef } from "react";

import { useSettings } from "@/src/components/Settings/Settings";
import { type Nullable } from "@/src/types";
import { type editor, MarkerSeverity } from "@/src/utils/monaco";
import { cn } from "@/src/utils/utilities";

import "./index.css";
type EditorProblemsProps = {
	className: string;
	editor: Nullable<editor.IStandaloneCodeEditor>;
	problems: editor.IMarker[];
};
const EditorProblems = forwardRef<HTMLDivElement, EditorProblemsProps>(({ className, editor, problems }, ref) => {
	const {
		i18nInstance: { t }
	} = useSettings();
	const getIcon = (severity: MarkerSeverity) => {
		switch (severity) {
			case MarkerSeverity.Error:
				return "error";
			case MarkerSeverity.Hint:
				return "hint";
			case MarkerSeverity.Info:
				return "info";
			case MarkerSeverity.Warning:
				return "warning";
			default:
				return "";
		}
	};
	return (
		<div className={cn("bg-[#1e1e1e]", className)} ref={ref}>
			{problems.length === 0 && <div className="center p-1">{t("settings.sections.customCSS.extras.noProblems")}</div>}
			{problems.map((problem, index) => (
				<div
					className="center flex max-h-6 cursor-pointer gap-1 text-[13px] text-[#cccccc] hover:bg-[#2e2e2e]"
					key={index}
					onClick={() => {
						if (!editor) return;
						editor.focus();
						editor.revealLine(problem.startLineNumber);
						editor.setPosition({
							column: problem.startColumn,
							lineNumber: problem.startLineNumber
						});
					}}
				>
					<div className={`marker-icon ${getIcon(problem.severity)}`}>
						<div className={`codicon codicon-${getIcon(problem.severity)}`} />
					</div>
					<div className="marker-message-details-container">
						<div className="marker-message-line details-container">
							<div className="marker-message">
								<span>{problem.message}</span>
							</div>
							{problem.source && (
								<>
									<div className="marker-source">
										<span>{problem.source}</span>
									</div>
									<div className="marker-code">
										<span>{problem.code && typeof problem.code === "string" ? `(${problem.code})` : ""}</span>
									</div>
								</>
							)}
							<span className="marker-line">{`[Ln ${problem.startLineNumber}, Col ${problem.startColumn}]`}</span>
						</div>
					</div>
				</div>
			))}
		</div>
	);
});
EditorProblems.displayName = "EditorProblems";
export default EditorProblems;
