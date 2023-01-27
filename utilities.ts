import * as az from "azure-devops-node-api";
import * as location from "azure-devops-node-api/interfaces/LocationsInterfaces";
import mdastToString from "mdast-util-to-string";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import unified from "unified";

/**
 * Get a variable from the environment. Will exit the program if not found.
 *
 * @param name env var name
 * @returns value of env var
 */
export function getEnv(name: string) {
  const val = process.env[name];
  if (!val) {
    console.error(`${name} env var not set`);
    process.exit(1);
  }
  return val;
}

/**
 * Get an Azure Web Api instance
 *
 * @param baseUrl api url
 * @returns Azure WebApi instance
 */
export async function getWebApi(baseUrl?: string): Promise<az.WebApi> {
  baseUrl = baseUrl || getEnv("API_URL");
  return await this.getApi(baseUrl);
}

/**
 * Get the api instance Azure WebApi
 *
 * @param baseUrl base url of the api
 * @returns Azure WebApi instance
 */
export async function getApi(baseUrl: string): Promise<az.WebApi> {
  return new Promise<az.WebApi>(async (resolve, reject) => {
    try {
      const token = getEnv("API_TOKEN");
      const authHandler = az.getPersonalAccessTokenHandler(token);

      const vsts: az.WebApi = new az.WebApi(baseUrl, authHandler);
      const connectionData: location.ConnectionData = await vsts.connect();

      resolve(vsts);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Semantic "Bump" Versions
 */
export const ChangesetBumpLevels = {
  dep: 0,
  patch: 1,
  minor: 2,
  major: 3,
} as const;

/**
 * Get the changelog entry for the given verison of the package.
 *
 * @param changelog changelog content to parse through
 * @param version version to get entry for
 * @returns changelog entry for the given version
 */
export async function getChangelogEntry(changelog: string, version: string) {
  let ast = unified().use(remarkParse).parse(changelog);

  let highestLevel: number = ChangesetBumpLevels.dep;

  // @ts-ignore
  let nodes = ast.children as Array<any>;
  let headingStartInfo:
    | {
        index: number;
        depth: number;
      }
    | undefined;
  let endIndex: number | undefined;

  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    if (node.type === "heading") {
      let stringified: string = mdastToString(node);
      let match = stringified.toLowerCase().match(/(major|minor|patch)/);
      if (match !== null) {
        let level =
          ChangesetBumpLevels[match[0] as "major" | "minor" | "patch"];
        highestLevel = Math.max(level, highestLevel);
      }
      if (headingStartInfo === undefined && stringified === version) {
        headingStartInfo = {
          index: i,
          depth: node.depth,
        };
        continue;
      }
      if (
        endIndex === undefined &&
        headingStartInfo !== undefined &&
        headingStartInfo.depth === node.depth
      ) {
        endIndex = i;
        break;
      }
    }
  }
  if (headingStartInfo) {
    // @ts-ignore
    ast.children = (ast.children as any).slice(
      headingStartInfo.index + 1,
      endIndex
    );
  }
  return {
    content: unified().use(remarkStringify).stringify(ast),
    highestLevel: highestLevel,
  };
}
