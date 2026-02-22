import { useEffect, useMemo, useRef, useState } from "react";

const EMPTY_PARTICIPANTS = [""];
const MEMORY_TOKENS = ["Nova", "Pulse", "Echo", "Orbit", "Flux", "Glint"];
const RPS_CHOICES = ["Rock", "Paper", "Scissors"];
const QUICK_DIFFICULTY = {
  chill: { label: "Chill", target: 420, waitMin: 900, waitMax: 2200 },
  pro: { label: "Pro", target: 320, waitMin: 700, waitMax: 1700 },
};
const NUMBER_RANGE = { min: 1, max: 20 };
const NUMBER_ATTEMPTS = 5;
const MEMORY_MOVE_LIMIT = 12;
const RPS_TARGET = 3;

const normalizeNames = (names) => {
  const trimmed = names.map((name) => name.trim()).filter(Boolean);
  const unique = [];
  const seen = new Set();

  for (const name of trimmed) {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(name);
    }
  }

  return { trimmed, unique };
};

const shuffle = (values) => {
  const array = [...values];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function QuickTapGame() {
  const [status, setStatus] = useState("idle");
  const [prompt, setPrompt] = useState("Tap start to begin.");
  const [reaction, setReaction] = useState(null);
  const [best, setBest] = useState(null);
  const [lastOutcome, setLastOutcome] = useState(null);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [difficulty, setDifficulty] = useState("chill");
  const startRef = useRef(0);
  const timerRef = useRef(null);

  const config = QUICK_DIFFICULTY[difficulty];

  useEffect(() => {
    if (status !== "waiting") {
      return undefined;
    }

    const delay = getRandomInt(config.waitMin, config.waitMax);
    timerRef.current = setTimeout(() => {
      startRef.current = performance.now();
      setStatus("go");
      setPrompt("Tap now!");
    }, delay);

    return () => clearTimeout(timerRef.current);
  }, [status, config.waitMin, config.waitMax]);

  const startRound = () => {
    setReaction(null);
    setLastOutcome(null);
    setPrompt("Wait for the signal...");
    setStatus("waiting");
  };

  const handleTap = () => {
    if (status === "idle" || status === "result") {
      startRound();
      return;
    }

    if (status === "waiting") {
      clearTimeout(timerRef.current);
      setStatus("result");
      setPrompt("Too soon! You jumped early.");
      setReaction(null);
      setLastOutcome(false);
      setLosses((prev) => prev + 1);
      return;
    }

    if (status === "go") {
      const time = Math.round(performance.now() - startRef.current);
      const win = time <= config.target;
      setReaction(time);
      setPrompt(win ? "Lightning fast!" : "Too slow this time.");
      setStatus("result");
      setLastOutcome(win);
      setWins((prev) => prev + (win ? 1 : 0));
      setLosses((prev) => prev + (win ? 0 : 1));
      if (win) {
        setBest((prev) => (prev === null || time < prev ? time : prev));
      }
    }
  };

  return (
    <div className="game-stack">
      <div className="scoreboard">
        <div className="score-item">
          <span className="score-label">Wins</span>
          <span className="score-value">{wins}</span>
        </div>
        <div className="score-item">
          <span className="score-label">Losses</span>
          <span className="score-value">{losses}</span>
        </div>
        <div className="score-item">
          <span className="score-label">Best</span>
          <span className="score-value">{best ? `${best}ms` : "-"}</span>
        </div>
      </div>

      <div
        className={`tap-zone ${status}`}
        role="button"
        tabIndex={0}
        onClick={handleTap}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            handleTap();
          }
        }}
      >
        <span className="tap-title">{prompt}</span>
        <span className="tap-subtitle">
          Target: {config.target}ms or faster.
        </span>
        {reaction !== null && (
          <span className="tap-result">Reaction time: {reaction}ms</span>
        )}
      </div>

      <div className="game-controls">
        <label className="inline-field" htmlFor="difficulty">
          Difficulty
          <select
            id="difficulty"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
            disabled={status === "waiting" || status === "go"}
          >
            {Object.entries(QUICK_DIFFICULTY).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary"
          type="button"
          onClick={startRound}
          disabled={status === "waiting" || status === "go"}
        >
          Start round
        </button>
      </div>

      {status === "result" && (
        <div className={`result-banner ${lastOutcome ? "win" : "lose"}`}>
          {lastOutcome
            ? "Round complete. Tap again to retry."
            : reaction !== null
              ? "Too slow. Tap again to retry."
              : "False start. Tap again to retry."}
        </div>
      )}
    </div>
  );
}

