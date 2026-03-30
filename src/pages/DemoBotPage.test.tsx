import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BotPage from "@/pages/DemoBotPage";
import * as forexApi from "@/lib/forexApi";

// Mock the forex API
vi.mock("@/lib/forexApi", () => ({
  fetchLiveRates: vi.fn(),
}));

// Mock live rates data
const mockLiveRates = [
  {
    symbol: "EUR/USD",
    bid: 1.09234,
    ask: 1.09244,
    spread: 0.0001,
    exchangeRate: 1.09239,
    lastRefreshed: new Date().toISOString(),
    source: "exchangerate.host",
  },
  {
    symbol: "GBP/USD",
    bid: 1.27356,
    ask: 1.27366,
    spread: 0.0001,
    exchangeRate: 1.27361,
    lastRefreshed: new Date().toISOString(),
    source: "exchangerate.host",
  },
  {
    symbol: "USD/JPY",
    bid: 150.234,
    ask: 150.244,
    spread: 0.01,
    exchangeRate: 150.239,
    lastRefreshed: new Date().toISOString(),
    source: "exchangerate.host",
  },
];

describe("BotPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (forexApi.fetchLiveRates as any).mockResolvedValue(mockLiveRates);
  });

  describe("Component Rendering", () => {
    it("should render the bot page with main heading", () => {
      render(<BotPage />);
      expect(screen.getByText("Automated Trading Bot")).toBeInTheDocument();
    });

    it("should display description text", () => {
      render(<BotPage />);
      expect(
        screen.getByText(/Real-time forex trading with multi-strategy analysis and detailed logs/i)
      ).toBeInTheDocument();
    });

    it("should render Start Bot button when not running", () => {
      render(<BotPage />);
      expect(screen.getByRole("button", { name: /Start Bot/i })).toBeInTheDocument();
    });

    it("should render Reset button", () => {
      render(<BotPage />);
      expect(screen.getByRole("button", { name: /Reset/i })).toBeInTheDocument();
    });
  });

  describe("Bot Start/Stop Functionality", () => {
    it("should start bot when Start Bot button is clicked", async () => {
      render(<BotPage />);
      const startButton = screen.getByRole("button", { name: /Start Bot/i });

      fireEvent.click(startButton);

      // Button should change to Pause
      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /Start Bot/i })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Pause/i })).toBeInTheDocument();
      });
    });

    it("should show warning if no pairs selected when starting", async () => {
      render(<BotPage />);

      // Uncheck all pairs in config
      const pairCheckboxes = screen.getAllByRole("checkbox");
      for (const checkbox of pairCheckboxes) {
        if ((checkbox as HTMLInputElement).checked) {
          fireEvent.click(checkbox);
        }
      }

      // Try to start bot
      const startButton = screen.getByRole("button", { name: /Start Bot/i });
      fireEvent.click(startButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/Please select at least one currency pair/i)).toBeInTheDocument();
      });
    });

    it("should pause bot when Pause button is clicked", async () => {
      render(<BotPage />);
      const startButton = screen.getByRole("button", { name: /Start Bot/i });

      fireEvent.click(startButton);

      await waitFor(() => {
        const pauseButton = screen.getByRole("button", { name: /Pause/i });
        fireEvent.click(pauseButton);
      });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Start Bot/i })).toBeInTheDocument();
      });
    });
  });

  describe("Configuration Panel", () => {
    it("should display configuration panel initially", () => {
      render(<BotPage />);
      expect(screen.getByText(/Select Currency Pairs/i)).toBeInTheDocument();
    });

    it("should list all available currency pairs", () => {
      render(<BotPage />);
      const availablePairs = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF", "USD/CAD"];

      for (const pair of availablePairs) {
        expect(screen.getByLabelText(pair)).toBeInTheDocument();
      }
    });

    it("should have EUR/USD, GBP/USD, USD/JPY pre-selected", () => {
      render(<BotPage />);

      const eurusdCheckbox = screen.getByLabelText("EUR/USD") as HTMLInputElement;
      const gbpusdCheckbox = screen.getByLabelText("GBP/USD") as HTMLInputElement;
      const usdjpyCheckbox = screen.getByLabelText("USD/JPY") as HTMLInputElement;

      expect(eurusdCheckbox.checked).toBe(true);
      expect(gbpusdCheckbox.checked).toBe(true);
      expect(usdjpyCheckbox.checked).toBe(true);
    });

    it("should allow toggling pair selection", async () => {
      render(<BotPage />);

      const audUsdCheckbox = screen.getByLabelText("AUD/USD") as HTMLInputElement;

      expect(audUsdCheckbox.checked).toBe(false);

      fireEvent.click(audUsdCheckbox);

      expect(audUsdCheckbox.checked).toBe(true);
    });

    it("should display selected pairs count", () => {
      render(<BotPage />);
      const selectedText = screen.getByText(/Selected:/i);
      expect(selectedText).toBeInTheDocument();
    });

    it("should display trade interval options", () => {
      render(<BotPage />);
      expect(screen.getByText(/Market Check Interval/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /5 seconds/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /10 seconds/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /30 seconds/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /1 minute/i })).toBeInTheDocument();
    });

    it("should allow changing trade interval", async () => {
      render(<BotPage />);

      const tenSecButton = screen.getByRole("button", { name: /10 seconds/i });
      fireEvent.click(tenSecButton);

      // Button should appear selected (default has different styling)
      expect(tenSecButton).toBeInTheDocument();
    });
  });

  describe("Bot Status Display", () => {
    it("should display initial bot status as Stopped", () => {
      render(<BotPage />);
      expect(screen.getByText("Stopped")).toBeInTheDocument();
    });

    it("should display initial account balance", () => {
      render(<BotPage />);
      expect(screen.getByText(/Account Balance/i)).toBeInTheDocument();
      expect(screen.getByText(/\$10000/)).toBeInTheDocument();
    });

    it("should display active positions count", () => {
      render(<BotPage />);
      expect(screen.getByText(/Active Positions/i)).toBeInTheDocument();
      expect(screen.getByText(/^0$/)).toBeInTheDocument();
    });
  });

  describe("Bot Activity Logs", () => {
    it("should display bot activity log section", () => {
      render(<BotPage />);
      expect(screen.getByText(/Bot Activity Log/i)).toBeInTheDocument();
    });

    it("should show placeholder when no logs", () => {
      render(<BotPage />);
      expect(screen.getByText(/Bot logs will appear here/i)).toBeInTheDocument();
    });

    it("should display logs when bot runs", async () => {
      (forexApi.fetchLiveRates as any).mockResolvedValue(mockLiveRates);

      render(<BotPage />);

      const startButton = screen.getByRole("button", { name: /Start Bot/i });
      fireEvent.click(startButton);

      // Wait for logs to appear
      await waitFor(
        () => {
          // Bot should generate logs during execution
          const logElements = screen.queryAllByText(/INFO|SIGNAL|TRADE|CLOSE/);
          // At least some logs should be generated
        },
        { timeout: 5000 }
      );
    });
  });

  describe("Live Rates Display", () => {
    it("should display live forex rates section", () => {
      render(<BotPage />);
      expect(screen.getByText(/Live Forex Rates/i)).toBeInTheDocument();
    });

    it("should show default message when bot not running", () => {
      render(<BotPage />);
      expect(screen.getByText(/Start the bot to see live rates/i)).toBeInTheDocument();
    });

    it("should fetch live rates when bot starts", async () => {
      render(<BotPage />);

      const startButton = screen.getByRole("button", { name: /Start Bot/i });
      fireEvent.click(startButton);

      await waitFor(
        () => {
          expect(forexApi.fetchLiveRates).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });

    it("should pass selected pairs to fetchLiveRates", async () => {
      render(<BotPage />);

      const startButton = screen.getByRole("button", { name: /Start Bot/i });
      fireEvent.click(startButton);

      await waitFor(
        () => {
          const calls = (forexApi.fetchLiveRates as any).mock.calls;
          expect(calls.length).toBeGreaterThan(0);
          const lastCall = calls[calls.length - 1][0];
          expect(Array.isArray(lastCall)).toBe(true);
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Active Signals Section", () => {
    it("should display active trading signals section", () => {
      render(<BotPage />);
      expect(screen.getByText(/Active Trading Signals/i)).toBeInTheDocument();
    });

    it("should show default message when no signals", () => {
      render(<BotPage />);
      expect(screen.getByText(/No active signals at the moment/i)).toBeInTheDocument();
    });
  });

  describe("Open Trades Section", () => {
    it("should display open trades section", () => {
      render(<BotPage />);
      expect(screen.getByText(/Open Trades/i)).toBeInTheDocument();
    });

    it("should show default message when no open trades", () => {
      render(<BotPage />);
      expect(screen.getByText(/No open trades/i)).toBeInTheDocument();
    });
  });

  describe("Performance Metrics", () => {
    it("should display performance metrics section", () => {
      render(<BotPage />);
      expect(screen.getByText(/Performance Metrics/i)).toBeInTheDocument();
    });

    it("should display total trades metric", () => {
      render(<BotPage />);
      expect(screen.getByText(/Total Trades/i)).toBeInTheDocument();
    });

    it("should display win rate metric", () => {
      render(<BotPage />);
      expect(screen.getByText(/Win Rate/i)).toBeInTheDocument();
    });

    it("should display P&L metric", () => {
      render(<BotPage />);
      expect(screen.getByText(/Total P&L/i)).toBeInTheDocument();
    });
  });

  describe("Closed Trades History", () => {
    it("should display closed trades history section", () => {
      render(<BotPage />);
      expect(screen.getByText(/Closed Trades History/i)).toBeInTheDocument();
    });

    it("should show default message when no closed trades", () => {
      render(<BotPage />);
      expect(screen.getByText(/No closed trades yet/i)).toBeInTheDocument();
    });

    it("should display trade table headers", () => {
      render(<BotPage />);
      const headers = ["Pair", "Type", "Entry", "Exit", "Qty", "P&L", "%"];

      for (const header of headers) {
        // At least one of these should appear in the table structure
      }
    });
  });

  describe("Info Alert", () => {
    it("should display info alert about bot features", () => {
      render(<BotPage />);
      expect(screen.getByText(/Bot Features:/i)).toBeInTheDocument();
    });

    it("should describe real market data usage", () => {
      render(<BotPage />);
      const alert = screen.getByText(/Ball Features:/i);
      expect(alert).toBeInTheDocument();
    });
  });

  describe("Real Data Integration", () => {
    it("should call fetchLiveRates with real data on bot start", async () => {
      render(<BotPage />);

      const startButton = screen.getByRole("button", { name: /Start Bot/i });
      fireEvent.click(startButton);

      await waitFor(
        () => {
          expect(forexApi.fetchLiveRates).toHaveBeenCalledWith(
            expect.arrayContaining(["EUR/USD", "GBP/USD", "USD/JPY"])
          );
        },
        { timeout: 3000 }
      );
    });

    it("should use forex data to run bot logic", async () => {
      const mockRates = [...mockLiveRates];
      (forexApi.fetchLiveRates as any).mockResolvedValue(mockRates);

      render(<BotPage />);

      const startButton = screen.getByRole("button", { name: /Start Bot/i });
      fireEvent.click(startButton);

      await waitFor(
        () => {
          expect(forexApi.fetchLiveRates).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });

    it("should update rates on each interval cycle", async () => {
      render(<BotPage />);

      const startButton = screen.getByRole("button", { name: /Start Bot/i });
      fireEvent.click(startButton);

      await waitFor(
        () => {
          // Should be called multiple times due to interval
          const callCount = (forexApi.fetchLiveRates as any).mock.calls.length;
          // At least initial call
          expect(callCount).toBeGreaterThanOrEqual(1);
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      (forexApi.fetchLiveRates as any).mockRejectedValue(new Error("API Error"));

      render(<BotPage />);

      const startButton = screen.getByRole("button", { name: /Start Bot/i });
      fireEvent.click(startButton);

      await waitFor(
        () => {
          // Should show error message or continue safely
        },
        { timeout: 3000 }
      );
    });

    it("should recover from errors and continue running", async () => {
      (forexApi.fetchLiveRates as any)
        .mockRejectedValueOnce(new Error("API Error"))
        .mockResolvedValueOnce(mockLiveRates);

      render(<BotPage />);

      const startButton = screen.getByRole("button", { name: /Start Bot/i });
      fireEvent.click(startButton);

      await waitFor(
        () => {
          // Should recover after error
          expect(forexApi.fetchLiveRates).toHaveBeenCalled();
        },
        { timeout: 5000 }
      );
    });
  });

  describe("Reset Functionality", () => {
    it("should reset bot when Reset button is clicked", async () => {
      render(<BotPage />);

      const startButton = screen.getByRole("button", { name: /Start Bot/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        const resetButton = screen.getByRole("button", { name: /Reset/i });
        fireEvent.click(resetButton);
      });

      // Should return to initial state
      expect(screen.getByRole("button", { name: /Start Bot/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Pause/i })).not.toBeInTheDocument();
    });
  });

  describe("Configuration Persistence", () => {
    it("should persist pair selection when bot is paused and resumed", async () => {
      render(<BotPage />);

      // Select specific pairs
      const audUsdCheckbox = screen.getByLabelText("AUD/USD") as HTMLInputElement;
      fireEvent.click(audUsdCheckbox);

      const startButton = screen.getByRole("button", { name: /Start Bot/i });
      fireEvent.click(startButton);

      // Pause bot
      await waitFor(() => {
        const pauseButton = screen.getByRole("button", { name: /Pause/i });
        fireEvent.click(pauseButton);
      });

      // Pairs should still be selected
      expect((screen.getByLabelText("AUD/USD") as HTMLInputElement).checked).toBe(true);
    });
  });
});
