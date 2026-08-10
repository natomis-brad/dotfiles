# 🚨ATTENTION: Big changes are here in C# Dev Kit!

With this latest pre-release, we’ve simplified what it means to get started with C# in VS Code and consolidated available views to make it easier to understand your repos and workspace.

## A clearer way to understand your workspace

We’ve consolidated C# Dev Kit’s Solution Explorer view with VS Code’s Explorer to ensure one primary way to navigate and understand your files and folders. Moving forward, VS Code’s Explorer should be used to see and work with files and folders on disk, and the newly named “C# Project Details” should be used to view virtual project details like Dependencies, Packages, linked files, and more.

If you **weren’t** using the Solution Explorer view before... this change should feel seamless and you can continue working as you were before.

If you **were** using the Solution Explorer view before...

1. Context menu items that were previously exclusive to the Solution Explorer have been migrated to VS Code’s Explorer. Right-click on a folder that contains a C# project or on a `.csproj` file to perform common C# commands, without needing to switch to a different view.
   ![New Context Menu](../media/NewContextMenu.png)
1. The “Solution Explorer” view has effectively been renamed to “C# Project Details” and now focuses on viewing virtual details such as Dependencies, Packages, linked files, etc.

## Getting started should just work

Alongside this consolidation, we’ve also simplified what it takes to start working with C# in VS Code.

-   **Open a folder with no solution file?** Things should just work. If the folder contains a C# project, you can start coding without creating or selecting a solution.

    -   When you are working in this mode, you will see `C# Workspace Dev Mode` in the status bar.

        ![C# Dev Mode Status Bar2](./CSharpDevModeStatusBar.png)

-   **Open a folder with exactly one solution?** We’ll automatically open it for you. No prompt, no extra step.

    -   The solution opened will be in the status bar.

        ![Solution Opened Status Bar](./SolOpenedStatusBar.png)

-   **Open a workspace with multiple solutions?** You’ll need to pick the one you want to work with. This makes the choice explicit and avoids ambiguity about which projects, dependencies, and tooling context you’re in.

    -   The solution opened will be in the status bar.
    -   To switch solutions, simply click the button in the status bar and select the solution you want to work with from the dropdown list.

        ![Switch Solution Status Bar](./SwitchSolutionStatusBar.png)

        ![Multi Solution Selection](./MultiSolutionSelection.png)

    -   If you often work with one solution in this scenario, you can set the dotnet.defaultSolution setting to the path of your preferred solution. Once configured, C# Dev Kit will automatically open that solution for you each time you open the workspace.

## What we need from you -> feedback!

We’re eager to roll this experience out to our stable build so we’d love your feedback in the [C# Dev Kit Repo](https://github.com/microsoft/vscode-dotnettools/issues) and letting us know if you are experiencing any bugs or are missing anything you’d like to see in the C# Project Details view!
