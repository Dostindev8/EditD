import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";
import { IsolationService } from "./isolation.service.js";
import type { CacheService } from "../cache/cache.service.js";

describe("IsolationService", () => {
  const workspaceId = new Types.ObjectId().toHexString();
  const projectId = new Types.ObjectId().toHexString();
  const userId = "user-1";

  const workspaces = {
    findOne: jest.fn(),
  };
  const projects = {
    findOne: jest.fn(),
  };
  const cache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  } as unknown as CacheService;

  const service = new IsolationService(
    workspaces as never,
    projects as never,
    cache,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (cache.get as jest.Mock).mockResolvedValue(null);
  });

  it("throws ForbiddenException when user is not a workspace member", async () => {
    workspaces.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
    await expect(service.assertWorkspaceMember(userId, workspaceId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("does not expose a project that belongs to another workspace", async () => {
    workspaces.findOne.mockReturnValue({
      lean: () => Promise.resolve({ _id: workspaceId, members: [{ userId, role: "owner" }] }),
    });
    projects.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
    await expect(
      service.getProjectInWorkspace(userId, workspaceId, projectId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
