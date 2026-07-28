"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { useHollowBalance } from "@/lib/hooks/useHollow";
import { useAdminStatus } from "@/lib/hooks/useAdmin";
import { useConfig } from "@/lib/hooks/useConfig";
import { formatTokenBalance } from "@/lib/hooks";
import { XIcon } from "@/components/ui/XIcon";
import { BrandBanner } from "@/components/ui/BrandBanner";

const TARGET_DATE = new Date("2026-03-17T06:00:00Z").getTime();
const WAITLIST_OPEN_SOON = false;
const ONE_TOKEN = BigInt(1e18);
const X_FOLLOW_USERNAME = "TheHollow_NFT";
const X_POST_ID = "2021439605271335122";

function getTimeLeft() {
  const now = Date.now();
  const diff = TARGET_DATE - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    isComplete: false,
  };
}

interface XUserData {
  id: string;
  username: string;
  name: string;
  profile_image_url: string;
  verified: boolean;
}

type TaskStatus = "idle" | "loading" | "completed" | "error";

interface TaskState {
  status: TaskStatus;
  message?: string;
  timer?: number;
}

interface TasksState {
  tokens: TaskState;
  xAuth: TaskState;
  follow: TaskState;
  like: TaskState;
  retweet: TaskState;
}

function storeOAuthState(state: string) {
  sessionStorage.setItem("x_oauth_state", state);
}

function verifyOAuthState(state: string): boolean {
  const stored = sessionStorage.getItem("x_oauth_state");
  if (!stored || stored !== state) return false;
  sessionStorage.removeItem("x_oauth_state");
  return true;
}

function formatBalance(balance: bigint): string {
  const formatted = formatTokenBalance(balance);
  const num = parseFloat(formatted);
  if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
  if (num >= 1000) return (num / 1000).toFixed(2) + "K";
  return num.toFixed(2);
}

const initialTasks: TasksState = {
  tokens: { status: "idle" },
  xAuth: { status: "idle" },
  follow: { status: "idle" },
  like: { status: "idle" },
  retweet: { status: "idle" },
};

