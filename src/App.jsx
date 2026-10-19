import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ChevronDown, Moon, Sun, Clock, Info, CheckCircle2, RotateCcw } from 'lucide-react';
import './index.css';

// Load Curtailment Programme - Receiving Station NADIHAL
// W.E.F. 18-10-2026
// F1-Nadihal, F2-Garoora, F3-Aragam
const SCHEDULE_DATA = {
  Sunday:    ["F1", "F2", "F3", "F1", "F2", "F3", "F1", "F2", "F3"],
  Monday:    ["F2", "F3", "F1", "F2", "F3", "F1", "F2", "F3", "F1"],
  Tuesday:   ["F3", "F1", "F2", "F3", "F1", "F2", "F3", "F1", "F2"],
  Wednesday: ["F1", "F2", "F3", "F1", "F2", "F3", "F1", "F2", "F3"],
  Thursday:  ["F2", "F3", "F1", "F2", "F3", "F1", "F2", "F3", "F1"],
  Friday:    ["F3", "F1", "F2", "F3", "F1", "F2", "F3", "F1", "F2"],
  Saturday:  ["F1", "F2", "F3", "F1", "F2", "F3", "F1", "F2", "F3"],
};

const CUT_TIMES = [
  "7–8 AM", "8–9 AM", "9–10 AM",
  "1–2 PM", "2–3 PM", "3–4 PM",
  "6–7 PM", "7–8 PM", "8–9 PM",
];

const FEEDERS = {
  F1: { name: "Nadihal", areas: "Nadihal, Gundidachina, Brar", css: "f1" },
  F2: { name: "Garoora", areas: "Garoora, SK Payeen", css: "f2" },
  F3: { name: "Aragam", areas: "Aragam, Chittibanday", css: "f3" },
};

const FULL_SUPPLY_WINDOWS = [
  { id: "morning", label: "10:00 AM – 1:00 PM", hours: "10 AM – 1 PM", duration: "3h", icon: Sun, type: "Daytime Supply" },
  { id: "evening", label: "4:00 PM – 6:00 PM", hours: "4 PM – 6 PM", duration: "2h", icon: Sun, type: "Evening Supply" },
  { id: "night",   label: "9:00 PM – 7:00 AM", hours: "9 PM – 7 AM", duration: "10h", icon: Moon, type: "Overnight Supply" },
];

const DAYS = Object.keys(SCHEDULE_DATA);
const DAY_LABEL = {
  Sunday: "Sun",
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
};

function getLiveStatus(now, daySchedule) {
  const hour = now.getHours();
  const min = now.getMinutes();
  const minLeftInSlot = 59 - min;

  // Daytime Full Supply 10 AM – 1 PM (hours 10, 11, 12)
  if (hour >= 10 && hour < 13) {
    const totalMinLeft = (12 - hour) * 60 + minLeftInSlot;
    return {
      isCut: false,
      activeWindow: "morning",
      title: "All Feeders ON",
      windowName: "Daytime Full Supply",
      windowTime: "10:00 AM – 1:00 PM",
      remainingText: `${totalMinLeft}m left`,
      feeder: null,
    };
  }

  // Daytime Full Supply 4 PM – 6 PM (hours 16, 17)
  if (hour >= 16 && hour < 18) {
    const totalMinLeft = (17 - hour) * 60 + minLeftInSlot;
    return {
      isCut: false,
      activeWindow: "evening",
      title: "All Feeders ON",
      windowName: "Evening Full Supply",
      windowTime: "4:00 PM – 6:00 PM",
      remainingText: `${totalMinLeft}m left`,
      feeder: null,
    };
  }

  // Overnight Full Supply 9 PM – 7 AM (hours 21..23, 0..6)
  if (hour >= 21 || hour < 7) {
    const hoursRemaining = hour >= 21 ? (24 - hour + 6) : (6 - hour);
    const totalMinLeft = hoursRemaining * 60 + minLeftInSlot;
    const formattedLeft = totalMinLeft >= 60 ? `${Math.floor(totalMinLeft / 60)}h ${totalMinLeft % 60}m left` : `${totalMinLeft}m left`;
    return {
      isCut: false,
      activeWindow: "night",
      title: "All Feeders ON",
      windowName: "Overnight Full Supply",
      windowTime: "9:00 PM – 7:00 AM",
      remainingText: formattedLeft,
      feeder: null,
    };
  }

  // Active Cut Hours:
  // 7..9   -> slots 0, 1, 2 (7-8 AM, 8-9 AM, 9-10 AM)
  // 13..15 -> slots 3, 4, 5 (1-2 PM, 2-3 PM, 3-4 PM)
  // 18..20 -> slots 6, 7, 8 (6-7 PM, 7-8 PM, 8-9 PM)
  let cutIdx = -1;
  if (hour >= 7 && hour < 10) {
    cutIdx = hour - 7;
  } else if (hour >= 13 && hour < 16) {
    cutIdx = 3 + (hour - 13);
  } else if (hour >= 18 && hour < 21) {
    cutIdx = 6 + (hour - 18);
  }

  if (cutIdx >= 0 && daySchedule[cutIdx]) {
    const offFeeder = daySchedule[cutIdx];
    return {
      isCut: true,
      activeWindow: null,
      cutIdx,
      feeder: offFeeder,
      slotLabel: CUT_TIMES[cutIdx],
      remainingText: `${minLeftInSlot}m left in slot`,
    };
  }

  return {
    isCut: false,
    activeWindow: null,
    title: "All Feeders ON",
    windowName: "Normal Supply",
    windowTime: "All areas powered",
    remainingText: "",
    feeder: null,
  };
}

