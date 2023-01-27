import { IGitApi } from "azure-devops-node-api/GitApi";
import {
  Comment,
  CommentThreadStatus,
  CommentType,
  GitPullRequest,
  GitPullRequestCommentThread,
} from "azure-devops-node-api/interfaces/GitInterfaces";

export default class ThreadManager {
  private api: IGitApi;
  private pr: GitPullRequest;

  constructor(api: IGitApi, pr: GitPullRequest) {
    this.api = api;
    this.pr = pr;
  }

  /**
   * Create a new thread if a thread matching `predicate` doesn't exist, otherwise, update
   * the existing thread
   *
   * @param content comment text
   * @param predicate predicate to match thread against
   * @returns the resulting thread object (whether modified or new)
   */
  public async upsertThread(
    content: string,
    predicate?: (t: GitPullRequestCommentThread) => boolean
  ) {
    // get all active threads
    const activeThreads = await this.getThreads(
      (t) => t.status === CommentThreadStatus.Active
    );

    let thread: GitPullRequestCommentThread;

    if (activeThreads.length == 0) {
      const comment = <Comment>{
        content: content,
        commentType: CommentType.Text,
        parentCommentId: 0,
      };

      thread = await this.createThread({
        comments: [comment],
        status: content.includes("✅")
          ? CommentThreadStatus.Closed
          : CommentThreadStatus.Active,
      });

      return thread;
    } else {
      // find the existing thread
      thread = await this.getThread(predicate, activeThreads);

      if (thread != null) {
        // post the comment
        await this.postComment(thread, content);

        // if the comment is a passed, set status to closed.
        if (content.includes("✅")) {
          await this.setThreadStatus(thread, CommentThreadStatus.Closed);
        }
      } else {
        thread = await this.createThread({
          status: content.includes("✅")
            ? CommentThreadStatus.Closed
            : CommentThreadStatus.Active,
          comments: [
            {
              commentType: CommentType.Text,
              content: content,
              parentCommentId: 0,
            },
          ],
        });
      }

      return await this.getThread((t) => t.id === thread.id);
    }
  }

  /**
   * Get a thread matching the given predicate
   *
   * @param predicate predicate to match thread against
   * @param threads optional list of threads to match from
   * @returns the thread, if found
   */
  public async getThread(
    predicate?: (t: GitPullRequestCommentThread) => boolean,
    threads?: GitPullRequestCommentThread[]
  ): Promise<GitPullRequestCommentThread | undefined> {
    if (threads) {
      const thread = threads.find((t) => predicate(t));
      return thread;
    } else {
      const thread = (await this.getThreads()).find((t) => predicate(t));
      return thread;
    }
  }

  /**
   * Get threads of a given pull request.
   *
   * @param predicate optional filtering mechanism for threads (i.e. t => t.status === GitInterfaces.CommentThreadStatus.Active)
   * @returns list of threads optionally matching the predicate
   */
  public async getThreads(
    predicate?: (thread: GitPullRequestCommentThread) => boolean
  ) {
    const threads = await this.api.getThreads(
      this.pr.repository.id,
      this.pr.pullRequestId,
      this.pr.repository.project.id
    );

    if (predicate) {
      return threads.filter((t) => predicate(t));
    } else {
      return threads;
    }
  }

  public async createThread(options: Partial<GitPullRequestCommentThread>) {
    return await this.api.createThread(
      options,
      this.pr.repository.id,
      this.pr.pullRequestId,
      this.pr.repository.project.id
    );
  }

  /**
   * Get the last comment in thread
   *
   * @param thread thread to get last comment of
   * @returns last comment in thread
   */
  public getLastComment(
    thread: GitPullRequestCommentThread
  ): Comment | undefined {
    try {
      return thread.comments[thread.comments.length - 1];
    } catch (e) {
      return undefined;
    }
  }

  /**
   * Find a comment within a thread that matches the given predicate
   *
   * @param threads thread to find comment in
   * @param predicate predicate to filter for comment matching
   * @returns comment matching the given predicate
   */
  public findComment(
    threads: GitPullRequestCommentThread[],
    predicate?: (comment: Comment) => boolean
  ) {
    return threads.find((f) => predicate(f));
  }

  /**
   * Post a new comment to a thread
   *
   * @param pr pull request thread exists on
   * @param thread thread to add new comment to
   * @param content content to post as comment
   */
  public async postComment(
    thread: GitPullRequestCommentThread,
    content: string
  ) {
    const parent: Comment | undefined = this.getLastComment(thread);
    let id: number;
    if (parent) {
      id = parent?.id;
    } else {
      id = 0;
    }

    await this.api.createComment(
      <Comment>{
        parentCommentId: id,
        content: content,
        commentType: CommentType.Text,
      },
      this.pr.repository.id,
      this.pr.pullRequestId,
      thread.id,
      this.pr.repository.project.id
    );
  }

  /**
   * Set the status of a given thread
   *
   * @param thread thread to set status of
   * @param status status to set thread to
   */
  public async setThreadStatus(
    thread: GitPullRequestCommentThread,
    status: CommentThreadStatus
  ) {
    await this.api.updateThread(
      {
        status: status,
      },
      this.pr.repository.id,
      this.pr.pullRequestId,
      thread.id,
      this.pr.repository.project.id
    );
  }
}