function NumberGuessGame() {
  const [secret, setSecret] = useState(() =>
    getRandomInt(NUMBER_RANGE.min, NUMBER_RANGE.max)
  );
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState(
    `Guess a number between ${NUMBER_RANGE.min} and ${NUMBER_RANGE.max}.`
  );
  const [attemptsLeft, setAttemptsLeft] = useState(NUMBER_ATTEMPTS);
  const [status, setStatus] = useState("playing");
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (status !== "playing") {
      return;
    }

    const value = Number(guess);
    if (!Number.isInteger(value)) {
      setFeedback("Enter a whole number to lock in your guess.");
      return;
    }

    if (value < NUMBER_RANGE.min || value > NUMBER_RANGE.max) {
      setFeedback(`Stay between ${NUMBER_RANGE.min} and ${NUMBER_RANGE.max}.`);
      return;
    }

    if (value === secret) {
      setStatus("win");
      setWins((prev) => prev + 1);
      setFeedback("You nailed it! You win the round.");
      return;
    }

    const nextAttempts = attemptsLeft - 1;
    setAttemptsLeft(nextAttempts);
    setFeedback(value > secret ? "Too high. Try lower." : "Too low. Try higher.");

    if (nextAttempts <= 0) {
      setStatus("lose");
      setLosses((prev) => prev + 1);
      setFeedback(`No more tries. The number was ${secret}.`);
    }
  };

  const resetRound = () => {
    setSecret(getRandomInt(NUMBER_RANGE.min, NUMBER_RANGE.max));
    setGuess("");
    setAttemptsLeft(NUMBER_ATTEMPTS);
    setStatus("playing");
    setFeedback(
      `Guess a number between ${NUMBER_RANGE.min} and ${NUMBER_RANGE.max}.`
    );
  };

  return (
    <div className="game-stack">
      <div className="scoreboard">
        <div className="score-item">
          <span className="score-label">Wins</span>
          <span className="score-value">{wins}</span>
        </div>
        <div className="score-item">
          <span className="score-label">Losses</span>
          <span className="score-value">{losses}</span>
        </div>
        <div className="score-item">
          <span className="score-label">Attempts left</span>
          <span className="score-value">{attemptsLeft}</span>
        </div>
      </div>

      <form className="guess-form" onSubmit={handleSubmit}>
        <input
          className="guess-input"
          type="number"
          min={NUMBER_RANGE.min}
          max={NUMBER_RANGE.max}
          value={guess}
          placeholder="Enter your guess"
          onChange={(event) => setGuess(event.target.value)}
          disabled={status !== "playing"}
        />
        <button className="primary" type="submit" disabled={status !== "playing"}>
          Lock guess
        </button>
      </form>

      <div className="message info">{feedback}</div>

      {status !== "playing" && (
        <div className={`result-banner ${status}`}>
          {status === "win" ? "Victory!" : "Better luck next time."}
        </div>
      )}

      <button className="secondary" type="button" onClick={resetRound}>
        New round
      </button>
    </div>
  );
}