function App() {
  const todayIdx = new Date().getDay();
  const [selected, setSelected] = useState(DAYS[todayIdx]);
  const [expanded, setExpanded] = useState(null);
  const [showNotes, setShowNotes] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const isToday = selected === DAYS[todayIdx];
  const schedule = SCHEDULE_DATA[selected];
  const liveStatus = getLiveStatus(now, SCHEDULE_DATA[DAYS[todayIdx]]);

  // Group curtailment times by feeder for selected day
  const feederTimes = { F1: [], F2: [], F3: [] };
  schedule.forEach((f, i) => {
    const isCurrent = isToday && liveStatus.isCut && liveStatus.cutIdx === i;
    feederTimes[f].push({ time: CUT_TIMES[i], isCurrent, slotIdx: i });
  });

  const toggle = (id) => setExpanded(expanded === id ? null : id);

  return (
    <div className="app">
      {/* Header */}
      <header>
        <div className="logo"><Zap size={18} /></div>
        <h1>Nadihal Power Schedule</h1>
        <div className="wef-badge">
          <span className="wef-dot" />
          <span>W.E.F. 18-10-2026</span>
        </div>
      </header>

      {/* Day Picker */}
      <div className="days">
        {DAYS.map(d => (
          <button
            key={d}
            className={`day ${selected === d ? 'on' : ''}`}
            onClick={() => { setSelected(d); setExpanded(null); }}
          >
            {DAY_LABEL[d]}
            {DAYS[todayIdx] === d && <span className="pip" />}
          </button>
        ))}
      </div>

      {/* Status Hero */}
      {isToday ? (
        liveStatus.isCut && liveStatus.feeder ? (
          <div className={`hero hero-${FEEDERS[liveStatus.feeder].css}`}>
            <div className="hero-top-row">
              <span className="hero-tag hero-tag-off">CURRENTLY OFF</span>
              <span className="hero-timer">
                <Clock size={11} />
                {liveStatus.remainingText}
              </span>
            </div>
            <div className="hero-feeder">
              {liveStatus.feeder} · {FEEDERS[liveStatus.feeder].name}
            </div>
            <div className="hero-areas">{FEEDERS[liveStatus.feeder].areas}</div>
            <div className="hero-slot-info">Slot: {liveStatus.slotLabel}</div>
          </div>
        ) : (
          <div className="hero hero-on">
            <div className="hero-top-row">
              <span className="hero-tag hero-tag-on">
                <CheckCircle2 size={11} /> ALL FEEDERS ON
              </span>
              {liveStatus.remainingText && (
                <span className="hero-timer">
                  <Clock size={11} />
                  {liveStatus.remainingText}
                </span>
              )}
            </div>
            <div className="hero-feeder">{liveStatus.windowName}</div>
            <div className="hero-areas">{liveStatus.windowTime} · All areas have power</div>
          </div>
        )
      ) : (
        <div className="hero hero-preview">
          <div className="hero-top-row">
            <span className="hero-tag hero-tag-preview">VIEWING SCHEDULE</span>
            <button className="jump-today-btn" onClick={() => setSelected(DAYS[todayIdx])}>
              <RotateCcw size={10} /> Today
            </button>
          </div>
          <div className="hero-feeder">{selected}</div>
          <div className="hero-areas">3 hours off per feeder · 15 hours full supply</div>
        </div>
      )}

      {/* Feeder Cards */}
      <div className="feeders">
        {Object.entries(FEEDERS).map(([id, info]) => {
          const times = feederTimes[id];
          const isOpen = expanded === id;
          const isOffNow = isToday && liveStatus.isCut && liveStatus.feeder === id;
          return (
            <div key={id} className={`feeder feeder-${info.css} ${isOffNow ? 'feeder-active-off' : ''}`}>
              <button className="feeder-head" onClick={() => toggle(id)}>
                <div className="feeder-left">
                  <span className={`fdot fdot-${info.css}`} />
                  <div>
                    <div className="fname-row">
                      <span className="fname">{id} · {info.name}</span>
                      {isToday && (
                        <span className={`fstatus-badge ${isOffNow ? 'fstatus-off' : 'fstatus-on'}`}>
                          {isOffNow ? 'OFF NOW' : 'ON NOW'}
                        </span>
                      )}
                    </div>
                    <div className="fareas">{info.areas}</div>
                  </div>
                </div>
                <div className="feeder-right">
                  <span className="fcount">3h off</span>
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={14} />
                  </motion.div>
                </div>
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="feeder-body"
                  >
                    <div className="pills-label">Power Curtailment Slots:</div>
                    <div className="time-pills">
                      {times.map(({ time, isCurrent }) => (
                        <span key={time} className={`pill pill-${info.css} ${isCurrent ? 'pill-now' : ''}`}>
                          <Clock size={10} />
                          {time}
                          {isCurrent && <span className="pill-live">NOW</span>}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Full Supply Windows */}
      <div className="supply-section">
        <div className="supply-header">
          <span className="supply-title">Full Supply Windows (All Feeders ON)</span>
          <span className="supply-total-badge">15h / day</span>
        </div>
        <div className="supply-grid">
          {FULL_SUPPLY_WINDOWS.map((w) => {
            const Icon = w.icon;
            const isActive = isToday && !liveStatus.isCut && liveStatus.activeWindow === w.id;
            return (
              <div key={w.id} className={`supply-card ${isActive ? 'supply-card-active' : ''}`}>
                <div className="supply-card-top">
                  <div className="supply-card-type">
                    <Icon size={12} className="supply-card-icon" />
                    <span>{w.type}</span>
                  </div>
                  <span className="supply-card-duration">{w.duration}</span>
                </div>
                <div className="supply-card-hours">{w.hours}</div>
                {isActive && <div className="supply-card-live">ACTIVE NOW</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Guidelines Accordion */}
      <div className="guidelines-card">
        <button className="guidelines-toggle" onClick={() => setShowNotes(!showNotes)}>
          <div className="guidelines-left">
            <Info size={13} className="guidelines-icon" />
            <span>Official Curtailment Guidelines</span>
          </div>
          <ChevronDown
            size={13}
            style={{
              transform: showNotes ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          />
        </button>
        <AnimatePresence>
          {showNotes && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="guidelines-body"
            >
              <ol>
                <li>
                  <strong>Equitable Curtailment:</strong> Framed strictly as per latest AT&amp;C loss data provided by IT&amp;C Division, Bemina.
                </li>
                <li>
                  <strong>Peak Rotational Curtailment:</strong> If the receiving station is overloaded and cannot sustain the connected load simultaneously, the 1-hour period from <strong>6:00 PM to 7:00 PM</strong> shall be managed via rotational curtailment equally divided among feeders (20 mins each).
                </li>
                <li>
                  <strong>Grid &amp; Emergency Constraints:</strong> Any emergency shutdowns, SLDC/Grid authority restrictions, or breakdowns are managed over and above this notified schedule.
                </li>
                <li>
                  <strong>Adherence:</strong> Strict compliance by field officers W.E.F. 18-10-2026.
                </li>
              </ol>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer>
        <div>Receiving Station Nadihal · PDD Kashmir</div>
        <div className="footer-sub">© xposed73</div>
      </footer>
    </div>
  );
}

export default App;
