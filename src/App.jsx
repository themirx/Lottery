import { useMemo, useState } from "react";

const EMPTY_PARTICIPANTS = [""];

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

export default function App() {
  const [view, setView] = useState("home");
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
    setParticipants((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
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
              onClick={() => setView("game")}
            >
              <span className="action-badge">Game</span>
              <span className="action-title">Who Is the Bad Person?</span>
              <span className="action-desc">
                A playful social game for calling out the mischief.
              </span>
              <span className="action-cta">Enter the game</span>
            </button>
          </div>
        </section>
      )}

      {view === "lottery" && (
        <section className="page" key={`lottery-${step}`}>
          <header className="hero">
            <div className="hero-top">
              <span className="pill">Lottery Draw</span>
              <button className="ghost" type="button" onClick={() => setView("home")}>
                Back to main
              </button>
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
                        onChange={(event) => handleNameChange(index, event.target.value)}
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
                  {duplicatesRemoved === 1 ? " was" : "s were"} removed before drawing.
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
        <section className="page" key="game">
          <header className="hero">
            <div className="hero-top">
              <span className="pill">Party Game</span>
              <button className="ghost" type="button" onClick={() => setView("home")}>
                Back to main
              </button>
            </div>
            <h1>Who Is the Bad Person?</h1>
            <p>
              A quick social game space. Start here, then build the rules your way.
            </p>
          </header>

          <section className="card game-card">
            <h2>Game Lobby</h2>
            <p>
              This page is ready for the game flow. Add players, roles, and rounds
              when you are ready.
            </p>
            <button className="primary" type="button" onClick={() => setView("home")}>
              Return to main
            </button>
          </section>
        </section>
      )}
    </div>
  );
}
