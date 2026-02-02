/**
 * Theme presets are adapted from the "YouTube DeepDark" Stylus theme by RaitaroH.
 * Author: https://github.com/RaitaroH
 * Co-authors: https://github.com/MechaLynx
 * Repository: https://github.com/RaitaroH/YouTube-DeepDark
 */
export const deepDarkPreset = [
	"9anime",
	"Adapta-Breath-Nokto",
	"Adapta-Nokto",
	"Arc-Dark",
	"Black-and-White",
	"Breeze-Dark",
	"Custom",
	"Deep-Dark",
	"Discord",
	"Dracula",
	"Firefox-57",
	"Firefox-Alpenglow-Dark",
	"Firefox-Dark",
	"Firefox-Dark-91",
	"Gruvbox-Dark",
	"Gruvbox-Light",
	"HavocOS",
	"Inspired-Dark",
	"Jisho",
	"Mint-Y-Dark",
	"NierAutomata-Dark",
	"NierAutomata-Light",
	"Orange",
	"Solarized-Dark",
	"Solarized-Light",
	"Ubuntu-Grey",
	"Ubuntu-Purple",
	"Vertex-Dark",
	"Yellow",
	"Yellow-2",
	"YouTube-Dark"
] as const;
export type DeepDarkPreset = (typeof deepDarkPreset)[number];
export type DeepDarkPresets = Record<Exclude<DeepDarkPreset, "Custom">, string>;
/**
 * Theme presets are adapted from the "YouTube DeepDark" Stylus theme by RaitaroH.
 * Author: RaitaroH
 * Co-authors: https://github.com/MechaLynx
 * Repository: https://github.com/RaitaroH/YouTube-DeepDark
 */
