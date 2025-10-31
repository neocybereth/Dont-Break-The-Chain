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
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

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
        const loadedStreaks = data.map((streak) => ({
          id: streak.id,
          name: streak.name,
          completedDates: new Set<string>(streak.completed_dates || []),
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
      // Trigger confetti!
      const rect = button.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x, y },
        colors: ["#16a34a", "#22c55e", "#86efac"],
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

    const dates = Array.from(completedDates)
      .map((d) => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < dates.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      const currentDate = new Date(dates[i]);
      currentDate.setHours(0, 0, 0, 0);

      if (currentDate.getTime() === expectedDate.getTime()) {
        streak++;
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
      {/* User info and sign out button */}
      <div className="absolute top-5 right-10 flex items-center gap-4">
        {user && (
          <div>
            <span className="text-sm text-gray-600 mr-2">{user.email}</span>
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
          <div className="text-center mb-12 relative">
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
                  >
                    <div className="flex items-center gap-6">
                      <div className="shrink-0 w-48">
                        <h3 className="text-2xl font-semibold text-gray-900">
                          {streak.name}
                        </h3>
                        {currentStreak > 0 && (
                          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-linear-to-r from-red-100 to-orange-100 rounded-full">
                            <span className="text-2xl">🔥</span>
                            <span className="text-sm font-bold text-red-600">
                              {currentStreak} day
                              {currentStreak !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
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
