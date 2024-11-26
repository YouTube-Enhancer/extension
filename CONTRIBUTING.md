# Contributing

## Table of Contents

- [Glossary](#📚-glossary)
- [Getting Started](#🎉-getting-started)
- [Commits, Issues, and Pull Requests](#✏-commits-issues-and-pull-requests)
- [Contributor Workflow](#🗃-contributor-workflow)
- [Internationalization](#🌐-internationalization-i18n)
- [Code Quality](#🔧-code-quality)

## 📚 Glossary

Here are some terms that we interchangeably refer to in this document:

- **Pull Request** (PR): Pull requests let you tell others about changes you've pushed to a branch in the repository. Once a pull request is opened, you can discuss and review the potential changes with collaborators and add follow-up commits before your changes are merged into the base branch.
- **Continuous Integration** (CI): A development practice where developers frequently integrate their code changes into a shared repository. Each integration triggers automated tests to ensure that the new code doesn't break existing functionality. CI aims to detect and fix integration errors quickly, promoting collaboration and maintaining a consistent codebase.
- **Continuous Development** (CD): An extension of Continuous Integration (CI) that focuses on automating the deployment of code changes to the production environment.

## 🎉 Getting Started

- Because our release CI/CD workflow is automated, we rely on commit messages that follow a format convention for semantic versioning[^1].
  As such, we use the [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) spec in commit messages.

## ✏ Commits, Issues, and Pull Requests

There are a few guidelines that we follow in order to maintain the quality of the codebase:

- Make sure that commit messages are meaningful, and describe the commit itself.
- When creating [Bug Report Issues](https://github.com/YouTube-Enhancer/extension/issues/new?assignees=&labels=&projects=&template=bug_report.md&title=), make sure to follow the template and explain the issue in a clear and straightforward manner.
- Although we do not strictly enforce the [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) spec in pull requests, it is preferred over other ways of creating PR titles.
- In the description of the pull request, briefly describe the goal of the PR and the changes it will bring to the codebase.

## 🗃 Contributor Workflow

We use the "contributor workflow" to manage the code. Everyone suggests changes by making pull requests. This helps people contribute, make tests easier, and get feedback from others.

To contribute to the codebase, the workflow is as follows:

1. Fork the repository
2. Commit changes to the fork (using the `dev` branch)
3. Create a pull request (on the `dev` branch)

_It is ill-advised to create pull requests against the `main` branch as `dev` changes are merged to the main branch in batches by the core maintainers._

> Read more about forking and making pull requests [here](https://docs.github.com/get-started/exploring-projects-on-github/contributing-to-a-project).

## 🌐 Internationalization (i18n)

### Crowdin Translation Project

Our YouTube Enhancer extension supports multiple languages to provide a more inclusive experience for users around the world. We use Crowdin for managing translations.

### Contributing Translations

We welcome contributions to improve translations and make the extension accessible to a wider audience. If you'd like to contribute translations or suggest improvements, follow these steps:

1. Visit our [Crowdin project](https://crowdin.com/project/youtube-enhancer).
2. Select your language and start translating.
3. If your language is not listed, feel free to request its addition.

## 🔧 Code Quality

Before new code gets merged into the repository, we do automated lint tests to verify the format of the code.

It is recommended to test your code before committing by running the following commands:

1. Lint check: `npm run lint`
2. Fix lint errors: `npm run lint:fix`

> You won't need to do this if you use a supported editor[^2], as the process is automated.

While we don't yet have a strict guideline on what kind of code should be in the repository, here are a few principles we loosely follow to maintain the general consistency of the code:

- [DRY principle](https://en.wikipedia.org/wiki/Don't_repeat_yourself)
- [Rule of three](<https://en.wikipedia.org/wiki/Rule_of_three_(computer_programming)>)
- [Single source of truth](https://en.wikipedia.org/wiki/Single_source_of_truth)

---

[^1]: [Why Use Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#why-use-conventional-commits)

[^2]: [ESLint: A List of Editor Integrations](https://eslint.org/docs/latest/use/integrations#editors)
