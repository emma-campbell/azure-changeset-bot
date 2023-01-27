import { GitPullRequest } from "azure-devops-node-api/interfaces/GitInterfaces";
import { join } from "path";
import simpleGit, { SimpleGit } from "simple-git";

/**
 * Wrapper class for [SimpleGit](https://github.com/steveukx/git-js), mainly just to make sure
 * all operations are authenticated properly.
 */
export class GitManager {
  private _dir: string;
  private git: SimpleGit;
  private branch: string;
  private auth?: string;
  private url: string;
  private pr: GitPullRequest;

  constructor(auth?: any) {
    this.auth = auth;
  }

  public get dir(): string {
    return this._dir;
  }

  public set dir(value: string) {
    this._dir = value;
  }

  public async initialize(pr: GitPullRequest) {
    this.pr = pr;

    // put our token creds into the url to get access
    this.url = this.pr.repository.webUrl.replace("dev", `${this.auth}@dev`);
    this.dir = join(process.cwd(), this.pr.repository.name);

    this.git = simpleGit({
      binary: "git",
      config: [
        `http.extraHeaders="Authorization: Basic ${Buffer.from(
          `:${this.auth}`
        ).toString("base64")}"`,
        `credential.helper=`,
      ],
    });

    await this.git.clone(this.url);

    // I have to call the factory again, because I cannot figure
    // out a way to override the `baseDir` value.
    this.git = simpleGit({
      binary: "git",
      config: [
        `http.extraHeaders="Authorization: Basic ${Buffer.from(
          `:${this.auth}`
        ).toString("base64")}"`,
        `credential.helper=`,
      ],
      baseDir: this._dir,
    });

    // set our name and password to changebot
    await this.git.addConfig("user.name", "changebot");
    await this.git.addConfig("user.email", "dev@hugo.health");
  }

  /**
   * Checks out the branch associated with the PR passed to the inialize function.
   *
   * @returns response of git checkout operation, as a string.
   */
  public async checkout() {
    this.branch = this.pr.sourceRefName.replace("refs/heads/", "");
    await this.git.fetch("origin", this.branch);
    return await this.git.checkout(this.branch);
  }

  /**
   * Add files to the git index
   *
   * @param files files to add to git index
   * @returns result of git add operations, as a string.
   */
  public async add(files: string[]) {
    return await this.git.add(files);
  }

  /**
   * Commit the staged changes
   *
   * @param message message to associate with commit
   * @returns commit result
   */
  public async commit(message: string) {
    await this.git.pull("origin", this.branch);
    return await this.git.commit(message);
  }

  /**
   * Push committed changes
   *
   * @returns push result
   */
  public async push() {
    // push changes, store results
    return await this.git.push("origin", this.branch);
  }
}
