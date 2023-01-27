import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as AzureApis from "azure-devops-node-api";
import * as GitApi from "azure-devops-node-api/GitApi";
import * as GitInterfaces from "azure-devops-node-api/interfaces/GitInterfaces";
import * as dotenv from "dotenv";
import * as utils from "../utilities";

import ChangeBot from "./changebot";

dotenv.config();

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  const organization = req.body.resource.organization.id;
  const repository = req.body.resource.repository.id;
  const project = req.body.resource.repository.project.id;
  const pullRequestId = req.body.resource.pullRequestId;

  const webApi: AzureApis.WebApi = await utils.getWebApi(
    `https://dev.azure.com/${organization}`
  );
  const gitApi: GitApi.IGitApi = await webApi.getGitApi();

  const pullRequest: GitInterfaces.GitPullRequest = await gitApi.getPullRequest(
    repository,
    pullRequestId,
    project,
    undefined,
    undefined,
    undefined,
    true
  );

  const bot = new ChangeBot(gitApi, pullRequest, utils.getEnv("API_TOKEN"));

  const res = await bot.check();

  context.res = {
    status: res.passed,
    body: res.threads,
  };
};

export default httpTrigger;
