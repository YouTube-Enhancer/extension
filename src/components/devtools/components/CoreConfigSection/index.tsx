import type { JSX } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CoreFeatureKeys, NonFeatureKeys } from "@/src/features/_registry/types";

import DevToolsLoader from "@/components/devtools/components/DevToolsLoader";
import { coreConfigQuery } from "@/components/devtools/hooks/useDevToolsQuery";
import { useNotifications } from "@/src/hooks";
import { sendDevToolsMessage } from "@/src/utils/messaging/devtools";

import ApiKeySetting from "./ApiKeySetting";
import ButtonPlacementSetting from "./ButtonPlacementSetting";
import FeatureMenuOpenTypeSetting from "./FeatureMenuOpenTypeSetting";
import LanguageSetting from "./LanguageSetting";
import OnScreenDisplaySettings from "./OnScreenDisplaySettings";
import VersionToggleSetting from "./VersionToggleSetting";

type CoreKey = CoreFeatureKeys | NonFeatureKeys;

export default function CoreConfigSection(): JSX.Element {
	const queryClient = useQueryClient();
	const { addNotification } = useNotifications();
	const { data, isError, isPending } = useQuery(coreConfigQuery);

	const updateMutation = useMutation({
		async mutationFn({ path, value }: { path: CoreKey; value: unknown }) {
			await sendDevToolsMessage("devtools_update_core_config", { path, value });
		},
		onError: () => {
			addNotification("error", () => "Failed to save");
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["devtools", "coreConfig"] });
			addNotification("success", () => "Saved");
		}
	});

	const handleChange = (path: CoreKey, value: unknown) => {
		void updateMutation.mutateAsync({ path, value });
	};

	if (isPending) return <DevToolsLoader message="Loading core settings..." />;
	if (isError || !data?.config) return <div className="p-4 text-red-400">Failed to load core settings</div>;

	const { config } = data;

	return (
		<div className="space-y-6 p-4">
			<FeatureMenuOpenTypeSetting
				onChange={(v) => handleChange("featureMenu", { openType: v })}
				options={[
					{ label: "Click", value: "click" },
					{ label: "Hover", value: "hover" }
				]}
				value={config.featureMenu?.openType ?? "click"}
			/>
			<LanguageSetting onChange={(v) => handleChange("language", v)} value={config.language ?? "en-US"} />
			<OnScreenDisplaySettings config={config.onScreenDisplay} onChange={(v) => handleChange("onScreenDisplay", v)} />
			<VersionToggleSetting
				onChange={(v) => handleChange("openSettingsOnMajorOrMinorVersionChange", v)}
				value={config.openSettingsOnMajorOrMinorVersionChange ?? true}
			/>
			<ApiKeySetting onChange={(v) => handleChange("youtubeDataApiV3Key", v)} value={config.youtubeDataApiV3Key ?? ""} />
			<ButtonPlacementSetting config={config} />
		</div>
	);
}