export const deepDarkPresets = {
	"9anime": `
	:root {
		--main-color: #723f8c;
		--main-background: #0b0a0d;
		--second-background: #17151c;
		--hover-background: #1E1c25;
		--main-text: #f9f6fb;
		--dimmer-text: #cac0cf;
		--shadow: 0 1px 0.5px rgba(54, 54, 54, .13);
	}`,
	"Adapta-Breath-Nokto": `
	:root {
		--main-color: #1abc9c;
		--main-background: #222d32;
		--second-background: #263238;
		--hover-background: #2a353b;
		--main-text: #fff;
		--dimmer-text: #9b9b9b;
		--shadow: 0 1px 0.5px  rgba(42, 53, 59, .32);
	}`,
	"Adapta-Nokto": `
	:root {
		--main-color: #00bcd4;
		--main-background: #222d32;
		--second-background: #263238;
		--hover-background: #2a353b;
		--main-text: #fff;
		--dimmer-text: #9b9b9b;
		--shadow: 0 1px 0.5px  rgba(61, 77, 86, .2);
	}`,
	"Arc-Dark": `
	:root {
		--main-color: #5294e2;
		--main-background: #343944;
		--second-background: #383c4a;
		--hover-background: #414a59;
		--main-text: #c1c8d1;
		--dimmer-text: #b3bac5;
		--shadow: 0 1px 0.5px rgba(0, 0, 0, .13);
	}`,
	"Black-and-White": `
	:root {
		--main-color: #fff;
		--main-background: #000;
		--second-background: #1e1e1e;
		--hover-background: #313131;
		--main-text: #fff;
		--dimmer-text: #aaa;
		--shadow: 0 1px 0.5px rgba(54 ,54 ,54, .2);
	}`,
	"Breeze-Dark": `
	:root {
		--main-color: #3daee9;
		--main-background: #232629;
		--second-background: #2a2e32;
		--hover-background: #31363b;
		--main-text: #eff0f1;
		--dimmer-text: #bdc3c7;
		--shadow: 0 1px 0.5px rgba(0, 0, 0, .13);
	}`,
	"Deep-Dark": `
	:root {
		--main-color: #00adee;
		--main-background: #111;
		--second-background: #181818;
		--hover-background: #232323;
		--main-text: #eff0f1;
		--dimmer-text: #ccc;
		--shadow: 0 1px 0.5px rgba(0, 0, 0, .3);
	}`,
	Discord: `
	:root {
		--main-color: #7289da;
		--main-background: #1e2124;
		--second-background: #2f3136;
		--hover-background: #484b51;
		--main-text: #fff;
		--dimmer-text: #ada8aa;
		--shadow: 0 1px 0.5px rgba(47, 49, 54, .23);
	}`,
	Dracula: `
	:root {
		--main-color: #bd93f9;                      /*Purple*/
		--main-background: hsl(231, 15%, 18%);      /*Background*/
		--second-background: hsl(231, 15%, 22%);    /*Manually generated from Background*/
		--hover-background: #44475a;                /*Selection*/
		--main-text:#f8f8f2;                        /*Foreground*/
		--dimmer-text: #bcc2cd;                     /*From .app-title https://draculatheme.com/*/
		--shadow: 0 1px 0.5px rgba(0, 0, 0, .15);
	}`,
	"Firefox-57": `
	:root {
		--main-color: #4080fb;
		--main-background: #0c0c0d;
		--second-background: #252526;
		--hover-background: #323234;
		--main-text: #f9f9fa;
		--dimmer-text: #d0d0d0;
		--shadow: 0 1px 0.5px rgba(54, 54, 54, .2);
	}`,
	"Firefox-Alpenglow-Dark": `
	:root {
		--main-color: #C488FC;
		--main-background: #21133d;
		--second-background: #2a1e52;
		--hover-background: #2d245b;
		--main-text: #ffffff;
		--dimmer-text: #E3DBFA;
		--shadow: 0 1px .5px rgba(35, 22, 65, .5);
	}`,
	"Firefox-Dark": `
	:root {
		--main-color: #5675b9;
		--main-background: #272b35;
		--second-background: #181d20;
		--hover-background: #353a44;
		--main-text: #e3eef9;
		--dimmer-text: #bec0cc;
		--shadow: 0 1px 0.5px rgba(0, 0, 0, .13);
	}`,
	"Firefox-Dark-91": `
	:root {
		--main-color: #00ddff;
		--main-background: #1c1b22;
		--second-background: #23222b;
		--hover-background: #2b2a33;
		--main-text: #fbfbfe;
		--dimmer-text: #b8b7bb;
		--shadow: 0 1px 0.5px rgba(0, 0, 0, .13);
	}`,
	"Gruvbox-Dark": `
	:root {
		--main-color: #fe8019;
		--main-background: #1d2021;
		--second-background: #282828;
		--hover-background: #3c3836;
		--main-text: #fbf1c7;
		--dimmer-text: #ebdbb2;
		--shadow: 0 1px 0.5px  rgba(60, 56, 54, .22);
	}`,
	"Gruvbox-Light": `
	:root {
		--main-color: #af3a03;
		--main-background: #f9f5d7;
		--second-background: #fbf1c7;
		--hover-background: #ebdbb2;
		--main-text: #282828;
		--dimmer-text: #3c3836;
		--shadow: 0 1px 0.5px  rgba(235, 219, 178, .33);
	}`,
	HavocOS: `
	:root {
		--main-color: #0794d4;
		--main-background: #141618;
		--second-background: #1c1e20;
		--hover-background: #212528;
		--main-text: #fff;
		--dimmer-text: #b9baba;
		--shadow: 0 1px 0.5px rgba(185, 186, 186, .04);
	}`,
	"Inspired-Dark": `
	:root {
		--main-color: #5e8acc;
		--main-background: #232629;
		--second-background: #181818;
		--hover-background: #515254;
		--main-text: #eee;
		--dimmer-text: #ccc;
		--shadow: 0 1px 0.5px rgba(0, 0, 0, .13);
	}`,
	Jisho: `
	:root {
		--main-color: #ef7d6c;
		--main-background: #332222;
		--second-background: #2a1b1b;
		--hover-background: #863b2f;
		--main-text: #EFB26C;
		--dimmer-text: #986E3F;
		--shadow: 0 1px 0.5px rgba(37, 19, 5, .19);
	}`,
	"Mint-Y-Dark": `
	:root {
		--main-color: #9ab87c;
		--main-background: #2f2f2f;
		--second-background: #383838;
		--hover-background: #404040;
		--main-text: #fff;
		--dimmer-text: #d5dada;
		--shadow: 0 1px 0.5px rgba(0, 0, 0, .13);
	}`,
	"NierAutomata-Dark": `
	:root {
		--main-color: #fe8019;
		--main-background: #33302a;
		--second-background: #48453c;
		--hover-background: #7c6f64;
		--main-text: #dad4bb;
		--dimmer-text: #bab5a1;
		--shadow: 0 1px 0.5px  rgba(124, 111, 100, .15);
	}`,
	"NierAutomata-Light": `
	:root {
		--main-color: #fe8019;
		--main-background: #d1cdb7;
		--second-background: #dcd8c0;
		--hover-background: #bab5a1;
		--main-text: #48453c;
		--dimmer-text: #33302a;
		--shadow: 0 1px 0.5px rgba(186, 181, 161, 2);
	}`,
	Orange: `
	:root {
		--main-color: #ff6905;
		--main-background: #0a0400;
		--second-background: #0e0702;
		--hover-background: #110903;
		--main-text: #fff9f5;
		--dimmer-text: #ffede1;
		--shadow: 0 1px 0.5px rgba(255, 105, 5, .1);
	}`,
	"Solarized-Dark": `
	:root {
		--main-color: #268bd2;
		--main-background: #073642;
		--second-background: #03303c;
		--hover-background: #002b36;
		--main-text: #fdf6E3;
		--dimmer-text: #eee8d5;
		--shadow: 0 1px 0.5px  rgba(0, 43, 54, .3);
	}`,
	"Solarized-Light": `
	:root {
		--main-color: #268bd2;
		--main-background: #fdf6e3;
		--second-background: #f5efdc;
		--hover-background: #eee8d5;
		--main-text: #073642;
		--dimmer-text: #586e75;
		--shadow: 0 1px 0.5px  rgba(222, 216, 196, .2);
	}`,
	"Ubuntu-Grey": `
	:root {
		--main-color: #ef7847;
		--main-background: #312d2a;
		--second-background: #3d3c38;
		--hover-background: #59564d;
		--main-text: #f2f1ef;
		--dimmer-text: #e6e5e3;
		--shadow: 0 1px 0.5px rgba(89, 86, 77, .12);
	}`,
	"Ubuntu-Purple": `
	:root {
		--main-color: #ef7847;
		--main-background: #2c071a;
		--second-background: #430b28;
		--hover-background: #520D30;
		--main-text: #f2f1ef;
		--dimmer-text: #e6e5e3;
		--shadow: 0 1px 0.5px rgba(82, 13, 48, .2);
	}`,
	"Vertex-Dark": `
	:root {
		--main-color: #4080fb;
		--main-background: #2b2b2c;
		--second-background: #353638;
		--hover-background: #515254;
		--main-text: #f3f3f5;
		--dimmer-text: #aeafb0;
		--shadow: 0 1px 0.5px rgba(0, 0, 0, .13);
	}`,
	Yellow: `
	:root {
		--main-color: #ffc700;
		--main-background: #141414;
		--second-background: #202222;
		--hover-background: #353838;
		--main-text: #eff0f1;
		--dimmer-text: #9f9999;
		--shadow: 0 1px 0.5px rgba(34, 34, 34, .2);
	}`,
	"Yellow-2": `
	:root {
		--main-color: #ffc700;
		--main-background: #0a0800;
		--second-background: #0c0a04;
		--hover-background: #0f0d05;
		--main-text: #fffdf5;
		--dimmer-text: #fff8e1;
		--shadow: 0 1px 0.5px rgba(34, 34, 34, .2);
	}`,
	"YouTube-Dark": `
	:root {
		--main-color: #e52117;
		--main-background: #111;
		--second-background: #232323;
		--hover-background: #343434;
		--main-text: #e1e1e1;
		--dimmer-text: #7f7f7f;
		--shadow: 0 1px 0.5px rgba(54, 54, 54, .2);
	}`
} as const satisfies DeepDarkPresets;