function TaskCard({
  icon,
  title,
  subtitle,
  state,
  buttonText,
  onClick,
  showTimer = false,
  isEnabled = true,
  xUser,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  state: TaskState;
  buttonText?: string;
  onClick?: () => void;
  showTimer?: boolean;
  isEnabled?: boolean;
  xUser?: XUserData | null;
}) {
  const isCompleted = state.status === "completed";
  const isLoading = state.status === "loading";
  const isError = state.status === "error";

  const borderColor = isCompleted
    ? "border-l-green-500"
    : isError
      ? "border-l-red-500"
      : isLoading
        ? "border-l-[#ccff00]"
        : "border-l-text-primary/20";

  return (
    <div className={`ui-container rounded border-l-4 ${borderColor} overflow-hidden ${!isEnabled && !isCompleted ? "opacity-40" : ""}`}>
      <div className="flex items-center gap-4 p-4">
        <div
          className={`
            flex-shrink-0 w-10 h-10 rounded flex items-center justify-center
            ${isCompleted
              ? "bg-green-500/20 text-green-400"
              : isError
                ? "bg-red-500/20 text-red-400"
                : isLoading
                  ? "bg-[#ccff00]/20 text-[#ccff00]"
                  : "bg-white/5 text-text-primary/60"
            }
          `}
        >
          {isCompleted ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : isLoading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            icon
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-text-primary truncate text-sm">{title}</h3>
            {xUser && (
              <img
                src={xUser.profile_image_url}
                alt={xUser.username}
                className="w-5 h-5 rounded-full"
              />
            )}
          </div>
          {subtitle && <p className="text-xs text-muted-blue truncate">{subtitle}</p>}
          {isError && state.message && (
            <p className="text-xs text-red-400 mt-1">{state.message}</p>
          )}
          {showTimer && isLoading && state.timer !== undefined && (
            <p className="text-xs text-[#ccff00] mt-1">
              Waiting... {state.timer}s remaining
            </p>
          )}
        </div>

        <div className="flex-shrink-0">
          {isCompleted ? (
            <span className="text-green-400 text-xs font-bold uppercase tracking-widest">Done</span>
          ) : isLoading ? (
            <span className="text-[#ccff00] text-xs font-bold uppercase tracking-widest animate-pulse">Processing...</span>
          ) : (
            <button
              onClick={onClick}
              disabled={!onClick || !isEnabled}
              className="px-4 py-2 bg-[#1a160d] border border-white/10 hover:brightness-125 text-text-primary font-bold text-xs rounded uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {buttonText || "Start"}
            </button>
          )}
        </div>
      </div>

      {isLoading && showTimer && (
        <div className="h-1 bg-[#ccff00] transition-all duration-1000 ease-linear"
          style={{ width: `${((20 - (state.timer || 0)) / 20) * 100}%` }}
        />
      )}
    </div>
  );
}

export default function WaitlistPage() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);
  const [skipTimer, setSkipTimer] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState<TasksState>(initialTasks);
  const [submitStep, setSubmitStep] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [xUser, setXUser] = useState<XUserData | null>(null);
  const [isAlreadyJoined, setIsAlreadyJoined] = useState<boolean | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const { address, isConnected } = useAccount();
  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useHollowBalance(address);
  const { isAdmin } = useAdminStatus(address);
  const { value: participantCount, setValue, fetchConfig, updateConfig, isLoading: configLoading } = useConfig("waitlist_participants", "0");

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function checkWaitlistStatus() {
      if (isConnected && address) {
        try {
          const response = await fetch(`/api/waitlist?wallet=${address}`);
          const data = await response.json();
          setIsAlreadyJoined(data.isWaitlisted ?? false);
        } catch (error) {
          console.error("Error checking waitlist status:", error);
          setIsAlreadyJoined(false);
        }
      }
      setCheckingStatus(false);
    }
    checkWaitlistStatus();
  }, [isConnected, address]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("x_auth_success");
    const userDataEncoded = params.get("x_user_data");
    const state = params.get("x_state");
    const authError = params.get("x_auth_error");

    if (authError) {
      setErrorMessage(getAuthErrorMessage(authError));
      setTasks((prev) => ({
        ...prev,
        xAuth: { status: "error", message: getAuthErrorMessage(authError) },
      }));
      window.history.replaceState({}, "", "/waitlist");
      return;
    }

    if (success === "true" && userDataEncoded && state) {
      if (!verifyOAuthState(state)) {
        setTasks((prev) => ({
          ...prev,
          xAuth: { status: "error", message: "Invalid OAuth state. Please try again." },
        }));
        window.history.replaceState({}, "", "/waitlist");
        return;
      }

      try {
        const userData = JSON.parse(atob(userDataEncoded)) as XUserData;

        if (!userData.id || !userData.username) {
          setTasks((prev) => ({
            ...prev,
            xAuth: { status: "error", message: "Invalid user data received." },
          }));
          window.history.replaceState({}, "", "/waitlist");
          return;
        }

        localStorage.setItem("x_auth_session", JSON.stringify({
          userData,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        }));
        setXUser(userData);
        setTasks((prev) => ({ ...prev, xAuth: { status: "completed" } }));
      } catch {
        setTasks((prev) => ({
          ...prev,
          xAuth: { status: "error", message: "Failed to parse user data." },
        }));
      }
      window.history.replaceState({}, "", "/waitlist");
    }
  }, []);

  const getAuthErrorMessage = (error: string): string => {
    switch (error) {
      case "access_denied":
        return "Authorization was denied. Please authorize to continue.";
      case "token_exchange_failed":
        return "Failed to complete X authentication. Please try again.";
      case "user_fetch_failed":
        return "Failed to fetch X user data. Please try again.";
      case "not_configured":
        return "X authentication is not configured.";
      case "server_error":
        return "An error occurred. Please try again.";
      default:
        return "Authentication failed. Please try again.";
    }
  };

  const handleVerifyTokens = useCallback(async () => {
    if (!address) return;
    setTasks((prev) => ({ ...prev, tokens: { status: "loading" } }));
    try {
      await refetchBalance();
      if (balance !== undefined) {
        if (balance >= ONE_TOKEN) {
          setTasks((prev) => ({
            ...prev,
            tokens: { status: "completed", message: `${formatBalance(balance)} HOLLOW` },
          }));
        } else {
          setTasks((prev) => ({
            ...prev,
            tokens: { status: "error", message: "Need at least 1 HOLLOW token" },
          }));
        }
      }
    } catch {
      setTasks((prev) => ({
        ...prev,
        tokens: { status: "error", message: "Failed to verify balance" },
      }));
    }
  }, [address, refetchBalance, balance]);

  const handleXAuth = useCallback(async () => {
    setTasks((prev) => ({ ...prev, xAuth: { status: "loading" } }));
    try {
      const response = await fetch("/api/x-auth/login");
      const data = await response.json();

      if (data.error) {
        setTasks((prev) => ({ ...prev, xAuth: { status: "error", message: data.error } }));
        return;
      }

      storeOAuthState(data.state);
      window.location.href = data.authUrl;
    } catch {
      setTasks((prev) => ({
        ...prev,
        xAuth: { status: "error", message: "Failed to start X authentication." },
      }));
    }
  }, []);

  const startXTaskTimer = (taskKey: keyof Pick<TasksState, "follow" | "like" | "retweet">) => {
    setTasks((prev) => ({
      ...prev,
      [taskKey]: { status: "loading", timer: 20 },
    }));

    let remaining = 20;
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        setTasks((prev) => ({
          ...prev,
          [taskKey]: { status: "completed" },
        }));
      } else {
        setTasks((prev) => ({
          ...prev,
          [taskKey]: { ...prev[taskKey], timer: remaining, status: "loading" },
        }));
      }
    }, 1000);
  };

  const handleFollow = useCallback(() => {
    window.open(`https://x.com/intent/user?screen_name=${X_FOLLOW_USERNAME}`, "_blank");
    startXTaskTimer("follow");
  }, []);

  const handleLike = useCallback(() => {
    window.open(`https://x.com/intent/like?tweet_id=2022416496664940889`, "_blank");
    startXTaskTimer("like");
  }, []);

  const handleRetweet = useCallback(() => {
    window.open(`https://x.com/intent/retweet?tweet_id=2022416496664940889`, "_blank");
    startXTaskTimer("retweet");
  }, []);

  const allTasksCompleted =
    tasks.tokens.status === "completed" &&
    tasks.xAuth.status === "completed" &&
    tasks.follow.status === "completed" &&
    tasks.like.status === "completed" &&
    tasks.retweet.status === "completed";

  const canVerifyTokens = tasks.retweet.status === "completed" && isConnected && !!address;
  const canConnectX = isConnected && !!address;
  const canFollow = tasks.xAuth.status === "completed";
  const canLike = tasks.follow.status === "completed";
  const canRetweet = tasks.like.status === "completed";

  const submitToWaitlist = async () => {
    if (!address || !xUser) return;

    setSubmitStep("submitting");
    setErrorMessage("");

    const sessionPayload = Buffer.from(
      JSON.stringify({
        username: xUser.username,
        id: xUser.id,
      })
    ).toString("base64");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: address,
          x_username: xUser.username,
          x_user_id: xUser.id,
          x_auth_session: sessionPayload,
        }),
      });

      const data = await response.json();

      if (data.alreadyJoined) {
        setIsAlreadyJoined(true);
        setSubmitStep("success");
        return;
      }

      if (!response.ok) {
        setErrorMessage(data.error || "Failed to join waitlist");
        setSubmitStep("error");
        return;
      }

      setSubmitStep("success");
    } catch {
      setErrorMessage("Failed to submit to waitlist");
      setSubmitStep("error");
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] py-12">
        <div className="ui-container p-8 sm:p-12 rounded text-center w-full max-w-[500px]">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded-full blur-2xl"></div>
            <div className="relative">
              <h1 className="text-3xl sm:text-4xl font-header mb-2">Coming Soon</h1>
              <p className="text-muted-blue text-xs uppercase tracking-widest mb-8">Waitlist Opening In</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-muted-blue">
            <div className="w-4 h-4 border-2 border-white/20 border-t-[#ccff00] rounded-full animate-spin"></div>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (WAITLIST_OPEN_SOON) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] py-12">
        <div className="ui-container p-8 sm:p-12 rounded text-center w-full max-w-[500px]">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded-full blur-2xl"></div>
            <div className="relative py-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 bg-[#ccff00]/10 rounded border border-[#ccff00]/20">
            <div className="w-2 h-2 bg-[#ccff00] rounded-full animate-pulse"></div>
                <span className="text-xs text-[#ccff00] uppercase tracking-widest font-bold">Coming Soon</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-header mb-3 text-text-primary">Waitlist Opening Soon</h1>
              <p className="text-muted-blue text-sm mb-6">
                The waitlist isn't open yet. Stay ready — spots are limited.
              </p>
              <p className="text-muted-blue text-xs">
                Follow us to be first to know when it goes live.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!timeLeft.isComplete && !skipTimer) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] py-12">
        <div className="ui-container p-8 sm:p-12 rounded text-center w-full max-w-[500px]">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded-full blur-2xl"></div>
            <div className="relative">
              <h1 className="text-3xl sm:text-4xl font-header mb-2">Coming Soon</h1>
              <p className="text-muted-blue text-xs uppercase tracking-widest mb-8">Waitlist Opening In</p>
            </div>
          </div>

          <div className="flex items-start justify-center mb-8">
            {[
              { value: timeLeft.days, label: "Days" },
              { sep: true },
              { value: timeLeft.hours, label: "Hours" },
              { sep: true },
              { value: timeLeft.minutes, label: "Mins" },
              { sep: true },
              { value: timeLeft.seconds, label: "Secs" },
            ].map((item, i) =>
              "sep" in item ? (
                <div key={i} className="flex items-center h-[50px] sm:h-[70px] mx-1 sm:mx-2">
                  <span className="text-xl sm:text-3xl text-[#ccff00] font-display animate-pulse">:</span>
                </div>
              ) : (
                <div key={item.label} className="flex flex-col items-center">
                  <div className="bg-gradient-to-b from-[#2a2200] to-[#1a160d] rounded-lg p-3 sm:p-4 min-w-[55px] sm:min-w-[75px] border border-white/10 shadow-[0_0_20px_rgba(204,255,0,0.1)]">
                    <span className="text-2xl sm:text-4xl font-bold text-[#ccff00] font-display block drop-shadow-[0_0_10px_rgba(204,255,0,0.5)]">
                      {String(item.value).padStart(2, "0")}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-blue mt-2 uppercase tracking-wider font-bold">{item.label}</span>
                </div>
              )
            )}
          </div>

          <p className="text-muted-blue text-sm">Stay ready. Spots are limited.</p>

          {isAdmin && (
            <button
              onClick={() => setSkipTimer(true)}
              className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/15 border border-white/20 text-text-primary/60 text-xs rounded uppercase tracking-widest transition-all"
            >
              Skip Timer (Admin)
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] py-12">
        <div className="ui-container p-8 rounded text-center w-full max-w-[500px]">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-white/5 via-transparent to-transparent rounded-full blur-xl"></div>
            <div className="relative">
              <h1 className="text-3xl sm:text-4xl font-header mb-3 text-black">Join the Waitlist</h1>
            </div>
          </div>
          <p className="text-muted-blue text-sm mb-6">
            Connect your wallet to secure your spot.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded border border-white/10">
            <div className="w-2 h-2 bg-[#ccff00] rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-blue uppercase tracking-widest">Waiting for wallet</span>
          </div>
        </div>
      </div>
    );
  }

  if (checkingStatus) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] py-12">
        <div className="ui-container p-8 rounded text-center w-full max-w-[500px]">
          <div className="animate-spin w-10 h-10 border-2 border-white/20 border-t-[#ccff00] rounded-full mx-auto mb-4"></div>
          <p className="text-muted-blue text-sm uppercase tracking-widest">Verifying...</p>
        </div>
      </div>
    );
  }

  if (isAlreadyJoined || submitStep === "success") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] py-12">
        <div className="ui-container p-8 rounded text-center w-full max-w-[500px] border-2 border-green-500/30">
          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-r from-green-500/20 via-green-500/10 to-green-500/20 rounded-full blur-2xl"></div>
            <div className="relative py-4">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-2xl sm:text-3xl font-header mb-2 text-text-primary">You're In!</h1>
              <p className="text-muted-blue text-sm mb-6">
                You're on the list. We'll notify you when it's your turn.
              </p>
              <div className="flex justify-center">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("LFG! You're officially on the list! 📝\n\nYou just secured a WL spot for the upcoming @TheHollow_NFT mint on @katana. You saw the vision early, and now you're part of the inner circle.\n\nDon't fade the silence. Stay active and stay engaged. 🌑⚔️")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a160d] border border-white/10 text-text-primary font-bold rounded hover:bg-[#E6EB00] transition-colors"
                >
                  Share on
                  <XIcon className="ml-2 w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const completedCount = [tasks.tokens, tasks.xAuth, tasks.follow, tasks.like, tasks.retweet].filter(t => t.status === "completed").length;

  return (
    <div className="flex justify-center py-8">
      <div className="w-full max-w-[600px] px-4">
        <BrandBanner eyebrow="Mint Waitlist" priority className="mb-6" />
        <div className="mb-8">
          <div>
            <div className="mb-4">
              <div className="text-center mb-4">
                <div className="relative inline-block">
                   <div className="absolute -inset-2 bg-gradient-to-r from-white/10 via-white/5 to-transparent rounded-full blur-xl"></div>
                  <h2 className="relative text-2xl sm:text-3xl font-header text-black mb-1">Join the Waitlist</h2>
                </div>
                <p className="text-muted-blue text-xs uppercase tracking-widest">Complete all tasks to secure your spot</p>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-blue">Progress</span>
                <span className="text-[10px] font-bold text-[#ccff00]">{completedCount}/5</span>
              </div>
               <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#ccff00] to-[#CCDD00] transition-all duration-500"
                  style={{ width: `${(completedCount / 5) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <TaskCard
                icon={
                  <XIcon className="w-5 h-5" />
                }
                title="Connect X Account"
                subtitle={xUser ? `@${xUser.username}` : "Authenticate with X to continue"}
                state={tasks.xAuth}
                buttonText={xUser ? "Connected" : "Connect X"}
                onClick={xUser ? undefined : handleXAuth}
                isEnabled={canConnectX}
                xUser={xUser}
              />

              <TaskCard
                icon={
                  <XIcon className="w-5 h-5" />
                }
                title="Follow @TheHollow_NFT"
                subtitle="Follow our X account"
                state={tasks.follow}
                buttonText={tasks.follow.status === "completed" ? "Done" : "Follow"}
                onClick={tasks.follow.status === "completed" ? undefined : handleFollow}
                showTimer
                isEnabled={canFollow}
              />

              <TaskCard
                icon={
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                }
                title="Like Announcement Post"
                subtitle="Like our waitlist announcement"
                state={tasks.like}
                buttonText={tasks.like.status === "completed" ? "Done" : "Like"}
                onClick={tasks.like.status === "completed" ? undefined : handleLike}
                showTimer
                isEnabled={canLike}
              />

              <TaskCard
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                }
                title="Retweet Announcement"
                subtitle="Share our waitlist post"
                state={tasks.retweet}
                buttonText={tasks.retweet.status === "completed" ? "Done" : "Retweet"}
                onClick={tasks.retweet.status === "completed" ? undefined : handleRetweet}
                showTimer
                isEnabled={canRetweet}
              />

              <TaskCard
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                title="Verify HOLLOW Balance"
                subtitle={balance !== undefined && tasks.tokens.status === "completed" ? `${formatBalance(balance)} HOLLOW` : "Hold at least 1 HOLLOW Token"}
                state={tasks.tokens}
                buttonText={tasks.tokens.status === "completed" ? "Verified" : "Verify"}
                onClick={tasks.tokens.status === "completed" ? undefined : handleVerifyTokens}
                isEnabled={canVerifyTokens}
              />
            </div>

            {errorMessage && submitStep === "error" && (
              <div className="ui-container rounded border border-red-500/30 p-4 text-center bg-red-500/5">
                <p className="text-red-400 text-sm">{errorMessage}</p>
              </div>
            )}

            <div className="pt-2">
              {allTasksCompleted ? (
                <button
                  onClick={submitToWaitlist}
                  disabled={submitStep === "submitting"}
                   className="w-full py-4 bg-gradient-to-r from-[#1a160d] to-[#CCDD00] hover:brightness-125 text-text-primary font-bold rounded-lg uppercase tracking-widest text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(204,255,0,0.3)]"
                >
                  {submitStep === "submitting" ? (
                    <span className="flex items-center justify-center gap-2">
                       <div className="w-4 h-4 border-2 border-white/20 border-t-[#ccff00] rounded-full animate-spin" />
                      Joining...
                    </span>
                  ) : (
                    "Join Waitlist"
                  )}
                </button>
              ) : (
                <div className="ui-container rounded p-4 text-center border border-white/10">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-[#ccff00]/20 rounded-full"></div>
                    <p className="text-muted-blue text-xs font-bold uppercase tracking-widest">
                      Complete all tasks to join
                    </p>
                    <div className="w-2 h-2 bg-[#ccff00]/20 rounded-full"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
