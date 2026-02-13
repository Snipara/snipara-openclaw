import { describe, it, expect, vi, beforeEach } from "vitest";
import { SniparaClient } from "../src/client";

describe("SniparaClient", () => {
  let client: SniparaClient;

  beforeEach(() => {
    client = new SniparaClient({
      apiKey: "rlm_test_key",
      projectSlug: "test-project",
    });
  });

  describe("constructor", () => {
    it("should create a client with valid config", () => {
      expect(client).toBeDefined();
    });

    it("should throw if apiKey is missing", () => {
      expect(() => {
        new SniparaClient({
          apiKey: "",
          projectSlug: "test",
        });
      }).toThrow("apiKey is required");
    });

    it("should throw if projectSlug is missing", () => {
      expect(() => {
        new SniparaClient({
          apiKey: "rlm_test",
          projectSlug: "",
        });
      }).toThrow("projectSlug is required");
    });
  });

  describe("API methods", () => {
    beforeEach(() => {
      // Mock fetch for all API tests
      global.fetch = vi.fn();
    });

    it("should call remember with correct parameters", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: { memoryId: "mem_123", success: true },
        }),
      });

      const result = await client.remember("Test memory", { type: "fact" });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.snipara.com/mcp/test-project",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-API-Key": "rlm_test_key",
          }),
        })
      );
      expect(result.memoryId).toBe("mem_123");
    });

    it("should call recall with correct parameters", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: {
            memories: [
              { id: "mem_1", content: "Test", relevance: 0.9 },
            ],
          },
        }),
      });

      const result = await client.recall("test query");

      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].content).toBe("Test");
    });

    it("should call contextQuery with correct parameters", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: {
            sections: [
              { title: "Test Section", content: "Test content" },
            ],
            totalTokens: 100,
          },
        }),
      });

      const result = await client.contextQuery("how does X work?");

      expect(result.sections).toHaveLength(1);
      expect(result.totalTokens).toBe(100);
    });

    it("should call executePython with correct parameters", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: {
            output: "Hello World",
            result: null,
            error: null,
          },
        }),
      });

      const result = await client.executePython("print('Hello World')");

      expect(result.output).toBe("Hello World");
      expect(result.error).toBeNull();
    });

    it("should handle API errors", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      await expect(client.remember("Test", {})).rejects.toThrow("API error: 401 Unauthorized");
    });

    it("should handle JSON-RPC errors", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          error: {
            code: -32000,
            message: "Internal error",
          },
        }),
      });

      await expect(client.remember("Test", {})).rejects.toThrow("Internal error");
    });
  });
});

describe("SniparaClient swarm methods", () => {
  let client: SniparaClient;

  beforeEach(() => {
    client = new SniparaClient({
      apiKey: "rlm_test_key",
      projectSlug: "test-project",
    });
    global.fetch = vi.fn();
  });

  it("should create a swarm", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        result: { swarmId: "swarm_123", name: "test-swarm" },
      }),
    });

    const result = await client.createSwarm("test-swarm");

    expect(result.swarmId).toBe("swarm_123");
    expect(result.name).toBe("test-swarm");
  });

  it("should join a swarm", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        result: { joined: true, role: "worker" },
      }),
    });

    const result = await client.joinSwarm("swarm_123", "agent-1");

    expect(result.joined).toBe(true);
    expect(result.role).toBe("worker");
  });

  it("should claim a resource", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        result: { claimId: "claim_123", success: true },
      }),
    });

    const result = await client.claim("swarm_123", "agent-1", {
      resourceType: "file",
      resourceId: "src/auth.ts",
    });

    expect(result.claimId).toBe("claim_123");
    expect(result.success).toBe(true);
  });
});