function RpsGame() {
  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);
  const [ties, setTies] = useState(0);
  const [roundResult, setRoundResult] = useState("Make your move.");
  const [status, setStatus] = useState("playing");

  const handlePick = (choice) => {
    if (status !== "playing") {
      return;
    }

    const cpuChoice =
      RPS_CHOICES[Math.floor(Math.random() * RPS_CHOICES.length)];

    if (choice === cpuChoice) {
      setTies((prev) => prev + 1);
      setRoundResult(`Tie! Both chose ${choice}.`);
      return;
    }

    const winMap = {
      Rock: "Scissors",
      Paper: "Rock",
      Scissors: "Paper",
    };
    const playerWon = winMap[choice] === cpuChoice;

    const nextPlayer = playerScore + (playerWon ? 1 : 0);
    const nextCpu = cpuScore + (playerWon ? 0 : 1);
    setPlayerScore(nextPlayer);
    setCpuScore(nextCpu);
    setRoundResult(
      playerWon
        ? `You win the round! ${choice} beats ${cpuChoice}.`
        : `You lose the round. ${cpuChoice} beats ${choice}.`
    );

    if (nextPlayer >= RPS_TARGET || nextCpu >= RPS_TARGET) {
      setStatus(nextPlayer > nextCpu ? "win" : "lose");
    }
  };

  const resetMatch = () => {
    setPlayerScore(0);
    setCpuScore(0);
    setTies(0);
    setRoundResult("Make your move.");
    setStatus("playing");
  };

  return (
    <div className="game-stack">
      <div className="scoreboard">
        <div className="score-item">
          <span className="score-label">You</span>
          <span className="score-value">{playerScore}</span>
        </div>
        <div className="score-item">
          <span className="score-label">CPU</span>
          <span className="score-value">{cpuScore}</span>
        </div>
        <div className="score-item">
          <span className="score-label">Ties</span>
          <span className="score-value">{ties}</span>
        </div>
      </div>

      <div className="rps-options">
        {RPS_CHOICES.map((choice) => (
          <button
            key={choice}
            className="rps-card"
            type="button"
            onClick={() => handlePick(choice)}
            disabled={status !== "playing"}
          >
            <span className="rps-title">{choice}</span>
          </button>
        ))}
      </div>

      <div className="message info">{roundResult}</div>

      {status !== "playing" && (
        <div className={`result-banner ${status}`}>
          {status === "win" ? "Match won!" : "CPU takes the match."}
        </div>
      )}

      <button className="secondary" type="button" onClick={resetMatch}>
        Reset match
      </button>
    </div>
  );
}

function MemoryMatchGame() {
  const buildDeck = () =>
    shuffle(
      MEMORY_TOKENS.flatMap((token) => [
        { id: `${token}-a`, value: token },
        { id: `${token}-b`, value: token },
      ])
    );

  const [cards, setCards] = useState(() => buildDeck());
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [status, setStatus] = useState("playing");
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);

  useEffect(() => {
    if (flipped.length !== 2) {
      return undefined;
    }

    const [first, second] = flipped;
    const isMatch = cards[first].value === cards[second].value;

    const timer = setTimeout(() => {
      setMoves((prev) => prev + 1);
      if (isMatch) {
        setMatched((prev) => [...prev, first, second]);
      }
      setFlipped([]);
    }, 600);

    return () => clearTimeout(timer);
  }, [flipped, cards]);

  useEffect(() => {
    if (status !== "playing") {
      return;
    }

    if (matched.length === cards.length) {
      setStatus("win");
      setWins((prev) => prev + 1);
      return;
    }

    if (moves >= MEMORY_MOVE_LIMIT) {
      setStatus("lose");
      setLosses((prev) => prev + 1);
    }
  }, [matched.length, moves, cards.length, status]);

  const handleFlip = (index) => {
    if (status !== "playing") {
      return;
    }

    if (flipped.includes(index) || matched.includes(index)) {
      return;
    }

    if (flipped.length === 2) {
      return;
    }

    setFlipped((prev) => [...prev, index]);
  };

  const resetGame = () => {
    setCards(buildDeck());
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setStatus("playing");
  };

  return (
    <div className="game-stack">
      <div className="scoreboard">
        <div className="score-item">
          <span className="score-label">Wins</span>
          <span className="score-value">{wins}</span>
        </div>
        <div className="score-item">
          <span className="score-label">Losses</span>
          <span className="score-value">{losses}</span>
        </div>
        <div className="score-item">
          <span className="score-label">Moves left</span>
          <span className="score-value">{MEMORY_MOVE_LIMIT - moves}</span>
        </div>
      </div>

      <div className="memory-grid">
        {cards.map((card, index) => {
          const isRevealed = flipped.includes(index) || matched.includes(index);
          return (
            <button
              key={card.id}
              type="button"
              className={`memory-card ${isRevealed ? "flipped" : ""} ${
                matched.includes(index) ? "matched" : ""
              }`}
              onClick={() => handleFlip(index)}
            >
              <span className="memory-face">
                {isRevealed ? card.value : "?"}
              </span>
            </button>
          );
        })}
      </div>

      {status !== "playing" && (
        <div className={`result-banner ${status}`}>
          {status === "win" ? "Perfect match!" : "Move limit reached."}
        </div>
      )}

      <button className="secondary" type="button" onClick={resetGame}>
        Shuffle cards
      </button>
    </div>
  );
}

