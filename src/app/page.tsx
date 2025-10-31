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
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
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
                color: STREAK_COLORS[streaks.length % STREAK_COLORS.length],
              },
              ...streaks,
            ]);
            setInputValue("");
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

  const getStreakCount = (completedDates: Set<string>) => {
    if (completedDates.size === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    // Check if today or yesterday is completed to have an active streak
    const todayString = today.toISOString().split("T")[0];
    const yesterdayString = yesterday.toISOString().split("T")[0];

    let streak = 0;
    let checkDate = new Date(today);

    // If today is completed, start from today; otherwise start from yesterday
    if (completedDates.has(todayString)) {
      // Start counting from today
      checkDate = new Date(today);
    } else if (completedDates.has(yesterdayString)) {
      // Start counting from yesterday (grace period)
      checkDate = new Date(yesterday);
    } else {
      // No recent activity, streak is 0
      return 0;
    }

    // Count consecutive days backward
    while (true) {
      const dateString = checkDate.toISOString().split("T")[0];
      if (completedDates.has(dateString)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  const getDateBoxes = () => {
    const boxes = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      boxes.push(date.toISOString().split("T")[0]);
    }
    return boxes;
  };

  const todayString = new Date().toISOString().split("T")[0];
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
      const streakCount = getStreakCount(streak.completedDates);
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
              Build your streaks, one day at a time
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
                const currentStreak = getStreakCount(streak.completedDates);
                return (
                  <div
                    key={streak.id}
                    className="bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl animate-slideDown"
                    style={{
                      borderLeft: `6px solid ${streak.color}`,
                    }}
                  >
                    <div className="flex items-center gap-6">
                      <div className="shrink-0 w-48">
                        <div className="flex items-center gap-2">
                          {/* Color indicator */}
                          <div
                            className="w-4 h-4 rounded-full shrink-0"
                            style={{ backgroundColor: streak.color }}
                          />
                          <h3 className="text-2xl font-semibold text-gray-900">
                            {streak.name}
                          </h3>
                        </div>
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-linear-to-r from-red-100 to-orange-100 rounded-full">
                          <span className="text-2xl">🔥</span>
                          <span className="text-sm font-bold text-red-600">
                            {currentStreak} day
                            {currentStreak !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-3 flex-1 justify-end">
                        {dateBoxes.map((date) => {
                          const isToday = date === todayString;
                          const isCompleted = streak.completedDates.has(date);
                          const dateObj = new Date(date);
                          const dayName = dateObj.toLocaleDateString("en-US", {
                            weekday: "short",
                          });

                          return (
                            <div
                              key={date}
                              className="flex flex-col items-center"
                            >
                              <span className="text-xs text-gray-500 mb-1">
                                {dayName}
                              </span>
                              <button
                                onClick={(e) =>
                                  isToday &&
                                  toggleDate(streak.id, date, e.currentTarget)
                                }
                                disabled={!isToday}
                                className={`
                            relative transition-all duration-200
                            ${
                              isToday
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
                            </div>
                          );
                        })}
                      </div>
                    </div>
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
            <div className="w-full max-w-2xl">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="What habit do you want to build?"
                className="w-full px-8 py-6 text-2xl text-center text-black rounded-2xl border-2 border-gray-300 bg-white focus:border-green-500 focus:outline-none focus:ring-4 focus:ring-green-100 shadow-lg transition-all duration-200 placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
