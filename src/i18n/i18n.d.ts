import "i18next";
declare module "i18next" {
	interface CustomTypeOptions {
		defaultNS: "en-US";
		resources: {
			"en-US": typeof import("../../public/locales/en-US.json");
		};
	}
}
