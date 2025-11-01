"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

interface Streak {
  id: string;
  name: string;
  completedDates: Set<string>;
  frequency: "daily" | "weekly";
  color?: string;
}

// Color palette for streaks
const STREAK_COLORS = [
  "#ef4444", // red
  "#3b82f6", // blue
  "#10b981", // green
  "#a855f7", // purple
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f43f5e", // rose
];

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [selectedStreakId, setSelectedStreakId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [sharingStreak, setSharingStreak] = useState<Streak | null>(null);
  const [windowDimensions, setWindowDimensions] = useState({
    width: 0,
    height: 0,
  });

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setUser(session.user);
      setIsAuthChecking(false);
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        router.push("/login");
      } else if (session) {
        setUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const loadStreaks = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading streaks:", error);
      } else if (data) {
        const loadedStreaks = data.map((streak, index) => ({
          id: streak.id,
          name: streak.name,
          completedDates: new Set<string>(streak.completed_dates || []),
          frequency: (streak.frequency || "daily") as "daily" | "weekly",
          color: STREAK_COLORS[index % STREAK_COLORS.length],
        }));
        setStreaks(loadedStreaks);
      }
    } catch (err) {
      console.error("Error loading streaks:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load streaks from Supabase when user is authenticated
  useEffect(() => {
    if (user) {
      loadStreaks();
    }
  }, [user, loadStreaks]);

  // Handle window resize for chain positioning
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Set initial dimensions
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleAddStreak = async () => {
    if (inputValue.trim() && user) {
      setIsAdding(true);

      try {
        const newStreak = {
          user_id: user.id,
          name: inputValue,
          completed_dates: [],
          frequency: frequency,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("streaks")
          .insert([newStreak])
          .select()
          .single();

        if (error) {
          console.error("Error adding streak:", error);
        } else if (data) {
          setTimeout(() => {
            setStreaks([
              {
                id: data.id,
                name: data.name,
                completedDates: new Set(data.completed_dates || []),
                frequency: data.frequency as "daily" | "weekly",
                color: STREAK_COLORS[streaks.length % STREAK_COLORS.length],
              },
              ...streaks,
            ]);
            setInputValue("");
            setFrequency("daily");
            setIsAdding(false);
          }, 400);
        }
      } catch (err) {
        console.error("Error adding streak:", err);
        setIsAdding(false);
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleEditStreak = async (streakId: string) => {
    if (!editingName.trim()) return;

    try {
      const { error } = await supabase
        .from("streaks")
        .update({
          name: editingName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", streakId);

      if (error) {
        console.error("Error updating streak:", error);
      } else {
        setStreaks(
          streaks.map((s) =>
            s.id === streakId ? { ...s, name: editingName } : s
          )
        );
        setEditingId(null);
        setEditingName("");
      }
    } catch (err) {
      console.error("Error updating streak:", err);
    }
  };

  const handleDeleteStreak = async (streakId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this habit? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("streaks")
        .delete()
        .eq("id", streakId);

      if (error) {
        console.error("Error deleting streak:", error);
      } else {
        setStreaks(streaks.filter((s) => s.id !== streakId));
      }
    } catch (err) {
      console.error("Error deleting streak:", err);
    }
  };

  const startEditing = (streak: Streak) => {
    setEditingId(streak.id);
    setEditingName(streak.name);
  };

  const handleStreakCardClick = (streakId: string) => {
    // Toggle selection - if already selected, deselect; otherwise select
    setSelectedStreakId(selectedStreakId === streakId ? null : streakId);
  };

  const handleShareStreak = (streak: Streak) => {
    setSharingStreak(streak);
  };

  const downloadShareCard = async () => {
    if (!sharingStreak) return;

    const card = document.getElementById("share-card");
    if (!card) return;

    try {
      // Use html2canvas to capture the card
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(card, {
        backgroundColor: null,
        scale: 2,
      });

      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        // Try Web Share API first (for mobile)
        if (
          navigator.share &&
          navigator.canShare?.({
            files: [new File([blob], "streak.png", { type: "image/png" })],
          })
        ) {
          try {
            await navigator.share({
              files: [new File([blob], "my-streak.png", { type: "image/png" })],
              title: "",
            });
            setSharingStreak(null);
            return;
          } catch (err) {
            if ((err as Error).name === "AbortError") {
              return; // User cancelled
            }
          }
        }

        // Fallback: Download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${sharingStreak.name
          .replace(/[^a-z0-9]/gi, "-")
          .toLowerCase()}-streak.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSharingStreak(null);
      }, "image/png");
    } catch (err) {
      console.error("Error creating share card:", err);
      alert("Failed to create share card. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddStreak();
    }
  };

  const toggleDate = async (
    streakId: string,
    date: string,
    button: HTMLElement
  ) => {
    const streak = streaks.find((s) => s.id === streakId);
    if (!streak) return;

    const newDates = new Set(streak.completedDates);
    const wasCompleted = newDates.has(date);

    if (wasCompleted) {
      newDates.delete(date);
    } else {
      newDates.add(date);
      // Trigger confetti with streak color!
      const rect = button.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      // Generate color variants based on the streak color
      const baseColor = streak.color || "#16a34a";

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x, y },
        colors: [baseColor, "#ffffff", "#ffd700"],
        ticks: 200,
      });
    }

    // Update local state
    setStreaks(
      streaks.map((s) => {
        if (s.id === streakId) {
          return { ...s, completedDates: newDates };
        }
        return s;
      })
    );

    // Sync with Supabase
    try {
      const { error } = await supabase
        .from("streaks")
        .update({
          completed_dates: Array.from(newDates),
          updated_at: new Date().toISOString(),
        })
        .eq("id", streakId);

      if (error) {
        console.error("Error updating streak:", error);
      }
    } catch (err) {
      console.error("Error syncing with Supabase:", err);
    }
  };

  // Helper function to get local date string in YYYY-MM-DD format
  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Get the start of the week (Monday) for a given date in local timezone
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // Adjust to get Monday as start of week (Sunday = 0 becomes -6, Monday = 1 becomes 0, etc.)
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Get week identifier based on the Monday of that week (in local timezone)
  // Format: YYYY-MM-DD of the Monday
  const getWeekIdentifier = (date: Date): string => {
    const weekStart = getWeekStart(date);
    return getLocalDateString(weekStart);
  };

  // Get start and end dates of a week from identifier
  const getWeekDates = (weekIdentifier: string): { start: Date; end: Date } => {
    // weekIdentifier is the Monday date in YYYY-MM-DD format
    const [year, month, day] = weekIdentifier.split("-").map(Number);
    const start = new Date(year, month - 1, day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Sunday is 6 days after Monday
    return { start, end };
  };

  const getStreakCount = (
    completedDates: Set<string>,
    frequency: "daily" | "weekly"
  ) => {
    if (completedDates.size === 0) return 0;

    if (frequency === "weekly") {
      const today = new Date();
      const currentWeek = getWeekIdentifier(today);
      const lastWeekDate = new Date(today);
      lastWeekDate.setDate(today.getDate() - 7);
      const lastWeek = getWeekIdentifier(lastWeekDate);

      let streak = 0;
      let checkWeek = currentWeek;

      // Check if current week or last week is completed
      if (!completedDates.has(currentWeek) && !completedDates.has(lastWeek)) {
        return 0;
      }

      // Start from current week if completed, otherwise last week
      if (completedDates.has(currentWeek)) {
        checkWeek = currentWeek;
      } else if (completedDates.has(lastWeek)) {
        checkWeek = lastWeek;
      }

      // Count consecutive weeks backward
      const checkDate = new Date(checkWeek); // Parse the Monday date

      while (true) {
        const weekId = getWeekIdentifier(checkDate);
        if (completedDates.has(weekId)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 7); // Go back one week
        } else {
          break;
        }
      }

      return streak;
    } else {
      // Daily logic - use local timezone
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const todayString = getLocalDateString(today);
      const yesterdayString = getLocalDateString(yesterday);

      let streak = 0;
      let checkDate = new Date(today);

      if (completedDates.has(todayString)) {
        checkDate = new Date(today);
      } else if (completedDates.has(yesterdayString)) {
        checkDate = new Date(yesterday);
      } else {
        return 0;
      }

      while (true) {
        const dateString = getLocalDateString(checkDate);
        if (completedDates.has(dateString)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      return streak;
    }
  };

  const getDateBoxes = () => {
    const boxes = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      boxes.push(getLocalDateString(date));
    }
    return boxes;
  };

  const getWeekBoxes = () => {
    const boxes = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i * 7);
      boxes.push(getWeekIdentifier(date));
    }
    return boxes;
  };

  const todayString = getLocalDateString(new Date());
  const dateBoxes = getDateBoxes();

  // Generate chains - one chain per streak wrapping around the window
  const generateChains = () => {
    const chains: Array<{
      color: string;
      links: Array<{
        x: number;
        y: number;
        rotation: number;
        isHorizontal: boolean;
      }>;
      zIndex: number;
    }> = [];

    const linkWidth = 25; // Width of each chain link (50% smaller)
    const linkHeight = 15; // Height of each chain link (50% smaller)
    const padding = 10; // Distance from edge (closer to window edge)

    // Process each streak
    streaks.forEach((streak, streakIndex) => {
      const streakCount = getStreakCount(
        streak.completedDates,
        streak.frequency
      );
      const color = streak.color || "#gray";

      if (streakCount === 0) return;

      const links: Array<{
        x: number;
        y: number;
        rotation: number;
        isHorizontal: boolean;
      }> = [];

      // Add a link for each day in the streak, wrapping around the window
      // All chains start from the same position (no offset)
      for (let i = 0; i < streakCount; i++) {
        const position = calculateChainLinkPosition(
          i,
          linkWidth,
          linkHeight,
          padding // Same padding for all chains so they start at the same spot
        );
        links.push(position);
      }

      chains.push({
        color,
        links,
        zIndex: streaks.length - streakIndex, // First streak has highest z-index
      });
    });

    return chains;
  };

  // Calculate position for each link going clockwise from top center
  const calculateChainLinkPosition = (
    index: number,
    linkWidth: number,
    linkHeight: number,
    padding: number
  ) => {
    if (windowDimensions.width === 0 || windowDimensions.height === 0) {
      return { x: 0, y: 0, rotation: 0, isHorizontal: true };
    }

    const width = windowDimensions.width;
    const height = windowDimensions.height;

    // Calculate perimeter
    const topWidth = width - padding * 2;
    const rightHeight = height - padding * 2;
    const bottomWidth = width - padding * 2;
    const leftHeight = height - padding * 2;
    const perimeter = topWidth + rightHeight + bottomWidth + leftHeight;

    // Calculate spacing between links (they interlock, so alternate positioning)
    const spacing = linkWidth * 0.8; // Links overlap slightly to interlock
    const position = (index * spacing) % perimeter;

    // Determine which side and position
    if (position < topWidth) {
      // Top edge (left to right) - horizontal links
      return {
        x: width / 2 - topWidth / 2 + position,
        y: padding,
        rotation: 0,
        isHorizontal: true,
      };
    } else if (position < topWidth + rightHeight) {
      // Right edge (top to bottom) - vertical links
      const yPos = position - topWidth;
      return {
        x: width - padding,
        y: padding + yPos,
        rotation: 90,
        isHorizontal: false,
      };
    } else if (position < topWidth + rightHeight + bottomWidth) {
      // Bottom edge (right to left) - horizontal links
      const xPos = position - topWidth - rightHeight;
      return {
        x: width - padding - xPos,
        y: height - padding,
        rotation: 0,
        isHorizontal: true,
      };
    } else {
      // Left edge (bottom to top) - vertical links
      const yPos = position - topWidth - rightHeight - bottomWidth;
      return {
        x: padding,
        y: height - padding - yPos,
        rotation: 90,
        isHorizontal: false,
      };
    }
  };

  const chains = generateChains();

  // Show loading while checking authentication
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-linear-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-500"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Share Card Modal */}
      {sharingStreak && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSharingStreak(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-3xl w-full my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => setSharingStreak(null)}
                style={{ color: "#9ca3af" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#4b5563";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#9ca3af";
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* The shareable card */}
            <div
              id="share-card"
              className="relative rounded-3xl overflow-hidden mb-4 mx-auto"
              style={{
                background:
                  "linear-gradient(135deg, #fffbeb 0%, #ffedd5 50%, #fee2e2 100%)",
                width: "600px",
                height: "600px",
                maxWidth: "100%",
                aspectRatio: "1/1",
              }}
            >
              {/* Decorative circles */}
              <div
                className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
                style={{ backgroundColor: sharingStreak.color }}
              ></div>
              <div
                className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-20"
                style={{ backgroundColor: sharingStreak.color }}
              ></div>

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col justify-between p-12">
                {/* Habit name at top */}
                <div className="text-center">
                  <div
                    className="flex items-center justify-center gap-3 mb-2"
                    style={{ marginBottom: "6px" }}
                  >
                    <h2
                      className="text-4xl font-bold"
                      style={{ color: "#111827", fontSize: "2rem" }}
                    >
                      {sharingStreak.name}
                    </h2>
                  </div>
                </div>

                {/* Main streak display in center */}
                <div className="flex flex-col items-center justify-center">
                  {/* Decorative red bar with number */}
                  <div className="w-full max-w-lg mb-6">
                    <div className="rounded-2xl h-40 relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          style={{
                            color: "red",
                            textShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            fontSize: "6rem",
                            fontWeight: "900",
                            fontFamily:
                              "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
                            lineHeight: "1",
                          }}
                        >
                          {getStreakCount(
                            sharingStreak.completedDates,
                            sharingStreak.frequency
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="text-3xl font-bold uppercase tracking-wide mb-6"
                    style={{ color: "#374151" }}
                  >
                    {sharingStreak.frequency === "weekly"
                      ? "Week Streak"
                      : "Day Streak"}
                  </div>
                </div>

                {/* App branding at bottom */}
                <div className="text-center">
                  <div
                    className="text-xl font-bold mb-1"
                    style={{ color: "#1f2937" }}
                  >
                    Don&apos;t Break the Chain
                  </div>
                  <div className="text-base" style={{ color: "#4b5563" }}>
                    Building habits, one day at a time
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={downloadShareCard}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white font-semibold rounded-lg transition-all shadow-lg"
                style={{
                  background: "linear-gradient(to right, #ef4444, #f97316)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "linear-gradient(to right, #dc2626, #ea580c)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    "linear-gradient(to right, #ef4444, #f97316)";
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
                Share / Download
              </button>
              <button
                onClick={() => setSharingStreak(null)}
                className="px-4 py-3 font-semibold rounded-lg transition-colors"
                style={{
                  backgroundColor: "#e5e7eb",
                  color: "#374151",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#d1d5db";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#e5e7eb";
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chain Links Visualization */}
      <div className="fixed inset-0 pointer-events-none">
        {chains.map((chain, chainIndex) => (
          <div
            key={chainIndex}
            className="absolute inset-0"
            style={{ zIndex: 40 + chain.zIndex }}
          >
            {chain.links.map((link, linkIndex) => {
              // Offset chains perpendicular to the edge they're on
              const offsetAmount = chainIndex * 15; // 15px offset per chain

              // Calculate offset based on orientation
              // Horizontal edges: offset vertically (y-axis)
              // Vertical edges: offset horizontally (x-axis)
              const xOffset = link.isHorizontal ? 0 : offsetAmount;
              const yOffset = link.isHorizontal ? offsetAmount : 0;

              return (
                <div
                  key={linkIndex}
                  className="absolute transition-all duration-300"
                  style={{
                    left: `${link.x + xOffset}px`,
                    top: `${link.y + yOffset}px`,
                    transform: `translate(-50%, -50%)`,
                  }}
                >
                  {/* Realistic Chain link SVG - 50% smaller */}
                  <svg
                    width="30"
                    height="20"
                    viewBox="0 0 30 20"
                    className="drop-shadow-md"
                    style={{
                      transform: `rotate(${link.rotation}deg)`,
                    }}
                  >
                    {/* Outer ring - creates the chain link shape */}
                    <ellipse
                      cx="15"
                      cy="10"
                      rx="10"
                      ry="6"
                      fill="none"
                      stroke={chain.color}
                      strokeWidth="3"
                      opacity="0.85"
                    />
                    {/* Inner highlight for 3D effect */}
                    <ellipse
                      cx="15"
                      cy="9"
                      rx="8.5"
                      ry="5"
                      fill="none"
                      stroke="white"
                      strokeWidth="1"
                      opacity="0.3"
                    />
                    {/* Shadow/depth on bottom */}
                    <ellipse
                      cx="15"
                      cy="11"
                      rx="8.5"
                      ry="5"
                      fill="none"
                      stroke="black"
                      strokeWidth="0.5"
                      opacity="0.15"
                    />
                    {/* Left connecting bar */}
                    <rect
                      x="4"
                      y="7"
                      width="4"
                      height="6"
                      fill={chain.color}
                      opacity="0.85"
                      rx="1"
                    />
                    {/* Right connecting bar */}
                    <rect
                      x="22"
                      y="7"
                      width="4"
                      height="6"
                      fill={chain.color}
                      opacity="0.85"
                      rx="1"
                    />
                    {/* Highlight on connecting bars */}
                    <rect
                      x="4"
                      y="7"
                      width="4"
                      height="2"
                      fill="white"
                      opacity="0.2"
                      rx="1"
                    />
                    <rect
                      x="22"
                      y="7"
                      width="4"
                      height="2"
                      fill="white"
                      opacity="0.2"
                      rx="1"
                    />
                  </svg>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* User info and sign out button */}
      <div className="absolute top-5 right-10 mt-10 mr-5 flex items-center gap-4 z-10">
        {user && (
          <div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
      <div className="min-h-screen bg-linear-to-br from-amber-50 via-orange-50 to-red-50 font-sans p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mt-5 mb-12 relative">
            <h1 className="text-5xl font-bold text-gray-900 mb-2">
              Don&apos;t Break the Chain
            </h1>
            <p className="text-gray-600 text-lg mb-4">
              Build your life, one day at a time
            </p>
          </div>

          {/* Streaks List */}
          <div className="mb-8 space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-500"></div>
                <p className="mt-4 text-gray-600">Loading your streaks...</p>
              </div>
            ) : (
              streaks.map((streak) => {
                const currentStreak = getStreakCount(
                  streak.completedDates,
                  streak.frequency
                );
                const isWeekly = streak.frequency === "weekly";
                const boxes = isWeekly ? getWeekBoxes() : dateBoxes;
                const currentIdentifier = isWeekly
                  ? getWeekIdentifier(new Date())
                  : todayString;

                return (
                  <div
                    key={streak.id}
                    className="bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl animate-slideDown"
                    style={{
                      borderLeft: `6px solid ${streak.color}`,
                    }}
                  >
                    <div
                      className="flex items-center gap-6 cursor-pointer"
                      onClick={() => handleStreakCardClick(streak.id)}
                    >
                      <div className="shrink-0 w-80">
                        {editingId === streak.id ? (
                          // Edit mode
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full shrink-0"
                              style={{ backgroundColor: streak.color }}
                            />
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  handleEditStreak(streak.id);
                                }
                              }}
                              className="flex-1 px-3 py-1 text-lg font-semibold text-gray-900 border-2 border-green-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300"
                              autoFocus
                            />
                            <button
                              onClick={() => handleEditStreak(streak.id)}
                              className="px-3 py-1 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          // View mode
                          <>
                            <div className="flex items-center gap-2">
                              {/* Color indicator */}
                              <div
                                className="w-4 h-4 rounded-full shrink-0"
                                style={{ backgroundColor: streak.color }}
                              />
                              <h3 className="text-xl font-semibold text-gray-900">
                                {streak.name}
                              </h3>
                            </div>
                            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-linear-to-r from-red-100 to-orange-100 rounded-full">
                              <span className="text-2xl">🔥</span>
                              <span className="text-sm font-bold text-red-600">
                                {currentStreak} {isWeekly ? "week" : "day"}
                                {currentStreak !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex gap-3 flex-1 justify-end">
                        {boxes.map((identifier) => {
                          const isCurrent = identifier === currentIdentifier;
                          const isCompleted =
                            streak.completedDates.has(identifier);

                          let label = "";
                          let tooltip = "";

                          if (isWeekly) {
                            const { start, end } = getWeekDates(identifier);
                            label = `${start.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}`;
                            tooltip = `${start.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })} - ${end.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })} (Week ending ${end.toLocaleDateString("en-US", {
                              weekday: "short",
                            })})`;
                          } else {
                            const [year, month, day] = identifier
                              .split("-")
                              .map(Number);
                            const dateObj = new Date(year, month - 1, day);
                            label = dateObj.toLocaleDateString("en-US", {
                              weekday: "short",
                            });
                            tooltip = dateObj.toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            });
                          }

                          return (
                            <div
                              key={identifier}
                              className="flex flex-col items-center relative group"
                            >
                              <span className="text-xs text-gray-500 mb-1">
                                {label}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent card click when clicking the box
                                  if (isCurrent) {
                                    toggleDate(
                                      streak.id,
                                      identifier,
                                      e.currentTarget
                                    );
                                  }
                                }}
                                disabled={!isCurrent}
                                className={`
                            relative transition-all duration-200
                            ${
                              isCurrent
                                ? "w-16 h-16 cursor-pointer hover:scale-110"
                                : "w-12 h-12 cursor-not-allowed opacity-60"
                            }
                            ${
                              isCompleted
                                ? "bg-green-500 shadow-lg"
                                : "bg-white border-2 border-gray-300 hover:border-gray-400"
                            }
                            rounded-lg
                          `}
                              >
                                {isCompleted && (
                                  <svg
                                    viewBox="0 0 100 100"
                                    className="absolute inset-0 w-full h-full p-2"
                                  >
                                    <path
                                      d="M 20 20 L 80 80 M 80 20 L 20 80"
                                      stroke="#d1fae5"
                                      strokeWidth="12"
                                      strokeLinecap="round"
                                      className="drop-shadow-lg"
                                    />
                                    <path
                                      d="M 20 20 L 80 80 M 80 20 L 20 80"
                                      stroke="#16a34a"
                                      strokeWidth="10"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                )}
                              </button>
                              {/* Custom Tooltip */}
                              {isWeekly && (
                                <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 pointer-events-none">
                                  <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                                    {tooltip}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                      <div className="border-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Edit, Share, and Delete buttons - appear below when selected */}
                    {selectedStreakId === streak.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200 flex gap-3 justify-center animate-slideDown">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(streak);
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareStreak(streak);
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                          </svg>
                          Share
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStreak(streak.id);
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Input Field */}
          <div
            className={`
            flex justify-center items-center transition-all duration-500
            ${streaks.length === 0 ? "min-h-[50vh]" : ""}
            ${isAdding ? "opacity-0 -translate-y-8" : "opacity-100"}
          `}
          >
            <div className="w-full max-w-4xl">
              <div className="flex gap-4 items-center">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="What habit do you want to build?"
                  className="flex-1 px-8 py-6 text-2xl text-center text-black rounded-2xl border-2 border-gray-300 bg-white focus:border-green-500 focus:outline-none focus:ring-4 focus:ring-green-100 shadow-lg transition-all duration-200 placeholder:text-gray-400"
                />
                <select
                  value={frequency}
                  onChange={(e) =>
                    setFrequency(e.target.value as "daily" | "weekly")
                  }
                  className="px-6 py-6 text-xl text-black rounded-2xl border-2 border-gray-300 bg-white focus:border-green-500 focus:outline-none focus:ring-4 focus:ring-green-100 shadow-lg transition-all duration-200 cursor-pointer appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: "right 0.75rem center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "1.5em 1.5em",
                    paddingRight: "2.5rem",
                  }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
                <button
                  onClick={handleAddStreak}
                  disabled={!inputValue.trim()}
                  className="px-8 py-6 text-xl font-semibold text-white bg-green-500 rounded-2xl hover:bg-green-600 focus:outline-none focus:ring-4 focus:ring-green-100 shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-500"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
