const express = require('express');
const router = express.Router();

const TEST_MATCHES = {
  1: {
    map: 'CTF-Face',
    gameType: 'CTF',
    server: 'TestServer #1',
    date: '2025-01-12',
    redTeamScore: 7,
    blueTeamScore: 3,
    players: [
      { name: 'Reaper',   team: 'Red',  flagCapture:3, flagReturn:4, flagKill:12, flagCover:6,  flagSeal:2, flagAssist:1, flagPickup:5, flagTaken:3, flagDrop:1 },
      { name: 'Ghost',    team: 'Red',  flagCapture:2, flagReturn:6, flagKill:8,  flagCover:9,  flagSeal:1, flagAssist:2, flagPickup:4, flagTaken:2, flagDrop:1 },
      { name: 'Nova',     team: 'Red',  flagCapture:1, flagReturn:2, flagKill:5,  flagCover:3,  flagSeal:0, flagAssist:3, flagPickup:2, flagTaken:4, flagDrop:2 },
      { name: 'Blaze',    team: 'Red',  flagCapture:1, flagReturn:7, flagKill:15, flagCover:4,  flagSeal:3, flagAssist:0, flagPickup:3, flagTaken:1, flagDrop:0 },
      { name: 'Titan',    team: 'Red',  flagCapture:0, flagReturn:5, flagKill:9,  flagCover:7,  flagSeal:2, flagAssist:1, flagPickup:2, flagTaken:2, flagDrop:1 },
      { name: 'Phantom',  team: 'Blue', flagCapture:2, flagReturn:3, flagKill:6,  flagCover:5,  flagSeal:1, flagAssist:1, flagPickup:4, flagTaken:5, flagDrop:2 },
      { name: 'Striker',  team: 'Blue', flagCapture:1, flagReturn:1, flagKill:3,  flagCover:2,  flagSeal:0, flagAssist:2, flagPickup:2, flagTaken:3, flagDrop:1 },
      { name: 'Viper',    team: 'Blue', flagCapture:0, flagReturn:5, flagKill:10, flagCover:7,  flagSeal:2, flagAssist:0, flagPickup:1, flagTaken:2, flagDrop:1 },
      { name: 'Shadow',   team: 'Blue', flagCapture:0, flagReturn:2, flagKill:4,  flagCover:1,  flagSeal:0, flagAssist:1, flagPickup:2, flagTaken:2, flagDrop:0 },
      { name: 'Frenzy',   team: 'Blue', flagCapture:0, flagReturn:3, flagKill:7,  flagCover:4,  flagSeal:1, flagAssist:0, flagPickup:1, flagTaken:1, flagDrop:0 },
    ]
  },
  2: {
    map: 'CTF-Coret',
    gameType: 'CTF',
    server: 'TestServer #1',
    date: '2025-01-12',
    redTeamScore: 4,
    blueTeamScore: 6,
    players: [
      { name: 'Reaper',   team: 'Red',  flagCapture:2, flagReturn:3, flagKill:7,  flagCover:4,  flagSeal:1, flagAssist:1, flagPickup:3, flagTaken:4, flagDrop:1 },
      { name: 'Ghost',    team: 'Red',  flagCapture:1, flagReturn:5, flagKill:11, flagCover:8,  flagSeal:2, flagAssist:0, flagPickup:2, flagTaken:2, flagDrop:1 },
      { name: 'Nova',     team: 'Red',  flagCapture:1, flagReturn:1, flagKill:3,  flagCover:2,  flagSeal:0, flagAssist:2, flagPickup:2, flagTaken:3, flagDrop:1 },
      { name: 'Blaze',    team: 'Red',  flagCapture:0, flagReturn:6, flagKill:14, flagCover:3,  flagSeal:3, flagAssist:1, flagPickup:1, flagTaken:1, flagDrop:0 },
      { name: 'Titan',    team: 'Red',  flagCapture:0, flagReturn:4, flagKill:8,  flagCover:5,  flagSeal:1, flagAssist:0, flagPickup:2, flagTaken:2, flagDrop:1 },
      { name: 'Phantom',  team: 'Blue', flagCapture:3, flagReturn:4, flagKill:9,  flagCover:6,  flagSeal:1, flagAssist:2, flagPickup:5, flagTaken:4, flagDrop:1 },
      { name: 'Striker',  team: 'Blue', flagCapture:2, flagReturn:2, flagKill:5,  flagCover:3,  flagSeal:0, flagAssist:1, flagPickup:3, flagTaken:3, flagDrop:2 },
      { name: 'Viper',    team: 'Blue', flagCapture:1, flagReturn:7, flagKill:13, flagCover:9,  flagSeal:2, flagAssist:0, flagPickup:2, flagTaken:2, flagDrop:0 },
      { name: 'Shadow',   team: 'Blue', flagCapture:0, flagReturn:3, flagKill:6,  flagCover:2,  flagSeal:1, flagAssist:2, flagPickup:1, flagTaken:1, flagDrop:0 },
      { name: 'Frenzy',   team: 'Blue', flagCapture:0, flagReturn:2, flagKill:4,  flagCover:1,  flagSeal:0, flagAssist:1, flagPickup:1, flagTaken:2, flagDrop:1 },
    ]
  },
  3: {
    map: 'CTF-Gauntlet',
    gameType: 'CTF',
    server: 'TestServer #2',
    date: '2025-01-19',
    redTeamScore: 5,
    blueTeamScore: 5,
    players: [
      { name: 'Reaper',    team: 'Red',  flagCapture:2, flagReturn:5, flagKill:10, flagCover:7,  flagSeal:1, flagAssist:1, flagPickup:4, flagTaken:3, flagDrop:1 },
      { name: 'Ghost',     team: 'Red',  flagCapture:1, flagReturn:4, flagKill:8,  flagCover:5,  flagSeal:2, flagAssist:2, flagPickup:3, flagTaken:2, flagDrop:0 },
      { name: 'Nova',      team: 'Red',  flagCapture:2, flagReturn:3, flagKill:6,  flagCover:4,  flagSeal:0, flagAssist:1, flagPickup:3, flagTaken:4, flagDrop:2 },
      { name: 'Blaze',     team: 'Red',  flagCapture:0, flagReturn:8, flagKill:17, flagCover:6,  flagSeal:4, flagAssist:0, flagPickup:1, flagTaken:1, flagDrop:0 },
      { name: 'Titan',     team: 'Red',  flagCapture:0, flagReturn:3, flagKill:5,  flagCover:3,  flagSeal:1, flagAssist:2, flagPickup:2, flagTaken:2, flagDrop:1 },
      { name: 'Phantom',   team: 'Blue', flagCapture:3, flagReturn:2, flagKill:5,  flagCover:3,  flagSeal:1, flagAssist:2, flagPickup:5, flagTaken:5, flagDrop:2 },
      { name: 'Striker',   team: 'Blue', flagCapture:1, flagReturn:6, flagKill:12, flagCover:8,  flagSeal:1, flagAssist:0, flagPickup:2, flagTaken:2, flagDrop:1 },
      { name: 'Viper',     team: 'Blue', flagCapture:1, flagReturn:3, flagKill:7,  flagCover:5,  flagSeal:2, flagAssist:1, flagPickup:2, flagTaken:3, flagDrop:1 },
      { name: 'Shadow',    team: 'Blue', flagCapture:0, flagReturn:4, flagKill:9,  flagCover:6,  flagSeal:2, flagAssist:1, flagPickup:1, flagTaken:2, flagDrop:0 },
      { name: 'NewPlayer', team: 'Blue', flagCapture:0, flagReturn:1, flagKill:2,  flagCover:1,  flagSeal:0, flagAssist:1, flagPickup:1, flagTaken:1, flagDrop:1 },
    ]
  },
  // --- Week 2 test matches (matches 4–6) ---
  4: {
    map: 'CTF-Orbital',
    gameType: 'CTF',
    server: 'TestServer #1',
    date: '2025-01-26',
    redTeamScore: 6,
    blueTeamScore: 3,
    players: [
      // Mixed lineups: Reaper/Ghost/Phantom/Striker/Shadow on Red; Nova/Blaze/Titan/Viper/Frenzy on Blue
      { name: 'Reaper',  team: 'Red',  flagCapture:3, flagReturn:3, flagKill:9,  flagCover:5,  flagSeal:1, flagAssist:2, flagPickup:5, flagTaken:3, flagDrop:1 },
      { name: 'Ghost',   team: 'Red',  flagCapture:2, flagReturn:5, flagKill:11, flagCover:7,  flagSeal:2, flagAssist:1, flagPickup:3, flagTaken:2, flagDrop:0 },
      { name: 'Phantom', team: 'Red',  flagCapture:1, flagReturn:4, flagKill:7,  flagCover:4,  flagSeal:0, flagAssist:3, flagPickup:2, flagTaken:4, flagDrop:2 },
      { name: 'Striker', team: 'Red',  flagCapture:0, flagReturn:7, flagKill:16, flagCover:5,  flagSeal:3, flagAssist:0, flagPickup:1, flagTaken:1, flagDrop:0 },
      { name: 'Shadow',  team: 'Red',  flagCapture:0, flagReturn:4, flagKill:8,  flagCover:6,  flagSeal:2, flagAssist:1, flagPickup:2, flagTaken:2, flagDrop:1 },
      { name: 'Nova',    team: 'Blue', flagCapture:2, flagReturn:2, flagKill:5,  flagCover:3,  flagSeal:1, flagAssist:2, flagPickup:4, flagTaken:5, flagDrop:2 },
      { name: 'Blaze',   team: 'Blue', flagCapture:1, flagReturn:3, flagKill:8,  flagCover:4,  flagSeal:0, flagAssist:1, flagPickup:2, flagTaken:3, flagDrop:1 },
      { name: 'Titan',   team: 'Blue', flagCapture:0, flagReturn:6, flagKill:10, flagCover:7,  flagSeal:2, flagAssist:0, flagPickup:1, flagTaken:2, flagDrop:0 },
      { name: 'Viper',   team: 'Blue', flagCapture:0, flagReturn:2, flagKill:4,  flagCover:2,  flagSeal:0, flagAssist:1, flagPickup:2, flagTaken:2, flagDrop:1 },
      { name: 'Frenzy',  team: 'Blue', flagCapture:0, flagReturn:1, flagKill:3,  flagCover:1,  flagSeal:0, flagAssist:0, flagPickup:1, flagTaken:1, flagDrop:0 },
    ]
  },
  5: {
    map: 'CTF-November',
    gameType: 'CTF',
    server: 'TestServer #2',
    date: '2025-01-26',
    redTeamScore: 2,
    blueTeamScore: 7,
    players: [
      // Blue wins by 5
      { name: 'Reaper',  team: 'Red',  flagCapture:1, flagReturn:2, flagKill:5,  flagCover:3,  flagSeal:0, flagAssist:1, flagPickup:2, flagTaken:3, flagDrop:1 },
      { name: 'Nova',    team: 'Red',  flagCapture:1, flagReturn:3, flagKill:6,  flagCover:4,  flagSeal:1, flagAssist:0, flagPickup:2, flagTaken:2, flagDrop:1 },
      { name: 'Blaze',   team: 'Red',  flagCapture:0, flagReturn:4, flagKill:9,  flagCover:3,  flagSeal:1, flagAssist:1, flagPickup:1, flagTaken:1, flagDrop:0 },
      { name: 'Striker', team: 'Red',  flagCapture:0, flagReturn:2, flagKill:4,  flagCover:2,  flagSeal:0, flagAssist:0, flagPickup:1, flagTaken:2, flagDrop:1 },
      { name: 'Viper',   team: 'Red',  flagCapture:0, flagReturn:1, flagKill:3,  flagCover:1,  flagSeal:0, flagAssist:0, flagPickup:1, flagTaken:1, flagDrop:0 },
      { name: 'Ghost',   team: 'Blue', flagCapture:3, flagReturn:5, flagKill:12, flagCover:8,  flagSeal:2, flagAssist:2, flagPickup:5, flagTaken:4, flagDrop:1 },
      { name: 'Titan',   team: 'Blue', flagCapture:2, flagReturn:6, flagKill:10, flagCover:6,  flagSeal:1, flagAssist:1, flagPickup:3, flagTaken:3, flagDrop:1 },
      { name: 'Phantom', team: 'Blue', flagCapture:1, flagReturn:4, flagKill:8,  flagCover:5,  flagSeal:2, flagAssist:2, flagPickup:3, flagTaken:4, flagDrop:2 },
      { name: 'Shadow',  team: 'Blue', flagCapture:1, flagReturn:3, flagKill:6,  flagCover:4,  flagSeal:0, flagAssist:1, flagPickup:2, flagTaken:2, flagDrop:0 },
      { name: 'Frenzy',  team: 'Blue', flagCapture:0, flagReturn:2, flagKill:4,  flagCover:2,  flagSeal:1, flagAssist:0, flagPickup:1, flagTaken:1, flagDrop:0 },
    ]
  },
  6: {
    map: 'CTF-Dreary',
    gameType: 'CTF',
    server: 'TestServer #1',
    date: '2025-01-26',
    redTeamScore: 4,
    blueTeamScore: 4,
    players: [
      // Draw — same lineup as match 4 but swapped sides
      { name: 'Nova',    team: 'Red',  flagCapture:2, flagReturn:3, flagKill:7,  flagCover:5,  flagSeal:1, flagAssist:2, flagPickup:4, flagTaken:3, flagDrop:1 },
      { name: 'Blaze',   team: 'Red',  flagCapture:1, flagReturn:5, flagKill:13, flagCover:4,  flagSeal:2, flagAssist:0, flagPickup:2, flagTaken:2, flagDrop:0 },
      { name: 'Titan',   team: 'Red',  flagCapture:1, flagReturn:4, flagKill:8,  flagCover:6,  flagSeal:1, flagAssist:1, flagPickup:2, flagTaken:4, flagDrop:2 },
      { name: 'Viper',   team: 'Red',  flagCapture:0, flagReturn:3, flagKill:5,  flagCover:2,  flagSeal:0, flagAssist:1, flagPickup:1, flagTaken:1, flagDrop:0 },
      { name: 'Frenzy',  team: 'Red',  flagCapture:0, flagReturn:2, flagKill:4,  flagCover:2,  flagSeal:1, flagAssist:0, flagPickup:1, flagTaken:2, flagDrop:1 },
      { name: 'Reaper',  team: 'Blue', flagCapture:2, flagReturn:4, flagKill:9,  flagCover:6,  flagSeal:2, flagAssist:1, flagPickup:4, flagTaken:4, flagDrop:2 },
      { name: 'Ghost',   team: 'Blue', flagCapture:1, flagReturn:6, flagKill:11, flagCover:7,  flagSeal:1, flagAssist:2, flagPickup:3, flagTaken:2, flagDrop:0 },
      { name: 'Phantom', team: 'Blue', flagCapture:1, flagReturn:3, flagKill:6,  flagCover:4,  flagSeal:1, flagAssist:2, flagPickup:2, flagTaken:3, flagDrop:1 },
      { name: 'Striker', team: 'Blue', flagCapture:0, flagReturn:5, flagKill:10, flagCover:5,  flagSeal:2, flagAssist:0, flagPickup:1, flagTaken:2, flagDrop:0 },
      { name: 'Shadow',  team: 'Blue', flagCapture:0, flagReturn:2, flagKill:3,  flagCover:2,  flagSeal:0, flagAssist:1, flagPickup:1, flagTaken:1, flagDrop:0 },
    ]
  },
  // --- Week 3 test matches (matches 7–9) ---
  // FlukeMaster appears only here (1 match), Clutch appears in 7+8, Wanderer in 8+9
  7: {
    map: 'CTF-Face',
    gameType: 'CTF',
    server: 'TestServer #1',
    date: '2025-02-02',
    redTeamScore: 7,
    blueTeamScore: 0,
    players: [
      // Red wins 7-0: win by 5+ (+5) and clean sheet (+2) for all Red players
      { name: 'Reaper',      team: 'Red',  flagCapture:3, flagReturn:5, flagKill:11, flagCover:8,  flagSeal:2, flagAssist:1, flagPickup:5, flagTaken:3, flagDrop:1 },
      { name: 'Ghost',       team: 'Red',  flagCapture:2, flagReturn:6, flagKill:14, flagCover:10, flagSeal:1, flagAssist:2, flagPickup:4, flagTaken:2, flagDrop:0 },
      { name: 'Phantom',     team: 'Red',  flagCapture:1, flagReturn:4, flagKill:8,  flagCover:6,  flagSeal:1, flagAssist:3, flagPickup:3, flagTaken:3, flagDrop:1 },
      { name: 'Titan',       team: 'Red',  flagCapture:1, flagReturn:7, flagKill:16, flagCover:7,  flagSeal:3, flagAssist:0, flagPickup:2, flagTaken:1, flagDrop:0 },
      { name: 'FlukeMaster', team: 'Red',  flagCapture:4, flagReturn:4, flagKill:12, flagCover:12, flagSeal:2, flagAssist:3, flagPickup:6, flagTaken:4, flagDrop:1 },
      { name: 'Nova',        team: 'Blue', flagCapture:0, flagReturn:2, flagKill:4,  flagCover:3,  flagSeal:0, flagAssist:1, flagPickup:2, flagTaken:4, flagDrop:2 },
      { name: 'Blaze',       team: 'Blue', flagCapture:0, flagReturn:3, flagKill:5,  flagCover:2,  flagSeal:1, flagAssist:0, flagPickup:1, flagTaken:3, flagDrop:2 },
      { name: 'Striker',     team: 'Blue', flagCapture:0, flagReturn:1, flagKill:3,  flagCover:2,  flagSeal:0, flagAssist:0, flagPickup:1, flagTaken:2, flagDrop:1 },
      { name: 'Shadow',      team: 'Blue', flagCapture:0, flagReturn:2, flagKill:4,  flagCover:1,  flagSeal:0, flagAssist:1, flagPickup:1, flagTaken:2, flagDrop:1 },
      { name: 'Clutch',      team: 'Blue', flagCapture:0, flagReturn:1, flagKill:2,  flagCover:2,  flagSeal:0, flagAssist:1, flagPickup:1, flagTaken:1, flagDrop:0 },
    ]
  },
  8: {
    map: 'CTF-Coret',
    gameType: 'CTF',
    server: 'TestServer #2',
    date: '2025-02-02',
    redTeamScore: 2,
    blueTeamScore: 6,
    players: [
      // Blue wins 6-2: win by 4 (>=3) for Blue
      { name: 'Reaper',   team: 'Red',  flagCapture:1, flagReturn:3, flagKill:6,  flagCover:4,  flagSeal:0, flagAssist:1, flagPickup:2, flagTaken:3, flagDrop:1 },
      { name: 'Nova',     team: 'Red',  flagCapture:1, flagReturn:2, flagKill:4,  flagCover:3,  flagSeal:0, flagAssist:1, flagPickup:2, flagTaken:4, flagDrop:2 },
      { name: 'Blaze',    team: 'Red',  flagCapture:0, flagReturn:4, flagKill:9,  flagCover:3,  flagSeal:2, flagAssist:0, flagPickup:1, flagTaken:2, flagDrop:1 },
      { name: 'Titan',    team: 'Red',  flagCapture:0, flagReturn:3, flagKill:7,  flagCover:4,  flagSeal:1, flagAssist:0, flagPickup:1, flagTaken:1, flagDrop:0 },
      { name: 'Wanderer', team: 'Red',  flagCapture:0, flagReturn:2, flagKill:3,  flagCover:2,  flagSeal:0, flagAssist:1, flagPickup:1, flagTaken:2, flagDrop:1 },
      { name: 'Ghost',    team: 'Blue', flagCapture:3, flagReturn:5, flagKill:13, flagCover:9,  flagSeal:2, flagAssist:2, flagPickup:5, flagTaken:3, flagDrop:1 },
      { name: 'Phantom',  team: 'Blue', flagCapture:2, flagReturn:4, flagKill:9,  flagCover:7,  flagSeal:1, flagAssist:2, flagPickup:4, flagTaken:4, flagDrop:2 },
      { name: 'Striker',  team: 'Blue', flagCapture:1, flagReturn:6, flagKill:11, flagCover:6,  flagSeal:2, flagAssist:1, flagPickup:3, flagTaken:2, flagDrop:0 },
      { name: 'Shadow',   team: 'Blue', flagCapture:0, flagReturn:3, flagKill:5,  flagCover:4,  flagSeal:1, flagAssist:2, flagPickup:2, flagTaken:2, flagDrop:1 },
      { name: 'Clutch',   team: 'Blue', flagCapture:0, flagReturn:2, flagKill:4,  flagCover:3,  flagSeal:0, flagAssist:1, flagPickup:1, flagTaken:1, flagDrop:0 },
    ]
  },
  9: {
    map: 'CTF-Gauntlet',
    gameType: 'CTF',
    server: 'TestServer #1',
    date: '2025-02-02',
    redTeamScore: 4,
    blueTeamScore: 4,
    players: [
      // Draw 4-4
      { name: 'Ghost',    team: 'Red',  flagCapture:2, flagReturn:4, flagKill:9,  flagCover:7,  flagSeal:1, flagAssist:1, flagPickup:3, flagTaken:3, flagDrop:1 },
      { name: 'Nova',     team: 'Red',  flagCapture:2, flagReturn:3, flagKill:6,  flagCover:5,  flagSeal:0, flagAssist:2, flagPickup:3, flagTaken:4, flagDrop:2 },
      { name: 'Blaze',    team: 'Red',  flagCapture:0, flagReturn:6, flagKill:14, flagCover:5,  flagSeal:3, flagAssist:0, flagPickup:1, flagTaken:1, flagDrop:0 },
      { name: 'Phantom',  team: 'Red',  flagCapture:0, flagReturn:4, flagKill:8,  flagCover:6,  flagSeal:2, flagAssist:1, flagPickup:2, flagTaken:2, flagDrop:1 },
      { name: 'Wanderer', team: 'Red',  flagCapture:0, flagReturn:2, flagKill:3,  flagCover:3,  flagSeal:0, flagAssist:1, flagPickup:1, flagTaken:2, flagDrop:1 },
      { name: 'Reaper',   team: 'Blue', flagCapture:2, flagReturn:5, flagKill:10, flagCover:8,  flagSeal:2, flagAssist:1, flagPickup:4, flagTaken:3, flagDrop:1 },
      { name: 'Titan',    team: 'Blue', flagCapture:2, flagReturn:4, flagKill:9,  flagCover:5,  flagSeal:1, flagAssist:2, flagPickup:3, flagTaken:2, flagDrop:0 },
      { name: 'Striker',  team: 'Blue', flagCapture:0, flagReturn:5, flagKill:11, flagCover:7,  flagSeal:2, flagAssist:0, flagPickup:2, flagTaken:3, flagDrop:1 },
      { name: 'Shadow',   team: 'Blue', flagCapture:0, flagReturn:3, flagKill:6,  flagCover:4,  flagSeal:1, flagAssist:1, flagPickup:1, flagTaken:2, flagDrop:0 },
      { name: 'Frenzy',   team: 'Blue', flagCapture:0, flagReturn:2, flagKill:4,  flagCover:2,  flagSeal:0, flagAssist:1, flagPickup:1, flagTaken:1, flagDrop:0 },
    ]
  },
  // --- Week 4 test matches (matches 10–12) ---
  // Clutch's 3rd and final match in 11; Wanderer and FlukeMaster absent
  10: {
    map: 'CTF-Orbital',
    gameType: 'CTF',
    server: 'TestServer #1',
    date: '2025-02-09',
    redTeamScore: 5,
    blueTeamScore: 2,
    players: [
      // Red wins 5-2: margin 3 (>=3)
      { name: 'Reaper',  team: 'Red',  flagCapture:3, flagReturn:4, flagKill:10, flagCover:6,  flagSeal:1, flagAssist:2, flagPickup:5, flagTaken:3, flagDrop:1 },
      { name: 'Ghost',   team: 'Red',  flagCapture:2, flagReturn:5, flagKill:12, flagCover:8,  flagSeal:2, flagAssist:1, flagPickup:3, flagTaken:2, flagDrop:0 },
      { name: 'Phantom', team: 'Red',  flagCapture:0, flagReturn:4, flagKill:8,  flagCover:6,  flagSeal:2, flagAssist:2, flagPickup:2, flagTaken:3, flagDrop:1 },
      { name: 'Nova',    team: 'Red',  flagCapture:0, flagReturn:3, flagKill:5,  flagCover:4,  flagSeal:1, flagAssist:1, flagPickup:2, flagTaken:2, flagDrop:1 },
      { name: 'Shadow',  team: 'Red',  flagCapture:0, flagReturn:6, flagKill:9,  flagCover:5,  flagSeal:2, flagAssist:0, flagPickup:1, flagTaken:1, flagDrop:0 },
      { name: 'Titan',   team: 'Blue', flagCapture:1, flagReturn:3, flagKill:6,  flagCover:4,  flagSeal:0, flagAssist:1, flagPickup:2, flagTaken:4, flagDrop:2 },
      { name: 'Blaze',   team: 'Blue', flagCapture:1, flagReturn:4, flagKill:8,  flagCover:3,  flagSeal:1, flagAssist:1, flagPickup:2, flagTaken:3, flagDrop:1 },
      { name: 'Striker', team: 'Blue', flagCapture:0, flagReturn:3, flagKill:5,  flagCover:3,  flagSeal:1, flagAssist:0, flagPickup:1, flagTaken:2, flagDrop:1 },
      { name: 'Viper',   team: 'Blue', flagCapture:0, flagReturn:2, flagKill:4,  flagCover:2,  flagSeal:0, flagAssist:1, flagPickup:1, flagTaken:2, flagDrop:1 },
      { name: 'Frenzy',  team: 'Blue', flagCapture:0, flagReturn:1, flagKill:3,  flagCover:1,  flagSeal:0, flagAssist:0, flagPickup:1, flagTaken:1, flagDrop:0 },
    ]
  },
  11: {
    map: 'CTF-November',
    gameType: 'CTF',
    server: 'TestServer #2',
    date: '2025-02-09',
    redTeamScore: 1,
    blueTeamScore: 4,
    players: [
      // Blue wins 4-1: margin 3 (>=3)
      { name: 'Nova',    team: 'Red',  flagCapture:1, flagReturn:2, flagKill:4,  flagCover:3,  flagSeal:0, flagAssist:1, flagPickup:2, flagTaken:3, flagDrop:2 },
      { name: 'Blaze',   team: 'Red',  flagCapture:0, flagReturn:3, flagKill:6,  flagCover:2,  flagSeal:1, flagAssist:0, flagPickup:1, flagTaken:2, flagDrop:1 },
      { name: 'Viper',   team: 'Red',  flagCapture:0, flagReturn:2, flagKill:3,  flagCover:2,  flagSeal:0, flagAssist:0, flagPickup:1, flagTaken:1, flagDrop:0 },
      { name: 'Frenzy',  team: 'Red',  flagCapture:0, flagReturn:1, flagKill:2,  flagCover:1,  flagSeal:0, flagAssist:0, flagPickup:1, flagTaken:1, flagDrop:1 },
      { name: 'Clutch',  team: 'Red',  flagCapture:0, flagReturn:2, flagKill:3,  flagCover:2,  flagSeal:0, flagAssist:1, flagPickup:1, flagTaken:2, flagDrop:1 },
      { name: 'Reaper',  team: 'Blue', flagCapture:2, flagReturn:4, flagKill:9,  flagCover:6,  flagSeal:1, flagAssist:2, flagPickup:4, flagTaken:3, flagDrop:1 },
      { name: 'Ghost',   team: 'Blue', flagCapture:1, flagReturn:5, flagKill:11, flagCover:8,  flagSeal:2, flagAssist:1, flagPickup:3, flagTaken:2, flagDrop:0 },
      { name: 'Phantom', team: 'Blue', flagCapture:1, flagReturn:4, flagKill:8,  flagCover:6,  flagSeal:1, flagAssist:2, flagPickup:3, flagTaken:4, flagDrop:2 },
      { name: 'Titan',   team: 'Blue', flagCapture:0, flagReturn:6, flagKill:13, flagCover:7,  flagSeal:2, flagAssist:0, flagPickup:2, flagTaken:1, flagDrop:0 },
      { name: 'Striker', team: 'Blue', flagCapture:0, flagReturn:3, flagKill:5,  flagCover:3,  flagSeal:1, flagAssist:1, flagPickup:1, flagTaken:2, flagDrop:1 },
    ]
  },
  12: {
    map: 'CTF-Face',
    gameType: 'CTF',
    server: 'TestServer #1',
    date: '2025-02-09',
    redTeamScore: 6,
    blueTeamScore: 3,
    players: [
      // Red wins 6-3: margin 3 (>=3)
      { name: 'Reaper',  team: 'Red',  flagCapture:3, flagReturn:4, flagKill:11, flagCover:7,  flagSeal:2, flagAssist:1, flagPickup:5, flagTaken:3, flagDrop:1 },
      { name: 'Ghost',   team: 'Red',  flagCapture:2, flagReturn:5, flagKill:10, flagCover:9,  flagSeal:1, flagAssist:2, flagPickup:4, flagTaken:2, flagDrop:0 },
      { name: 'Nova',    team: 'Red',  flagCapture:1, flagReturn:3, flagKill:6,  flagCover:5,  flagSeal:0, flagAssist:2, flagPickup:3, flagTaken:4, flagDrop:2 },
      { name: 'Blaze',   team: 'Red',  flagCapture:0, flagReturn:7, flagKill:15, flagCover:5,  flagSeal:3, flagAssist:0, flagPickup:2, flagTaken:1, flagDrop:0 },
      { name: 'Phantom', team: 'Red',  flagCapture:0, flagReturn:4, flagKill:7,  flagCover:5,  flagSeal:2, flagAssist:2, flagPickup:2, flagTaken:3, flagDrop:1 },
      { name: 'Titan',   team: 'Blue', flagCapture:2, flagReturn:3, flagKill:7,  flagCover:4,  flagSeal:0, flagAssist:1, flagPickup:3, flagTaken:5, flagDrop:2 },
      { name: 'Striker', team: 'Blue', flagCapture:1, flagReturn:4, flagKill:8,  flagCover:5,  flagSeal:1, flagAssist:0, flagPickup:2, flagTaken:3, flagDrop:1 },
      { name: 'Shadow',  team: 'Blue', flagCapture:0, flagReturn:3, flagKill:5,  flagCover:3,  flagSeal:1, flagAssist:1, flagPickup:1, flagTaken:2, flagDrop:0 },
      { name: 'Viper',   team: 'Blue', flagCapture:0, flagReturn:2, flagKill:4,  flagCover:2,  flagSeal:0, flagAssist:0, flagPickup:1, flagTaken:2, flagDrop:1 },
      { name: 'Frenzy',  team: 'Blue', flagCapture:0, flagReturn:1, flagKill:2,  flagCover:1,  flagSeal:0, flagAssist:0, flagPickup:1, flagTaken:1, flagDrop:0 },
    ]
  },
};

router.get('/match/:id', (req, res) => {
  const match = TEST_MATCHES[req.params.id];
  if (!match) return res.status(404).json({ error: 'Test match not found. Valid IDs: 1, 2, 3' });
  res.json(match);
});

router.get('/matches', (req, res) => {
  res.json(Object.entries(TEST_MATCHES).map(([id, m]) => ({
    id,
    url: `/api/test/match/${id}`,
    map: m.map,
    score: `${m.redTeamScore}–${m.blueTeamScore}`,
    players: m.players.length,
    date: m.date
  })));
});

module.exports = router;
