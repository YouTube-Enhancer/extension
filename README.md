# YouTube Enhancer Extension 🚀

The YouTube Enhancer Extension is a powerful browser extension designed to enhance your YouTube experience.

[![Get the YouTube Enhancer Extension on Firefox](https://img.shields.io/amo/v/youtube-enhancer-vc?label=Firefox&logo=Firefox-Browser&labelColor=5b5b5b&color=4fca21)](https://addons.mozilla.org/en-US/firefox/addon/youtube-enhancer-vc?utm_source=github&utm_medium=social)
[![Mozilla Add-on Users](https://img.shields.io/amo/users/youtube-enhancer-vc?logo=Firefox-Browser&labelColor=5b5b5b&color=4fca21)](https://addons.mozilla.org/en-US/firefox/addon/youtube-enhancer-vc?utm_source=github&utm_medium=social)
[![Mozilla Add-on Downloads](https://img.shields.io/amo/dw/youtube-enhancer-vc?logo=Firefox-Browser&labelColor=5b5b5b&color=4fca21)](https://addons.mozilla.org/en-US/firefox/addon/youtube-enhancer-vc?utm_source=github&utm_medium=social)
[![Get the YouTube Enhancer Extension on Google Chrome](https://img.shields.io/chrome-web-store/v/dejhhgdpambaambdifcfbmpliolehfaj?logo=googlechrome&labelColor=5b5b5b&color=4fca21)](https://chromewebstore.google.com/detail/youtube-enhancer/dejhhgdpambaambdifcfbmpliolehfaj)
[![Chrome Extension Users](https://img.shields.io/chrome-web-store/users/dejhhgdpambaambdifcfbmpliolehfaj?logo=googlechrome&labelColor=5b5b5b&color=4fca21)](https://chromewebstore.google.com/detail/youtube-enhancer/dejhhgdpambaambdifcfbmpliolehfaj)
[![Chrome Extension Downloads](https://img.shields.io/chrome-web-store/rating/dejhhgdpambaambdifcfbmpliolehfaj?logo=googlechrome&labelColor=5b5b5b&color=4fca21)](https://chromewebstore.google.com/detail/youtube-enhancer/dejhhgdpambaambdifcfbmpliolehfaj)
<br/>
[![GitHub Release](https://img.shields.io/github/v/release/VampireChicken12/youtube-enhancer?label=Github&logo=Github&labelColor=5b5b5b&color=4fca21)](https://github.com/VampireChicken12/youtube-enhancer/releases/latest)
![GitHub Downloads](https://img.shields.io/github/downloads/VampireChicken12/youtube-enhancer/total?logo=Github&labelColor=5b5b5b&color=4fca21)
![Stars](https://img.shields.io/github/stars/VampireChicken12/youtube-enhancer?logo=Github&labelColor=5b5b5b&color=4fca21)
[![All Contributors](https://img.shields.io/github/all-contributors/VampireChicken12/youtube-enhancer?labelColor=5b5b5b&color=4fca21)](#-contributors)
[![Crowdin Translation Project Badge](https://badges.crowdin.net/youtube-enhancer/localized.svg)](https://crowdin.com/project/youtube-enhancer)
[![Join our Discord server](https://img.shields.io/discord/1180688348675838132?label=Discord&logo=Discord&labelColor=5b5b5b&color=4fca21)](https://discord.gg/VpdGFmuB4B)

## Table of Contents

- [Introduction](#-introduction)
- [Features](#%EF%B8%8F-features)
- [Installing from pre-built package](#installing-from-pre-built-zip-archive)
- [Building the Extension](#%EF%B8%8F-building-the-extension)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Contributing](#-contributing)
- [Contributors](#-contributors)
- [Internationalization (i18n)](#-internationalization-i18n)
- [License](#-license)

## 🌟 Introduction

YouTube Enhancer is a browser extension that aims to improve your YouTube experience by providing a set of customizable features and enhancements. Whether you want to fine-tune your video settings, improve navigation, or simplify common tasks, this extension has you covered.

## 🎛️ Features

### Miscellaneous Settings

- **Remember Last Volume:** This option remembers the last volume set for Shorts and the Watch page separately, applying the appropriate volume when you revisit each type of video content.

- **Maximize Player Button:** Adds a button to the player to maximize the video player for a better viewing experience.

- **Remaining Time:** Keep track of the time remaining on your video with a dynamic display.

- **Pause background players:** Pauses video players in background tabs when you start a new player in the foreground.

- **Loop Button:** Adds a dedicated button to toggle the video player loop.

- **Hide Scrollbar:** Hides the pages scroll bar.

- **Automatic Theater Mode:** Automatically enables theater mode when you load a video

- **Open Transcript Button:** Adds a button to the feature menu to open the video transcript (available if the video has a transcript).

- **Open YouTube Settings On Hover:** Opens the settings menu when you hover over the settings button.

- **Remove YouTube `/redirect` URLs**: Enhance link navigation by eliminating YouTube /redirect URLs and get straight to the content you want.

- **Shorten YouTube video share link**: Enhance your shared YouTube links with a shortened and cleaner appearance, intelligently excluding unnecessary query parameters like `si`, `pp`, and `feature` for a more user-friendly experience.

- **Skip "Video is paused. Continue watching?" popup**: Skips the idle dialog that pauses video playback.

- **Shorts auto scroll**: Enjoy seamless viewing with automatic scrolling through YouTube Shorts.

- **Hide shorts**: Enhance your browsing experience by hiding distracting YouTube Shorts content.

- **Hide live stream chat**: Hide the chat section of live streams.

- **Hide translate comment button**: Hides the `Translate to Language` button under comments.

- **Hide end screen cards:**: Hide the end screen cards on videos.

### Video history settings

- **Track watched videos:** Keeps track of where you left off on videos you were watching and enables resuming playback
- **Resume type:** Select how you want to resume playback (Automatic, Prompt)

### On-Screen Display Settings

- **Color:** Select the color for the On-Screen Display (red, green, blue, orange, yellow, white, pink)

- **Type:** Select the type of On-Screen Display (text, line, round, no display).

- **Position:** Select the position of the On-Screen Display (top left, top right, bottom left, bottom right, center).

- **Opacity:** Adjust the transparency of the On-Screen Display.

- **Hide Delay:** Specify the time, in milliseconds, before automatically hiding the On-Screen Display.

- **Padding:** Adjust the spacing around the On-Screen Display in pixels. This applies specifically to corner On-Screen Display.

### Scroll Wheel Speed Control Settings

- **Scroll Wheel Speed Control:** Enables adjusting video speed with scroll wheel while holding the modifier key down.

- **Modifier Key:** Select the modifier key for use with scroll wheel speed control.

- **Speed Change Per Scroll:** The amount the speed is changed per scroll.

### Scroll Wheel Volume Control Settings

- **Scroll Wheel Volume Control:** Control video volume with your mouse's scroll wheel for quick and easy adjustments.

- **Enable when holding modifier key**: Optionally, enable holding a modifier key to adjust the volume only when the specified key is held down during scroll wheel actions.

- **Enable when holding right click**: Optionally, enable holding down the right mouse button during scroll wheel actions.

- **Amount to Adjust Volume per Scroll:** Define how much the volume should change with each scroll.

### Automatic Quality Settings

- **Automatically Set Quality:** Automatically sets the video quality to the chosen level.

- **Player Quality:** Choose the desired video quality for playback.

### Playback Speed Settings

- **Forced Playback Speed:** Allows users to force videos to play at a specific speed.

- **Playback speed buttons:** Adds buttons to adjust the playback speed.

- **Player Speed:** Define the playback speed for videos.

- **Playback buttons speed:** Define the speed adjustment per button press.

### Volume Boost Settings

- **Volume Boost:** Enables the volume boost feature.

- **Volume Boost Mode Selection:** You can select 'Per Video' mode to enable volume boost for each video individually, or 'Global' mode to apply volume boost to all videos when the feature is enabled.

- **Volume Boost Amount (dB):** Specify the amount by which to boost the volume. This setting applies to both 'Per Video' and 'Global' modes.

### Screenshot Settings

- **Screenshot Button:** Adds a button to the player for taking screenshots of videos.

- **Screenshot Save Type:** Choose whether to save screenshots as files or to the clipboard.

- **Screenshot Format:** Define the format in which screenshots should be saved (PNG, JPEG, or WEBP).

### YouTube Deep Dark Settings

- **Enable selected theme:** Enables the selected YouTube Deep Dark theme.

- **Select theme:** Select the YouTube Deep Dark theme to use (9anime, Adapta-Breath-Nokto, Adapta-Nokto, Arc-Dark, Black-and-White, Breeze-Dark, Custom, Deep-Dark, Discord, Dracula, Firefox-57, Firefox-Alpenglow-Dark, Firefox-Dark, Firefox-Dark-91, Gruvbox-Dark, Gruvbox-Light, HavocOS, Inspired-Dark, Jisho, Mint-Y-Dark, NierAutomata-Dark, NierAutomata-Light, Orange, Solarized-Dark, Solarized-Light, Ubuntu-Grey, Ubuntu-Purple, Vertex-Dark, Yellow, Yellow-2, YouTube-Dark).

- **Accent color:** Select the accent color for the "Custom" theme.

- **Main background color:** Select the main background color for the "Custom" theme.

- **Secondary background color:** Select the secondary background color for the "Custom" theme.

- **Hover background color:** Select the hover background color for the "Custom" theme.

- **Main text color:** Select the main text color for the "Custom" theme.

- **Secondary text color:** Select the secondary text color for the "Custom" theme.

- **Shadow color:** Select the shadow color for the "Custom" theme.

### Custom CSS Settings

- **Enable custom CSS:** Applies the custom CSS from the editor to the YouTube page.

## Installing from pre-built zip archive

To install the YouTube Enhancer Extension from the latest release, follow these steps:

1. Visit the [Latest Release Page](https://github.com/VampireChicken12/youtube-enhancer/releases/latest).

2. Download the pre-built zip archive for your preferred browser.

3. Extract the contents of the zip archive to a directory of your choice.

4. Depending on your browser, follow these steps:

   - **Google Chrome, Microsoft Edge, Brave:**

     - Open your browser and go to `chrome://extensions/` (or `edge://extensions/` for Edge, `brave://extensions/` for Brave).
     - Enable 'Developer mode'.
     - Click 'Load unpacked' and select the extracted directory.

   - **Mozilla Firefox:**
     - Open Firefox and go to `about:debugging#/runtime/this-firefox`.
     - Click on 'Load Temporary Add-on' and select any file in the extracted directory.

5. Test the extension on YouTube to ensure it functions as expected.

That's it! You've successfully installed the YouTube Enhancer Extension from the latest release.

## 🛠️ Building the Extension

To build the YouTube Enhancer extension from scratch, follow these steps. We'll start with installing the necessary dependencies:

### 1. Install Required Software

Before you begin, ensure you have the following software installed on your system:

- **Node.js and npm:** If you don't have Node.js and npm (Node Package Manager) installed, you can download and install them from the official website: [Node.js Downloads](https://nodejs.org/en/download/).

- **Git:** If you don't have Git installed, download and install it from [Git Downloads](https://git-scm.com/downloads).

### 2. Clone the Repository

Next, open your terminal (command prompt or shell) and navigate to the directory where you want to store the YouTube Enhancer extension project. Run the following command to clone the repository:

```bash
git clone https://github.com/YouTube-Enhancer/extension.git
```

### 3. Navigate to the Project Directory

Change your working directory to the project folder:

```bash
cd youtube-enhancer
```

### 4. Install Project Dependencies

Inside the project folder, run the following command to install the required dependencies:

```bash
npm install
```

### 5. Build the Extension

After the installation is complete, build the extension using the following command:

```bash
npm run build
```

This command will bundle the extension's code and assets into a 'dist' directory.

### 6. Loading the Extension from the 'dist' Folder

After building the extension, you can load it into your browser for testing. Follow these steps:

Depending on your browser, follow these steps:

- **Google Chrome, Microsoft Edge, Brave:**

  - Open your browser and go to `chrome://extensions/` (or `edge://extensions/` for Edge, `brave://extensions/` for Brave).
  - Enable 'Developer mode'.
  - Click 'Load unpacked' and select the 'dist/Chrome' directory.

- **Mozilla Firefox:**
  - Open Firefox and go to `about:debugging#/runtime/this-firefox`.
  - Click on 'Load Temporary Add-on' and select any file in the 'dist/Firefox" directory.

### 7. Test the Extension

Your extension should now be loaded. Test it on YouTube to ensure it functions as expected.

That's it! You've successfully built the YouTube Enhancer extension from scratch.

## ⚙ Configuration

The extension provides a range of configuration options to tailor your YouTube experience to your liking. Simply access the extension's settings page to customize its behavior.

## 🔧 Usage

Using the YouTube Enhancer Extension is straightforward:

1. Ensure the extension is installed and the icon is visible in your browser's toolbar.

2. Click on the extension icon to access its features and settings.

3. Configure the extension according to your preferences. Adjust settings related to volume control, on-screen displays, video quality, playback speed, volume boost, and more.

4. Save your changes to apply them to your YouTube experience.

5. Enjoy an enhanced YouTube experience with the extension's features working seamlessly in the background.

## 📝 Contributing

Contributions to the YouTube Enhancer Extension are welcome! If you'd like to contribute to the development of this extension or report issues, please refer to the project's GitHub repository.

## 🤝 Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://hioctane.org"><img src="https://avatars.githubusercontent.com/u/46955469?v=4?s=100" width="100px;" alt="mist8kengas"/><br /><sub><b>mist8kengas</b></sub></a><br /><a href="#translation-mist8kengas" title="Translation">🌍</a> <a href="#code-mist8kengas" title="Code">💻</a> <a href="#bug-mist8kengas" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://hikari-bot.com"><img src="https://avatars.githubusercontent.com/u/45531575?v=4?s=100" width="100px;" alt="Nathan"/><br /><sub><b>Nathan</b></sub></a><br /><a href="#design-VampireChicken12" title="Design">🎨</a> <a href="#code-VampireChicken12" title="Code">💻</a> <a href="#translation-VampireChicken12" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/commonly-ts"><img src="https://avatars.githubusercontent.com/u/51011212?v=4?s=100" width="100px;" alt="Commonly"/><br /><sub><b>Commonly</b></sub></a><br /><a href="#bug-commonly-ts" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://eduardozgz.com"><img src="https://avatars.githubusercontent.com/u/30407412?v=4?s=100" width="100px;" alt="Eduardo Aznar"/><br /><sub><b>Eduardo Aznar</b></sub></a><br /><a href="#translation-eduardozgz" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/lamyergeier"><img src="https://avatars.githubusercontent.com/u/42092626?v=4?s=100" width="100px;" alt="Lamyergeier"/><br /><sub><b>Lamyergeier</b></sub></a><br /><a href="#ideas-lamyergeier" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/SleepyPrince"><img src="https://avatars.githubusercontent.com/u/670216?v=4?s=100" width="100px;" alt="Jackal Chan"/><br /><sub><b>Jackal Chan</b></sub></a><br /><a href="#translation-SleepyPrince" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://livingflore.me"><img src="https://avatars.githubusercontent.com/u/63370734?v=4?s=100" width="100px;" alt="livingflore"/><br /><sub><b>livingflore</b></sub></a><br /><a href="#translation-livingflore" title="Translation">🌍</a> <a href="#code-livingflore" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/crvt7"><img src="https://avatars.githubusercontent.com/u/79649679?v=4?s=100" width="100px;" alt="Patryk Popardowski"/><br /><sub><b>Patryk Popardowski</b></sub></a><br /><a href="#translation-crvt7" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/luisaosan"><img src="https://avatars.githubusercontent.com/u/48157083?v=4?s=100" width="100px;" alt="Luis Felipe"/><br /><sub><b>Luis Felipe</b></sub></a><br /><a href="#translation-luisaosan" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://nosesisaid.com"><img src="https://avatars.githubusercontent.com/u/74506415?v=4?s=100" width="100px;" alt="Vic"/><br /><sub><b>Vic</b></sub></a><br /><a href="#translation-v1ctorio" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/rado84-github"><img src="https://avatars.githubusercontent.com/u/41172201?v=4?s=100" width="100px;" alt="rado84"/><br /><sub><b>rado84</b></sub></a><br /><a href="#bug-rado84-github" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/pulsar2105"><img src="https://avatars.githubusercontent.com/u/54115653?v=4?s=100" width="100px;" alt="pulsar2105"/><br /><sub><b>pulsar2105</b></sub></a><br /><a href="#translation-pulsar2105" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/G-Ran-Berg"><img src="https://avatars.githubusercontent.com/u/12037193?v=4?s=100" width="100px;" alt="Granberg"/><br /><sub><b>Granberg</b></sub></a><br /><a href="#translation-G-Ran-Berg" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Secret-Peter"><img src="https://avatars.githubusercontent.com/u/166921574?v=4?s=100" width="100px;" alt="Secret-Peter"/><br /><sub><b>Secret-Peter</b></sub></a><br /><a href="#translation-Secret-Peter" title="Translation">🌍</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/szaumoor"><img src="https://avatars.githubusercontent.com/u/78204388?v=4?s=100" width="100px;" alt="Marcos C.R."/><br /><sub><b>Marcos C.R.</b></sub></a><br /><a href="#ideas-szaumoor" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/charlymoon741"><img src="https://avatars.githubusercontent.com/u/62484941?v=4?s=100" width="100px;" alt="Carlos Ramos Luna"/><br /><sub><b>Carlos Ramos Luna</b></sub></a><br /><a href="#ideas-charlymoon741" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Angsimosaurus"><img src="https://avatars.githubusercontent.com/u/79510039?v=4?s=100" width="100px;" alt="앙시모사우루스"/><br /><sub><b>앙시모사우루스</b></sub></a><br /><a href="#translation-Angsimosaurus" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Mabra51"><img src="https://avatars.githubusercontent.com/u/12016338?v=4?s=100" width="100px;" alt="Mabra51"/><br /><sub><b>Mabra51</b></sub></a><br /><a href="#ideas-Mabra51" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://eduardozgz.com"><img src="https://avatars.githubusercontent.com/u/30407412?v=4?s=100" width="100px;" alt="Eduardo Aznar"/><br /><sub><b>Eduardo Aznar</b></sub></a><br /><a href="#translation-eduardozgz" title="Translation">🌍</a> <a href="#code-eduardozgz" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://notyasho.netlify.app/blogs"><img src="https://avatars.githubusercontent.com/u/90166733?v=4?s=100" width="100px;" alt="pyrix"/><br /><sub><b>pyrix</b></sub></a><br /><a href="#ideas-at-pyrix" title="Ideas, Planning, & Feedback">🤔</a> <a href="#design-at-pyrix" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/CaiCheng-Li"><img src="https://avatars.githubusercontent.com/u/150627108?v=4?s=100" width="100px;" alt="CaiCheng-Li"/><br /><sub><b>CaiCheng-Li</b></sub></a><br /><a href="#bug-CaiCheng-Li" title="Bug reports">🐛</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://sites.google.com/u/0/d/1OdIAWachs1svsjOS4lT9jqwlE632B6rP"><img src="https://avatars.githubusercontent.com/u/121247693?v=4?s=100" width="100px;" alt="Lexiosity"/><br /><sub><b>Lexiosity</b></sub></a><br /><a href="#bug-Lexiosity" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/HelloIamarandomperson"><img src="https://avatars.githubusercontent.com/u/136181387?v=4?s=100" width="100px;" alt="HelloIamarandomperson"/><br /><sub><b>HelloIamarandomperson</b></sub></a><br /><a href="#code-HelloIamarandomperson" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## 🌐 Internationalization (i18n)

### Crowdin Translation Project

Our YouTube Enhancer extension supports multiple languages to provide a more inclusive experience for users around the world. We use Crowdin for managing translations.

### Contributing Translations

We welcome contributions to improve translations and make the extension accessible to a wider audience. If you'd like to contribute translations or suggest improvements, follow these steps:

1. Visit our [Crowdin project](https://crowdin.com/project/youtube-enhancer).
2. Select your language and start translating.
3. If your language is not listed, feel free to request its addition.

## 📜 License

The YouTube Enhancer Extension is open-source and available under the [MIT License](LICENSE). Feel free to explore, modify, and share it as needed.

![Alt](https://repobeats.axiom.co/api/embed/262a11c40b9db9e119db0a64a23049ead4eaed96.svg "Repobeats analytics image")

## 🌟 Star History

<a href="https://star-history.com/#VampireChicken12/youtube-enhancer&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=VampireChicken12/youtube-enhancer&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=VampireChicken12/youtube-enhancer&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=VampireChicken12/youtube-enhancer&type=Date" />
  </picture>
</a>
