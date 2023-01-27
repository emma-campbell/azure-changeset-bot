# azure-changeset-bot

Changebot is an Azure implementation of [changesets/action](https://github.com/changesets/action).

## Running Locally

Running the locally is a little different than the typical run flow since we need to set up the Azure Functions host.

Prerequisites on MacOs are Homebrew and VSCode.

#### 1. Install Azure Functions Core Tools

```sh
brew tap azure/functions && brew install azure-functions-core-tools@4
```

#### 2. Install the Azure Functions VSCode Extension

Use the install button [here](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurefunctions) to install the extension, or type "Azure Functions" into the extension search bar in visual studio code and install from there.

#### 3. Clone the Repository

```sh
git clone https://dev.azure.com/HugoHealth/Tools/_git/azure-changeset-bot
```

#### 4. Install the Dependencies

```sh
yarn
```

#### 5. Open the Project in VSCode

Open the Project in VSCode. You should see an Azure logo on your toolbar, since you previously installed the extension. Click that and log in, if need be.

Otherwise, you should see a folder that says Local Project. Expand that, and then expand the "Functions" item. You should then see the function "changeset-check".


#### 6. Start the Functions Host

In VSCode, open the command palette (`CMD+SHIFT+P` on MacOs) and type Run Task. Select that option, and then run the task `func host start`.

#### 7. Start the Watch Server

In a separate terminal, run `yarn watch`. 


#### 8. Run the Function

Take a look at the sample data in `changeset-check/sample.dat`. This represents a payload that Azure will send to the function when a PR is created or updated.

To test the function, create a "dummy" pull request and replace all the information in the `sample.dat` json with the relevant information from your pull request.

Once you have that written down, and have followed the steps to get the functions host and watch server running, open the Azure Functions extension and right-click on `changeset-check`, then press "Execute Now". VSCode will prompt your for the request body, so paste in the JSON you just created for your pull request.

If all goes according to plan, you should see new comments (and possibly commits) appear on the Pull Request.