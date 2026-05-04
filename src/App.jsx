import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ChevronDown, Moon } from 'lucide-react';
import './index.css';

const SCHEDULE_DATA = {
  Sunday:    ["F1","F1","F2","F3","F3","F1","F1","F2","F3","F3","F1","F1","F2","F3","F3"],
  Monday:    ["F2","F3","F3","F1","F1","F2","F3","F3","F1","F1","F2","F3","F3","F1","F1"],
  Tuesday:   ["F3","F3","F1","F1","F2","F3","F3","F1","F1","F2","F3","F3","F1","F1","F2"],
  Wednesday: ["F1","F1","F2","F3","F3","F1","F1","F2","F3","F3","F1","F1","F2","F3","F3"],
  Thursday:  ["F2","F3","F3","F1","F1","F2","F3","F3","F1","F1","F2","F3","F3","F1","F1"],
  Friday:    ["F3","F3","F1","F1","F2","F3","F3","F1","F1","F2","F3","F3","F1","F1","F2"],
  Saturday:  ["F1","F1","F2","F3","F3","F1","F1","F2","F3","F3","F1","F1","F2","F3","F3"],
};

const TIMES = [
  "7–8 AM","8–9 AM","9–10 AM","10–11 AM","11 AM–12 PM",
  "12–1 PM","1–2 PM","2–3 PM","3–4 PM","4–5 PM",
  "5–6 PM","6–7 PM","7–8 PM","8–9 PM","9–10 PM",
];

const FEEDERS = {
  F1: { name: "Nadihal", areas: "Nadihal, Gundidachina, Brar", css: "f1" },
  F2: { name: "Garoora", areas: "Garoora, SK Payeen", css: "f2" },
  F3: { name: "Aragam", areas: "Aragam, Chittibanday", css: "f3" },
};

const DAYS = Object.keys(SCHEDULE_DATA);
const DAY_LABEL = { Sunday:"Sun", Monday:"Mon", Tuesday:"Tue", Wednesday:"Wed", Thursday:"Thu", Friday:"Fri", Saturday:"Sat" };

function App() {
  const todayIdx = new Date().getDay();
  const [selected, setSelected] = useState(DAYS[todayIdx]);
  const [expanded, setExpanded] = useState(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hour = now.getHours();
  const isToday = selected === DAYS[todayIdx];
  const schedule = SCHEDULE_DATA[selected];

  // Current feeder OFF (only if today and within 7AM-10PM)
  const currentIdx = hour >= 7 && hour < 22 ? hour - 7 : -1;
  const currentFeeder = isToday && currentIdx >= 0 ? schedule[currentIdx] : null;
  const isNight = hour >= 22 || hour < 7;

  // Group times by feeder for selected day
  const feederTimes = {};
  Object.keys(FEEDERS).forEach(f => { feederTimes[f] = []; });
  schedule.forEach((f, i) => {
    feederTimes[f].push({ time: TIMES[i], isCurrent: isToday && i === currentIdx });
  });

  const toggle = (id) => setExpanded(expanded === id ? null : id);

  return (
    <div className="app">
      <header>
        <div className="logo"><Zap size={16} /></div>
        <h1>Nadihal Power Schedule</h1>
      </header>

      {/* Day Picker */}
      <div className="days">
        {DAYS.map(d => (
          <button key={d} className={`day ${selected === d ? 'on' : ''}`} onClick={() => { setSelected(d); setExpanded(null); }}>
            {DAY_LABEL[d]}
            {DAYS[todayIdx] === d && <span className="pip" />}
          </button>
        ))}
      </div>

      {/* Status Hero */}
      {isToday && (
        <div className={`hero ${currentFeeder ? `hero-${FEEDERS[currentFeeder].css}` : 'hero-on'}`}>
          {currentFeeder ? (
            <>
              <div className="hero-label">Currently OFF</div>
              <div className="hero-feeder">{currentFeeder} · {FEEDERS[currentFeeder].name}</div>
              <div className="hero-areas">{FEEDERS[currentFeeder].areas}</div>
            </>
          ) : (
            <>
              <div className="hero-label">{isNight ? 'All Feeders ON' : 'Schedule Complete'}</div>
              <div className="hero-feeder">Power Restored</div>
              <div className="hero-areas">All areas have power</div>
            </>
          )}
        </div>
      )}

      {/* Feeder Cards */}
      <div className="feeders">
        {Object.entries(FEEDERS).map(([id, info]) => {
          const times = feederTimes[id];
          const isOpen = expanded === id;
          return (
            <div key={id} className={`feeder feeder-${info.css}`}>
              <button className="feeder-head" onClick={() => toggle(id)}>
                <div className="feeder-left">
                  <span className={`fdot fdot-${info.css}`} />
                  <div>
                    <div className="fname">{id} · {info.name}</div>
                    <div className="fareas">{info.areas}</div>
                  </div>
                </div>
                <div className="feeder-right">
                  <span className="fcount">{times.length}h off</span>
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
                    <div className="time-pills">
                      {times.map(({ time, isCurrent }) => (
                        <span key={time} className={`pill pill-${info.css} ${isCurrent ? 'pill-now' : ''}`}>
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

      {/* Overnight */}
      <div className="overnight">
        <Moon size={12} />
        <span>10 PM – 7 AM · All feeders ON</span>
      </div>

      <footer>© xposed73</footer>
    </div>
  );
}

export default App;