const GAMES = [
  {
    id: "quick-tap",
    title: "Quick Tap",
    tag: "Reflex",
    description: "Wait for the signal, then tap as fast as you can.",
    cta: "Play Quick Tap",
    accent: "#0ea5e9",
    component: QuickTapGame,
  },
  {
    id: "number-guess",
    title: "Number Guess",
    tag: "Logic",
    description: "Crack the hidden number before your attempts run out.",
    cta: "Play Number Guess",
    accent: "#f97316",
    component: NumberGuessGame,
  },
  {
    id: "rps",
    title: "Rock Paper Scissors",
    tag: "Duel",
    description: "First to three wins. Outsmart the CPU.",
    cta: "Play RPS",
    accent: "#10b981",
    component: RpsGame,
  },
  {
    id: "memory-match",
    title: "Memory Match",
    tag: "Focus",
    description: "Match all pairs before you run out of moves.",
    cta: "Play Memory Match",
    accent: "#6366f1",
    component: MemoryMatchGame,
  },
];

function GameMenu({ onSelect, onBack }) {
  return (
    <>
      <header className="hero home-hero">
        <div className="hero-top">
          <span className="pill">Mini Games</span>
          <div className="hero-actions">
            <button className="ghost" type="button" onClick={onBack}>
              Back to main
            </button>
          </div>
        </div>
        <h1>Pick a Game</h1>
        <p>Short, competitive rounds designed for quick fun.</p>
      </header>

      <div className="game-grid">
        {GAMES.map((game) => (
          <button
            key={game.id}
            className="game-card"
            type="button"
            style={{ "--accent": game.accent }}
            onClick={() => onSelect(game.id)}
          >
            <span className="game-tag">{game.tag}</span>
            <span className="game-title">{game.title}</span>
            <span className="game-desc">{game.description}</span>
            <span className="game-cta">{game.cta}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export default function App() {
  const [view, setView] = useState("home");
  const [gameId, setGameId] = useState(null);
  const [participants, setParticipants] = useState(EMPTY_PARTICIPANTS);
  const [winnerCount, setWinnerCount] = useState("1");
  const [step, setStep] = useState("form");
  const [winners, setWinners] = useState([]);
  const [error, setError] = useState("");
  const [duplicatesRemoved, setDuplicatesRemoved] = useState(0);

  const participantCount = useMemo(
    () => normalizeNames(participants).unique.length,
    [participants]
  );

  const activeGame = GAMES.find((game) => game.id === gameId);
  const ActiveGameComponent = activeGame?.component;

  const handleNameChange = (index, value) => {
    setParticipants((prev) =>
      prev.map((name, currentIndex) =>
        currentIndex === index ? value : name
      )
    );
  };

  const addParticipant = () => {
    setParticipants((prev) => [...prev, ""]);
  };

  const removeParticipant = (index) => {
    setParticipants((prev) =>
      prev.filter((_, currentIndex) => currentIndex !== index)
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const { trimmed, unique } = normalizeNames(participants);
    const count = Number(winnerCount);

    if (!Number.isInteger(count) || count <= 0) {
      setError("Please enter a valid number of winners.");
      return;
    }

    if (unique.length === 0) {
      setError("Add at least one participant before drawing winners.");
      return;
    }

    if (count > unique.length) {
      setError("Number of winners cannot exceed the number of participants.");
      return;
    }

    const removed = trimmed.length - unique.length;
    setDuplicatesRemoved(removed);

    const selected = shuffle(unique).slice(0, count);
    setWinners(selected);
    setError("");
    setStep("results");
  };

  const handleReset = () => {
    setParticipants(EMPTY_PARTICIPANTS);
    setWinnerCount("1");
    setWinners([]);
    setError("");
    setDuplicatesRemoved(0);
    setStep("form");
  };

  return (
    <div className="app">
      {view === "home" && (
        <section className="page" key="home">
          <header className="hero home-hero">
            <span className="pill">Party Hub</span>
            <h1>Choose Your Next Move</h1>
            <p>
              Pick an activity to kick things off. Smooth, modern, and ready for a
              draw.
            </p>
          </header>

          <div className="action-grid">
            <button
              className="action-card"
              type="button"
              onClick={() => setView("lottery")}
            >
              <span className="action-badge">Luck</span>
              <span className="action-title">Lottery</span>
              <span className="action-desc">
                Build a list of names and draw winners instantly.
              </span>
              <span className="action-cta">Start the draw</span>
            </button>

            <button
              className="action-card alt"
              type="button"
              onClick={() => {
                setGameId(null);
                setView("game");
              }}
            >
              <span className="action-badge">Games</span>
              <span className="action-title">Mini Games</span>
              <span className="action-desc">
                Jump into fast-paced challenges and track your score.
              </span>
              <span className="action-cta">Open the arcade</span>
            </button>
          </div>
        </section>
      )}

      {view === "lottery" && (
        <section className="page" key={`lottery-${step}`}>
          <header className="hero">
            <div className="hero-top">
              <span className="pill">Lottery Draw</span>
              <div className="hero-actions">
                <button
                  className="ghost"
                  type="button"
                  onClick={() => setView("home")}
                >
                  Back to main
                </button>
              </div>
            </div>
            <h1>Lucky Winner Selector</h1>
            <p>
              Create a list, draw winners instantly, and keep the results clean and
              fair.
            </p>
          </header>

          {step === "form" ? (
            <section className="card">
              <form onSubmit={handleSubmit} className="form">
                <div className="section-header">
                  <div>
                    <h2>Participants</h2>
                    <p>
                      Enter each participant name once. Duplicates are removed
                      automatically.
                    </p>
                  </div>
                  <div className="count-chip">{participantCount} ready</div>
                </div>

                <div className="participants">
                  {participants.map((name, index) => (
                    <div className="participant-row" key={`participant-${index}`}>
                      <label className="sr-only" htmlFor={`participant-${index}`}>
                        Participant {index + 1}
                      </label>
                      <input
                        id={`participant-${index}`}
                        type="text"
                        placeholder={`Participant ${index + 1}`}
                        value={name}
                        onChange={(event) =>
                          handleNameChange(index, event.target.value)
                        }
                      />
                      <button
                        className="ghost"
                        type="button"
                        onClick={() => removeParticipant(index)}
                        disabled={participants.length === 1}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <button className="secondary" type="button" onClick={addParticipant}>
                  + Add another
                </button>

                <div className="field">
                  <label htmlFor="winner-count">Number of winners</label>
                  <input
                    id="winner-count"
                    type="number"
                    min="1"
                    step="1"
                    value={winnerCount}
                    onChange={(event) => setWinnerCount(event.target.value)}
                  />
                </div>

                {error && <div className="message error">{error}</div>}

                <button className="primary" type="submit">
                  Draw winners
                </button>
              </form>
            </section>
          ) : (
            <section className="card results">
              <div className="section-header">
                <div>
                  <h2>Winning Names</h2>
                  <p>Results generated instantly with no repeat winners.</p>
                </div>
                <div className="count-chip">{winners.length} winners</div>
              </div>

              <div className="winner-list">
                {winners.map((winner, index) => (
                  <div
                    className="winner-item"
                    style={{ "--i": index }}
                    key={`${winner}-${index}`}
                  >
                    <span className="winner-rank">#{index + 1}</span>
                    <span className="winner-name">{winner}</span>
                  </div>
                ))}
              </div>

              {duplicatesRemoved > 0 && (
                <div className="message info">
                  {duplicatesRemoved} duplicate name
                  {duplicatesRemoved === 1 ? " was" : "s were"} removed before
                  drawing.
                </div>
              )}

              <button className="primary" type="button" onClick={handleReset}>
                Reset draw
              </button>
            </section>
          )}
        </section>
      )}

      {view === "game" && (
        <section className="page" key={gameId ?? "game-menu"}>
          {gameId && ActiveGameComponent ? (
            <>
              <header className="hero">
                <div className="hero-top">
                  <span className="pill">{activeGame.tag}</span>
                  <div className="hero-actions">
                    <button
                      className="ghost"
                      type="button"
                      onClick={() => setGameId(null)}
                    >
                      Game menu
                    </button>
                    <button
                      className="ghost"
                      type="button"
                      onClick={() => setView("home")}
                    >
                      Main menu
                    </button>
                  </div>
                </div>
                <h1>{activeGame.title}</h1>
                <p>{activeGame.description}</p>
              </header>
              <section className="card game-panel">
                <ActiveGameComponent />
              </section>
            </>
          ) : (
            <GameMenu onSelect={setGameId} onBack={() => setView("home")} />
          )}
        </section>
      )}
    </div>
  );
}
