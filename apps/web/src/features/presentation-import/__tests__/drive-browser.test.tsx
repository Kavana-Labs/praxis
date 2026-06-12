import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GoogleDriveBrowser } from "../components/GoogleDriveBrowser";
import { GoogleAuthExpiredError } from "../services/googleSlides";

/**
 * Praxis Drive browser component: listing, search, selection, paging, and
 * the expired-token reconnect path — with the Drive service mocked.
 */

vi.mock("../services/googleSlides", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/googleSlides")>();
  return { ...actual, listSlidesPresentations: vi.fn() };
});

import { listSlidesPresentations } from "../services/googleSlides";

const mockList = vi.mocked(listSlidesPresentations);

const FILES = [
  {
    id: "f1",
    name: "Wave Optics Review",
    modifiedTime: "2026-06-01T10:00:00Z",
    owner: "Desmond",
  },
  { id: "f2", name: "Lab Safety Briefing" },
];

beforeEach(() => {
  mockList.mockReset();
});

describe("GoogleDriveBrowser", () => {
  it("lists presentations and reports a selection", async () => {
    mockList.mockResolvedValue({ files: FILES, nextPageToken: undefined });
    const onSelect = vi.fn();
    render(
      <GoogleDriveBrowser
        accessToken="tok"
        onSelect={onSelect}
        onReconnect={vi.fn()}
      />,
    );

    await screen.findByText("Wave Optics Review");
    expect(mockList).toHaveBeenCalledWith("tok", { query: undefined });

    fireEvent.click(screen.getByText("Wave Optics Review"));
    expect(onSelect).toHaveBeenCalledWith({
      fileId: "f1",
      fileName: "Wave Optics Review",
    });
  });

  it("debounces search queries into Drive list calls", async () => {
    mockList.mockResolvedValue({ files: [], nextPageToken: undefined });
    render(
      <GoogleDriveBrowser
        accessToken="tok"
        onSelect={vi.fn()}
        onReconnect={vi.fn()}
      />,
    );
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));

    fireEvent.change(
      screen.getByLabelText(/search your google slides/i),
      { target: { value: "optics" } },
    );
    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith("tok", { query: "optics" }),
    );
    await screen.findByText(/no presentations found for/i);
  });

  it("loads the next page on demand", async () => {
    mockList
      .mockResolvedValueOnce({ files: [FILES[0]], nextPageToken: "p2" })
      .mockResolvedValueOnce({ files: [FILES[1]], nextPageToken: undefined });
    render(
      <GoogleDriveBrowser
        accessToken="tok"
        onSelect={vi.fn()}
        onReconnect={vi.fn()}
      />,
    );
    await screen.findByText("Wave Optics Review");
    fireEvent.click(screen.getByText("Load more"));
    await screen.findByText("Lab Safety Briefing");
    expect(mockList).toHaveBeenLastCalledWith("tok", {
      query: undefined,
      pageToken: "p2",
    });
    expect(screen.queryByText("Load more")).toBeNull();
  });

  it("offers reconnect when the token has expired", async () => {
    mockList.mockRejectedValue(new GoogleAuthExpiredError());
    const onReconnect = vi.fn();
    render(
      <GoogleDriveBrowser
        accessToken="expired"
        onSelect={vi.fn()}
        onReconnect={onReconnect}
      />,
    );
    await screen.findByText(/session expired/i);
    fireEvent.click(screen.getByRole("button", { name: /reconnect google drive/i }));
    expect(onReconnect).toHaveBeenCalled();
  });

  it("offers retry on transient errors", async () => {
    mockList
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ files: FILES, nextPageToken: undefined });
    render(
      <GoogleDriveBrowser
        accessToken="tok"
        onSelect={vi.fn()}
        onReconnect={vi.fn()}
      />,
    );
    await screen.findByText(/could not list your presentations/i);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await screen.findByText("Wave Optics Review");
  });
});
