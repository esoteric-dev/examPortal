"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// Client-only wrapper to prevent hydration mismatches
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading quiz...</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

type MCQQuestion = { text: string; options: string[]; correctIndex: number };
type Quiz = {
  id: string;
  title: string;
  description?: string;
  timeLimitSeconds?: number;
  questions: MCQQuestion[];
  createdAt: string;
};

function TakeQuizPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [studentName, setStudentName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedAtIso, setStartedAtIso] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const hasAutoSubmittedRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visited, setVisited] = useState<boolean[]>([]);
  const [marked, setMarked] = useState<boolean[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenRequested, setFullscreenRequested] = useState(false);
  const [enteringFullscreen, setEnteringFullscreen] = useState(false);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [showExitFullscreenPopup, setShowExitFullscreenPopup] = useState(false);
  const [isUnmounting, setIsUnmounting] = useState(false);
  const [escPressed, setEscPressed] = useState(false);
  useEffect(() => {
    
    (async () => {
      const res = await fetch("/api/quizzes");
      const data: Quiz[] = await res.json();
      const found = data.find((q) => q.id === params.id);
      if (found) {
        setQuiz(found);
        setSelected(new Array(found.questions.length).fill(-1));
        setVisited(new Array(found.questions.length).fill(false));
        setMarked(new Array(found.questions.length).fill(false));
        const nowIso = new Date().toISOString();
        setStartedAtIso(nowIso);
        if (found.timeLimitSeconds) setRemaining(found.timeLimitSeconds);
        
        // Auto-enter fullscreen when quiz starts
        setTimeout(() => {
          if (document.fullscreenEnabled) {
            enterFullscreen();
          } else {
            setShowFullscreenModal(true);
          }
        }, 1000);
      }
    })();
  }, [params.id]);

  // countdown
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz) return;
    setSubmitting(true);
    setIsUnmounting(true); // Prevent fullscreen operations during submission
    setError(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: quiz.id, selectedIndices: selected, studentName, startedAtIso }),
      });
      if (!res.ok) throw new Error("Failed to submit answers");
      router.push(`/student/quiz/${quiz.id}/results`);
    } catch (err) {
      setError((err as Error).message);
      setIsUnmounting(false); // Reset if submission fails
    } finally {
      setSubmitting(false);
    }
  }, [quiz, selected, studentName, startedAtIso, router]);

  useEffect(() => {
    if (remaining == null) return;
    if (remaining <= 0) {
      // auto submit
      (async () => {
        if (!submitting) {
          const mockFormEvent = {
            preventDefault: () => {},
            target: null,
            currentTarget: null,
          } as unknown as React.FormEvent;
          await handleSubmit(mockFormEvent);
        }
      })();
      return;
    }
    const id = window.setTimeout(() => setRemaining((r) => (r == null ? r : r - 1)), 1000);
    tickRef.current = id;
    return () => {
      if (tickRef.current) window.clearTimeout(tickRef.current);
    };
  }, [remaining, submitting, handleSubmit]);

  // fullscreen detection
  useEffect(() => {
    function isFullscreenNow(): boolean {
      const d = document as Document & {
        webkitFullscreenElement?: Element;
        mozFullScreenElement?: Element;
        msFullscreenElement?: Element;
      };
      return !!(
        document.fullscreenElement ||
        d.webkitFullscreenElement ||
        d.mozFullScreenElement ||
        d.msFullscreenElement
      );
    }

    const requestAutoSubmit = async () => {
      if (hasAutoSubmittedRef.current || submitting || isUnmounting) return;
      hasAutoSubmittedRef.current = true;
      const mockFormEvent = {
        preventDefault: () => {},
        target: null,
        currentTarget: null,
      } as unknown as React.FormEvent;
      await handleSubmit(mockFormEvent);
    };

    const handleFullscreenChange = () => {
      if (isUnmounting) return; // Don't handle fullscreen changes during submission
      const isCurrentlyFullscreen = isFullscreenNow();
      const wasFullscreen = isFullscreen;
      
      console.log('Fullscreen change:', { wasFullscreen, isCurrentlyFullscreen, fullscreenRequested, showExitFullscreenPopup, escPressed });
      
      setIsFullscreen(isCurrentlyFullscreen);
      
      // If user exits fullscreen and quiz was started in fullscreen, show popup immediately
      if (fullscreenRequested && (wasFullscreen && !isCurrentlyFullscreen) && !showExitFullscreenPopup) {
        console.log('Showing exit popup immediately');
        setShowExitFullscreenPopup(true);
      }
      
      // Also check if ESC was pressed and we're no longer in fullscreen
      if (escPressed && !isCurrentlyFullscreen && fullscreenRequested && !showExitFullscreenPopup) {
        console.log('ESC was pressed and fullscreen exited, showing popup');
        setShowExitFullscreenPopup(true);
        setEscPressed(false); // Reset the flag
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange as EventListener);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange as EventListener);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange as EventListener);

    // Periodic check to catch fullscreen exits that might be missed
    const fullscreenCheckInterval = setInterval(() => {
      if (isUnmounting) return;
      const isCurrentlyFullscreen = isFullscreenNow();
      
      if (fullscreenRequested && isFullscreen && !isCurrentlyFullscreen && !showExitFullscreenPopup) {
        console.log('Periodic check: Fullscreen exited, showing popup');
        setShowExitFullscreenPopup(true);
      }
      
      // Also check if ESC was pressed and we're no longer in fullscreen
      if (escPressed && !isCurrentlyFullscreen && fullscreenRequested && !showExitFullscreenPopup) {
        console.log('Periodic check: ESC was pressed and fullscreen exited, showing popup');
        setShowExitFullscreenPopup(true);
        setEscPressed(false); // Reset the flag
      }
      
      setIsFullscreen(isCurrentlyFullscreen);
    }, 500); // Check more frequently

    // Fallback: if page becomes hidden after fullscreen requested, attempt submit
    const handleVisibility = () => {
      if (isUnmounting) return; // Don't handle visibility changes during submission
      if (fullscreenRequested && document.visibilityState === "hidden") {
        void requestAutoSubmit();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Listen for ESC key to detect fullscreen exit
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenRequested && !showExitFullscreenPopup) {
        console.log('ESC key pressed, setting flag');
        setEscPressed(true);
        // Also try to show popup immediately
        setTimeout(() => {
          if (fullscreenRequested && !showExitFullscreenPopup) {
            console.log('ESC key: Showing popup after timeout');
            setShowExitFullscreenPopup(true);
          }
        }, 50);
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // Additional detection for window focus/blur events
    const handleWindowBlur = () => {
      if (fullscreenRequested && isFullscreen && !showExitFullscreenPopup) {
        console.log('Window blur detected, showing popup');
        setShowExitFullscreenPopup(true);
      }
    };
    window.addEventListener("blur", handleWindowBlur);

    // Listen for page visibility changes
    const handlePageVisibilityChange = () => {
      if (fullscreenRequested && isFullscreen && document.visibilityState === 'visible' && !showExitFullscreenPopup) {
        console.log('Page visibility change detected, showing popup');
        setShowExitFullscreenPopup(true);
      }
    };
    document.addEventListener("visibilitychange", handlePageVisibilityChange);

    // Add a more aggressive detection using multiple events
    const handleAggressiveDetection = () => {
      if (fullscreenRequested && !showExitFullscreenPopup) {
        const isCurrentlyFullscreen = isFullscreenNow();
        if (!isCurrentlyFullscreen && isFullscreen) {
          console.log('Aggressive detection: Fullscreen exited, showing popup');
          setShowExitFullscreenPopup(true);
        }
      }
    };

    // Listen for multiple events that might indicate fullscreen exit
    document.addEventListener("fullscreenchange", handleAggressiveDetection);
    document.addEventListener("webkitfullscreenchange", handleAggressiveDetection);
    document.addEventListener("mozfullscreenchange", handleAggressiveDetection);
    document.addEventListener("MSFullscreenChange", handleAggressiveDetection);
    window.addEventListener("resize", handleAggressiveDetection);

    return () => {
      clearInterval(fullscreenCheckInterval);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange as EventListener);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange as EventListener);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange as EventListener);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handlePageVisibilityChange);
      document.removeEventListener("fullscreenchange", handleAggressiveDetection);
      document.removeEventListener("webkitfullscreenchange", handleAggressiveDetection);
      document.removeEventListener("mozfullscreenchange", handleAggressiveDetection);
      document.removeEventListener("MSFullscreenChange", handleAggressiveDetection);
      window.removeEventListener("resize", handleAggressiveDetection);
    };
  }, [fullscreenRequested, submitting, handleSubmit, isUnmounting, isFullscreen, showExitFullscreenPopup, escPressed]);

  // Cleanup effect to handle component unmounting
  useEffect(() => {
    return () => {
      setIsUnmounting(true);
    };
  }, []);


  async function enterFullscreen() {
    try {
      setEnteringFullscreen(true);
      setShowFullscreenModal(false);
      setShowExitFullscreenPopup(false);
      await document.documentElement.requestFullscreen();
      setFullscreenRequested(true);
      setIsFullscreen(true);
    } catch (err) {
      console.error('Failed to enter fullscreen:', err);
      setShowFullscreenModal(true);
    } finally {
      setEnteringFullscreen(false);
    }
  }

  async function handleExitFullscreenPopup(action: 'continue' | 'submit') {
    setShowExitFullscreenPopup(false);
    if (action === 'submit') {
      const mockFormEvent = {
        preventDefault: () => {},
        target: null,
        currentTarget: null,
      } as unknown as React.FormEvent;
      await handleSubmit(mockFormEvent);
    } else {
      // User chose to continue, re-enter fullscreen
      await enterFullscreen();
    }
  }


  function formatHMS(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  }

  function goTo(index: number) {
    if (!quiz) return;
    const clamped = Math.max(0, Math.min(index, quiz.questions.length - 1));
    setCurrentIndex(clamped);
    setVisited((v) => {
      const copy = [...v];
      copy[clamped] = true;
      return copy;
    });
  }

  const answered = useMemo(() => selected.map((v) => v >= 0), [selected]);

  if (!quiz) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-gray-500">Loading quiz...</p>
      </main>
    );
  }

  // Show fullscreen modal if required
  if (showFullscreenModal) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Fullscreen Required</h3>
            <p className="text-sm text-gray-500 mb-6">
              This quiz must be taken in fullscreen mode for security reasons. Please enable fullscreen to continue.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={enterFullscreen}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Enable Fullscreen
              </button>
              <button
                onClick={() => router.push("/student")}
                className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Back to Dashboard
              </button>
            </div>
            <div className="mt-4 text-xs text-gray-400">
              <p>If fullscreen is not working:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Check if your browser allows fullscreen</li>
                <li>Try refreshing the page</li>
                <li>Use a different browser</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Show exit fullscreen popup
  if (showExitFullscreenPopup) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4 border-4 border-yellow-400">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
              <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">⚠️ Fullscreen Exited</h3>
            <p className="text-lg text-gray-700 mb-8">
              You have exited fullscreen mode. For security reasons, you must either re-enter fullscreen or submit your quiz now.
            </p>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => handleExitFullscreenPopup('continue')}
                className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 text-lg font-semibold transition-all duration-200"
              >
                🔄 Re-enter Fullscreen
              </button>
              <button
                onClick={() => handleExitFullscreenPopup('submit')}
                className="w-full bg-green-600 text-white px-6 py-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 text-lg font-semibold transition-all duration-200"
              >
                ✅ Submit Quiz Now
              </button>
            </div>
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ Note: Exiting fullscreen during a quiz is not recommended as it may affect your progress.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className={`min-h-screen p-8 ${isFullscreen ? 'bg-white' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{quiz.title}</h1>
            {enteringFullscreen && (
              <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg border border-blue-200">
                Entering fullscreen...
              </div>
            )}
          </div>
          {quiz.description && (
            <p className="text-gray-600 mb-4 text-lg">{quiz.description}</p>
          )}
          <div className="flex flex-wrap gap-4 items-center">
            {quiz.timeLimitSeconds != null && (
              <div className="rounded-lg border border-gray-200 p-3 bg-white shadow-sm">
                <span className="text-sm text-gray-700 font-medium" suppressHydrationWarning>
                  Time remaining: {formatHMS(remaining ?? quiz.timeLimitSeconds)}
                </span>
              </div>
            )}
            {isFullscreen && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Fullscreen Mode:</strong> Exiting fullscreen will show a popup with options.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Question Section */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-lg border border-gray-200 p-6 space-y-4 bg-white shadow-sm">
                <div className="font-medium text-lg text-gray-900">Q{currentIndex + 1}. {quiz.questions[currentIndex].text}</div>
                <div className="space-y-3">
                  {quiz.questions[currentIndex].options.map((opt, oi) => (
                    <label key={oi} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name={`q-${currentIndex}`}
                        checked={selected[currentIndex] === oi}
                        onChange={() => {
                          const copy = [...selected];
                          copy[currentIndex] = oi;
                          setSelected(copy);
                          setVisited((v) => {
                            const vv = [...v];
                            vv[currentIndex] = true;
                            return vv;
                          });
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={() => goTo(currentIndex - 1)}
                    disabled={currentIndex === 0}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={() => goTo(currentIndex + 1)}
                    disabled={quiz.questions.length - 1 === currentIndex}
                  >
                    Next
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className={`px-4 py-2 border rounded-lg transition-colors ${marked[currentIndex] ? "bg-yellow-100 border-yellow-300 text-yellow-800" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                    onClick={() => setMarked((m) => {
                      const copy = [...m];
                      copy[currentIndex] = !copy[currentIndex];
                      return copy;
                    })}
                  >
                    {marked[currentIndex] ? "Unmark" : "Mark for review"}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setSelected((s) => {
                      const copy = [...s];
                      copy[currentIndex] = -1;
                      return copy;
                    })}
                  >
                    Clear response
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 text-white px-6 py-2 hover:bg-blue-700 disabled:opacity-60 transition-colors font-medium"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </div>
              {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            </form>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {/* Question Palette */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm mb-6">
                <div className="text-sm font-medium mb-3 text-gray-900">Question Palette</div>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {quiz.questions.map((_, i) => {
                    const isVisited = visited[i];
                    const isMarked = marked[i];
                    const isAnswered = answered[i];
                    const both = isMarked && isAnswered;
                    const color = both
                      ? "bg-purple-600 text-white border-purple-600"
                      : isMarked
                      ? "bg-yellow-500 text-black border-yellow-500"
                      : isAnswered
                      ? "bg-green-600 text-white border-green-600"
                      : isVisited
                      ? "bg-gray-300 text-black border-gray-300"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50";
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`h-8 w-8 rounded-md text-xs font-medium border transition-colors ${color}`}
                        onClick={() => goTo(i)}
                        title={`Go to question ${i + 1}`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 bg-white border border-gray-300 rounded" /> Unvisited</div>
                  <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 bg-gray-300 rounded" /> Visited</div>
                  <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 bg-green-600 rounded" /> Answered</div>
                  <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 bg-yellow-500 rounded" /> Marked</div>
                  <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 bg-purple-600 rounded" /> Answered + Marked</div>
                </div>
              </div>

              {/* Student Name Input */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                <label className="block text-sm font-medium mb-2 text-gray-700">Your name (optional)</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g., Alex"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function TakeQuizPage() {
  return (
    <ClientOnly>
      <TakeQuizPageContent />
    </ClientOnly>
  );
}



